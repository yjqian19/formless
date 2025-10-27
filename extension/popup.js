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

// Open Memory Hub page
document.getElementById('manageMemories').addEventListener('click', () => {
  const memoryHubPath = 'file:///Volumes/yjbolt/projects/formless/memory-hub.html';
  chrome.tabs.create({ url: memoryHubPath });
});

// Auto fill with selected memory names
document.getElementById('autoFill').addEventListener('click', async () => {
  if (selectedMemoryNames.length === 0) {
    return;
  }

  const autoFillBtn = document.getElementById('autoFill');

  // Set loading state
  autoFillBtn.disabled = true;
  autoFillBtn.classList.add('loading');
  autoFillBtn.textContent = '';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Send message and wait for response
  chrome.tabs.sendMessage(tab.id, {
    action: 'autofill',
    memoryNames: selectedMemoryNames
  }, () => {
    // Reset button state after completion
    autoFillBtn.disabled = false;
    autoFillBtn.classList.remove('loading');
    autoFillBtn.textContent = 'Auto Fill';
  });
});
