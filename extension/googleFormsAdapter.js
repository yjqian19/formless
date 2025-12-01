// Google Forms Adapter
const GoogleFormsAdapter = {
  isGoogleForm() {
    return window.location.hostname === 'docs.google.com'
      && window.location.pathname.includes('/forms/d/');
  },

  getAllFields() {
    if (!this.isGoogleForm()) return [];

    const fields = [];

    // Find all question containers
    const questionContainers = document.querySelectorAll('[data-params*="[["]');

    console.log('[GoogleFormsAdapter] Total question containers:', questionContainers.length);

    questionContainers.forEach(container => {
      // Look for input or textarea inside each container
      const input = container.querySelector('input[type="text"], textarea');

      if (!input) return;

      console.log('[GoogleFormsAdapter] Checking field:', {
        tagName: input.tagName,
        type: input.type,
        ariaLabel: input.getAttribute('aria-label'),
        visible: input.offsetParent !== null
      });

      if (input.offsetParent === null) {
        console.log('[GoogleFormsAdapter] Skipping hidden field');
        return;
      }

      if (!input.id) {
        input.id = this.generateFieldId(input);
      }

      fields.push(input);
    });

    console.log('[GoogleFormsAdapter] Returning fields:', fields.length);
    return fields;
  },

  generateFieldId(field) {
    const container = field.closest('[data-params]');
    if (container && container.dataset.params) {
      const match = container.dataset.params.match(/\[\[(\d+)/);
      if (match) {
        return `formless-gform-entry-${match[1]}`;
      }
    }

    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) {
      const sanitized = ariaLabel.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
      return `formless-gform-${sanitized}-${Date.now()}`;
    }

    return `formless-gform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  getFieldName(field) {
    // Priority 1: Get from role="heading" (most accurate)
    const container = field.closest('[data-params]');
    if (container) {
      const heading = container.querySelector('[role="heading"]');
      if (heading && heading.textContent) {
        return heading.textContent.trim();
      }
    }

    // Priority 2: aria-label (fallback, usually just "Your answer")
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim() && ariaLabel !== 'Your answer') {
      return ariaLabel.trim();
    }

    // Priority 3: placeholder
    return field.placeholder || 'Unknown Question';
  },

  fillField(field, value) {
    field.value = value;
    field.focus();
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  }
};

window.GoogleFormsAdapter = GoogleFormsAdapter;
