// Store current popup state
let currentPopup = null;
let currentFieldId = null;

// Store memories and selections
let availableMemories = [];
let selectedMemoryIntents = [];
let memoryMode = 'all';

/**
 * Show inline popup for a specific field
 */
async function showInlinePopup(field) {
  // Close existing popup if any
  closeInlinePopup();

  currentFieldId = field.id;

  // Load memories from backend
  await loadMemoriesForInlinePopup();

  // Create popup
  currentPopup = createPopupElement(field);
  document.body.appendChild(currentPopup);

  // Position popup
  positionPopup(currentPopup, field);

  console.log('[Formless] Inline popup opened for field:', field.id);
}

/**
 * Create popup element
 */
function createPopupElement(field) {
  const popup = document.createElement('div');
  popup.className = 'formless-inline-popup';

  // Get field name for display
  const fieldName = getParsedFieldName(field);

  popup.innerHTML = `
    <button class="formless-close-button" id="formless-inline-close" title="Close">&times;</button>

    <h1>Formless</h1>

    <div class="section-title">
      <span>Field</span>
    </div>
    <div class="field-display" title="${escapeHtml(fieldName)}">${escapeHtml(fieldName)}</div>

    <div class="section-title">
      <span>Add Prompt</span>
    </div>
    <textarea id="formless-inline-prompt" placeholder="Enter custom prompt or instructions..."></textarea>

    <div class="section-title">
      <span>Add Context</span>
    </div>
    <textarea id="formless-inline-context" placeholder="Paste additional context here..."></textarea>

    <div class="section-title">
      <span>Memory</span>
    </div>
    <div class="memory-mode-selector">
      <button id="formless-inline-mode-all" class="active">All</button>
      <button id="formless-inline-mode-custom">Custom</button>
    </div>
    <div class="memory-box" id="formless-inline-memory-box" style="display: none;">
      <div style="color: #999; font-size: 12px; padding: 10px;">Loading memories...</div>
    </div>

    <div class="button-group">
      <button id="formless-inline-cancel">Cancel</button>
      <button id="formless-inline-autofill" class="primary">Auto Fill</button>
    </div>
  `;

  // Attach event listeners
  attachPopupEventListeners(popup, field);

  // Render memories
  renderMemoriesInPopup(popup);

  return popup;
}

/**
 * Attach event listeners to popup elements
 */
function attachPopupEventListeners(popup, field) {
  // Close button (X)
  popup.querySelector('#formless-inline-close').addEventListener('click', closeInlinePopup);

  // Cancel button
  popup.querySelector('#formless-inline-cancel').addEventListener('click', closeInlinePopup);

  // Auto fill button
  popup.querySelector('#formless-inline-autofill').addEventListener('click', () => {
    handleAutoFill(popup, field);
  });

  // Memory mode buttons
  popup.querySelector('#formless-inline-mode-all').addEventListener('click', () => {
    setMemoryMode('all', popup);
  });

  popup.querySelector('#formless-inline-mode-custom').addEventListener('click', () => {
    setMemoryMode('custom', popup);
  });


  // ESC key to close
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeInlinePopup();
    }
  };
  document.addEventListener('keydown', escapeHandler);

  // Store handler for cleanup
  popup._escapeHandler = escapeHandler;
}

/**
 * Position popup on right side of screen
 */
function positionPopup(popup, field) {
  // Position popup on the right side of the screen
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Fixed to right side with some padding
  popup.style.top = `${scrollTop + 20}px`;
  popup.style.right = '20px';
  popup.style.left = 'auto'; // Clear any left positioning

  // Use fixed positioning for smoother behavior
  popup.style.position = 'fixed';
  popup.style.top = '20px';
  popup.style.right = '20px';
}

/**
 * Load memories from backend
 */
async function loadMemoriesForInlinePopup() {
  try {
    availableMemories = await getAllMemories();
    console.log('[Formless] Loaded memories:', availableMemories.length);
  } catch (error) {
    console.error('[Formless] Failed to load memories:', error);
    availableMemories = [];
  }
}

/**
 * Render memories in popup
 */
function renderMemoriesInPopup(popup) {
  const memoryBox = popup.querySelector('#formless-inline-memory-box');
  if (!memoryBox) return;

  if (availableMemories.length === 0) {
    memoryBox.innerHTML = '<div style="color: #999; font-size: 12px; padding: 10px;">No memories available</div>';
    return;
  }

  // Clear existing content
  memoryBox.innerHTML = '';

  // Create checkboxes for each memory
  availableMemories.forEach((memory, index) => {
    const label = document.createElement('label');
    label.className = 'memory-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = memory.intent;
    checkbox.id = `formless-inline-memory-${index}`;
    checkbox.addEventListener('change', () => updateSelectedMemories(popup));

    const span = document.createElement('span');
    span.textContent = memory.intent;

    label.appendChild(checkbox);
    label.appendChild(span);
    memoryBox.appendChild(label);
  });

  // Set initial selections based on mode
  updateMemorySelections(popup);
}

/**
 * Update selected memories based on checkboxes
 */
function updateSelectedMemories(popup) {
  selectedMemoryIntents = [];
  popup.querySelectorAll('#formless-inline-memory-box input[type="checkbox"]:checked').forEach(checkbox => {
    selectedMemoryIntents.push(checkbox.value);
  });
  console.log('[Formless] Selected memories:', selectedMemoryIntents);
}

/**
 * Set memory mode (all or custom)
 */
function setMemoryMode(mode, popup) {
  memoryMode = mode;

  const allBtn = popup.querySelector('#formless-inline-mode-all');
  const customBtn = popup.querySelector('#formless-inline-mode-custom');
  const memoryBox = popup.querySelector('#formless-inline-memory-box');

  if (mode === 'all') {
    allBtn.classList.add('active');
    customBtn.classList.remove('active');
    memoryBox.style.display = 'none';

    // Select all memories
    selectedMemoryIntents = availableMemories.map(m => m.intent);
  } else {
    allBtn.classList.remove('active');
    customBtn.classList.add('active');
    memoryBox.style.display = 'block';

    // Update selections in checkboxes
    updateMemorySelections(popup);
  }
}

/**
 * Update memory selections in checkboxes
 */
function updateMemorySelections(popup) {
  if (memoryMode === 'all') {
    // Check all
    popup.querySelectorAll('#formless-inline-memory-box input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = true;
    });
    selectedMemoryIntents = availableMemories.map(m => m.intent);
  } else {
    // Use current selections
    updateSelectedMemories(popup);
  }
}

/**
 * Handle auto fill button click
 */
async function handleAutoFill(popup, field) {
  const autoFillBtn = popup.querySelector('#formless-inline-autofill');

  // Get user inputs
  const userPrompt = popup.querySelector('#formless-inline-prompt').value.trim() || null;
  const context = popup.querySelector('#formless-inline-context').value.trim() || null;
  const memoryIntents = selectedMemoryIntents.length > 0 ? selectedMemoryIntents : null;

  // Set loading state
  autoFillBtn.disabled = true;
  autoFillBtn.classList.add('loading');
  autoFillBtn.textContent = '';

  console.log('[Formless] Auto filling field:', field.id);
  console.log('[Formless] User prompt:', userPrompt);
  console.log('[Formless] Context:', context);
  console.log('[Formless] Memory intents:', memoryIntents);

  try {
    // Get parsed field name
    const parsedField = getParsedFieldName(field);

    // Call backend matching API
    const result = await matchField(parsedField, memoryIntents, userPrompt, context);

    // Fill the field with matched value
    if (result.matched_fields && Object.keys(result.matched_fields).length > 0) {
      const matchedValue = Object.values(result.matched_fields)[0];

      if (matchedValue && matchedValue.trim() !== '') {
        // Google Forms special filling
        if (window.GoogleFormsAdapter && GoogleFormsAdapter.isGoogleForm()) {
          GoogleFormsAdapter.fillField(field, matchedValue);
        } else {
          field.value = matchedValue;
          // Trigger input event for frameworks that listen to it
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Show success notification
        showSuccessNotification(field.id);

        // Close popup after successful fill
        setTimeout(closeInlinePopup, 500);
      } else {
        // No match found
        console.log('[Formless] No match found (none case)');
        showErrorNotification('No matching value found');

        // Reset button state
        autoFillBtn.disabled = false;
        autoFillBtn.classList.remove('loading');
        autoFillBtn.textContent = 'Auto Fill';
      }
    } else {
      console.log('[Formless] No matched_fields in response');
      showErrorNotification('No matching value found');

      // Reset button state
      autoFillBtn.disabled = false;
      autoFillBtn.classList.remove('loading');
      autoFillBtn.textContent = 'Auto Fill';
    }
  } catch (error) {
    console.error('[Formless] Error during autofill:', error);
    showErrorNotification('Error: ' + error.message);

    // Reset button state
    autoFillBtn.disabled = false;
    autoFillBtn.classList.remove('loading');
    autoFillBtn.textContent = 'Auto Fill';
  }
}

/**
 * Get parsed field name from DOM element (reuse from fill.js logic)
 */
function getParsedFieldName(field) {
  // Google Forms special handling
  if (window.GoogleFormsAdapter && GoogleFormsAdapter.isGoogleForm()) {
    return GoogleFormsAdapter.getFieldName(field);
  }

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

/**
 * Close inline popup
 */
function closeInlinePopup() {
  if (currentPopup) {
    // Remove ESC key handler
    if (currentPopup._escapeHandler) {
      document.removeEventListener('keydown', currentPopup._escapeHandler);
    }
    currentPopup.remove();
    currentPopup = null;
  }

  currentFieldId = null;
  console.log('[Formless] Inline popup closed');
}

/**
 * Show success notification
 */
function showSuccessNotification(fieldId) {
  let notification = document.getElementById('formless-inline-success-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'formless-inline-success-notification';
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
      animation: fadeIn 0.2s ease-out;
    `;
    document.body.appendChild(notification);
  }
  notification.textContent = `Filled: ${fieldId}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

/**
 * Show error notification
 */
function showErrorNotification(message) {
  let notification = document.getElementById('formless-inline-error-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'formless-inline-error-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #d32f2f;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 11px;
      z-index: 10000;
      border: 1px solid #b71c1c;
      animation: fadeIn 0.2s ease-out;
    `;
    document.body.appendChild(notification);
  }
  notification.textContent = message;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for use by inlineButton.js
window.showInlinePopup = showInlinePopup;
