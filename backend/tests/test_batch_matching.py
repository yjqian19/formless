import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.matching import match_form_fields
from schema import MatchingRequest


async def test_batch_single_field():
    """
    Test Case 1: Batch matching with a single field (baseline test)
    """
    print("=" * 60)
    print("Test 1: Batch Matching - Single Field")
    print("=" * 60)

    request = MatchingRequest(
        parsed_fields=["LinkedIn Profile"],
        memory_intents=None
    )

    print("\nTesting fields:", request.parsed_fields)
    print("-" * 40)

    try:
        response = await match_form_fields(request)
        print("✅ Success!")
        for field, value in response.matched_fields.items():
            print(f"  {field}: {value}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def test_batch_multiple_fields():
    """
    Test Case 2: Batch matching with multiple simple fields
    """
    print("\n" + "=" * 60)
    print("Test 2: Batch Matching - Multiple Simple Fields")
    print("=" * 60)

    request = MatchingRequest(
        parsed_fields=[
            "full_name",
            "email_address",
            "linkedin_url",
            "github_portfolio"
        ],
        memory_intents=None
    )

    print("\nTesting fields:", request.parsed_fields)
    print("-" * 40)

    try:
        response = await match_form_fields(request)
        print("✅ Success!")
        for field, value in response.matched_fields.items():
            print(f"  {field}: {value}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def test_batch_mixed_types():
    """
    Test Case 3: Batch matching with mixed field types (text + prompt)
    """
    print("\n" + "=" * 60)
    print("Test 3: Batch Matching - Mixed Types (Text + Prompt)")
    print("=" * 60)

    context = """About Acme Corp:
We're an innovative tech company focused on AI and machine learning.
We value fast iteration, technical excellence, and product thinking."""

    request = MatchingRequest(
        parsed_fields=[
            "Your Name",
            "Email",
            "Why do you want to join our company?",
            "What's your proudest project?"
        ],
        memory_intents=None,
        context=context
    )

    print("\nTesting fields:", request.parsed_fields)
    print(f"Context: {context[:100]}...")
    print("-" * 40)

    try:
        response = await match_form_fields(request)
        print("✅ Success!")
        for field, value in response.matched_fields.items():
            print(f"\n  Field: {field}")
            if len(value) > 100:
                print(f"  Value: {value[:100]}...")
            else:
                print(f"  Value: {value}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def test_batch_with_field_level_prompts():
    """
    Test Case 4: Batch matching with field-level user prompts
    """
    print("\n" + "=" * 60)
    print("Test 4: Batch Matching - Field-Level User Prompts")
    print("=" * 60)

    context = """About Formless:
We're building an AI form-filling assistant to automate repetitive tasks."""

    request = MatchingRequest(
        parsed_fields=[
            "Name",
            "Email",
            "Why Formless?",
            "Your background"
        ],
        memory_intents=None,
        user_prompts={
            "Why Formless?": "Focus on: 1) mission alignment, 2) technical challenge, 3) team culture",
            "Your background": "Mention startup experience and AI expertise"
        },
        context=context
    )

    print("\nTesting fields:", request.parsed_fields)
    print(f"User prompts provided for: {list(request.user_prompts.keys())}")
    print(f"Context: {context[:80]}...")
    print("-" * 40)

    try:
        response = await match_form_fields(request)
        print("✅ Success!")
        for field, value in response.matched_fields.items():
            print(f"\n  Field: {field}")
            if len(value) > 150:
                print(f"  Value: {value[:150]}...")
            else:
                print(f"  Value: {value}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def test_batch_some_no_match():
    """
    Test Case 5: Batch matching where some fields don't match any intent
    """
    print("\n" + "=" * 60)
    print("Test 5: Batch Matching - Some Fields With No Match")
    print("=" * 60)

    request = MatchingRequest(
        parsed_fields=[
            "Your Name",
            "Favorite Color",  # Should not match
            "Email",
            "Spirit Animal",  # Should not match
            "LinkedIn"
        ],
        memory_intents=None
    )

    print("\nTesting fields:", request.parsed_fields)
    print("Expected: 'Favorite Color' and 'Spirit Animal' should return empty strings")
    print("-" * 40)

    try:
        response = await match_form_fields(request)
        print("✅ Success!")
        for field, value in response.matched_fields.items():
            if value == "":
                print(f"  {field}: '' (no match) ✓")
            else:
                print(f"  {field}: {value}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def test_batch_large_form():
    """
    Test Case 6: Batch matching with a larger form (10+ fields)
    This simulates a realistic job application form
    """
    print("\n" + "=" * 60)
    print("Test 6: Batch Matching - Large Form (Job Application)")
    print("=" * 60)

    request = MatchingRequest(
        parsed_fields=[
            "Full Name",
            "Email Address",
            "LinkedIn Profile URL",
            "GitHub/Portfolio Link",
            "Current Company/Affiliation",
            "Dietary Restrictions",
            "Why do you want to work here?",
            "Tell us about your proudest project",
            "What's your biggest weakness?",  # No match
            "When can you start?",  # No match
        ],
        memory_intents=None,
        context="We're Formless, an AI startup building form automation tools."
    )

    print(f"\nTesting {len(request.parsed_fields)} fields")
    print("Fields:", request.parsed_fields)
    print("-" * 40)

    try:
        response = await match_form_fields(request)
        print("✅ Success!")
        print(f"\nMatched {len(response.matched_fields)} fields:")
        for field, value in response.matched_fields.items():
            print(f"\n  📝 {field}")
            if value == "":
                print(f"     → (no match)")
            elif len(value) > 80:
                print(f"     → {value[:80]}...")
            else:
                print(f"     → {value}")
    except Exception as e:
        print(f"❌ Error: {e}")


async def run_all_tests():
    """Run all batch matching tests."""
    await test_batch_single_field()
    await test_batch_multiple_fields()
    await test_batch_mixed_types()
    await test_batch_with_field_level_prompts()
    await test_batch_some_no_match()
    await test_batch_large_form()

    print("\n" + "=" * 60)
    print("All batch matching tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    # Check if OPENAI_API_KEY is set
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set")
        print("Set it with: export OPENAI_API_KEY=your_key")
        print()
        sys.exit(1)

    asyncio.run(run_all_tests())
