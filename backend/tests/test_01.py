import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.matching import match_form_fields
from schema import MatchingRequest


async def test_01():
    """Test matching form fields with memory items."""
    # Modify this request as needed
    request = MatchingRequest(
        parsed_fields=["Why do you want to work at Baseten?"],
        memory_intents=None  # None means use all memory items
    )

    print(f"Testing with fields: {request.parsed_fields}")
    print(f"Using memory intents: {request.memory_intents or 'all'}")
    print("-" * 50)

    try:
        response = await match_form_fields(request)
        print("\n✅ Success!")
        print(f"\nMatched fields:")
        for field, value in response.matched_fields.items():
            print(f"  {field}:")
            print(f"    {value}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    # Check if OPENAI_API_KEY is set
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set")
        print("Set it with: export OPENAI_API_KEY=your_key")

    asyncio.run(test_01())
