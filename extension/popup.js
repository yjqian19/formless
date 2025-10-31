// Store selected memory names
let selectedMemoryNames = ['basic_info', 'why_join'];

// Store selected field IDs (only used in custom mode)
let selectedFieldIds = [];
let fieldMode = 'all'; // 'all' or 'custom'
// Predefined field IDs for 'all' mode
const ALL_FIELDS = ['full_name', 'email', 'why_join'];

// Handle checkbox changes
document.querySelectorAll('#memorySelection input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', updateSelectedMemoryNames);
});

function updateSelectedMemoryNames() {
  selectedMemoryNames = [];
  document.querySelectorAll('#memorySelection input[type="checkbox"]:checked').forEach(checkbox => {
    selectedMemoryNames.push(checkbox.value);
  });

  updateAutoFillButtonState();
}

// Field mode switching
document.getElementById('modeAllFields').addEventListener('click', () => {
  fieldMode = 'all';
  updateFieldModeUI();
  updateSelectedFieldsDisplay();
  updateAutoFillButtonState();

  // Disable field picker mode in content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'disableFieldPicker' });
  });
});

document.getElementById('modeCustomFields').addEventListener('click', () => {
  fieldMode = 'custom';
  // Don't reset - load from storage instead
  loadSelectedFieldsFromStorage();
  updateFieldModeUI();
  updateSelectedFieldsDisplay();
  updateAutoFillButtonState();

  // Make sure field picker is disabled initially
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'disableFieldPicker' });
    }
  });
});

// Add field button click handler
document.getElementById('addFieldBtn').addEventListener('click', () => {
  // Enable field picker when add button is clicked
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      console.log('Enabling field picker via add button');
      chrome.tabs.sendMessage(tabs[0].id, { action: 'enableFieldPicker' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error enabling field picker:', chrome.runtime.lastError);
          alert('Error enabling field picker. Please refresh the page and try again.');
        } else {
          console.log('Field picker enabled successfully:', response);
          // Hide add button and show picker mode indicator
          document.getElementById('addFieldBtn').style.display = 'none';
          document.getElementById('fieldPickerMode').style.display = 'block';
        }
      });
    }
  });
});

// Load selected fields from storage
function loadSelectedFieldsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['selectedFieldIds'], (result) => {
      selectedFieldIds = result.selectedFieldIds || [];
      updateSelectedFieldsDisplay();
      updateAutoFillButtonState();
      resolve();
    });
  });
}

// Save selected fields to storage
function saveSelectedFieldsToStorage() {
  chrome.storage.local.set({ selectedFieldIds: selectedFieldIds });
}

function updateFieldModeUI() {
  const allBtn = document.getElementById('modeAllFields');
  const customBtn = document.getElementById('modeCustomFields');
  const pickerMode = document.getElementById('fieldPickerMode');
  const addFieldBtn = document.getElementById('addFieldBtn');

  if (fieldMode === 'all') {
    allBtn.classList.add('active');
    customBtn.classList.remove('active');
    pickerMode.style.display = 'none';
    addFieldBtn.style.display = 'none';
    updateSelectedFieldsDisplay();
    updateAutoFillButtonState();
  } else {
    allBtn.classList.remove('active');
    customBtn.classList.add('active');
    // Show add button if no fields selected, otherwise hide it
    if (selectedFieldIds.length === 0) {
      addFieldBtn.style.display = 'flex';
      pickerMode.style.display = 'none';
    } else {
      addFieldBtn.style.display = 'none';
      pickerMode.style.display = 'none'; // Hide picker mode indicator when fields are selected
    }
    updateSelectedFieldsDisplay();
    updateAutoFillButtonState();
  }
}

function updateSelectedFieldsDisplay() {
  const display = document.getElementById('selectedFields');

  if (fieldMode === 'all') {
    display.textContent = `All Fields (${ALL_FIELDS.length} fields: ${ALL_FIELDS.join(', ')})`;
    display.classList.remove('empty');
  } else {
    if (selectedFieldIds.length === 0) {
      display.textContent = 'Custom Select (no fields selected)';
      display.classList.add('empty');
    } else {
      const fieldsHtml = selectedFieldIds.map(fieldId =>
        `<span class="selected-field-item">${fieldId}<span class="remove-btn" data-field-id="${fieldId}">×</span></span>`
      ).join('');
      display.innerHTML = `Custom Select (${selectedFieldIds.length} field${selectedFieldIds.length > 1 ? 's' : ''})<br>${fieldsHtml}`;
      display.classList.remove('empty');

      // Add remove button listeners
      display.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const fieldId = e.target.getAttribute('data-field-id');
          selectedFieldIds = selectedFieldIds.filter(id => id !== fieldId);
          saveSelectedFieldsToStorage();
          updateSelectedFieldsDisplay();
          updateAutoFillButtonState();
          updateFieldModeUI(); // Update UI to show add button if no fields left
        });
      });
    }
  }
}

function updateAutoFillButtonState() {
  const autoFillBtn = document.getElementById('autoFill');
  const hasMemories = selectedMemoryNames.length > 0;

  if (fieldMode === 'all') {
    // In 'all' mode, always enabled if memories are selected
    autoFillBtn.disabled = !hasMemories;
  } else {
    // In 'custom' mode, need to have selected fields
    const hasFields = selectedFieldIds.length > 0;
    autoFillBtn.disabled = !(hasMemories && hasFields);
  }
}

// Listen for field selection from content script (for real-time updates when popup is open)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Popup received message:', message);

  if (message.action === 'fieldSelected' && fieldMode === 'custom') {
    // Reload from storage to get the latest state
    loadSelectedFieldsFromStorage().then(() => {
      // Update UI to hide add button and picker mode indicator
      updateFieldModeUI();
    });
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'fieldPickerDisabled') {
    // Hide picker mode indicator when field picker is disabled
    document.getElementById('fieldPickerMode').style.display = 'none';
    // Show add button if no fields selected
    if (selectedFieldIds.length === 0) {
      document.getElementById('addFieldBtn').style.display = 'flex';
    }
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// Listen for storage changes to update UI in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.selectedFieldIds && fieldMode === 'custom') {
    selectedFieldIds = changes.selectedFieldIds.newValue || [];
    updateSelectedFieldsDisplay();
    updateAutoFillButtonState();
    updateFieldModeUI(); // Update UI to show/hide add button
  }
});

// Open Memory Hub page
document.getElementById('manageMemories').addEventListener('click', () => {
  const memoryHubPath = 'file:///Volumes/yjbolt/projects/formless/memory-hub.html';
  chrome.tabs.create({ url: memoryHubPath });
});

// Auto fill with selected memory names and field IDs
document.getElementById('autoFill').addEventListener('click', async () => {
  const autoFillBtn = document.getElementById('autoFill');

  // Determine which fields to fill based on mode
  let fieldIdsToFill = [];
  if (fieldMode === 'all') {
    fieldIdsToFill = ALL_FIELDS;
  } else {
    if (selectedFieldIds.length === 0) {
      return;
    }
    fieldIdsToFill = selectedFieldIds;
  }

  if (selectedMemoryNames.length === 0) {
    return;
  }

  // Set loading state
  autoFillBtn.disabled = true;
  autoFillBtn.classList.add('loading');
  autoFillBtn.textContent = '';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Send message and wait for response
  chrome.tabs.sendMessage(tab.id, {
    action: 'autofill',
    memoryNames: selectedMemoryNames,
    fieldIds: fieldIdsToFill
  }, () => {
    // Reset button state after completion
    autoFillBtn.disabled = false;
    autoFillBtn.classList.remove('loading');
    autoFillBtn.textContent = 'Auto Fill';
  });
});

// Initialize on popup open
loadSelectedFieldsFromStorage();
