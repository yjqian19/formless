// Store selected memory names
let selectedMemoryNames = ['basic_info', 'why_join'];

// Handle checkbox changes
document.querySelectorAll('#memorySelection input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', updateSelectedMemoryNames);
});

function updateSelectedMemoryNames() {
  selectedMemoryNames = [];
  document.querySelectorAll('#memorySelection input[type="checkbox"]:checked').forEach(checkbox => {
    selectedMemoryNames.push(checkbox.value);
  });

  // Update display
  const display = document.getElementById('selectedMemories');
  const autoFillBtn = document.getElementById('autoFill');

  if (selectedMemoryNames.length === 0) {
    display.textContent = 'No memory selected';
    display.classList.add('empty');
    autoFillBtn.disabled = true;
  } else {
    display.textContent = `Selected: ${selectedMemoryNames.join(', ')}`;
    display.classList.remove('empty');
    autoFillBtn.disabled = false;
  }
}

// Auto fill with selected memory names
document.getElementById('autoFill').addEventListener('click', async () => {
  if (selectedMemoryNames.length === 0) {
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, {
    action: 'autofill',
    memoryNames: selectedMemoryNames
  });
});
