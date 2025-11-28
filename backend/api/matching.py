import os
import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from openai import OpenAI

from schema import MatchingRequest, MatchingResponse, MemoryItem
from storage import JSONStorage

import dotenv

dotenv.load_dotenv()

router = APIRouter()
storage = JSONStorage()

# Initialize OpenAI client (will be None if API key not set)
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None


@router.post("", response_model=MatchingResponse)
async def match_form_fields(request: MatchingRequest):
    """
    Match a parsed form field with memory data using OpenAI semantic matching.
    This is called by the Extension to get value for a single form field.

    Process:
    1. Get memory items by their intents
    2. Search for matching intent (search_intent)
    3. Compose final value from match result and optional inputs (compose_value)
    """
    # Print request details for debugging
    print("=" * 50)
    print("Received matching request:")
    print(json.dumps(request.model_dump(), indent=2, ensure_ascii=False))
    print("=" * 50)

    # Get memory items by their intents (None means all items)
    if not request.memory_intents:
        memory_items = storage.get_all_items()
    else:
        memory_items = storage.get_items_by_intents(request.memory_intents)

    if not memory_items:
        raise HTTPException(
            status_code=404,
            detail=f"None of the requested memory intents found: {request.memory_intents}"
        )

    # Step 1: Search for matching intent
    matched_item = await search_intent(
        parsed_field=request.parsed_field,
        memory_items=memory_items
    )

    # Step 2: Compose final value
    matched_value = await compose_value(
        matched_item=matched_item,
        user_prompt=request.user_prompt,
        context=request.context
    )

    # Return in dict format: {field_name: value}
    # If matched_value is None, return empty string
    return MatchingResponse(matched_fields={request.parsed_field: matched_value or ""})


async def search_intent(
    parsed_field: str,
    memory_items: list[MemoryItem]
) -> Optional[MemoryItem]:
    """
    Search for the best matching intent in memory items.

    Args:
        parsed_field: Form field name to match
        memory_items: List of memory items to search

    Returns:
        MemoryItem if a match is found, None otherwise
    """
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )

    if not memory_items:
        return None

    # Prepare items info for AI
    items_info = [
        {
            "intent": item.intent,
            "value": item.value,
            "type": item.type
        }
        for item in memory_items
    ]

    # Get available intents for schema validation
    available_intents = [item.intent for item in memory_items]

    # Define JSON Schema for response format
    # Allow null to indicate no match found
    response_schema = {
        "type": "object",
        "properties": {
            "intent": {
                "type": ["string", "null"],
                "enum": available_intents + [None],
                "description": "The intent name that best matches the form field, or null if no intent matches well"
            }
        },
        "required": ["intent"],
        "additionalProperties": False
    }

    # Create prompt for semantic matching
    system_prompt = """You are a form field matching assistant. Your task is to semantically match a form field name with a memory item intent.

Given a form field name and available memory items (each with an intent, value, and type), determine which intent best matches the field name through semantic understanding. The intent and field name might be expressed differently but have similar meaning.

Return a JSON object with an "intent" field containing the intent name that best matches the field. The intent must be one of the available intents. If no intent matches well semantically, return null.

Example:
Form field: "full_name"
Memory items: [
  {"intent": "legal_name", "value": "John Doe", "type": "text"},
  {"intent": "contact_email", "value": "john@example.com", "type": "text"}
]
Result: {"intent": "legal_name"}

Example (no match):
Form field: "favorite_color"
Memory items: [
  {"intent": "legal_name", "value": "John Doe", "type": "text"}
]
Result: {"intent": null}
"""

    user_prompt_text = f"""Form field to match: "{parsed_field}"

Available memory items:
{json.dumps(items_info, indent=2)}

Available intents: {available_intents}

Return a JSON object with an "intent" field containing the intent name that best matches this field. Use exact intent name from the available intents list, or null if no intent matches well. Perform semantic matching - the field name and intent might be worded differently but should have the same meaning."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt_text}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "intent_match",
                    "strict": True,
                    "schema": response_schema,
                    "description": "An object containing the intent name that matches the form field, or null if no match"
                }
            },
            temperature=0.1
        )

        result = json.loads(response.choices[0].message.content)
        matched_intent = result.get("intent")

        # If no match found, return None
        if not matched_intent:
            return None

        # Create a mapping from intent to item for quick lookup
        intent_to_item = {item.intent: item for item in memory_items}

        if matched_intent not in intent_to_item:
            raise HTTPException(
                status_code=500,
                detail=f"Matched intent '{matched_intent}' not found in memory items"
            )

        item = intent_to_item[matched_intent]
        return item

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search intent with OpenAI: {str(e)}"
        )


async def compose_value(
    matched_item: Optional[MemoryItem],
    user_prompt: Optional[str] = None,
    context: Optional[str] = None
) -> Optional[str]:
    """
    Compose the final field value from matched item and optional inputs.

    Priority: user_prompt > context > memory_item

    Logic:
    - If user_prompt exists: always generate (prompt class), even if matched_item is None
    - If no user_prompt:
      - matched_item is None → return None
      - matched_item.type == "text" → return item.value directly
      - matched_item.type == "prompt" → generate content

    Args:
        matched_item: Memory item from search_intent (can be None)
        user_prompt: User-provided prompt/outline (highest priority)
        context: Short-term context provided by the form creator (e.g., company introduction, event details, form instructions, page content). This is written by whoever created the form, not by the user filling it out.

    Returns:
        Final value string, or None if cannot resolve
    """
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )

    # If user_prompt exists, always generate (prompt class)
    # Priority: user_prompt > context > memory_item (if exists)
    if user_prompt:
        memory_item_value = matched_item.value if matched_item else None
        return await generate_content(
            user_prompt=user_prompt,
            context=context,
            memory_item_value=memory_item_value
        )

    # No user_prompt: check matched_item
    if not matched_item:
        return None

    # matched_item exists
    if matched_item.type == "text":
        # Direct text value - return as is
        return matched_item.value
    elif matched_item.type == "prompt":
        # Generate content from prompt
        # Priority: context > memory_item
        return await generate_content(
            user_prompt=None,
            context=context,
            memory_item_value=matched_item.value
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Unknown item type: {matched_item.type}"
        )


async def generate_content(
    user_prompt: Optional[str] = None,
    context: Optional[str] = None,
    memory_item_value: Optional[str] = None
) -> str:
    """
    Generate content with priority: user_prompt > context > memory_item_value.

    The memory_item_value can be either a template (with placeholders) or prompt instructions.

    Args:
        user_prompt: User-provided prompt/outline (highest priority)
        context: Short-term context provided by the form creator (e.g., company introduction, event details, form instructions, page content). This is written by whoever created the form, not by the user filling it out.
        memory_item_value: Memory item value (template or prompt instruction, lowest priority)

    Returns:
        Generated content
    """
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )

    # Build the generation prompt progressively with clear priority order
    sections = []

    # Add priority header if we have multiple inputs
    if user_prompt or (context and memory_item_value):
        sections.append("Priority: User's outline (primary) > Form context (secondary) > Memory template (supplementary)")

    # Primary: User's outline
    if user_prompt:
        sections.append(f"PRIMARY INPUT - User's outline:\n{user_prompt}")

    # Secondary: Context
    if context:
        sections.append(f"SECONDARY INPUT - Form context:\n{context}")

    # Supplementary: Memory item
    if memory_item_value:
        sections.append(f"SUPPLEMENTARY GUIDANCE - Reference template:\n{memory_item_value}")

    # Generate instruction based on what's available
    if user_prompt:
        instruction = "Generate a response following the user's outline above, incorporating context where relevant."
    elif context:
        instruction = "Generate a response based on the context above."
    else:
        instruction = "Generate a response based on the template above."

    messages_content = "\n\n".join(sections) + "\n\n" + instruction

    # Define JSON Schema to ensure AI returns plain text response
    # OpenAI requires object type, so we wrap it in an object with a "response" field
    response_schema = {
        "type": "object",
        "properties": {
            "response": {
                "type": "string",
                "description": "The complete response text content"
            }
        },
        "required": ["response"],
        "additionalProperties": False
    }

    # System message to reinforce writing style
    system_message = """You are a helpful assistant that generates concise, genuine, and direct responses for form filling. Your responses should be brief but clear, authentic, and meaningful. Avoid verbosity, flowery language, or unnecessarily long explanations. Write as a real person would - naturally and to the point."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": messages_content}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "text_response",
                    "strict": True,
                    "schema": response_schema,
                    "description": "Response object containing plain text response content"
                }
            },
            temperature=0.7
        )

        # Extract the response text from the JSON object
        result = json.loads(response.choices[0].message.content)
        return result.get("response", "")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate content: {str(e)}"
        )
