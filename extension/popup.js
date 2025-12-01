// Current state
let isEnabled = false;

/**
 * Load enabled state from storage
 */
function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['formlessEnabled'], (result) => {
      isEnabled = result.formlessEnabled || false;
      resolve(isEnabled);
    });
  });
}

/**
 * Save enabled state to storage
 */
function saveState(enabled) {
  isEnabled = enabled;
  chrome.storage.local.set({ formlessEnabled: enabled });
}

/**
 * Update UI based on current state
 */
function updateUI() {
  const toggle = document.getElementById('enableToggle');
  const pageFillSection = document.getElementById('pageFillSection');

  toggle.checked = isEnabled;
  pageFillSection.style.display = isEnabled ? 'block' : 'none';
}

/**
 * Enable inline buttons on current tab
 */
async function enableInlineButtons() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: 'enableInlineMode' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Formless] Error enabling inline mode:', chrome.runtime.lastError);
    } else {
      console.log('[Formless] Inline buttons enabled');
    }
  });
}

/**
 * Disable inline buttons on current tab
 */
async function disableInlineButtons() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: 'disableInlineMode' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Formless] Error disabling inline mode:', chrome.runtime.lastError);
    } else {
      console.log('[Formless] Inline buttons disabled');
    }
  });
}

/**
 * Handle toggle change
 */
document.getElementById('enableToggle').addEventListener('change', async (e) => {
  isEnabled = e.target.checked;
  saveState(isEnabled);
  updateUI();

  if (isEnabled) {
    await enableInlineButtons();
  } else {
    await disableInlineButtons();
  }
});

/**
 * Handle Page Fill button click
 */
document.getElementById('pageFillBtn').addEventListener('click', async () => {
  const button = document.getElementById('pageFillBtn');
  const context = document.getElementById('pageContext').value.trim() || null;

  // Set loading state
  button.disabled = true;
  button.classList.add('loading');
  const originalText = button.textContent;
  button.textContent = 'Filling...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab');
    }

    // Get all fields from page
    chrome.tabs.sendMessage(tab.id, { action: 'getPageFields' }, async (response) => {
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }

      const fields = response?.fields || [];

      if (fields.length === 0) {
        alert('No form fields found on this page');
        return;
      }

      console.log('[Formless] Found fields:', fields);

      // Extract parsed field names
      const parsedFields = fields.map(f => f.parsedName);

      // Call batch matching API
      const result = await matchFields(parsedFields, null, context);

      console.log('[Formless] Batch result:', result);

      // Send batch fill command to content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'batchFill',
        fieldMapping: fields,  // [{id, parsedName}]
        fieldValues: result.matched_fields  // {parsedName: value}
      }, (fillResponse) => {
        if (chrome.runtime.lastError) {
          console.error('[Formless] Fill error:', chrome.runtime.lastError);
        } else {
          console.log('[Formless] Batch fill completed:', fillResponse);
        }

        // Reset button state
        button.disabled = false;
        button.classList.remove('loading');
        button.textContent = originalText;
      });
    });
  } catch (error) {
    console.error('[Formless] Page fill error:', error);
    alert('Error: ' + error.message);

    // Reset button state
    button.disabled = false;
    button.classList.remove('loading');
    button.textContent = originalText;
  }
});

/**
 * Batch match fields (calls backend API)
 * This function is defined here since it's only used by popup
 */
async function matchFields(parsedFields, memoryIntents = null, context = null) {
  const url = 'http://localhost:8000/api/matching';

  const requestBody = {
    parsed_fields: parsedFields,
    memory_intents: memoryIntents,
    user_prompts: null,  // Page fill doesn't use prompts
    context: context
  };

  console.log('[Formless API] Batch request:', requestBody);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('[Formless API] Error response:', errorData);

      const errorMessage = typeof errorData.detail === 'string'
        ? errorData.detail
        : JSON.stringify(errorData.detail || `HTTP ${response.status}`);

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[Formless API] Response:', data);
    return data;
  } catch (error) {
    console.error('[Formless API] Error calling matching API:', error);
    throw error;
  }
}

// Initialize on popup open
loadState().then((enabled) => {
  updateUI();

  // Apply state to current tab
  if (enabled) {
    enableInlineButtons();
  }
});
