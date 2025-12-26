'use strict';

const STORAGE_KEYS = {
  apiKey: 'avoApiKey',
  model: 'avoModel',
};

const DEFAULT_MODEL = 'gpt-3.5-turbo';
const API_ENDPOINT = 'https://openrouter.io/api/v1/chat/completions';

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
  if (e.target === settingsModal) closeSettings();
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
}

async function saveSettings() {
  const nextApiKey = apiKeyInput.value.trim();
  const nextModel = modelSelect.value;

  if (!nextApiKey) {
    showError('Please enter an API key');
    return;
  }

  try {
    await storageSet({
      [STORAGE_KEYS.apiKey]: nextApiKey,
      [STORAGE_KEYS.model]: nextModel,
    });

    apiKey = nextApiKey;
    selectedModel = nextModel;

    closeSettings();
    addMessage('✓ Settings saved!', 'ai');
  } catch (err) {
    showError(`Failed to save settings: ${err.message}`);
  }
}

function openSettings() {
  settingsModal.classList.remove('hidden');
  apiKeyInput.focus();
}

function closeSettings() {
  settingsModal.classList.add('hidden');
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
  const systemPrompt =
    'You are avo, a Google Gemini-inspired AI page analyzer. ' +
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

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://avo-extension.local',
      'X-Title': 'avo',
    },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      max_tokens: 1000,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || data?.message || 'Unknown error';
    throw new Error(`API error: ${response.status} - ${msg}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Unexpected API response');
  return content;
}

function addMessage(text, sender) {
  const messageEl = document.createElement('div');
  messageEl.className = `avo-message ${sender}`;

  const contentEl = document.createElement('div');
  contentEl.className = 'avo-message-content';
  contentEl.textContent = text;

  messageEl.appendChild(contentEl);
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showLoading() {
  removeLoading();

  const loadingEl = document.createElement('div');
  loadingEl.className = 'avo-loading';
  loadingEl.id = 'loadingIndicator';

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'avo-loading-dot';
    loadingEl.appendChild(dot);
  }

  messagesContainer.appendChild(loadingEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeLoading() {
  const loading = document.getElementById('loadingIndicator');
  if (loading) loading.remove();
}

function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'avo-error';
  errorEl.textContent = message;

  messagesContainer.appendChild(errorEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function clearConversation() {
  conversationHistory = [];
  currentPageText = '';
  messagesContainer.innerHTML = '';
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
