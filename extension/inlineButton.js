// Track all injected buttons and their associated fields
const inlineButtons = new Map();
let inlineButtonsEnabled = false;

// Debounce timer for resize/scroll events
let repositionTimer = null;

// DOM observer for dynamic fields
let domObserver = null;

// Scroll and resize listeners
let scrollListener = null;
let resizeListener = null;

/**
 * Enable inline buttons
 */
function enableInlineButtons() {
  if (inlineButtonsEnabled) return;
  inlineButtonsEnabled = true;

  console.log('[Formless] Enabling inline buttons...');

  // Scan and inject buttons after a short delay to ensure DOM is ready
  setTimeout(() => {
    scanAndInjectButtons();
  }, 100);

  // Monitor DOM changes for dynamically added fields
  observeDOMChanges();

  // Update button positions on scroll and resize
  scrollListener = debounceRepositionButtons;
  resizeListener = debounceRepositionButtons;
  window.addEventListener('scroll', scrollListener, true);
  window.addEventListener('resize', resizeListener);

  console.log('[Formless] Inline buttons enabled');
}

/**
 * Disable inline buttons
 */
function disableInlineButtons() {
  if (!inlineButtonsEnabled) return;
  inlineButtonsEnabled = false;

  console.log('[Formless] Disabling inline buttons...');

  // Remove all buttons
  removeAllButtons();

  // Stop observing DOM changes
  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }

  // Remove scroll and resize listeners
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener, true);
    scrollListener = null;
  }
  if (resizeListener) {
    window.removeEventListener('resize', resizeListener);
    resizeListener = null;
  }

  console.log('[Formless] Inline buttons disabled');
}

/**
 * Remove all injected buttons
 */
function removeAllButtons() {
  inlineButtons.forEach(({ button }) => {
    if (button && button.parentNode) {
      button.remove();
    }
  });
  inlineButtons.clear();
}

/**
 * Scan page for input fields and inject buttons
 */
function scanAndInjectButtons() {
  if (!inlineButtonsEnabled) return; // Don't scan if disabled

  const fields = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="password"], input[type="tel"], input[type="url"], textarea, select'
  );

  console.log(`[Formless] Found ${fields.length} input fields`);

  fields.forEach(field => {
    // Skip if field has no ID
    if (!field.id) return;

    // Skip if button already exists for this field
    if (inlineButtons.has(field.id)) return;

    // Skip if field is inside formless popup
    if (field.closest('.formless-inline-popup')) return;

    // Inject button for this field
    injectButtonForField(field);
  });

  console.log(`[Formless] Injected ${inlineButtons.size} buttons`);
}

/**
 * Inject a button for a specific field
 */
function injectButtonForField(field) {
  const button = document.createElement('button');
  button.className = 'formless-inline-button';
  button.setAttribute('data-field-id', field.id);
  button.setAttribute('type', 'button'); // Prevent form submission
  button.title = 'Formless Auto Fill';

  // Position button
  updateButtonPosition(button, field);

  // Click handler
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleButtonClick(field);
  });

  // Add to DOM
  document.body.appendChild(button);

  // Track button
  inlineButtons.set(field.id, { button, field });

  // Update position when field visibility changes
  observeFieldVisibility(field, button);
}

/**
 * Update button position based on field position
 */
function updateButtonPosition(button, field) {
  const rect = field.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  // Check if field is visible
  if (rect.width === 0 || rect.height === 0 || rect.top < -100 || rect.top > window.innerHeight + 100) {
    button.style.display = 'none';
    return;
  }

  button.style.display = 'flex';

  // Position at bottom-right corner of the field, with small offset
  const top = rect.bottom + scrollTop - 28; // 24px button height + 4px offset
  const left = rect.right + scrollLeft - 28; // 24px button width + 4px offset

  button.style.top = `${top}px`;
  button.style.left = `${left}px`;
}

/**
 * Reposition all buttons
 */
function repositionAllButtons() {
  inlineButtons.forEach(({ button, field }) => {
    updateButtonPosition(button, field);
  });
}

/**
 * Debounced reposition function
 */
function debounceRepositionButtons() {
  if (repositionTimer) clearTimeout(repositionTimer);
  repositionTimer = setTimeout(repositionAllButtons, 100);
}

/**
 * Observe field visibility using IntersectionObserver
 */
function observeFieldVisibility(field, button) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          updateButtonPosition(button, field);
        } else {
          button.style.display = 'none';
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(field);
}

/**
 * Observe DOM changes for dynamically added fields
 */
function observeDOMChanges() {
  if (domObserver) return; // Already observing

  domObserver = new MutationObserver((mutations) => {
    if (!inlineButtonsEnabled) return; // Don't process if disabled

    let shouldRescan = false;

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          // Check if added node is an input field or contains input fields
          if (node.matches && node.matches('input, textarea, select')) {
            shouldRescan = true;
          } else if (node.querySelectorAll) {
            const inputs = node.querySelectorAll('input, textarea, select');
            if (inputs.length > 0) {
              shouldRescan = true;
            }
          }
        }
      });

      mutation.removedNodes.forEach(node => {
        if (node.nodeType === 1 && node.id) {
          // Remove button if field was removed
          const buttonData = inlineButtons.get(node.id);
          if (buttonData && buttonData.button) {
            buttonData.button.remove();
            inlineButtons.delete(node.id);
          }
        }
      });
    });

    if (shouldRescan) {
      setTimeout(scanAndInjectButtons, 100);
    }
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Handle button click - show inline popup
 */
function handleButtonClick(field) {
  console.log('[Formless] Button clicked for field:', field.id);

  // Import and call popup UI function
  if (typeof showInlinePopup === 'function') {
    showInlinePopup(field);
  } else {
    console.error('[Formless] showInlinePopup function not found');
  }
}

/**
 * Get button position for popup positioning
 */
function getButtonPosition(fieldId) {
  const buttonData = inlineButtons.get(fieldId);
  if (!buttonData) return null;

  const rect = buttonData.button.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.right + 8, // Position popup to the right of button with 8px gap
    fieldRect: buttonData.field.getBoundingClientRect()
  };
}

/**
 * Listen for messages from popup to enable/disable inline buttons
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'enableInlineMode') {
    enableInlineButtons();
    sendResponse({ success: true });
    return true;
  } else if (message.action === 'disableInlineMode') {
    disableInlineButtons();
    sendResponse({ success: true });
    return true;
  }
  return false;
});

/**
 * Check stored mode on page load and enable if needed
 */
chrome.storage.local.get(['formlessMode'], (result) => {
  const mode = result.formlessMode || 'page'; // Default to page
  if (mode === 'inline') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enableInlineButtons);
    } else {
      enableInlineButtons();
    }
  }
  // Default page mode - don't enable buttons automatically
});

// Export for use by popup UI
window.formlessGetButtonPosition = getButtonPosition;
