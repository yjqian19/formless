const memoryHub = {
  "basic_info": [
    {
      "intent": "legal_name",
      "value": "Yujia Qian",
      "type": "text"
    },
    {
      "intent": "contact_email",
      "value": "yujia@example.com",
      "type": "text"
    }
  ],
  "why_join": [
    {
      "intent": "why_join_company",
      "value": "Write why I want to work at this company using the themes: user impact, fast iteration, ownership.",
      "type": "prompt"
    }
  ]
}

const parsedFields = ['full_name', 'email', 'why_join'];

// Fake composed result - simulating backend response
const fakeComposedResult = {
  full_name: 'Yujia Qian',
  email: 'yujia@example.com',
  why_join: "I'm excited to apply my skills in building intelligent, user-centered applications that create real impact."
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'autofill') {
    const memoryNames = message.memoryNames || [];

    if (memoryNames.length === 0) {
      alert('No memory selected!');
      return;
    }

    // Get selected memories from memoryHub based on memory names
    const selectedMemories = getSelectedMemories(memoryNames);

    // Compose result from selected memories
    const result = composeResult(parsedFields, selectedMemories);

    // Fill form with composed result
    fillFormWithComposedResult(result);

    // Show floating notification
    showNotification(memoryNames);
  }
});

function getSelectedMemories(memoryNames) {
  // Extract memories from memoryHub based on memory names
  // Return object: { 'basic_info': [...], 'why_join': [...] }
  const selectedMemories = {};

  memoryNames.forEach(memoryName => {
    if (memoryHub[memoryName]) {
      selectedMemories[memoryName] = memoryHub[memoryName];
    }
  });

  return selectedMemories;
}

function composeResult(parsedFields, selectedMemories) {
  // Transform memory items into a composed result object
  // For now, directly return the fake composedResult
  // In the future, this would process selectedMemories to generate the result
  return fakeComposedResult;
}

function fillFormWithComposedResult(composedResult) {
  // Fill the form with the composed result

  Object.keys(composedResult).forEach(fieldId => {
    const field = document.getElementById(fieldId);

    if (field) {
      field.value = composedResult[fieldId];
    } else {
      console.warn(`Field ${fieldId} not found in DOM`);
    }
  });
}

function showNotification(memories) {
  let notification = document.getElementById('formless-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'formless-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1a1a1a;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
  }
  notification.textContent = `✅ Formless: Filled with [${memories.join(', ')}]`;
}
