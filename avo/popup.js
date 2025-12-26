'use strict';

const STORAGE_KEYS = {
  apiKey: 'avoApiKey',
  model: 'avoModel',
  conversations: 'avoConversations',
  activeConversationId: 'avoActiveId'
};

const DEFAULT_MODEL = 'openai/gpt-3.5-turbo';
const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

let conversationHistory = [];
let currentPageText = '';
let apiKey = '';
let selectedModel = DEFAULT_MODEL;
let isBusy = false;
let conversations = [];
let activeConversationId = null;

// DOM Elements
const summarizeBtn = document.getElementById('summarizeBtn');
const sendBtn = document.getElementById('sendBtn');
const questionInput = document.getElementById('questionInput');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const modelSelect = document.getElementById('modelSelect');
const messagesContainer = document.getElementById('messagesContainer');
const historyBtn = document.getElementById('historyBtn');
const historySidebar = document.getElementById('historySidebar');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const clearBtn = document.getElementById('clearBtn');

// Storage Helpers
function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function storageSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
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

// Event Listeners
summarizeBtn.addEventListener('click', () => void summarizePage());
sendBtn.addEventListener('click', () => void sendQuestion());
clearBtn.addEventListener('click', () => startNewConversation());
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', () => void saveSettings());
questionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') void sendQuestion();
});

historyBtn.addEventListener('click', openHistory);
closeHistoryBtn.addEventListener('click', closeHistory);
clearHistoryBtn.addEventListener('click', clearAllHistory);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal || e.target.classList.contains('avo-modal-overlay')) {
    closeSettings();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSettings();
    closeHistory();
  }
});

// Initialization
async function init() {
  await loadSettings();
  await loadConversations();
  
  void getPageText({ silent: true }).then((text) => {
    if (text) {
      currentPageText = text;
      // If active conversation has no text, update it
      const active = conversations.find(c => c.id === activeConversationId);
      if (active && !active.pageText) {
        active.pageText = text;
        saveCurrentConversation();
      }
    }
  });
}

// Settings
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
    addMessage('Settings saved!', 'system');
  } catch (err) {
    showError(`Failed to save settings: ${err.message}`);
  }
}

// History & Conversation Management
async function loadConversations() {
  const stored = await storageGet([STORAGE_KEYS.conversations, STORAGE_KEYS.activeConversationId]);
  conversations = stored[STORAGE_KEYS.conversations] || [];
  activeConversationId = stored[STORAGE_KEYS.activeConversationId];

  if (activeConversationId) {
    const active = conversations.find(c => c.id === activeConversationId);
    if (active) {
      loadConversationIntoUI(active);
    } else {
      startNewConversation();
    }
  } else {
    startNewConversation();
  }
  renderHistoryList();
}

function loadConversationIntoUI(conv) {
  activeConversationId = conv.id;
  conversationHistory = conv.messages || [];
  currentPageText = conv.pageText || '';
  
  messagesContainer.innerHTML = '';
  if (conversationHistory.length === 0) {
    showWelcome();
  } else {
    conversationHistory.forEach(msg => {
      addMessage(msg.content, msg.role === 'user' ? 'user' : (msg.role === 'assistant' ? 'ai' : 'system'), false);
    });
  }
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showWelcome() {
  const welcomeEl = document.createElement('div');
  welcomeEl.className = 'avo-welcome';
  welcomeEl.innerHTML = `
    <div class="avo-welcome-icon">avo</div>
    <h3>Welcome to avo</h3>
    <p>Ask questions about this page or request a summary</p>
  `;
  messagesContainer.appendChild(welcomeEl);
}

function startNewConversation() {
  activeConversationId = Date.now().toString();
  conversationHistory = [];
  messagesContainer.innerHTML = '';
  showWelcome();
  saveCurrentConversation();
  renderHistoryList();
}

async function saveCurrentConversation() {
  const tab = await queryActiveTab();
  const pageUrl = tab?.url || '';
  const pageTitle = tab?.title || 'New Conversation';

  const existingIndex = conversations.findIndex(c => c.id === activeConversationId);
  
  let title = pageTitle;
  if (conversationHistory.length > 0) {
    const firstUserMsg = conversationHistory.find(m => m.role === 'user');
    if (firstUserMsg) {
      title = firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '');
    }
  }

  const convData = {
    id: activeConversationId,
    title: title,
    messages: conversationHistory,
    pageText: currentPageText,
    pageUrl: pageUrl,
    updatedAt: Date.now(),
    createdAt: (existingIndex >= 0 && conversations[existingIndex].createdAt) ? conversations[existingIndex].createdAt : Date.now()
  };

  if (existingIndex >= 0) {
    conversations[existingIndex] = convData;
  } else {
    conversations.unshift(convData);
  }

  // Sort by updatedAt descending
  conversations.sort((a, b) => b.updatedAt - a.updatedAt);

  // Limit history to 50 conversations
  if (conversations.length > 50) {
    conversations = conversations.slice(0, 50);
  }

  await storageSet({
    [STORAGE_KEYS.conversations]: conversations,
    [STORAGE_KEYS.activeConversationId]: activeConversationId
  });
  renderHistoryList();
}

function renderHistoryList() {
  historyList.innerHTML = '';
  if (conversations.length === 0) {
    historyList.innerHTML = '<div class="avo-history-empty">No conversations yet</div>';
    return;
  }

  conversations.forEach(conv => {
    const item = document.createElement('div');
    item.className = `avo-history-item ${conv.id === activeConversationId ? 'active' : ''}`;
    
    const date = new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    item.innerHTML = `
      <div class="avo-history-title" title="${conv.title}">${conv.title}</div>
      <div class="avo-history-meta">${date}</div>
      <button class="avo-history-delete" title="Delete conversation" data-id="${conv.id}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.avo-history-delete')) return;
      switchToConversation(conv.id);
    });

    const deleteBtn = item.querySelector('.avo-history-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    historyList.appendChild(item);
  });
}

function switchToConversation(id) {
  const conv = conversations.find(c => c.id === id);
  if (conv) {
    loadConversationIntoUI(conv);
    closeHistory();
    storageSet({ [STORAGE_KEYS.activeConversationId]: activeConversationId });
    renderHistoryList();
  }
}

async function deleteConversation(id) {
  conversations = conversations.filter(c => c.id !== id);
  if (activeConversationId === id) {
    activeConversationId = null;
    startNewConversation();
  } else {
    await storageSet({ [STORAGE_KEYS.conversations]: conversations });
    renderHistoryList();
  }
}

async function clearAllHistory() {
  if (confirm('Are you sure you want to clear all conversation history?')) {
    conversations = [];
    activeConversationId = null;
    await storageSet({ 
      [STORAGE_KEYS.conversations]: [],
      [STORAGE_KEYS.activeConversationId]: null
    });
    startNewConversation();
  }
}

// UI State
function openSettings() {
  settingsModal.classList.add('avo-modal-open');
  apiKeyInput.focus();
}

function closeSettings() {
  settingsModal.classList.remove('avo-modal-open');
}

function openHistory() {
  historySidebar.classList.add('avo-sidebar-open');
}

function closeHistory() {
  historySidebar.classList.remove('avo-sidebar-open');
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

// API Interaction
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
    saveCurrentConversation();
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
    saveCurrentConversation();
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

    const requestBody = {
      model: selectedModel,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    };

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

    const responseText = await response.text();

    if (!response.ok) {
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(`OpenRouter error (${response.status}): ${errorData.error?.message || responseText}`);
        } catch (e) {
          if (e.message.startsWith('OpenRouter error')) throw e;
          throw new Error(`OpenRouter error (${response.status}): ${responseText || 'No response body'}`);
        }
      } else {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = JSON.parse(responseText);
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter');
    }

    return data.choices[0].message.content;
  } catch (error) {
    throw error;
  }
}

// UI Helpers
function removeWelcome() {
  const welcome = messagesContainer.querySelector('.avo-welcome');
  if (welcome) welcome.remove();
}

function addMessage(text, sender, animate = true) {
  const messageEl = document.createElement('div');
  messageEl.className = `avo-message avo-message-${sender}`;
  if (!animate) {
    messageEl.style.animation = 'none';
    messageEl.style.opacity = '1';
  }

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

function setBusy(nextBusy) {
  isBusy = nextBusy;
  summarizeBtn.disabled = nextBusy;
  sendBtn.disabled = nextBusy;
  questionInput.disabled = nextBusy;
}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});
