from pydantic import BaseModel
from typing import Literal


class MemoryItemCreate(BaseModel):
    """Memory item for creation (without id)."""
    intent: str
    value: str
    type: Literal["text", "prompt"]


class MemoryItem(BaseModel):
    """Memory item with id (returned from API)."""
    id: str
    intent: str
    value: str
    type: Literal["text", "prompt"]


class MatchingRequest(BaseModel):
    parsed_fields: list[str]  # List of form field names to match
    memory_intents: list[str] | None = None  # List of intent names to match, None means all
    user_prompts: dict[str, str] | None = None  # Optional: field-level user prompts {field_name: prompt}
    context: str | None = None  # Short-term context (e.g., company introduction, page content)


class MatchingResponse(BaseModel):
    matched_fields: dict[str, str]  # field_name -> value
