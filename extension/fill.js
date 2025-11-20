// Import API functions (api.js must be loaded before fill.js in manifest.json)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofill') {
    handleAutofill(message, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleAutofill(message, sendResponse) {
  // Popup sends fieldIds (currently only supports single field)
  const fieldIds = message.fieldIds || [];
  const memoryIntents = message.memoryIntents || null; // List of intent names, or null for all
  const userPrompt = message.userPrompt || null;
  const context = message.context || null;

  if (fieldIds.length === 0) {
    sendResponse({ success: false, error: 'No fields selected' });
    return;
  }

  // Currently only support single field
  if (fieldIds.length > 1) {
    console.warn('Multiple fields selected, but only single field is supported. Using first field.');
  }

  const fieldId = fieldIds[0];
  const field = document.getElementById(fieldId);

  if (!field) {
    sendResponse({ success: false, error: `Field ${fieldId} not found in DOM` });
    return;
  }

  try {
    // Get parsed field name from field (use label, placeholder, or field id)
    const parsedField = getParsedFieldName(field);

    // Call backend matching API
    const result = await matchField(parsedField, memoryIntents, userPrompt, context);

    // Fill the field with matched value
    // Backend returns {matched_fields: {parsed_field: value}}
    if (result.matched_fields && Object.keys(result.matched_fields).length > 0) {
      // Get the first (and only) value from matched_fields
      const matchedValue = Object.values(result.matched_fields)[0];

      // Only fill if value is not empty (empty string means no match)
      if (matchedValue && matchedValue.trim() !== '') {
        field.value = matchedValue;

        // Show floating notification
        showNotification([fieldId], fieldId);

        sendResponse({ success: true });
      } else {
        // No match found (none case) - silently return success, don't show error
        console.log('No match found for this field (none case)');
        sendResponse({ success: true });
      }
    } else {
      // No matched_fields in response - silently return success
      console.log('No matched_fields in API response');
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Error during autofill:', error);
    sendResponse({ success: false, error: error.message || 'Unknown error' });
  }
}

/**
 * Get all form fields from the page
 */
function handleGetAllFields(sendResponse) {
  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, select');
  const fields = [];

  inputs.forEach(input => {
    if (input.id) {
      // Try to find associated label
      let label = null;
      const labelElement = document.querySelector(`label[for="${input.id}"]`);
      if (labelElement && labelElement.textContent) {
        label = labelElement.textContent.trim();
      } else if (input.placeholder) {
        label = input.placeholder.trim();
      } else if (input.getAttribute('aria-label')) {
        label = input.getAttribute('aria-label').trim();
      }

      fields.push({
        id: input.id,
        label: label || input.id
      });
    }
  });

  sendResponse({ fields: fields });
}

/**
 * Get parsed field name from DOM element
 * Tries to get label, placeholder, or falls back to field id
 */
function getParsedFieldName(field) {
  // Try to find associated label
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label && label.textContent) {
      return label.textContent.trim();
    }
  }

  // Try placeholder
  if (field.placeholder) {
    return field.placeholder.trim();
  }

  // Try aria-label
  if (field.getAttribute('aria-label')) {
    return field.getAttribute('aria-label').trim();
  }

  // Fall back to field id
  return field.id || 'unknown_field';
}

function showNotification(fieldIds, fieldId) {
  let notification = document.getElementById('formless-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'formless-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #000;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 11px;
      z-index: 10000;
      border: 1px solid #333;
    `;
    document.body.appendChild(notification);
  }
  notification.textContent = `Filled: ${fieldId}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}
