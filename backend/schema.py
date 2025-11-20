from pydantic import BaseModel
from typing import Literal


class MemoryItem(BaseModel):
    intent: str
    value: str
    type: Literal["text", "prompt"]


class MemoryItemWithId(MemoryItem):
    id: str


class MatchingRequest(BaseModel):
    parsed_field: str  # Single form field name to match
    memory_intents: list[str] | None = None  # List of intent names to match, None means all
    user_prompt: str | None = None  # User-provided prompt/outline (for Inline Edit scenarios)
    context: str | None = None  # Short-term context (e.g., company introduction, page content)


class MatchingResponse(BaseModel):
    matched_fields: dict[str, str]  # field_name -> value
