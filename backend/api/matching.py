import os
import json
import asyncio
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
    Match multiple parsed form fields with memory data using OpenAI semantic matching.
    This is called by the Extension to get values for form fields.

    Two-stage process:
    1. Batch match all fields to intents in one API call (batch_search_intents)
    2. Parallel compose values for each field (batch_compose_values)

    This approach is more efficient than processing each field independently:
    - Reduces API calls (N fields -> 1 batch match call + N parallel compose calls)
    - Lower latency (batch matching is faster than N sequential matches)
    - Better context understanding (AI sees all fields together)
    """
    # Print request details for debugging
    print("=" * 50)
    print("Received matching request:")
    print(json.dumps(request.model_dump(), indent=2, ensure_ascii=False))
    print("=" * 50)

    # Validate input
    if not request.parsed_fields:
        raise HTTPException(
            status_code=400,
            detail="parsed_fields cannot be empty"
        )

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

    # Stage 1: Batch match all fields to intents (single API call)
    print(f"Stage 1: Batch matching {len(request.parsed_fields)} fields to intents...")
    field_matches = await batch_search_intents(
        parsed_fields=request.parsed_fields,
        memory_items=memory_items
    )

    # Print matching results for debugging
    print("Matching results:")
    for field, item in field_matches.items():
        if item:
            print(f"  {field} -> {item.intent}")
        else:
            print(f"  {field} -> None")

    # Stage 2: Parallel compose values for each field
    print(f"Stage 2: Composing values for {len(request.parsed_fields)} fields in parallel...")
    matched_fields = await batch_compose_values(
        field_matches=field_matches,
        user_prompts=request.user_prompts,
        context=request.context
    )

    print("Composition complete!")
    print("=" * 50)

    return MatchingResponse(matched_fields=matched_fields)


async def batch_search_intents(
    parsed_fields: list[str],
    memory_items: list[MemoryItem]
) -> dict[str, Optional[MemoryItem]]:
    """
    Batch search for matching intents for multiple form fields.
    Uses a single API call to match all fields at once.

    Args:
        parsed_fields: List of form field names to match
        memory_items: List of memory items to search

    Returns:
        Dictionary mapping field_name -> matched MemoryItem (or None if no match)
    """
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )

    if not memory_items:
        return {field: None for field in parsed_fields}

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

    # Define JSON Schema for batch response format
    # Each field maps to an intent name or null
    response_schema = {
        "type": "object",
        "properties": {
            field: {
                "type": ["string", "null"],
                "enum": available_intents + [None],
                "description": f"The intent that best matches '{field}', or null if no match"
            }
            for field in parsed_fields
        },
        "required": parsed_fields,
        "additionalProperties": False
    }

    # Create prompt for batch semantic matching
    system_prompt = """You are a form field matching assistant. Your task is to semantically match multiple form field names with memory item intents in one go.

Given a list of form field names and available memory items (each with an intent, value, and type), determine which intent best matches each field name through semantic understanding. The intent and field name might be expressed differently but have similar meaning.

Return a JSON object mapping each field name to its matched intent. Each intent must be one of the available intents. If no intent matches well for a field, use null for that field.

Important: Each intent can be matched to multiple fields if appropriate (e.g., both "first_name" and "last_name" could map to different aspects of a name-related intent).

Example:
Form fields: ["full_name", "email", "favorite_color"]
Memory items: [
  {"intent": "legal_name", "value": "John Doe", "type": "text"},
  {"intent": "contact_email", "value": "john@example.com", "type": "text"}
]
Result: {
  "full_name": "legal_name",
  "email": "contact_email",
  "favorite_color": null
}"""

    user_prompt_text = f"""Form fields to match: {json.dumps(parsed_fields)}

Available memory items:
{json.dumps(items_info, indent=2)}

Available intents: {available_intents}

Return a JSON object mapping each field name to its best matching intent. Use exact intent names from the available intents list, or null if no intent matches well. Perform semantic matching - field names and intents might be worded differently but should have the same meaning."""

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
                    "name": "batch_intent_match",
                    "strict": True,
                    "schema": response_schema,
                    "description": "An object mapping each form field to its matched intent or null"
                }
            },
            temperature=0.1
        )

        result = json.loads(response.choices[0].message.content)

        # Create a mapping from intent to item for quick lookup
        intent_to_item = {item.intent: item for item in memory_items}

        # Convert intent names to MemoryItem objects
        field_matches = {}
        for field in parsed_fields:
            matched_intent = result.get(field)
            if matched_intent and matched_intent in intent_to_item:
                field_matches[field] = intent_to_item[matched_intent]
            else:
                field_matches[field] = None

        return field_matches

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to batch search intents with OpenAI: {str(e)}"
        )


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


async def batch_compose_values(
    field_matches: dict[str, Optional[MemoryItem]],
    user_prompts: Optional[dict[str, str]] = None,
    context: Optional[str] = None
) -> dict[str, str]:
    """
    Compose final values for multiple fields in parallel.

    Args:
        field_matches: Dictionary mapping field_name -> matched MemoryItem (from batch_search_intents)
        user_prompts: Optional dictionary of field-level user prompts {field_name: prompt}
        context: Short-term context provided by the form creator

    Returns:
        Dictionary mapping field_name -> final value (empty string if cannot resolve)
    """
    # Create tasks for parallel composition
    tasks = []
    fields = []

    for field, matched_item in field_matches.items():
        user_prompt = user_prompts.get(field) if user_prompts else None
        tasks.append(
            compose_value(
                matched_item=matched_item,
                user_prompt=user_prompt,
                context=context
            )
        )
        fields.append(field)

    # Execute all compose_value calls in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Build result dictionary, handling exceptions
    composed_values = {}
    for field, result in zip(fields, results):
        if isinstance(result, Exception):
            # Log error and return empty string
            print(f"Error composing value for field '{field}': {str(result)}")
            composed_values[field] = ""
        else:
            composed_values[field] = result or ""

    return composed_values


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
