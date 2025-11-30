// Backend API configuration and client
const API_CONFIG = {
  baseURL: 'http://localhost:8000'
};

/**
 * Get all memory items from backend
 * @returns {Promise<Array<{id: string, intent: string, value: string, type: string}>>}
 */
async function getAllMemories() {
  const url = `${API_CONFIG.baseURL}/api/memories`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching memories:', error);
    throw error;
  }
}

/**
 * Match a form field with memory data using backend API
 * @param {string} parsedField - Form field name/label to match
 * @param {string[]|null} memoryIntents - List of intent names to match, null means all
 * @param {string|null} userPrompt - User-provided prompt/outline (optional)
 * @param {string|null} context - Short-term context (optional)
 * @returns {Promise<{matched_fields: {[fieldName: string]: string}}>}
 */
async function matchField(parsedField, memoryIntents = null, userPrompt = null, context = null) {
  const url = `${API_CONFIG.baseURL}/api/matching`;

  // Adapt to new batch API format:
  // - parsed_field -> parsed_fields (array)
  // - user_prompt -> user_prompts (object mapping field -> prompt)
  const requestBody = {
    parsed_fields: [parsedField],  // Wrap single field in array
    memory_intents: memoryIntents,
    user_prompts: userPrompt ? { [parsedField]: userPrompt } : null,  // Convert to object if provided
    context: context
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling matching API:', error);
    throw error;
  }
}
