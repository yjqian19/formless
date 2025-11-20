import os
import json
from fastapi import APIRouter, HTTPException
from openai import OpenAI

from schema import MatchingRequest, MatchingResponse
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
    2. Use AI to semantically match the field with item intents
    3. For matched item:
       - If type is "text": return value directly
       - If type is "prompt": generate content from prompt
    """
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

    # Use OpenAI to semantically match the field with items
    matched_value = await match_with_openai(
        parsed_field=request.parsed_field,
        memory_items=memory_items,
        user_prompt=request.user_prompt,
        context=request.context
    )

    # Return in dict format: {field_name: value}
    return MatchingResponse(matched_fields={request.parsed_field: matched_value})


async def match_with_openai(
    parsed_field: str,
    memory_items: list,
    user_prompt: str | None = None,
    context: str | None = None
) -> str:
    """
    Use OpenAI to semantically match a single form field with memory item intents.

    Args:
        parsed_field: Form field name to match
        memory_items: List of memory items (each has intent, value, type)

    Returns:
        Matched value (text value or generated content from prompt)
    """
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )

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
    # Response should be an object with an "intent" field (OpenAI requires object type)
    response_schema = {
        "type": "object",
        "properties": {
            "intent": {
                "type": "string",
                "enum": available_intents,
                "description": "The intent name that best matches the form field"
            }
        },
        "required": ["intent"],
        "additionalProperties": False
    }

    # Create prompt for semantic matching
    system_prompt = """You are a form field matching assistant. Your task is to semantically match a form field name with a memory item intent.

Given a form field name and available memory items (each with an intent, value, and type), determine which intent best matches the field name through semantic understanding. The intent and field name might be expressed differently but have similar meaning.

Return a JSON object with an "intent" field containing the intent name that best matches the field. The intent must be one of the available intents. If no intent matches well, return the most relevant one from the available intents.

Example:
Form field: "full_name"
Memory items: [
  {"intent": "legal_name", "value": "John Doe", "type": "text"},
  {"intent": "contact_email", "value": "john@example.com", "type": "text"}
]
Result: {"intent": "legal_name"}
"""

    user_prompt = f"""Form field to match: "{parsed_field}"

Available memory items:
{json.dumps(items_info, indent=2)}

Available intents: {available_intents}

Return a JSON object with an "intent" field containing the intent name that best matches this field. Use exact intent name from the available intents list. Perform semantic matching - the field name and intent might be worded differently but should have the same meaning."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "intent_match",
                    "strict": True,
                    "schema": response_schema,
                    "description": "An object containing the intent name that matches the form field"
                }
            },
            temperature=0.1
        )

        result = json.loads(response.choices[0].message.content)
        matched_intent = result.get("intent")

        if not matched_intent:
            raise HTTPException(
                status_code=500,
                detail="AI response missing 'intent' field"
            )

        # Create a mapping from intent to item for quick lookup
        intent_to_item = {item.intent: item for item in memory_items}

        if matched_intent not in intent_to_item:
            raise HTTPException(
                status_code=500,
                detail=f"Matched intent '{matched_intent}' not found in memory items"
            )

        item = intent_to_item[matched_intent]

        if item.type == "text":
            # Direct text value - return as is
            return item.value
        elif item.type == "prompt":
            # Generate content from prompt, incorporating user_prompt and context
            return await generate_from_prompt(
                prompt_template=item.value,
                user_prompt=user_prompt,
                context=context
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Unknown item type: {item.type}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to match field with OpenAI: {str(e)}"
        )


async def generate_from_prompt(
    prompt_template: str,
    user_prompt: str | None = None,
    context: str | None = None
) -> str:
    """
    Generate content from a prompt template, incorporating user_prompt and context.

    Two modes:
    1. If user_prompt is provided: Use user_prompt as primary input, enrich with context and template
    2. If user_prompt is None: Use prompt_template with context substitution

    Args:
        prompt_template: The prompt template from memory (may contain placeholders like {company name})
        user_prompt: User-provided prompt/outline (for Inline Edit scenarios)
        context: Short-term context (e.g., company introduction, page content)

    Returns:
        Generated content
    """
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )

    # Build the generation prompt
    if user_prompt:
        # Way 2: Inline Edit - user provides framework/outline as primary input
        messages_content = f"""Based on the following outline/framework, generate a complete, professional response:

User's outline/framework:
{user_prompt}

"""
        if context:
            messages_content += f"""Additional context to incorporate:
{context}

"""
        if prompt_template:
            messages_content += f"""Reference template (for style/structure guidance):
{prompt_template}

"""
        messages_content += """Generate a complete response based on the user's outline, incorporating the context information, and following the style/structure suggested by the template if provided."""
    else:
        # Way 1: Use prompt template with context substitution
        messages_content = prompt_template

        if context:
            messages_content += f"""

Additional context:
{context}

Please incorporate this context into your response and replace any placeholders (like {{company name}} or {{company_name}}) with appropriate information from the context provided above."""

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

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
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
            detail=f"Failed to generate content from prompt: {str(e)}"
        )
