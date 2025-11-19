# Formless Backend

FastAPI backend service for Formless, using JSON file storage.

## Setup

This project uses `uv` for dependency management. Make sure you have `uv` installed.

## Installation

Dependencies are automatically managed by `uv`. The virtual environment is created at `.venv/`.

## Running the Server

```bash
# Using uv
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or directly
uv run python main.py
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Memories

- `GET /api/memories` - Get all memory items
- `POST /api/memories` - Create a new memory item
- `GET /api/memories/{item_id}` - Get a specific memory item
- `PUT /api/memories/{item_id}` - Update a memory item
- `DELETE /api/memories/{item_id}` - Delete a memory item

### Matching

- `POST /api/matching` - Match form fields with memory data

## Data Structure

Memory items are stored as a simple list. Each item has:
- `id`: Unique identifier (UUID)
- `intent`: Intent name (e.g., "legal_name", "contact_email")
- `value`: The value to fill (text or prompt)
- `type`: Either "text" or "prompt"

## Data Storage

Memory data is stored in `data/memories.json`. The storage layer uses thread-safe operations to ensure data consistency.
