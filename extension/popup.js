// Store selected memory intents (from backend)
let selectedMemoryIntents = [];

// Store all available memory items from backend
let availableMemories = [];

// Store selected field ID (single field only)
let selectedFieldId = null;

// Memory mode: 'all' or 'custom'
let memoryMode = 'all';

/**
 * Load memories from backend and display them
 */
async function loadMemoriesFromBackend() {
  try {
    availableMemories = await getAllMemories();
    renderMemoryCheckboxes();
  } catch (error) {
    console.error('Failed to load memories:', error);
    const memoryBox = document.getElementById('memoryFromHub');
    if (memoryBox) {
      memoryBox.innerHTML = `<div style="color: #999; font-size: 12px; padding: 10px;">Failed to load memories. Please check backend connection.</div>`;
    }
  }
}

/**
 * Render memory checkboxes based on available memories
 */
function renderMemoryCheckboxes() {
  const memoryBox = document.getElementById('memoryFromHub');
  if (!memoryBox) return;

  if (availableMemories.length === 0) {
    memoryBox.innerHTML = '<div style="color: #999; font-size: 12px; padding: 10px;">No memories available</div>';
    return;
  }

  // Clear existing content
  memoryBox.innerHTML = '';

  // Create checkboxes for each memory item (display intent)
  availableMemories.forEach(memory => {
    const label = document.createElement('label');
    label.className = 'memory-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = memory.intent;
    checkbox.addEventListener('change', updateSelectedMemoryIntents);

    const span = document.createElement('span');
    span.textContent = memory.intent;

    label.appendChild(checkbox);
    label.appendChild(span);
    memoryBox.appendChild(label);
  });

  // If custom mode, restore previously selected intents
  if (memoryMode === 'custom') {
    // Restore selections from selectedMemoryIntents
    document.querySelectorAll('#memoryFromHub input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = selectedMemoryIntents.includes(checkbox.value);
    });
  } else {
    // All mode: select all
    selectedMemoryIntents = availableMemories.map(m => m.intent);
    document.querySelectorAll('#memoryFromHub input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = true;
    });
  }

  updateAutoFillButtonState();
}

/**
 * Update selected memory intents based on checked checkboxes
 */
function updateSelectedMemoryIntents() {
  selectedMemoryIntents = [];
  document.querySelectorAll('#memoryFromHub input[type="checkbox"]:checked').forEach(checkbox => {
    selectedMemoryIntents.push(checkbox.value);
  });

  updateAutoFillButtonState();
}

// Load selected field from storage and update select display
function loadSelectedFieldFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['selectedFieldId'], (result) => {
      selectedFieldId = result.selectedFieldId || null;
      updateFieldSelectDisplay();
      updateAutoFillButtonState();
      resolve();
    });
  });
}

// Update field select display to show current selected field
function updateFieldSelectDisplay() {
  const fieldSelect = document.getElementById('fieldSelect');
  if (!fieldSelect) return;

  if (selectedFieldId) {
    // Show selected field
    fieldSelect.textContent = selectedFieldId;
    fieldSelect.classList.remove('empty');
  } else {
    // Show placeholder
    fieldSelect.textContent = 'Select a field...';
    fieldSelect.classList.add('empty');
  }
}

// Handle field select click - enable field picker
document.getElementById('fieldSelect').addEventListener('click', async () => {
  // Always enable field picker when clicking on field select
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: 'enableFieldPicker' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error enabling field picker:', chrome.runtime.lastError);
        alert('Cannot enable field picker. Please refresh the page and try again.\n\nError: ' + chrome.runtime.lastError.message);
      } else {
        console.log('Field picker enabled successfully');
      }
    });
  }
});

function updateAutoFillButtonState() {
  const autoFillBtn = document.getElementById('autoFill');
  const hasMemories = selectedMemoryIntents.length > 0;
  const hasField = selectedFieldId !== null && selectedFieldId !== '';

  // Need both memories and a field selected
  autoFillBtn.disabled = !(hasMemories && hasField);
}

// Auto fill with selected memory intents and field ID
document.getElementById('autoFill').addEventListener('click', async () => {
  const autoFillBtn = document.getElementById('autoFill');

  if (!selectedFieldId) {
    return;
  }

  if (selectedMemoryIntents.length === 0) {
    return;
  }

  // Get page context from textarea
  const pageContext = document.getElementById('pageContext').value.trim() || null;

  // Set loading state
  autoFillBtn.disabled = true;
  autoFillBtn.classList.add('loading');
  autoFillBtn.textContent = 'Filling...';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Use selected memory intents
  const memoryIntents = selectedMemoryIntents.length > 0 ? selectedMemoryIntents : null;

  // Send message and wait for response
  chrome.tabs.sendMessage(tab.id, {
    action: 'autofill',
    memoryIntents: memoryIntents,
    fieldIds: [selectedFieldId],
    userPrompt: null,
    context: pageContext
  }, (response) => {
    // Reset button state after completion
    autoFillBtn.disabled = false;
    autoFillBtn.classList.remove('loading');
    autoFillBtn.textContent = 'Auto Fill';

    // Only show error for actual errors, not for "no match" (none case)
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
      alert('Error: ' + chrome.runtime.lastError.message);
    } else if (response && !response.success && response.error) {
      console.error('Autofill failed:', response.error);
      alert('Autofill failed: ' + response.error);
    }
  });
});

// Memory mode toggle
document.getElementById('modeAllMemories').addEventListener('click', () => {
  memoryMode = 'all';
  updateMemoryModeUI();
});

document.getElementById('modeCustomMemories').addEventListener('click', () => {
  memoryMode = 'custom';
  updateMemoryModeUI();
});

function updateMemoryModeUI() {
  const allBtn = document.getElementById('modeAllMemories');
  const customBtn = document.getElementById('modeCustomMemories');
  const memoryBox = document.getElementById('memoryFromHub');

  if (memoryMode === 'all') {
    allBtn.classList.add('active');
    customBtn.classList.remove('active');
    memoryBox.style.display = 'none';

    // Select all memories
    selectedMemoryIntents = availableMemories.map(m => m.intent);
  } else {
    allBtn.classList.remove('active');
    customBtn.classList.add('active');
    memoryBox.style.display = 'block';

    // Keep current selections
  }

  updateAutoFillButtonState();
}

// Listen for field selection from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fieldSelected') {
    // Reload from storage to get the latest state
    loadSelectedFieldFromStorage();
    sendResponse({ success: true });
    return true;
  }
  return false;
});

// Listen for storage changes to update UI in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.selectedFieldId) {
    selectedFieldId = changes.selectedFieldId.newValue || null;
    updateFieldSelectDisplay();
    updateAutoFillButtonState();
  }
});

// Open Memory Hub page
document.getElementById('manageMemories').addEventListener('click', () => {
  const memoryHubPath = 'file:///Volumes/yjbolt/projects/formless/frontend/memory-hub.html';
  chrome.tabs.create({ url: memoryHubPath });
});

// Initialize on popup open
loadSelectedFieldFromStorage();
loadMemoriesFromBackend().then(() => {
  updateMemoryModeUI(); // Set initial memory mode UI
});
updateAutoFillButtonState();
