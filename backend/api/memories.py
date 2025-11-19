from fastapi import APIRouter, HTTPException

from schema import MemoryItem, MemoryItemWithId
from storage import JSONStorage

router = APIRouter()
storage = JSONStorage()


@router.get("", response_model=list[MemoryItemWithId])
def get_all_memories():
    """Get all memory items."""
    return storage.get_all_items()


@router.post("", response_model=MemoryItemWithId)
def create_memory(item: MemoryItem):
    """Create a new memory item."""
    return storage.create_item(item)


@router.get("/{item_id}", response_model=MemoryItemWithId)
def get_memory(item_id: str):
    """Get a specific memory item."""
    item = storage.get_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Memory item '{item_id}' not found")
    return item


@router.put("/{item_id}", response_model=MemoryItemWithId)
def update_memory(item_id: str, item: MemoryItem):
    """Update a memory item."""
    updated_item = storage.update_item(item_id, item)
    if updated_item is None:
        raise HTTPException(status_code=404, detail=f"Memory item '{item_id}' not found")
    return updated_item


@router.delete("/{item_id}")
def delete_memory(item_id: str):
    """Delete a memory item."""
    success = storage.delete_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Memory item '{item_id}' not found")
    return {"message": f"Memory item '{item_id}' deleted successfully"}
