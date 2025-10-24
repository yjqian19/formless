# I-129 Form Section Mapping Reference

Quick reference for I-129 PDF structure and subform mappings.

## Discovered Subforms

Total subforms discovered: 34+ subforms (0-33+)

## Key Section Mappings

### Part 1: Petitioner Information
**Subforms:** `subform[0]`
- Company/Organization details
- Petitioner name
- Tax number
- Address information

### Part 2: Petition Information
**Subforms:** `subform[1]`
- Classification symbol
- Basis for classification (checkboxes)
- Requested action
- Receipt number
- Total number of workers

### Part 3: Beneficiary Information (MAIN)
**Subforms:** `subform[1]`, `subform[2]`, `subform[25]`, `subform[33]`

Fields are **spread across multiple subforms**:

#### `subform[1]` - Part 3 Name (Initial)
- `Part3_Line2_FamilyName[0]`
- `Part3_Line2_GivenName[0]`
- `Part3_Line2_MiddleName[0]`
- `P3Line1_Checkbox[0]` and `[1]` - Multiple beneficiaries checkbox

#### `subform[2]` - Part 3 Main Fields
- **Basic Info:**
  - Date of birth
  - Gender (checkboxes)
  - SSN
  - Alien Number
  - Country of birth
  - Country of citizenship

- **Other Names** (3 sets):
  - Line3_FamilyName1/2/3
  - Line3_GivenName1/2/3
  - Line3_MiddleName1/2/3

- **US Address:**
  - Line8a_StreetNumberName
  - Line6_Unit (checkboxes: Apt/Ste/Flr)
  - Line6_AptSteFlrNumber
  - Line8d_CityTown
  - Line8e_State (dropdown)
  - Line8f_ZipCode

- **Arrival Info:**
  - Part3Line5_DateofArrival
  - Part3Line5_ArrivalDeparture (I-94 number)

- **Passport:**
  - Part3Line5_PassportorTravDoc
  - Line11e_ExpDate[0] - Date issued
  - Line11e_ExpDate[1] - Date expires
  - Line_CountryOfIssuance

- **Status:**
  - Line11g_CurrentNon (dropdown - current status)
  - Line11h_DateStatusExpires
  - Line5_SEVIS
  - Line5_EAD

#### `subform[25]` - Part 3 Foreign Address
- `Part3Line2_StreetName[0]`
- `Part3Line2_City[0]`
- `Part3Line2_State[0]` (dropdown)
- `Part3Line2_Province[0]`
- `Part3Line2_PostalCode[0]`
- `Part3Line2_Country[0]`

#### `subform[33]` - Part 3 Classification Checkboxes
- `i_P3[0]` - P3 classification
- `j_P3S[0]` - P3S classification

### Part 4: Processing Information
**Subforms:** `subform[3]` (estimated)
- Office type
- Foreign address for notification
- Additional processing questions

## Extraction Strategy

### Single Section Extraction

For **Part 3 Beneficiary Information**, you need to combine multiple subforms:

```python
part3_patterns = [
    'subform[1]',  # Initial name
    'subform[2]',  # Main fields
    'subform[25]', # Foreign address
    'subform[33]'  # Classification
]

# AND filter by field name containing 'Part3' or 'P3'
```

### Multiple Section Extraction

```python
section_configs = [
    {
        "patterns": ["subform[0]"],
        "name": "Petitioner_Information",
        "key_prefix": "Petitioner"
    },
    {
        "patterns": ["subform[1]"],
        "name": "Petition_Information",
        "key_prefix": "Petition",
        "exclude_patterns": ["Part3", "P3"]  # Exclude Part 3 fields
    },
    {
        "patterns": ["subform[1]", "subform[2]", "subform[25]", "subform[33]"],
        "name": "Beneficiary_Information",
        "key_prefix": "Beneficiary",
        "include_patterns": ["Part3", "P3"]  # Only Part 3 fields
    }
]
```

## Field Counts

Based on extraction of Part 3:
- **Total Part 3 fields identified:** 55+ fields
- **Manually mapped for JSON:** 40 fields (consolidated and cleaned)

### Field Breakdown:
- Name: 3 fields
- Other names: 9 fields (3 sets)
- Basic info: 5 fields
- US Address: 6 fields
- Foreign Address: 6 fields
- Arrival: 2 fields
- Passport: 4 fields
- Status: 4 fields

## Common Patterns

### Field Naming
- `form1[0].#subform[N].FieldName[0]`
- Part number often in field name: `Part3_Line2_FamilyName`
- Abbreviated versions: `P3Line1_Checkbox`
- Line numbers indicate visual order on form

### Checkbox Groups
Multiple checkboxes with same base name but different indices:
```
Line6_Unit[0] = "Apt."
Line6_Unit[1] = "Ste."
Line6_Unit[2] = "Flr."
```

### Dropdown Fields
Type: `/Ch`, includes `/Opt` array:
- State dropdowns: 59 options (all US states/territories)
- Current status dropdown: 150+ visa types

## Discovery Commands

Use these to explore the PDF:

```python
# Find all subforms
python3 -c "
from pypdf import PdfReader
import re
reader = PdfReader('i-129_template.pdf')
fields = reader.get_fields()
subforms = set()
for name in fields.keys():
    match = re.search(r'subform\[(\d+)\]', name)
    if match:
        subforms.add(int(match.group(1)))
print(f'Subforms: {sorted(subforms)}')
"

# Count fields per section
python3 -c "
from pypdf import PdfReader
reader = PdfReader('i-129_template.pdf')
fields = reader.get_fields()
for i in range(5):
    count = sum(1 for name in fields.keys() if f'subform[{i}]' in name)
    print(f'subform[{i}]: {count} fields')
"
```

## Notes

1. **Part numbering is NOT 1:1 with subform numbers**
   - Part 3 ≠ subform[3]
   - Part 3 actually uses subforms [1, 2, 25, 33]

2. **Always use text extraction first** to identify which part you need

3. **Field names may contain part numbers** - use this for filtering

4. **Some subforms are for supplemental pages** (supplements, attachments)

5. **Total PDF fields:** 1111 fields across all sections
