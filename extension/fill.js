// Context data
const contextData = {
  basic_info: {
    full_name: 'Yujia Qian',
    email: 'yujia@example.com'
  },
  work_reason_prompt: {
    why_join: "I'm excited to apply my skills in building intelligent, user-centered applications that create real impact."
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofill') {
    const contexts = message.contexts || [];

    if (contexts.length === 0) {
      alert('No context selected!');
      return;
    }

    // Fill fields based on selected contexts
    contexts.forEach(contextName => {
      const data = contextData[contextName];
      if (data) {
        Object.keys(data).forEach(fieldId => {
          const field = document.getElementById(fieldId);
          if (field) {
            field.value = data[fieldId];
          }
        });
      }
    });

    // Show floating notification
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
    notification.textContent = `✅ Formless: Filled with [${contexts.join(', ')}]`;

    // Show alert
    alert('Form completed!');
  }
});
