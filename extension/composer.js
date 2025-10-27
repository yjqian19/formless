chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofill') {
    // Fill text inputs
    document.getElementById('full_name').value = 'Yujia Qian';
    document.getElementById('email').value = 'yujia@example.com';
    document.getElementById('position').value = 'Full-Stack Developer';
    document.getElementById('why_join').value = "I'm excited to apply my skills in building intelligent, user-centered applications that create real impact.";

    // Select radio button
    const hybridRadio = document.querySelector('input[name="work_type"][value="Hybrid"]');
    if (hybridRadio) hybridRadio.checked = true;

    // Check checkboxes
    const pythonCheckbox = document.querySelector('input[type="checkbox"][value="Python"]');
    if (pythonCheckbox) pythonCheckbox.checked = true;

    const uiuxCheckbox = document.querySelector('input[type="checkbox"][value="UI/UX"]');
    if (uiuxCheckbox) uiuxCheckbox.checked = true;

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
    notification.textContent = '✅ Formless: Filled with AI reasoning';

    // Show alert
    alert('Form completed!');
  }
});
