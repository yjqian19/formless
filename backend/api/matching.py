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
        memory_items=memory_items
    )

    # Return in dict format: {field_name: value}
    return MatchingResponse(matched_fields={request.parsed_field: matched_value})


async def match_with_openai(
    parsed_field: str,
    memory_items: list
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
    # Response should be a string representing the matching intent name
    response_schema = {
        "type": "string",
        "enum": available_intents,
        "description": "The intent name that best matches the form field"
    }

    # Create prompt for semantic matching
    system_prompt = """You are a form field matching assistant. Your task is to semantically match a form field name with a memory item intent.

Given a form field name and available memory items (each with an intent, value, and type), determine which intent best matches the field name through semantic understanding. The intent and field name might be expressed differently but have similar meaning.

Return the intent name (as a string) that best matches the field. The intent must be one of the available intents. If no intent matches well, return the most relevant one from the available intents.

Example:
Form field: "full_name"
Memory items: [
  {"intent": "legal_name", "value": "John Doe", "type": "text"},
  {"intent": "contact_email", "value": "john@example.com", "type": "text"}
]
Result: "legal_name"
"""

    user_prompt = f"""Form field to match: "{parsed_field}"

Available memory items:
{json.dumps(items_info, indent=2)}

Available intents: {available_intents}

Return the intent name (as a string) that best matches this field. Use exact intent name from the available intents list. Perform semantic matching - the field name and intent might be worded differently but should have the same meaning."""

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
                    "description": "The intent name that matches the form field"
                }
            },
            temperature=0.1
        )

        matched_intent = json.loads(response.choices[0].message.content)

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
            # Generate content from prompt
            return await generate_from_prompt(item.value)
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
