# Memory Hub Frontend

A simple, vanilla HTML + JavaScript implementation of the Memory Hub interface for Formless.

## Features

- ✅ **View all memories** - Fetches and displays all memory items from the backend
- ✅ **Create new memories** - Add new memory items with intent, value, and type
- ✅ **Edit memories** - Update existing memory items inline
- ✅ **Delete memories** - Remove memory items with confirmation
- ✅ **Error handling** - Displays user-friendly error messages
- ✅ **Loading states** - Shows loading indicator while fetching data
- ✅ **Empty state** - Helpful message when no memories exist

## Setup

1. **Start the backend server** (from the project root):
```bash
cd backend
uvicorn main:app --reload
# Or: python main.py
```

The backend will run on `http://localhost:8000`

2. **Open the HTML file**:
   - Simply open `memory-hub.html` in your browser
   - Or serve it with a simple HTTP server:
   ```bash
   # Python 3
   python -m http.server 3000

   # Then navigate to: http://localhost:3000/memory-hub.html
   ```

3. **Configure API URL** (if needed):
   - The API URL is configured in the script section: `const API_BASE_URL = 'http://localhost:8000/api/memories';`
   - Update this if your backend runs on a different host/port

## Usage

- **View memories**: Memories are automatically loaded when the page opens
- **Add memory**: Click "+ Add New Memory", fill in the form, and click "Create"
- **Edit memory**: Click "Edit" on any memory item, make changes, and click "Save"
- **Delete memory**: Click "Delete" on any memory item and confirm

## Data Structure

Each memory item has:
- `id`: Unique identifier (UUID)
- `intent`: The intent name (e.g., "linkedin profile", "why join company")
- `value`: The value or prompt text
- `type`: Either "text" or "prompt"

## Technical Details

- **No build step required** - Just open the HTML file
- **Vanilla JavaScript** - No frameworks or dependencies
- **Fetch API** - Modern browser API for HTTP requests
- **CORS enabled** - Backend allows all origins (configure for production)

## Browser Compatibility

Works in all modern browsers that support:
- Fetch API
- ES6+ JavaScript features
- CSS Grid and Flexbox
