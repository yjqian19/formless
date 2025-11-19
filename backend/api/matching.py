from fastapi import APIRouter, HTTPException

from schema import MatchingRequest, MatchingResponse
from storage import JSONStorage

router = APIRouter()
storage = JSONStorage()


@router.post("", response_model=MatchingResponse)
def match_form_fields(request: MatchingRequest):
    """
    Match parsed form fields with memory data.
    This is called by the Extension to get values for form fields.
    """
    # Get memory items by their intents
    memory_items = storage.get_items_by_intents(request.memory_intents)

    if not memory_items:
        raise HTTPException(
            status_code=404,
            detail=f"None of the requested memory intents found: {request.memory_intents}"
        )

    # Create a mapping from intent to value
    intent_to_value = {item.intent: item.value for item in memory_items}

    # Match field names with memory intents
    matched_fields = {}

    for field_name in request.parsed_fields:
        # Try to find matching memory item by intent
        # Simple exact match - can be enhanced with fuzzy matching
        if field_name in intent_to_value:
            matched_fields[field_name] = intent_to_value[field_name]
        else:
            # Try case-insensitive match
            for intent, value in intent_to_value.items():
                if intent.lower() == field_name.lower():
                    matched_fields[field_name] = value
                    break

    return MatchingResponse(matched_fields=matched_fields)
