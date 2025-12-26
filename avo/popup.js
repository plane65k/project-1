'use strict';

const STORAGE_KEYS = {
  apiKey: 'avoApiKey',
  model: 'avoModel',
};

const DEFAULT_MODEL = 'openai/gpt-3.5-turbo';
const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

let conversationHistory = [];
let currentPageText = '';
let apiKey = '';
let selectedModel = DEFAULT_MODEL;
let isBusy = false;

const summarizeBtn = document.getElementById('summarizeBtn');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const questionInput = document.getElementById('questionInput');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const modelSelect = document.getElementById('modelSelect');
const messagesContainer = document.getElementById('messagesContainer');

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (result) => resolve(result || {}));
  });
}

function storageSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(data, () => {
      if (chrome.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function queryActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tabs?.[0] || null);
    });
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

summarizeBtn.addEventListener('click', () => void summarizePage());
sendBtn.addEventListener('click', () => void sendQuestion());
clearBtn.addEventListener('click', clearConversation);
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', () => void saveSettings());
questionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') void sendQuestion();
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal || e.target.classList.contains('avo-modal-overlay')) {
    closeSettings();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSettings();
});

async function loadSettings() {
  const stored = await storageGet([STORAGE_KEYS.apiKey, STORAGE_KEYS.model]);

  apiKey = (stored[STORAGE_KEYS.apiKey] || '').trim();
  selectedModel = stored[STORAGE_KEYS.model] || DEFAULT_MODEL;

  apiKeyInput.value = apiKey;

  if (!modelSelect.querySelector(`option[value="${CSS.escape(selectedModel)}"]`)) {
    const opt = document.createElement('option');
    opt.value = selectedModel;
    opt.textContent = `${selectedModel} (saved)`;
    modelSelect.appendChild(opt);
  }

  modelSelect.value = selectedModel;

  console.log('✅ [DEBUG] ========== Settings Loaded ==========');
  console.log('✅ [DEBUG] Model:', selectedModel);
  console.log('✅ [DEBUG] API Key present:', !!apiKey);
  console.log('✅ [DEBUG] API Key format:', apiKey ? (apiKey.startsWith('sk-or-v1-') ? 'Correct (sk-or-v1-)' : `Unexpected prefix: ${apiKey.substring(0, 10)}...`) : 'MISSING');
  console.log('✅ [DEBUG] Default model:', DEFAULT_MODEL);
  console.log('✅ [DEBUG] API Endpoint:', API_ENDPOINT);
}

async function saveSettings() {
  const nextApiKey = apiKeyInput.value.trim();
  const nextModel = modelSelect.value;

  if (!nextApiKey) {
    showError('Please enter an API key');
    return;
  }

  console.log('💾 [DEBUG] ========== Saving Settings ==========');
  console.log('💾 [DEBUG] Model to save:', nextModel);
  console.log('💾 [DEBUG] API Key prefix:', nextApiKey.substring(0, 10) + '...');

  try {
    await storageSet({
      [STORAGE_KEYS.apiKey]: nextApiKey,
      [STORAGE_KEYS.model]: nextModel,
    });

    apiKey = nextApiKey;
    selectedModel = nextModel;

    console.log('✅ [DEBUG] Settings saved successfully');
    closeSettings();
    removeWelcome();
    addMessage('Settings saved!', 'system');
  } catch (err) {
    console.error('❌ [ERROR] Failed to save settings:', err);
    showError(`Failed to save settings: ${err.message}`);
  }
}

function openSettings() {
  settingsModal.classList.add('avo-modal-open');
  apiKeyInput.focus();
}

function closeSettings() {
  settingsModal.classList.remove('avo-modal-open');
}

async function getPageText({ silent = false } = {}) {
  try {
    const tab = await queryActiveTab();
    if (!tab?.id) {
      if (!silent) showError('No active tab found');
      return null;
    }

    const response = await sendMessageToTab(tab.id, { action: 'getPageText' });
    const pageText = response?.pageText || null;

    if (!pageText && !silent) {
      showError('Could not extract page text from this page');
    }

    return pageText;
  } catch (error) {
    if (!silent) {
      console.error('Error getting page text:', error);
      showError('Could not extract page text from this page');
    }
    return null;
  }
}

async function ensurePageText() {
  if (currentPageText) return true;
  const text = await getPageText();
  if (!text) return false;
  currentPageText = text;
  return true;
}

async function summarizePage() {
  if (isBusy) return;

  if (!apiKey) {
    showError('Please set your API key in Settings first');
    openSettings();
    return;
  }

  const ok = await ensurePageText();
  if (!ok) return;

  setBusy(true);
  showLoading();

  try {
    const userMessage = 'Summarize this page. Keep it concise, use bullet points, and include key takeaways.';
    const summary = await callOpenRouter(userMessage);

    removeLoading();
    removeWelcome();
    addMessage('Page Summary', 'system');
    addMessage(summary, 'ai');

    conversationHistory.push({ role: 'user', content: userMessage });
    conversationHistory.push({ role: 'assistant', content: summary });
  } catch (error) {
    removeLoading();
    showError(`Failed to summarize: ${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function sendQuestion() {
  if (isBusy) return;

  if (!apiKey) {
    showError('Please set your API key in Settings first');
    openSettings();
    return;
  }

  const question = questionInput.value.trim();
  if (!question) return;

  const ok = await ensurePageText();
  if (!ok) return;

  removeWelcome();
  addMessage(question, 'user');
  questionInput.value = '';

  setBusy(true);
  showLoading();

  try {
    const response = await callOpenRouter(question);

    removeLoading();
    addMessage(response, 'ai');

    conversationHistory.push({ role: 'user', content: question });
    conversationHistory.push({ role: 'assistant', content: response });
  } catch (error) {
    removeLoading();
    showError(`Failed to get response: ${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function callOpenRouter(userMessage) {
  try {
    const systemPrompt =
      'You are avo, an AI page analyzer. ' +
      'You will receive PAGE CONTENT extracted from the current webpage. ' +
      'Answer questions and provide summaries using ONLY that content. ' +
      'If the page does not contain the answer, say so clearly.';

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nPAGE CONTENT:\n${currentPageText}`,
      },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    console.log('🔄 [DEBUG] ========== Preparing OpenRouter Request ==========');
    console.log('🔄 [DEBUG] Selected Model:', selectedModel);
    console.log('🔄 [DEBUG] API Endpoint:', API_ENDPOINT);
    console.log('🔄 [DEBUG] API Key (first 30 chars):', apiKey ? apiKey.substring(0, 30) + '...' : 'NONE');

    const requestBody = {
      model: selectedModel,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    };

    console.log('🔄 [DEBUG] Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'avo',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📊 [DEBUG] ========== Response Received ==========');
    console.log('📊 [DEBUG] Response Status:', response.status);
    console.log('📊 [DEBUG] Response Status Text:', response.statusText);
    console.log('📊 [DEBUG] Response Headers:', {
      contentType: response.headers.get('content-type'),
      xRatelimitLimitRequests: response.headers.get('x-ratelimit-limit-requests'),
      xRatelimitRemainingRequests: response.headers.get('x-ratelimit-remaining-requests'),
    });

    const responseText = await response.text();
    console.log('📊 [DEBUG] Response Body (raw):', responseText);

    if (!response.ok) {
      console.error('❌ [ERROR] API returned error status');

      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ [ERROR] Parsed error:', errorData);
          throw new Error(`OpenRouter error (${response.status}): ${errorData.error?.message || responseText}`);
        } catch (e) {
          if (e.message.startsWith('OpenRouter error')) {
            throw e;
          }
          console.error('❌ [ERROR] Could not parse error response as JSON');
          throw new Error(`OpenRouter error (${response.status}): ${responseText || 'No response body'}`);
        }
      } else {
        console.error('❌ [ERROR] Empty response body with error status');
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - Empty response (request format may be incorrect)`);
      }
    }

    const data = JSON.parse(responseText);
    console.log('✅ [SUCCESS] OpenRouter response:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ [ERROR] Invalid response format:', data);
      throw new Error('Invalid response format: missing choices or message content');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('💥 [ERROR] Full error in callOpenRouter:', error);
    throw error;
  }
}

function removeWelcome() {
  const welcome = messagesContainer.querySelector('.avo-welcome');
  if (welcome) welcome.remove();
}

function addMessage(text, sender) {
  const messageEl = document.createElement('div');
  messageEl.className = `avo-message avo-message-${sender}`;

  if (sender === 'system') {
    messageEl.innerHTML = `<div class="avo-message-label">${text}</div>`;
  } else {
    const contentEl = document.createElement('div');
    contentEl.className = 'avo-message-content';
    contentEl.textContent = text;
    messageEl.appendChild(contentEl);
  }

  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showLoading() {
  removeLoading();

  const loadingEl = document.createElement('div');
  loadingEl.className = 'avo-message avo-message-ai avo-loading';
  loadingEl.id = 'loadingIndicator';

  const contentEl = document.createElement('div');
  contentEl.className = 'avo-message-content';
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.className = 'avo-loading-dot';
    dot.style.animationDelay = `${i * 0.15}s`;
    contentEl.appendChild(dot);
  }

  loadingEl.appendChild(contentEl);
  messagesContainer.appendChild(loadingEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeLoading() {
  const loading = document.getElementById('loadingIndicator');
  if (loading) loading.remove();
}

function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'avo-message avo-message-error';
  errorEl.innerHTML = `<div class="avo-message-content">${message}</div>`;
  
  messagesContainer.appendChild(errorEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function clearConversation() {
  conversationHistory = [];
  currentPageText = '';
  
  // Clear all messages except welcome
  messagesContainer.innerHTML = '';
  
  // Re-add welcome
  const welcomeEl = document.createElement('div');
  welcomeEl.className = 'avo-welcome';
  welcomeEl.innerHTML = `
    <div class="avo-welcome-icon">avo</div>
    <h3>Welcome to avo</h3>
    <p>Ask questions about this page or request a summary</p>
  `;
  messagesContainer.appendChild(welcomeEl);
  
  questionInput.value = '';
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  summarizeBtn.disabled = nextBusy;
  sendBtn.disabled = nextBusy;
  questionInput.disabled = nextBusy;
}

async function init() {
  await loadSettings();
  void getPageText({ silent: true }).then((text) => {
    if (text) currentPageText = text;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});
