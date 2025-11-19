import os
import json
from fastapi import APIRouter, HTTPException
from openai import OpenAI

from schema import MatchingRequest, MatchingResponse
from storage import JSONStorage

router = APIRouter()
storage = JSONStorage()

# Initialize OpenAI client (will be None if API key not set)
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None


@router.post("", response_model=MatchingResponse)
async def match_form_fields(request: MatchingRequest):
    """
    Match parsed form fields with memory data using OpenAI semantic matching.
    This is called by the Extension to get values for form fields.

    Process:
    1. Get memory items by their intents
    2. Use AI to semantically match each field with item intents
    3. For matched items:
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

    # Use OpenAI to semantically match fields with items
    matched_fields = await match_with_openai(
        parsed_fields=request.parsed_fields,
        memory_items=memory_items
    )

    return MatchingResponse(matched_fields=matched_fields)


async def match_with_openai(
    parsed_fields: list[str],
    memory_items: list
) -> dict[str, str]:
    """
    Use OpenAI to semantically match form fields with memory item intents.

    Args:
        parsed_fields: List of form field names to match
        memory_items: List of memory items (each has intent, value, type)

    Returns:
        Dictionary mapping field names to values (text values or generated content)
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
    # Response should be an object mapping field names (strings) to intent names (strings)
    response_schema = {
        "type": "object",
        "properties": {},
        "additionalProperties": {
            "type": "string",
            "enum": available_intents
        },
        "required": []
    }

    # Create prompt for semantic matching
    system_prompt = """You are a form field matching assistant. Your task is to semantically match form field names with memory item intents.

Given a list of form field names and available memory items (each with an intent, value, and type), determine which intent best matches each field name through semantic understanding. The intent and field name might be expressed differently but have similar meaning.

Return a JSON object mapping field names to intent names. If a field doesn't match any intent, omit it from the result. Each intent value must be one of the available intents.

Example:
Form fields: ["full_name", "email_address", "phone"]
Memory items: [
  {"intent": "legal_name", "value": "John Doe", "type": "text"},
  {"intent": "contact_email", "value": "john@example.com", "type": "text"},
  {"intent": "phone_number", "value": "123-456-7890", "type": "text"}
]
Result: {"full_name": "legal_name", "email_address": "contact_email", "phone": "phone_number"}
"""

    user_prompt = f"""Form fields to match: {parsed_fields}

Available memory items:
{json.dumps(items_info, indent=2)}

Available intents: {available_intents}

Return a JSON object mapping each form field to its best matching intent. Use exact intent names from the available intents list. Perform semantic matching - the field name and intent might be worded differently but should have the same meaning."""

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
                    "name": "field_intent_mapping",
                    "strict": True,
                    "schema": response_schema,
                    "description": "Maps form field names to memory item intents"
                }
            },
            temperature=0.1
        )

        field_to_intent = json.loads(response.choices[0].message.content)

        # Build matched_fields result
        matched_fields = {}

        # Create a mapping from intent to item for quick lookup
        intent_to_item = {item.intent: item for item in memory_items}

        for field_name, intent in field_to_intent.items():
            if intent not in intent_to_item:
                continue

            item = intent_to_item[intent]

            if item.type == "text":
                # Direct text value - return as is
                matched_fields[field_name] = item.value
            elif item.type == "prompt":
                # Generate content from prompt
                generated_value = await generate_from_prompt(item.value)
                matched_fields[field_name] = generated_value

        return matched_fields

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to match fields with OpenAI: {str(e)}"
        )


async def generate_from_prompt(prompt: str) -> str:
    """Generate content from a prompt using OpenAI."""
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
        )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate content from prompt: {str(e)}"
        )
