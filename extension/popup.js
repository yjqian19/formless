// Current mode: 'inline' or 'page'
let currentMode = 'page';

/**
 * Load current mode from storage
 */
function loadMode() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['formlessMode'], (result) => {
      currentMode = result.formlessMode || 'page'; // Default to page
      resolve(currentMode);
    });
  });
}

/**
 * Save mode to storage
 */
function saveMode(mode) {
  currentMode = mode;
  chrome.storage.local.set({ formlessMode: mode });
}

/**
 * Update UI to reflect current mode
 */
function updateModeUI() {
  const inlineBtn = document.getElementById('inlineModeBtn');
  const pageBtn = document.getElementById('pageModeBtn');
  const statusText = document.getElementById('modeStatusText');

  if (currentMode === 'inline') {
    inlineBtn.classList.add('active');
    pageBtn.classList.remove('active');
    statusText.textContent = 'Inline mode enabled';
  } else {
    inlineBtn.classList.remove('active');
    pageBtn.classList.add('active');
    statusText.textContent = 'Page mode enabled';
  }
}

/**
 * Enable inline mode - send message to content script
 */
async function enableInlineMode() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: 'enableInlineMode' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Formless] Error enabling inline mode:', chrome.runtime.lastError);
      // Still update UI even if message failed (might be on chrome:// page)
    } else {
      console.log('[Formless] Inline mode enabled');
    }
  });
}

/**
 * Disable inline mode - send message to content script
 */
async function disableInlineMode() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: 'disableInlineMode' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Formless] Error disabling inline mode:', chrome.runtime.lastError);
    } else {
      console.log('[Formless] Inline mode disabled');
    }
  });
}

/**
 * Switch to inline mode
 */
async function switchToInlineMode() {
  saveMode('inline');
  updateModeUI();
  await enableInlineMode();
}

/**
 * Switch to page mode
 */
async function switchToPageMode() {
  saveMode('page');
  updateModeUI();
  await disableInlineMode();
}

// Toggle button event listeners
document.getElementById('inlineModeBtn').addEventListener('click', switchToInlineMode);
document.getElementById('pageModeBtn').addEventListener('click', switchToPageMode);

// Initialize on popup open
loadMode().then((mode) => {
  updateModeUI();

  // Apply mode to current tab
  if (mode === 'inline') {
    enableInlineMode();
  } else {
    disableInlineMode(); // Default page mode - disable inline buttons
  }
});
