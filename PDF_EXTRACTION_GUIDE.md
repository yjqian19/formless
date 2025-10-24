# PDF Form Field Extraction Guide

## Quick Reference for I-129 and Similar USCIS Forms

This guide provides a reusable process for extracting form fields from PDF templates (like I-129) and converting them into structured JSON format.

**Supports:**
- ✅ Single section extraction
- ✅ Multiple sections extraction at once
- ✅ Automatic section discovery
- ✅ Field type detection and mapping

---

## Quick Start Guide

| Task | Jump to Section |
|------|----------------|
| Extract ONE section | [Single Section Extraction](#single-section-extraction) |
| Extract MULTIPLE sections | [Multiple Sections Extraction](#multiple-sections-extraction) |
| Find available sections first | [Discover Section Patterns](#helper-discover-section-patterns) |
| Understand field types | [Step 7: Determine Field Types](#step-7-determine-field-types) |
| Complete workflow | Follow Steps 1-8 in order |

---

## Step 1: Install Required Libraries

```bash
pip3 install pypdf pdfplumber
```

---

## Step 2: Understand the PDF Structure

### Extract Text to Identify Sections

```python
import pdfplumber

pdf = pdfplumber.open("path/to/form.pdf")

# Find which pages contain your target section
for i, page in enumerate(pdf.pages[:10]):
    text = page.extract_text()
    if 'Part 3' in text or 'Beneficiary' in text:
        print(f"PAGE {i+1} contains target section")
        print(text[:1500])  # Preview content
```

**Key Insight**: I-129 uses "Part 3" for Beneficiary Information, not "Part 2"

---

## Step 3: Extract All Form Fields

```python
from pypdf import PdfReader

reader = PdfReader("path/to/form.pdf")
fields = reader.get_fields()

print(f"Total fields in PDF: {len(fields)}")
```

---

## Step 4: Identify Target Section Fields

### Method 1: Search by Subform Number (Recommended)

```python
# I-129 structure: subform[0]=Part 1, subform[1]=Part 2, subform[2]=Part 3, etc.
target_fields = {}
for field_name, field_data in fields.items():
    if 'subform[2]' in field_name:  # Adjust subform number for your target section
        target_fields[field_name] = field_data
```

### Method 2: Search by Field Name Pattern

```python
# Look for patterns like 'Part3', 'P3', etc.
target_fields = {}
for field_name, field_data in fields.items():
    if 'Part3' in field_name or 'P3' in field_name:
        target_fields[field_name] = field_data
```

### Method 3: Multiple Sections at Once

```python
# Extract multiple sections using multiple patterns
section_patterns = {
    "Petitioner_Information": "subform[0]",
    "Petition_Information": "subform[1]",
    "Beneficiary_Information": "subform[2]"
}

sections = {}
for section_name, pattern in section_patterns.items():
    sections[section_name] = {
        name: data for name, data in fields.items()
        if pattern in name
    }

# Now you have all sections organized
for section_name, section_fields in sections.items():
    print(f"{section_name}: {len(section_fields)} fields")
```

---

## Step 5: Decode Field Types

```python
for field_name, field_data in target_fields.items():
    field_type = field_data.get('/FT', 'Unknown')

    # Map PDF types to your JSON types
    if field_type == '/Tx':
        json_type = 'TEXT'
    elif field_type == '/Btn':
        json_type = 'BOOLEAN'  # or 'SELECT_ONE' for radio buttons
    elif field_type == '/Ch':
        json_type = 'SELECT_ONE'  # or 'SELECT_MANY'

    # Extract options for select/radio fields
    options = field_data.get('/Opt', None)

    print(f"{field_name}: {json_type}")
    if options:
        print(f"  Options: {options}")
```

---

## Step 6: Map PDF Fields to Human-Readable Keys

Create structured keys using dot notation:

```python
field_mapping = {
    "form1[0].#subform[1].Part3_Line2_FamilyName[0]": {
        "key": "Beneficiary.Name.Family",
        "description": "Beneficiary's family name (last name)"
    },
    # Add more mappings...
}
```

**Naming Convention:**
- `Section.Subsection.FieldName`
- Example: `Beneficiary.USAddress.City`

---

## Step 7: Determine Field Types

| PDF Type | JSON Type | Notes |
|----------|-----------|-------|
| `/Tx` | TEXT | Text input fields |
| `/Tx` with date pattern | DATE | Fields like "DateOfBirth" |
| `/Tx` with number pattern | NUMBER | Fields like "SSN", "AlienNumber" |
| `/Btn` (single) | BOOLEAN | Checkboxes |
| `/Btn` (group) | SELECT_ONE | Radio buttons (mutually exclusive) |
| `/Ch` | SELECT_ONE or SELECT_MANY | Dropdowns or multi-select |

---

## Step 8: Create JSON Output

### Single Section Output

```python
import json

output = {
    "name": "I-129",
    "description": "Form section description",
    "sections": [
        {
            "name": "Section_Name",
            "fields": [
                {
                    "key": "Section.Field",
                    "type": "TEXT",
                    "options": None,
                    "description": "Field description",
                    "pdfFieldName": "form1[0].#subform[2].FieldName[0]"
                }
                # More fields...
            ]
        }
    ]
}

with open("output/extract.json", "w") as f:
    json.dump(output, f, indent=2)
```

### Multiple Sections Output

```python
# Extract multiple sections at once
output = {
    "name": "I-129",
    "description": "Petition for Nonimmigrant Worker",
    "sections": [
        {
            "name": "Petitioner_Information",
            "fields": petitioner_fields  # List of field objects
        },
        {
            "name": "Petition_Information",
            "fields": petition_fields
        },
        {
            "name": "Beneficiary_Information",
            "fields": beneficiary_fields
        }
        # Add more sections as needed
    ]
}
```

---

## Common I-129 PDF Patterns

### Field Naming Patterns
- `form1[0].#subform[N]` - N is the subform/section number
- `Part3_Line2_FamilyName[0]` - Part number, line number, field name
- `P3Line1_Checkbox[0]` - Abbreviated part number

### Subform Structure (I-129)

**Important: Fields may be spread across multiple subforms!**

Common I-129 subform mappings:
- `subform[0]` = Part 1 (Petitioner Information)
- `subform[1]` = Part 2 (Petition Information) + some Part 3 fields
- `subform[2]` = Part 3 (Beneficiary Information) - Main section
- `subform[25]` = Part 3 (Beneficiary Foreign Address)
- `subform[33]` = Part 3 (Classification checkboxes)
- Continue incrementing for additional parts

**Pro Tip:** Use the `discover_sections()` helper function to find all subforms before extraction!

### Common Field Groupings
- **Name fields**: FamilyName, GivenName, MiddleName
- **Address fields**: StreetNumber, Unit, City, State, ZipCode
- **Date fields**: DateOfBirth, DateOfArrival, ExpirationDate
- **ID fields**: SSN, AlienNumber, PassportNumber

---

## Tips and Tricks

1. **Always preview the PDF text first** to understand section naming
2. **Check multiple subforms** - fields may be spread across different subforms
3. **Use `discover_sections()` first** - identify all subforms before extraction
4. **Extract options from select fields** using `/Opt` key
5. **Group related fields** (e.g., all address fields together)
6. **Use consistent key naming** with dot notation
7. **Verify field counts** by comparing with PDF visual inspection
8. **For sections spread across subforms** - use multiple patterns:
   ```python
   # Example: Part 3 fields are in subform[1], [2], [25], [33]
   part3_patterns = ['subform[1]', 'subform[2]', 'subform[25]', 'subform[33]']
   part3_fields = {}
   for pattern in part3_patterns:
       for name, data in fields.items():
           if pattern in name and ('Part3' in name or 'P3' in name):
               part3_fields[name] = data
   ```

---

## Example: Complete Extraction Scripts

### Single Section Extraction

```python
from pypdf import PdfReader
import json
import os

def extract_single_section(pdf_path, target_pattern, section_name, output_path):
    """Extract a single section from PDF form"""
    reader = PdfReader(pdf_path)
    fields = reader.get_fields()

    # Filter for target section fields
    section_fields = {name: data for name, data in fields.items()
                      if target_pattern in name}

    # Build JSON structure (customize mapping as needed)
    output_fields = []
    for field_name, field_data in sorted(section_fields.items()):
        field_type = field_data.get('/FT', 'Unknown')
        options = field_data.get('/Opt', None)

        output_fields.append({
            "key": f"{section_name}.FieldName",  # Customize key mapping
            "type": "TEXT",  # Determine based on field_type
            "options": options,
            "description": "Add description",
            "pdfFieldName": field_name
        })

    output = {
        "name": "I-129",
        "description": f"Form section: {section_name}",
        "sections": [{"name": section_name, "fields": output_fields}]
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"✓ Extracted {len(output_fields)} fields to {output_path}")

# Usage
extract_single_section(
    "i-129_template.pdf",
    "subform[2]",
    "Beneficiary_Information",
    "output/extract_01.json"
)
```

### Multiple Sections Extraction

```python
from pypdf import PdfReader
import json
import os

def extract_multiple_sections(pdf_path, section_configs, output_path):
    """
    Extract multiple sections from PDF form at once

    section_configs: List of dicts with 'pattern', 'name', 'key_prefix'
    Example:
    [
        {"pattern": "subform[0]", "name": "Petitioner_Information", "key_prefix": "Petitioner"},
        {"pattern": "subform[1]", "name": "Petition_Information", "key_prefix": "Petition"},
        {"pattern": "subform[2]", "name": "Beneficiary_Information", "key_prefix": "Beneficiary"}
    ]
    """
    reader = PdfReader(pdf_path)
    all_fields = reader.get_fields()

    sections = []

    for config in section_configs:
        pattern = config["pattern"]
        section_name = config["name"]
        key_prefix = config.get("key_prefix", section_name)

        # Filter fields for this section
        section_fields = {name: data for name, data in all_fields.items()
                         if pattern in name}

        # Build field list
        fields_list = []
        for field_name, field_data in sorted(section_fields.items()):
            field_type = field_data.get('/FT', 'Unknown')
            options = field_data.get('/Opt', None)

            fields_list.append({
                "key": f"{key_prefix}.FieldName",  # Customize as needed
                "type": "TEXT",  # Map based on field_type
                "options": options,
                "description": "Add description",
                "pdfFieldName": field_name
            })

        sections.append({
            "name": section_name,
            "fields": fields_list
        })

        print(f"✓ Section '{section_name}': {len(fields_list)} fields")

    # Create output structure
    output = {
        "name": "I-129",
        "description": "Petition for Nonimmigrant Worker - Multiple Sections",
        "sections": sections
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    total_fields = sum(len(s["fields"]) for s in sections)
    print(f"\n✓ Total: {len(sections)} sections, {total_fields} fields")
    print(f"✓ Saved to: {output_path}")

# Usage Example
section_configs = [
    {"pattern": "subform[0]", "name": "Petitioner_Information", "key_prefix": "Petitioner"},
    {"pattern": "subform[1]", "name": "Petition_Information", "key_prefix": "Petition"},
    {"pattern": "subform[2]", "name": "Beneficiary_Information", "key_prefix": "Beneficiary"}
]

extract_multiple_sections(
    "i-129_template.pdf",
    section_configs,
    "output/i129_full_extract.json"
)
```

### Helper: Discover Section Patterns

```python
def discover_sections(pdf_path):
    """Helper to discover all subform patterns in PDF"""
    reader = PdfReader(pdf_path)
    fields = reader.get_fields()

    # Extract unique subform patterns
    subforms = set()
    for field_name in fields.keys():
        if 'subform[' in field_name:
            # Extract subform[N] pattern
            import re
            match = re.search(r'subform\[(\d+)\]', field_name)
            if match:
                subforms.add(int(match.group(1)))

    print(f"Found {len(subforms)} subforms in PDF:")
    for num in sorted(subforms):
        # Count fields in this subform
        count = sum(1 for name in fields.keys() if f'subform[{num}]' in name)
        print(f"  subform[{num}]: {count} fields")

    return sorted(subforms)

# Usage: Discover sections before extraction
discover_sections("i-129_template.pdf")
```

---

## Troubleshooting

### Issue: No fields found
- Check if PDF has fillable form fields using `reader.get_fields()`
- Some PDFs are images only and require OCR

### Issue: Wrong section fields
- Use `pdfplumber` to read page text and find correct section
- Check multiple subform indices

### Issue: Options not extracting
- Verify field is type `/Ch` (Choice)
- Options stored in `/Opt` key of field data

### Issue: Field names are cryptic
- Cross-reference with PDF visual layout
- Use page text extraction to map field positions
