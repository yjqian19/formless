# Form Parsing Implementation

This document describes how Formless identifies, extracts information from, and fills form fields across different form types.

## Table of Contents

- [Standard HTML Forms](#standard-html-forms)
- [Google Forms](#google-forms)
- [Architecture](#architecture)
- [Comparison](#comparison)

---

## Standard HTML Forms

### 1. Field Detection

**Selector Strategy:**
```javascript
document.querySelectorAll(
  'input[type="text"], ' +
  'input[type="email"], ' +
  'input[type="password"], ' +
  'input[type="tel"], ' +
  'input[type="url"], ' +
  'textarea, ' +
  'select'
);
```

**Requirements:**
- Field must have an `id` attribute
- Field must be visible (`offsetParent !== null`)
- Field must not be inside formless popup

### 2. Field Name Extraction

**Priority Order:**

1. **Associated Label** - Most reliable
   ```html
   <label for="username">Username</label>
   <input id="username" type="text" />
   ```
   ```javascript
   const label = document.querySelector(`label[for="${field.id}"]`);
   return label.textContent.trim(); // "Username"
   ```

2. **Placeholder Attribute**
   ```html
   <input type="text" placeholder="Enter your name" />
   ```
   ```javascript
   return field.placeholder.trim(); // "Enter your name"
   ```

3. **ARIA Label**
   ```html
   <input type="text" aria-label="Full Name" />
   ```
   ```javascript
   return field.getAttribute('aria-label').trim(); // "Full Name"
   ```

4. **Field ID** - Fallback
   ```javascript
   return field.id || 'unknown_field';
   ```

### 3. Field Filling

**Standard Approach:**
```javascript
field.value = matchedValue;
field.dispatchEvent(new Event('input', { bubbles: true }));
field.dispatchEvent(new Event('change', { bubbles: true }));
```

**Events Triggered:**
- `input` - For frameworks like React, Vue
- `change` - For native form validation

---

## Google Forms

### 1. Form Detection

**URL Pattern:**
```javascript
isGoogleForm() {
  return window.location.hostname === 'docs.google.com'
    && window.location.pathname.includes('/forms/d/');
}
```

### 2. Field Detection

**DOM Structure:**
Google Forms uses a nested component structure instead of standard HTML forms:

```html
<div data-params="[[847375956, ...]]" role="listitem">
  <div role="heading">What is your name?</div>
  <input type="text" aria-label="Your answer" />
</div>
```

**Detection Strategy:**
```javascript
// Step 1: Find all question containers
const questionContainers = document.querySelectorAll('[data-params*="[["]');

// Step 2: Find input/textarea inside each container
questionContainers.forEach(container => {
  const input = container.querySelector('input[type="text"], textarea');
  // Process input...
});
```

**Supported Question Types:**
- **Short answer**: `<input type="text">`
- **Paragraph**: `<textarea>`

### 3. Field ID Generation

Google Forms inputs typically don't have `id` attributes, so we generate them:

**Strategy 1 - Extract Entry ID from data-params:**
```javascript
const container = field.closest('[data-params]');
const match = container.dataset.params.match(/\[\[(\d+)/);
// data-params="[[847375956,...]]" → "formless-gform-entry-847375956"
```

**Strategy 2 - Use aria-label:**
```javascript
const sanitized = ariaLabel.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
return `formless-gform-${sanitized}-${Date.now()}`;
```

**Strategy 3 - Random ID (fallback):**
```javascript
return `formless-gform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### 4. Field Name Extraction

**Priority Order:**

1. **Role Heading** - Most accurate ✅
   ```html
   <div role="heading">What previous project would you like to share?</div>
   ```
   ```javascript
   const container = field.closest('[data-params]');
   const heading = container.querySelector('[role="heading"]');
   return heading.textContent.trim(); // "What previous project..."
   ```

2. **ARIA Label** - Usually generic ⚠️
   ```html
   <input aria-label="Your answer" />
   ```
   Note: Usually just "Your answer" - not useful for field identification

3. **Placeholder** - Fallback
   ```javascript
   return field.placeholder || 'Unknown Question';
   ```

### 5. Field Filling

Google Forms requires a specific event sequence:

```javascript
fillField(field, value) {
  field.value = value;
  field.focus();  // 1. Focus field first

  // 2. Trigger input event (with composed flag for Shadow DOM)
  field.dispatchEvent(new Event('input', {
    bubbles: true,
    composed: true
  }));

  // 3. Trigger change event
  field.dispatchEvent(new Event('change', { bubbles: true }));

  // 4. Blur to confirm
  field.blur();
}
```

**Why this sequence?**
- `focus()` - Activates field in Google's framework
- `composed: true` - Penetrates Shadow DOM boundaries
- `blur()` - Triggers validation and confirmation

---

## Architecture

### File Structure

```
extension/
├── googleFormsAdapter.js    # Google Forms specific logic
├── fill.js                  # Core filling logic
├── inlineButton.js          # Button injection
└── inlinePopupUI.js         # Popup interface
```

### Adapter Pattern

**googleFormsAdapter.js** provides a unified interface:

```javascript
const GoogleFormsAdapter = {
  isGoogleForm()      // Detect if current page is Google Forms
  getAllFields()      // Get all fillable fields
  generateFieldId()   // Generate unique ID for field
  getFieldName()      // Extract question text
  fillField()         // Fill field with value
};
```

### Integration Points

**1. Field Scanning (inlineButton.js):**
```javascript
if (GoogleFormsAdapter.isGoogleForm()) {
  fields = GoogleFormsAdapter.getAllFields();
} else {
  fields = document.querySelectorAll('input[type="text"], ...');
}
```

**2. Name Extraction (fill.js, inlinePopupUI.js):**
```javascript
function getParsedFieldName(field) {
  if (GoogleFormsAdapter.isGoogleForm()) {
    return GoogleFormsAdapter.getFieldName(field);
  }
  // Standard form logic...
}
```

**3. Field Filling (fill.js, inlinePopupUI.js):**
```javascript
if (GoogleFormsAdapter.isGoogleForm()) {
  GoogleFormsAdapter.fillField(field, value);
} else {
  field.value = value;
  // Standard events...
}
```

---

## Comparison

### Field Detection

| Aspect | Standard Forms | Google Forms |
|--------|----------------|--------------|
| **Selector** | Direct element query | Container-based search |
| **Key Elements** | `input`, `textarea`, `select` | `[data-params]` containers |
| **ID Requirement** | Must have native `id` | Generate from entry ID |
| **Visibility Check** | `offsetParent !== null` | Same |

### Field Identification

| Aspect | Standard Forms | Google Forms |
|--------|----------------|--------------|
| **Primary Source** | `<label for="...">` | `role="heading"` |
| **Secondary Source** | `placeholder` attribute | `aria-label` (generic) |
| **Tertiary Source** | `aria-label` | `placeholder` |
| **Fallback** | Field `id` | "Unknown Question" |

### Field Filling

| Aspect | Standard Forms | Google Forms |
|--------|----------------|--------------|
| **Value Assignment** | `field.value = value` | Same |
| **Events** | `input`, `change` | `focus` → `input` → `change` → `blur` |
| **Event Options** | `{ bubbles: true }` | `{ bubbles: true, composed: true }` |
| **Special Handling** | None | Focus/blur sequence required |

### Workflow

**Standard Forms:**
```
Scan page
  ↓
Find input elements by type
  ↓
Check if has ID
  ↓
Extract name from label/placeholder
  ↓
Fill with standard events
```

**Google Forms:**
```
Detect Google Forms URL
  ↓
Find question containers [data-params]
  ↓
Find input/textarea in each container
  ↓
Generate unique ID
  ↓
Extract name from role="heading"
  ↓
Fill with special event sequence
```

---

## Key Takeaways

### Design Principles

1. **Separation of Concerns** - Google Forms logic isolated in adapter
2. **Conditional Execution** - Special logic only runs on Google Forms
3. **Graceful Degradation** - Fallback strategies at each step
4. **Non-Invasive** - Standard form functionality unaffected

### Critical Differences

1. **Google Forms uses role="heading" for question text**, not labels
2. **Google Forms aria-label is generic ("Your answer")**, not useful for identification
3. **Google Forms requires focus/blur sequence** for proper filling
4. **Google Forms uses data-params for entry IDs**, not standard name attributes

### Future Extensions

To support additional Google Forms question types:

- **Multiple Choice**: `input[type="radio"]` within containers
- **Checkboxes**: `input[type="checkbox"]` with multiple selections
- **Dropdown**: Custom select components or native `<select>`
- **Date/Time**: Special date picker components
- **File Upload**: File input handling

All extensions can be added to `googleFormsAdapter.js` without modifying core logic.
