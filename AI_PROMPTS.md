# AI Prompts for Formless Project

This document contains prompts for Claude Code to perform various tasks in the Formless project.

---

## 1. Extract Beneficiary Section from I-129 PDF

### Task
Extract form field information from the I-129 PDF template and generate a structured JSON file containing only the Beneficiary section fields.

### Prompt

```
Please help me extract form field information from the I-129 PDF template:

1. Read the file: @i-129_template.pdf
2. Reference the format structure from: @ref_template_I-129.json
3. Extract ONLY the "Beneficiary_Information" section fields
4. For each field, include:
   - key: Field identifier (use dot notation like "Beneficiary.FieldName")
   - type: Field type (TEXT, NUMBER, DATE, BOOLEAN, SELECT_ONE, SELECT_MANY, or SIGNATURE)
   - options: Array of valid options (for SELECT types) or null
   - description: Clear description of what the field represents
   - pdfFieldName: The actual PDF form field name/code, e.g. Pt2Line3_Gender or form1[0].#subform[0].Line7b_StreetNumberName[0]

5. Output the result as a JSON file following this structure:
{
  "name": "I-129",
  "description": "Petition for Nonimmigrant Worker - Beneficiary Information",
  "sections": [
    {
      "name": "Beneficiary_Information",
      "fields": [
        // ... extracted fields here
      ]
    }
  ]
}

6. Save the output file to: output/extract_01.json
```

### Expected Output
- File: `output/i-129_beneficiary_extracted.json`
- Format: JSON matching the reference template structure
- Content: Complete Beneficiary_Information section with all relevant fields

### Notes
- Ensure all field types match the FormTemplateFieldTypes enum
- Use descriptive field keys with clear hierarchy
- Include accurate PDF field names for form filling integration

---

## Template for Future Prompts

### [Prompt Name]

**Task:** Brief description

**Prompt:**
```
[Detailed prompt text]
```

**Expected Output:**
- Description of expected results

**Notes:**
- Additional context or requirements
