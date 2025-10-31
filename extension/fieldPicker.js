let fieldPickerEnabled = false;
let fieldListeners = new Map(); // Track which fields have listeners attached

// Add visual highlight to fields when picker is enabled
function enableFieldPicker() {
  console.log('enableFieldPicker() called');

  // First disable if already enabled
  if (fieldPickerEnabled) {
    disableFieldPicker();
  }

  fieldPickerEnabled = true;

  // Find all form fields on the page
  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, select');

  console.log('Enabling field picker, found', inputs.length, 'fields');

  if (inputs.length === 0) {
    console.warn('No form fields found on the page!');
    alert('No form fields found on this page. Make sure the form has fields with id attributes.');
    return;
  }

  inputs.forEach(input => {
    if (input.id) {
      const field = input;
      field.style.cursor = 'crosshair';
      field.style.outline = 'none';

      // Use capture phase to ensure we catch the event
      field.addEventListener('click', handleFieldClick, true);
      field.addEventListener('mouseenter', handleFieldMouseEnter, true);
      field.addEventListener('mouseleave', handleFieldMouseLeave, true);

      fieldListeners.set(field, {
        click: handleFieldClick,
        mouseenter: handleFieldMouseEnter,
        mouseleave: handleFieldMouseLeave
      });

      console.log('Added listener to field:', field.id);
    } else {
      console.warn('Field without ID found:', input);
    }
  });

  if (fieldListeners.size === 0) {
    console.warn('No fields with IDs found! Fields need to have id attributes.');
    alert('No fields with IDs found. Form fields must have id attributes to be selectable.');
  } else {
    showFieldPickerNotification();
  }
}

function disableFieldPicker() {
  fieldPickerEnabled = false;

  console.log('Disabling field picker, removing listeners from', fieldListeners.size, 'fields');

  // Remove listeners from all tracked fields
  fieldListeners.forEach((listeners, field) => {
    field.style.cursor = '';
    field.style.outline = '';
    field.style.boxShadow = '';
    field.removeEventListener('click', listeners.click, true);
    field.removeEventListener('mouseenter', listeners.mouseenter, true);
    field.removeEventListener('mouseleave', listeners.mouseleave, true);
  });

  fieldListeners.clear();
  hideFieldPickerNotification();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('fieldPicker.js received message:', message);

  if (message.action === 'enableFieldPicker') {
    console.log('Enabling field picker...');
    enableFieldPicker();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'disableFieldPicker') {
    console.log('Disabling field picker...');
    disableFieldPicker();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

function handleFieldClick(event) {
  if (!fieldPickerEnabled) return;

  // Prevent popup from closing when clicking on field during selection
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const field = event.target;
  const fieldId = field.id;

  console.log('Field clicked:', fieldId, field);

  if (fieldId) {
    // Save to storage instead of sending message to popup
    chrome.storage.local.get(['selectedFieldIds'], (result) => {
      const currentFields = result.selectedFieldIds || [];
      if (!currentFields.includes(fieldId)) {
        const updatedFields = [...currentFields, fieldId];
        chrome.storage.local.set({ selectedFieldIds: updatedFields }, () => {
          console.log('Field saved to storage:', fieldId, 'All fields:', updatedFields);

          // Notify popup if it's open (optional, but helps with real-time updates)
          chrome.runtime.sendMessage({
            action: 'fieldSelected',
            fieldId: fieldId
          }).catch(() => {
            // Popup might be closed, that's okay
          });

          // Auto-disable field picker after selecting a field
          console.log('Auto-disabling field picker after field selection');
          disableFieldPicker();

          // Send message to popup to notify that picker is disabled
          chrome.runtime.sendMessage({
            action: 'fieldPickerDisabled'
          }).catch(() => {
            // Popup might be closed, that's okay
          });
        });
      } else {
        // Field already selected, just disable picker
        console.log('Field already selected, disabling picker');
        disableFieldPicker();
      }
    });

    // Visual feedback
    field.style.boxShadow = '0 0 0 2px #4CAF50';
    setTimeout(() => {
      field.style.boxShadow = '';
    }, 500);
  } else {
    console.warn('Field clicked but has no ID:', field);
  }
}

function handleFieldMouseEnter(event) {
  if (!fieldPickerEnabled) return;
  event.target.style.boxShadow = '0 0 0 2px #2196F3';
}

function handleFieldMouseLeave(event) {
  if (!fieldPickerEnabled) return;
  event.target.style.boxShadow = '';
}

function showFieldPickerNotification() {
  let notification = document.getElementById('formless-field-picker-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'formless-field-picker-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2196F3;
      color: #fff;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      z-index: 10001;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      max-width: 300px;
    `;
    document.body.appendChild(notification);
  }
  notification.textContent = 'Field picker enabled: Click on form fields to add them';
}

function hideFieldPickerNotification() {
  const notification = document.getElementById('formless-field-picker-notification');
  if (notification) {
    notification.remove();
  }
}

// Initialize: Field picker is disabled by default
(function() {
  console.log('fieldPicker.js loaded - field picker is disabled by default');

  // Ensure field picker is disabled on page load
  disableFieldPicker();

  // Clear any stored enabled state
  chrome.storage.local.set({ fieldPickerEnabled: false });
})();
