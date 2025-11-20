import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.matching import match_form_fields
from schema import MatchingRequest


async def test_01_simple_fill():
    """
    Test Case 1: Simple Fill - Your LinkedIn Profile
    This tests direct text value matching without any prompt generation.
    """
    print("=" * 60)
    print("Test 1: Simple Fill - LinkedIn Profile")
    print("=" * 60)

    field_name = "LinkedIn Profile"
    request = MatchingRequest(
        parsed_field=field_name,
        memory_intents=None  # Use all memory items
    )

    print(f"\nTesting field: '{field_name}'")
    print("-" * 40)

    try:
        response = await match_form_fields(request)
        print("✅ Success!")
        for field, value in response.matched_fields.items():
            print(f"  Field: {field}")
            print(f"  Value: {value}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def test_02_inconsistent_phrasing():
    """
    Test Case 2: Inconsistent Question Phrasing
    This tests semantic matching with different question phrasings for the same intent.
    """
    print("\n" + "=" * 60)
    print("Test 2: Inconsistent Question Phrasing - Proudest Project")
    print("=" * 60)

    # Test with three different question phrasings (from SAMPLE_CASES.md)
    test_cases = [
        "What's your coolest project?",
        "What's your proudest project?",
        "Please describe a project that you built that you are most proud of.",
    ]

    for i, field_name in enumerate(test_cases, 1):
        request = MatchingRequest(
            parsed_field=field_name,
            memory_intents=None  # Use all memory items
        )

        print(f"\nTest 2.{i}: '{field_name}'")
        print("-" * 40)

        try:
            response = await match_form_fields(request)
            print("✅ Success!")
            for field, value in response.matched_fields.items():
                print(f"  Field: {field}")
                print(f"  Value: {value[:100]}..." if len(value) > 100 else f"  Value: {value}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_03_why_join_company():
    """
    Test Case 3: Short-term Customed Prompt and Context + Inline Edit
    This tests prompt template with context (Way 1) and Inline Edit (Way 2).
    Uses Formless as the company name (currently hiring).
    """
    print("\n" + "=" * 60)
    print("Test 3: Why Join Company - Formless (Currently Hiring)")
    print("=" * 60)

    # Formless company context (short-term context)
    formless_context = """About Formless:
We're building Formless, an AI-powered form filling assistant that helps users automate repetitive form submissions. Our mission is to bring AI into real workflows to create business value and reduce friction in everyday tasks.

We're a small, product-minded team that values:
- Deep work and technical excellence
- Fast iteration and shipping with care
- Ownership and end-to-end responsibility
- Clear communication and transparency

We're currently hiring and looking for talented engineers who are passionate about AI, product development, and creating tools that make people's lives easier."""

    field_name = "Why do you want to work at Formless?"

    # Way 1: Using existing memory (prompt template) + user input context
    print("\n--- Way 1: Using Prompt Template + Context ---")
    request = MatchingRequest(
        parsed_field=field_name,
        memory_intents=None,
        user_prompt=None,  # No user prompt - use template
        context=formless_context
    )

    print(f"\nTest 3.1: Why do you want to work at Formless?")
    print(f"Context: {formless_context[:150]}...")
    print("-" * 40)

    try:
        response = await match_form_fields(request)
        print("✅ Success!")
        for field, value in response.matched_fields.items():
            print(f"  Field: {field}")
            print(f"  Value: {value}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Way 2: Using Inline Edit (user provides framework, AI generates)
    print("\n--- Way 2: Using Inline Edit (User Framework) ---")
    user_framework = "Reason 1: mission alignment - AI in workflows, Reason 2: technical fit - hands-on coding, startup experience, Reason 3: team/culture - energetic team, learning opportunity"

    request = MatchingRequest(
        parsed_field=field_name,
        memory_intents=None,
        user_prompt=user_framework,  # User provides framework
        context=formless_context
    )

    print(f"\nTest 3.2: With user framework")
    print(f"User Framework: {user_framework}")
    print(f"Context: {formless_context[:150]}...")
    print("-" * 40)

    try:
        response = await match_form_fields(request)
        print("✅ Success!")
        for field, value in response.matched_fields.items():
            print(f"  Field: {field}")
            print(f"  Value: {value}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def run_all_tests():
    """Run all test cases."""
    await test_01_simple_fill()
    await test_02_inconsistent_phrasing()
    await test_03_why_join_company()


if __name__ == "__main__":
    # Check if OPENAI_API_KEY is set
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set")
        print("Set it with: export OPENAI_API_KEY=your_key")
        print()

    asyncio.run(run_all_tests())
