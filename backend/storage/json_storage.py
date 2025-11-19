import json
import uuid
from pathlib import Path
import threading

from schema import MemoryItem, MemoryItemWithId


class JSONStorage:
    """JSON-based storage for Memory items with thread-safe operations."""

    def __init__(self, data_dir: str = "data", filename: str = "memories.json"):
        self.data_dir = Path(data_dir)
        self.file_path = self.data_dir / filename
        self.lock = threading.Lock()

        # Ensure data directory exists
        self.data_dir.mkdir(exist_ok=True)

        # Initialize file if it doesn't exist
        if not self.file_path.exists():
            self._write_data({"items": []})

    def _read_data(self) -> dict:
        """Read data from JSON file."""
        with self.lock:
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                return {"items": []}

    def _write_data(self, data: dict):
        """Write data to JSON file atomically."""
        with self.lock:
            # Write to temporary file first, then rename (atomic operation)
            temp_path = self.file_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            # Atomic rename
            temp_path.replace(self.file_path)

    def get_all_items(self) -> list[MemoryItemWithId]:
        """Get all memory items."""
        data = self._read_data()
        return [MemoryItemWithId(**item) for item in data.get("items", [])]

    def get_item(self, item_id: str) -> MemoryItemWithId | None:
        """Get a specific memory item by ID."""
        items = self.get_all_items()
        for item in items:
            if item.id == item_id:
                return item
        return None

    def create_item(self, item: MemoryItem) -> MemoryItemWithId:
        """Create a new memory item."""
        data = self._read_data()

        item_with_id = MemoryItemWithId(
            id=str(uuid.uuid4()),
            **item.model_dump()
        )

        items = data.get("items", [])
        items.append(item_with_id.model_dump())
        data["items"] = items
        self._write_data(data)

        return item_with_id

    def update_item(self, item_id: str, item: MemoryItem) -> MemoryItemWithId | None:
        """Update a memory item."""
        data = self._read_data()

        items = data.get("items", [])
        for i, existing_item in enumerate(items):
            if existing_item["id"] == item_id:
                updated_item = MemoryItemWithId(id=item_id, **item.model_dump())
                items[i] = updated_item.model_dump()
                data["items"] = items
                self._write_data(data)
                return updated_item

        return None

    def delete_item(self, item_id: str) -> bool:
        """Delete a memory item."""
        data = self._read_data()

        items = data.get("items", [])
        original_length = len(items)
        data["items"] = [item for item in items if item["id"] != item_id]

        if len(data["items"]) < original_length:
            self._write_data(data)
            return True

        return False

    def get_items_by_intents(self, intents: list[str]) -> list[MemoryItemWithId]:
        """Get memory items by their intent names."""
        all_items = self.get_all_items()
        return [item for item in all_items if item.intent in intents]
