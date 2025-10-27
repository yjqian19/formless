// Store selected contexts
let selectedContexts = ['basic_info', 'work_reason_prompt'];

// Handle checkbox changes
document.querySelectorAll('#contextSelection input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', updateSelectedContexts);
});

function updateSelectedContexts() {
  selectedContexts = [];
  document.querySelectorAll('#contextSelection input[type="checkbox"]:checked').forEach(checkbox => {
    selectedContexts.push(checkbox.value);
  });

  // Update display
  const display = document.getElementById('selectedContexts');
  const autoFillBtn = document.getElementById('autoFill');

  if (selectedContexts.length === 0) {
    display.textContent = 'No context selected';
    display.classList.add('empty');
    autoFillBtn.disabled = true;
  } else {
    display.textContent = `Selected: ${selectedContexts.join(', ')}`;
    display.classList.remove('empty');
    autoFillBtn.disabled = false;
  }
}

// Auto fill with selected contexts
document.getElementById('autoFill').addEventListener('click', async () => {
  if (selectedContexts.length === 0) {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, {
    action: 'autofill',
    contexts: selectedContexts
  });
});
