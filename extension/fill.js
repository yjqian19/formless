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
  why_join: "I'm excited to join a team that deeply values user impact. I'm motivated by the idea of building products that genuinely improve people's lives, and I hope to contribute to meaningful, user-centered outcomes through thoughtful design and execution."
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofill') {
    handleAutofill(message, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleAutofill(message, sendResponse) {
  const memoryNames = message.memoryNames || [];

  if (memoryNames.length === 0) {
    sendResponse({ success: false });
    return;
  }

  // Compose result from parsedFields and memoryNames (async with 5 second delay)
  const result = await composeResult(parsedFields, memoryNames);

  // Fill form with composed result
  fillFormWithComposedResult(result);

  // Show floating notification
  showNotification(memoryNames);

  // Send response back to popup
  sendResponse({ success: true });
}

async function composeResult(parsedFields, memoryNames) {
  // Extract selected memories from memoryHub based on memory names
  const selectedMemories = {};
  memoryNames.forEach(memoryName => {
    if (memoryHub[memoryName]) {
      selectedMemories[memoryName] = memoryHub[memoryName];
    }
  });

  // Simulate 5 second processing time (like calling backend API)
  console.log('Composing result with:', { parsedFields, selectedMemories });

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Transform memory items into a composed result object
  // For now, return the fake composedResult after waiting
  // In the future, this would process parsedFields and selectedMemories to generate the result
  console.log('Composition complete!');
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
      background: #000;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 11px;
      z-index: 10000;
      border: 1px solid #333;
    `;
    document.body.appendChild(notification);
  }
  notification.textContent = `Filled: ${memories.join(', ')}`;
}
