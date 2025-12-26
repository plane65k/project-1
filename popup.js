'use strict';

let conversationHistory = [];

const API_KEY = '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';
const API_ENDPOINT = 'https://openrouter.io/api/v1/chat/completions';

let currentPageText = '';

document.getElementById('summarizeBtn').addEventListener('click', summarizePage);
document.getElementById('sendBtn').addEventListener('click', sendQuestion);
document.getElementById('clearBtn').addEventListener('click', clearConversation);
document.getElementById('questionInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendQuestion();
});

async function getPageText() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      showError('No active tab found');
      return null;
    }

    const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageText' });
    return response?.pageText || null;
  } catch (error) {
    console.error('Error getting page text:', error);
    showError('Could not extract page text from this page');
    return null;
  }
}

async function summarizePage() {
  if (!currentPageText) {
    currentPageText = await getPageText();
    if (!currentPageText) return;
  }

  addMessage('Summarizing page...', 'ai');
  removeLastMessage();
  showLoading();

  try {
    const summary = await callOpenRouter(
      `Please provide a concise summary of the following page content:\n\n${currentPageText}`
    );
    
    removeLoading();
    addMessage(summary, 'ai');
    conversationHistory.push({ role: 'assistant', content: summary });
  } catch (error) {
    removeLoading();
    showError('Failed to summarize: ' + error.message);
  }
}

async function sendQuestion() {
  const input = document.getElementById('questionInput');
  const question = input.value.trim();

  if (!question) return;

  if (!currentPageText) {
    currentPageText = await getPageText();
    if (!currentPageText) return;
  }

  addMessage(question, 'user');
  input.value = '';
  showLoading();

  try {
    const contextMessage = conversationHistory.length === 0
      ? `Here is the page content:\n\n${currentPageText}\n\nNow answer this question about it: ${question}`
      : question;

    const response = await callOpenRouter(contextMessage);
    
    removeLoading();
    addMessage(response, 'ai');
    conversationHistory.push({ role: 'user', content: question });
    conversationHistory.push({ role: 'assistant', content: response });
  } catch (error) {
    removeLoading();
    showError('Failed to get response: ' + error.message);
  }
}

async function callOpenRouter(userMessage) {
  const messages = [
    { role: 'user', content: userMessage }
  ];

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function addMessage(text, sender) {
  const container = document.getElementById('messagesContainer');
  const messageEl = document.createElement('div');
  messageEl.className = `avo-message ${sender}`;
  
  const contentEl = document.createElement('div');
  contentEl.className = 'avo-message-content';
  contentEl.textContent = text;
  
  messageEl.appendChild(contentEl);
  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
}

function removeLastMessage() {
  const container = document.getElementById('messagesContainer');
  const messages = container.querySelectorAll('.avo-message');
  if (messages.length > 0) {
    messages[messages.length - 1].remove();
  }
}

function showLoading() {
  const container = document.getElementById('messagesContainer');
  const loadingEl = document.createElement('div');
  loadingEl.className = 'avo-loading';
  loadingEl.id = 'loadingIndicator';
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'avo-loading-dot';
    loadingEl.appendChild(dot);
  }
  
  container.appendChild(loadingEl);
  container.scrollTop = container.scrollHeight;
}

function removeLoading() {
  const loading = document.getElementById('loadingIndicator');
  if (loading) loading.remove();
}

function showError(message) {
  const container = document.getElementById('messagesContainer');
  const errorEl = document.createElement('div');
  errorEl.className = 'avo-error';
  errorEl.textContent = message;
  container.appendChild(errorEl);
  container.scrollTop = container.scrollHeight;
}

function clearConversation() {
  conversationHistory = [];
  currentPageText = '';
  document.getElementById('messagesContainer').innerHTML = '';
  document.getElementById('questionInput').value = '';
}

// Load page text on popup open
window.addEventListener('load', async () => {
  currentPageText = await getPageText();
});
