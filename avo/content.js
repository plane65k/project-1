'use strict';

const MAX_EXTRACTED_CHARS = 8000;
const STORAGE_KEYS = {
  apiKey: 'avoApiKey',
  model: 'avoModel',
  conversations: 'avoConversations',
  activeConversationId: 'avoActiveId',
  widgetPos: 'avoWidgetPos',
  widgetSize: 'avoWidgetSize',
  widgetMinimized: 'avoWidgetMinimized'
};

const DEFAULT_MODEL = 'openai/gpt-3.5-turbo';
const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

let conversationHistory = [];
let currentPageText = '';
let pastedText = '';
let textSource = 'page'; // 'page', 'pasted', or 'both'
let apiKey = '';
let selectedModel = DEFAULT_MODEL;
let isBusy = false;
let conversations = [];
let activeConversationId = null;

let widgetVisible = false;
let widgetMinimized = false;
let widget = null;
let shadowRoot = null;

// DOM Elements inside Shadow Root
let summarizeBtn, sendBtn, questionInput, settingsBtn, settingsModal, closeSettingsBtn, saveSettingsBtn, apiKeyInput, modelSelect, messagesContainer, historyBtn, historySidebar, closeHistoryBtn, historyList, clearHistoryBtn, clearBtn, pasteTextBtn, pasteTextInput, sourcePageBtn, sourcePastedBtn, sourceBothBtn, textSourceIndicator, askPastedBtn, summarizePastedBtn, clearPastedBtn;

// --- Content Extraction ---

async function extractPageContent() {
  const currentUrl = window.location.href;

  if (isGoogleDocs(currentUrl)) {
    return await extractGoogleDocsContent();
  }

  if (isGoogleSheets(currentUrl)) {
    return await extractGoogleSheetsContent();
  }

  if (isGoogleSlides(currentUrl)) {
    return await extractGoogleSlidesContent();
  }

  if (isGoogleForms(currentUrl)) {
    return await extractGoogleFormsContent();
  }

  return extractStandardContent();
}

function isGoogleDocs(url) {
  return url.includes('docs.google.com/document');
}

function isGoogleSheets(url) {
  return url.includes('docs.google.com/spreadsheets');
}

function isGoogleSlides(url) {
  return url.includes('docs.google.com/presentation');
}

function isGoogleForms(url) {
  return url.includes('docs.google.com/forms') || url.includes('forms.gle') || url.includes('forms.google.com');
}

async function extractGoogleDocsContent() {
  const editorRoot =
    (await waitForElement('.kix-appview-editor, .kix-appview-editor-container', 2500)) || document.body;

  await waitForMutationsToSettle(editorRoot, { stableMs: 500, timeoutMs: 3000 });

  const parts = [];

  const title = (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '')
    .replace(/\s+-\s+Google Docs\s*$/i, '')
    .trim();
  if (title) parts.push(title);

  const pages = Array.from(editorRoot.querySelectorAll('.kix-page, .kix-page-paginated'));
  if (pages.length > 0) {
    for (const page of pages) {
      const pageText = page.innerText;
      if (pageText) parts.push(pageText);
    }
  } else {
    const editorText = editorRoot.innerText;
    if (editorText) parts.push(editorText);
  }

  const commentSelectors = [
    '.docos-stream-view',
    '.docos-stream-docoview',
    '.docos-commentview',
    '.docos-comment',
    '.docos-replyview',
    '.docos-suggestionview'
  ].join(',');
  const commentEls = Array.from(document.querySelectorAll(commentSelectors)).filter(isVisibleElement);
  for (const el of commentEls) {
    const t = el.innerText;
    if (t) parts.push(t);
  }

  const combined = parts.join('\n\n');
  const normalized = normalizeExtractedText(combined);

  if (normalized) return normalized;

  return extractStandardContent();
}

async function extractGoogleSheetsContent() {
  const root =
    (await waitForElement('#waffle-grid-container, .waffle-grid-container, [role="grid"]', 2500)) || document.body;

  await waitForMutationsToSettle(root, { stableMs: 400, timeoutMs: 2500 });

  const parts = [];

  const title = (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '')
    .replace(/\s+-\s+Google Sheets\s*$/i, '')
    .trim();
  if (title) parts.push(title);

  const tabNames = Array.from(document.querySelectorAll('.docs-sheet-tab-name'))
    .map((el) => el.textContent?.trim() || '')
    .filter(Boolean);
  if (tabNames.length > 0) {
    parts.push(`Sheets: ${tabNames.join(', ')}`);
  }

  const formulaInput = document.querySelector(
    '#t-formula-bar-input input, #t-formula-bar-input textarea, .cell-input textarea, .cell-input input'
  );
  const formulaValue = (formulaInput?.value || '').trim();
  if (formulaValue) {
    parts.push(`Formula Bar: ${formulaValue}`);
  }

  const cellSelectors = [
    '[role="gridcell"]',
    '.waffle-cell',
    '.waffle-cell-renderer',
    '.waffle-cell-content',
    '.waffle-cell-text',
    '.waffle-gridcell',
    '.cell'
  ].join(',');

  const gridCells = Array.from(
    new Set([...root.querySelectorAll(cellSelectors), ...document.querySelectorAll(cellSelectors)])
  );

  const cellLinesSet = new Set();
  for (const cell of gridCells) {
    if (!isPotentiallyVisibleElement(cell)) continue;

    const text = (cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim();
    const aria = (cell.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();

    const candidate = text || parseSheetsAriaLabel(aria);
    if (candidate) cellLinesSet.add(candidate);
  }

  const cellLines = Array.from(cellLinesSet);
  if (cellLines.length > 0) {
    parts.push(cellLines.join('\n'));
  }

  const noteLikeSelectors = [
    '.docs-commentview',
    '.docos-commentview',
    '.docs-suggestion',
    '.docos-suggestionview'
  ].join(',');
  const noteEls = Array.from(document.querySelectorAll(noteLikeSelectors)).filter(isVisibleElement);
  for (const el of noteEls) {
    const t = el.innerText;
    if (t) parts.push(t);
  }

  const combined = parts.join('\n\n');
  const normalized = normalizeExtractedText(combined);

  if (normalized) return normalized;

  return extractStandardContent();
}

async function extractGoogleSlidesContent() {
  const root =
    (await waitForElement('.punch-viewer-content, .punch-viewer-container, .punch-viewer', 2500)) || document.body;

  await waitForMutationsToSettle(root, { stableMs: 500, timeoutMs: 3000 });

  const partsSet = new Set();

  const title = (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '')
    .replace(/\s+-\s+Google Slides\s*$/i, '')
    .trim();
  if (title) partsSet.add(title);

  const slideTextContainers = Array.from(
    root.querySelectorAll('.punch-viewer-page, .punch-viewer-page-wrapper, [role="textbox"]')
  );

  for (const el of slideTextContainers) {
    if (!isVisibleElement(el)) continue;
    const t = el.innerText;
    if (t) partsSet.add(t);
  }

  const svgTextNodes = Array.from(root.querySelectorAll('svg text'));
  for (const el of svgTextNodes) {
    const t = (el.textContent || '').trim();
    if (t) partsSet.add(t);
  }

  const speakerNotesSelectors = [
    '.punch-speaker-notes-textarea',
    '.speaker-notes textarea',
    'textarea[aria-label*="Speaker notes"]'
  ].join(',');
  const speakerNotesEls = Array.from(document.querySelectorAll(speakerNotesSelectors)).filter(isVisibleElement);
  for (const el of speakerNotesEls) {
    const t = (el.value || el.innerText || '').trim();
    if (t) partsSet.add(`Speaker Notes: ${t}`);
  }

  const combined = Array.from(partsSet).join('\n\n');
  const normalized = normalizeExtractedText(combined);

  if (normalized) return normalized;

  return extractStandardContent();
}

async function extractGoogleFormsContent() {
  const root =
    (await waitForElement(
      'form, .freebirdFormviewerViewFormContent, .freebirdFormviewerViewFormCard, .freebirdFormviewerViewItemList',
      2500
    )) || document.body;

  await waitForMutationsToSettle(root, { stableMs: 400, timeoutMs: 2500 });

  const parts = [];

  const title = (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '')
    .replace(/\s+-\s+Google Forms\s*$/i, '')
    .trim();
  if (title) parts.push(title);

  const formText = root.innerText;
  if (formText) parts.push(formText);

  const combined = parts.join('\n\n');
  const normalized = normalizeExtractedText(combined);

  if (normalized) return normalized;

  return extractStandardContent();
}

function extractStandardContent() {
  const base = document.body?.innerText || document.documentElement?.innerText || document.body?.textContent || '';
  const normalized = normalizeExtractedText(base);

  if (normalized) return normalized;

  const deep = normalizeExtractedText(extractVisibleTextByTraversal(document.body || document.documentElement));
  return deep;
}

function normalizeExtractedText(text) {
  const cleaned = (text || '')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return cleaned.substring(0, MAX_EXTRACTED_CHARS);
}

function isPotentiallyVisibleElement(el) {
  if (!el || !(el instanceof Element)) return false;
  if (el.closest('script, style, noscript')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;

  const style = window.getComputedStyle(el);
  if (!style) return true;
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (Number(style.opacity) === 0) return false;

  return true;
}

function isVisibleElement(el) {
  if (!isPotentiallyVisibleElement(el)) return false;

  const rect = el.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return false;

  return true;
}

function extractVisibleTextByTraversal(root) {
  if (!root) return '';

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (!isVisibleElement(parent)) return NodeFilter.FILTER_REJECT;
      const value = node.nodeValue || '';
      if (!value.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const chunks = [];
  let current = walker.nextNode();
  while (current) {
    chunks.push(current.nodeValue);
    current = walker.nextNode();
  }

  return chunks.join(' ');
}

function parseSheetsAriaLabel(ariaLabel) {
  if (!ariaLabel) return '';
  const stripped = ariaLabel
    .replace(/^Cell\s+/i, '')
    .replace(/^R\d+C\d+\s+/i, '')
    .trim();

  if (!stripped) return '';
  if (/^Row\s+\d+/i.test(stripped)) return '';
  if (/^Column\s+/i.test(stripped)) return '';
  if (/^[A-Z]+\d+$/i.test(stripped)) return '';

  const coordMatch = stripped.match(/^([A-Z]+\d+)\s+(.+)$/i);
  if (coordMatch) {
    return `${coordMatch[1]}: ${coordMatch[2].trim()}`;
  }

  return stripped;
}

function waitForElement(selector, timeoutMs) {
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        window.clearTimeout(timeout);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

function waitForMutationsToSettle(root, { stableMs = 500, timeoutMs = 2500 } = {}) {
  return new Promise((resolve) => {
    if (!root) {
      resolve();
      return;
    }

    let done = false;
    let settleTimer = null;

    const finalize = () => {
      if (done) return;
      done = true;
      if (settleTimer) window.clearTimeout(settleTimer);
      window.clearTimeout(timeout);
      observer.disconnect();
      resolve();
    };

    const scheduleSettle = () => {
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(finalize, stableMs);
    };

    const observer = new MutationObserver(() => scheduleSettle());
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    const timeout = window.setTimeout(finalize, timeoutMs);

    scheduleSettle();
  });
}

// --- App Logic ---

async function appInit() {
  await loadSettings();
  await loadConversations();
  refreshTextSourceControls();
  
  const pasteSection = shadowRoot.querySelector('.avo-paste-section');
  if (pasteSection) {
    pasteSection.classList.remove('avo-paste-visible');
  }
  
  void extractPageContent().then((text) => {
    if (text) {
      currentPageText = text;
      const active = conversations.find(c => c.id === activeConversationId);
      if (active && !active.pageText) {
        active.pageText = text;
        saveCurrentConversation();
      }
    }
  });
}

function setTextSource(source) {
  textSource = source;
  refreshTextSourceControls();
  saveCurrentConversation();
}

function refreshTextSourceControls() {
  const hasPasted = Boolean(pastedText && pastedText.trim());

  sourcePastedBtn.disabled = !hasPasted;
  sourceBothBtn.disabled = !hasPasted;

  if (!hasPasted && (textSource === 'pasted' || textSource === 'both')) {
    textSource = 'page';
  }

  sourcePageBtn.classList.toggle('active', textSource === 'page');
  sourcePastedBtn.classList.toggle('active', textSource === 'pasted');
  sourceBothBtn.classList.toggle('active', textSource === 'both');

  if (textSource === 'page') {
    textSourceIndicator.textContent = 'Page content';
  } else if (textSource === 'pasted') {
    textSourceIndicator.textContent = 'Pasted text';
  } else if (textSource === 'both') {
    textSourceIndicator.textContent = 'Page + pasted';
  }
}

function togglePasteSection() {
  const pasteSection = shadowRoot.querySelector('.avo-paste-section');
  const pasteBtn = shadowRoot.getElementById('pasteTextBtn');
  const isVisible = pasteSection.classList.contains('avo-paste-visible');
  
  if (isVisible) {
    pasteSection.classList.remove('avo-paste-visible');
    pasteBtn.classList.remove('avo-active');
    pasteBtn.setAttribute('title', 'Toggle Paste Text');
    pasteBtn.setAttribute('aria-label', 'Toggle Paste Text');
  } else {
    pasteSection.classList.add('avo-paste-visible');
    pasteBtn.classList.add('avo-active');
    pasteBtn.setAttribute('title', 'Hide Paste Text');
    pasteBtn.setAttribute('aria-label', 'Hide Paste Text');
    pasteTextInput.focus();
  }
}

function getCurrentText() {
  if (textSource === 'page') {
    return `PAGE CONTENT:\n${currentPageText}`;
  }
  if (textSource === 'pasted') {
    return `PASTED TEXT:\n${pastedText}`;
  }
  if (textSource === 'both') {
    const parts = [];
    if (currentPageText && currentPageText.trim()) parts.push(`PAGE CONTENT:\n${currentPageText}`);
    if (pastedText && pastedText.trim()) parts.push(`PASTED TEXT:\n${pastedText}`);
    return parts.join('\n\n---\n\n');
  }
  return `PAGE CONTENT:\n${currentPageText}`;
}

async function loadSettings() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.apiKey, STORAGE_KEYS.model]);
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
    await chrome.storage.local.set({
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

async function loadConversations() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.conversations, STORAGE_KEYS.activeConversationId]);
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
  pastedText = conv.pastedText || '';
  textSource = conv.textSource || 'page';

  pasteTextInput.value = pastedText;
  refreshTextSourceControls();
  
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
  pastedText = '';
  textSource = 'page';
  pasteTextInput.value = '';
  refreshTextSourceControls();
  messagesContainer.innerHTML = '';
  showWelcome();
  saveCurrentConversation();
  renderHistoryList();
}

async function saveCurrentConversation() {
  const pageUrl = window.location.href;
  const pageTitle = document.title || 'New Conversation';

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
    pastedText: pastedText,
    textSource: textSource,
    pageUrl: pageUrl,
    updatedAt: Date.now(),
    createdAt: (existingIndex >= 0 && conversations[existingIndex].createdAt) ? conversations[existingIndex].createdAt : Date.now()
  };

  if (existingIndex >= 0) {
    conversations[existingIndex] = convData;
  } else {
    conversations.unshift(convData);
  }

  conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  if (conversations.length > 50) conversations = conversations.slice(0, 50);

  await chrome.storage.local.set({
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
    chrome.storage.local.set({ [STORAGE_KEYS.activeConversationId]: activeConversationId });
    renderHistoryList();
  }
}

async function deleteConversation(id) {
  conversations = conversations.filter(c => c.id !== id);
  if (activeConversationId === id) {
    activeConversationId = null;
    startNewConversation();
  } else {
    await chrome.storage.local.set({ [STORAGE_KEYS.conversations]: conversations });
    renderHistoryList();
  }
}

async function clearAllHistory() {
  if (confirm('Are you sure you want to clear all conversation history?')) {
    conversations = [];
    activeConversationId = null;
    await chrome.storage.local.set({ 
      [STORAGE_KEYS.conversations]: [],
      [STORAGE_KEYS.activeConversationId]: null
    });
    startNewConversation();
  }
}

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

async function ensurePageText() {
  if (textSource === 'pasted') {
    if (!pastedText || !pastedText.trim()) {
      showError('Please paste some text to analyze');
      return false;
    }
    return true;
  }

  if (textSource === 'both' && pastedText && pastedText.trim()) {
    if (!currentPageText) {
      currentPageText = await extractPageContent();
    }
    return true;
  }

  if (currentPageText) return true;
  currentPageText = await extractPageContent();
  return Boolean(currentPageText);
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
    saveCurrentConversation();
  } catch (error) {
    removeLoading();
    showError(`Failed to summarize: ${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function summarizePastedText() {
  if (isBusy) return;
  if (!apiKey) {
    showError('Please set your API key in Settings first');
    openSettings();
    return;
  }
  if (!pastedText || !pastedText.trim()) {
    showError('Please paste some text first');
    return;
  }
  setBusy(true);
  showLoading();
  try {
    const userMessage = `Please summarize this text:\n\n${pastedText}`;
    const summary = await callOpenRouter(userMessage);
    removeLoading();
    removeWelcome();
    addMessage('Text Summary', 'system');
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
  const contentText = getCurrentText();
  const systemPrompt =
    'You are avo, an AI page analyzer. ' +
    'You will receive CONTENT to analyze. ' +
    'Answer questions and provide summaries using ONLY that content. ' +
    'If the content does not contain the answer, say so clearly.';

  const messages = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n${contentText}`,
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
}

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
  const loading = shadowRoot.getElementById('loadingIndicator');
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

// --- Widget Creation and Management ---

async function initWidget() {
  if (widget) return;

  widget = document.createElement('div');
  widget.id = 'avo-widget-container';
  // Reset styles for the container and ensure it doesn't block interactions
  widget.style.all = 'initial';
  widget.style.position = 'fixed';
  widget.style.top = '0';
  widget.style.left = '0';
  widget.style.width = '0';
  widget.style.height = '0';
  widget.style.zIndex = '2147483647';
  document.body.appendChild(widget);

  shadowRoot = widget.attachShadow({ mode: 'open' });

  const cssUrl = chrome.runtime.getURL('styles.css');
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = cssUrl;
  shadowRoot.appendChild(cssLink);

  const widgetHtml = `
    <div id="gemini-widget" class="gemini-widget" style="display: none;">
      <div class="gemini-widget-header" id="widgetHeader">
        <span class="gemini-widget-title">avo AI Page Analyzer</span>
        <div class="gemini-widget-controls">
          <button id="widgetMinimizeBtn" title="Minimize">−</button>
          <button id="widgetCloseBtn" title="Close">×</button>
        </div>
      </div>
      <div class="gemini-widget-content"></div>
      <div class="gemini-resize-handle" id="widgetResizeHandle"></div>
    </div>
  `;
  
  const container = document.createElement('div');
  container.innerHTML = widgetHtml;
  shadowRoot.appendChild(container);

  const contentArea = shadowRoot.querySelector('.gemini-widget-content');
  const popupHtmlResponse = await fetch(chrome.runtime.getURL('popup.html'));
  const popupHtmlText = await popupHtmlResponse.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(popupHtmlText, 'text/html');
  const popupContainer = doc.querySelector('.avo-container');
  contentArea.appendChild(popupContainer);

  const getEl = (id) => shadowRoot.getElementById(id);
  summarizeBtn = getEl('summarizeBtn');
  sendBtn = getEl('sendBtn');
  questionInput = getEl('questionInput');
  settingsBtn = getEl('settingsBtn');
  settingsModal = getEl('settingsModal');
  closeSettingsBtn = getEl('closeSettingsBtn');
  saveSettingsBtn = getEl('saveSettingsBtn');
  apiKeyInput = getEl('apiKeyInput');
  modelSelect = getEl('modelSelect');
  messagesContainer = getEl('messagesContainer');
  historyBtn = getEl('historyBtn');
  historySidebar = getEl('historySidebar');
  closeHistoryBtn = getEl('closeHistoryBtn');
  historyList = getEl('historyList');
  clearHistoryBtn = getEl('clearHistoryBtn');
  clearBtn = getEl('clearBtn');
  pasteTextBtn = getEl('pasteTextBtn');
  pasteTextInput = getEl('pasteTextInput');
  sourcePageBtn = getEl('sourcePageBtn');
  sourcePastedBtn = getEl('sourcePastedBtn');
  sourceBothBtn = getEl('sourceBothBtn');
  textSourceIndicator = getEl('textSourceIndicator');
  askPastedBtn = getEl('askPastedBtn');
  summarizePastedBtn = getEl('summarizePastedBtn');
  clearPastedBtn = getEl('clearPastedBtn');

  const widgetEl = shadowRoot.getElementById('gemini-widget');
  const widgetHeader = shadowRoot.getElementById('widgetHeader');
  const widgetMinimizeBtn = shadowRoot.getElementById('widgetMinimizeBtn');
  const widgetCloseBtn = shadowRoot.getElementById('widgetCloseBtn');
  const widgetResizeHandle = shadowRoot.getElementById('widgetResizeHandle');

  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.widgetPos,
    STORAGE_KEYS.widgetSize,
    STORAGE_KEYS.widgetMinimized
  ]);

  if (stored[STORAGE_KEYS.widgetPos]) {
    widgetEl.style.left = stored[STORAGE_KEYS.widgetPos].x + 'px';
    widgetEl.style.top = stored[STORAGE_KEYS.widgetPos].y + 'px';
    widgetEl.style.bottom = 'auto';
    widgetEl.style.right = 'auto';
  }
  if (stored[STORAGE_KEYS.widgetSize]) {
    widgetEl.style.width = stored[STORAGE_KEYS.widgetSize].width + 'px';
    widgetEl.style.height = stored[STORAGE_KEYS.widgetSize].height + 'px';
  }
  if (stored[STORAGE_KEYS.widgetMinimized]) {
    widgetMinimized = true;
    widgetEl.classList.add('minimized');
    widgetMinimizeBtn.textContent = '+';
  }

  summarizeBtn.addEventListener('click', () => void summarizePage());
  sendBtn.addEventListener('click', () => void sendQuestion());
  clearBtn.addEventListener('click', () => startNewConversation());
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', () => void saveSettings());
  questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') void sendQuestion();
  });
  pasteTextBtn.addEventListener('click', togglePasteSection);
  pasteTextInput.addEventListener('input', () => {
    const wasEmpty = !pastedText || !pastedText.trim();
    pastedText = pasteTextInput.value;
    const isEmpty = !pastedText.trim();
    if (wasEmpty && !isEmpty) {
      setTextSource('pasted');
    } else {
      refreshTextSourceControls();
      saveCurrentConversation();
    }
  });
  askPastedBtn.addEventListener('click', () => {
    if (!pastedText || !pastedText.trim()) {
      showError('Please paste some text first');
      return;
    }
    setTextSource('pasted');
    questionInput.focus();
    questionInput.placeholder = 'Ask about the pasted text...';
  });
  summarizePastedBtn.addEventListener('click', () => {
    if (!pastedText || !pastedText.trim()) {
      showError('Please paste some text first');
      return;
    }
    void summarizePastedText();
  });
  clearPastedBtn.addEventListener('click', () => {
    pasteTextInput.value = '';
    pastedText = '';
    refreshTextSourceControls();
    saveCurrentConversation();
  });
  sourcePageBtn.addEventListener('click', () => setTextSource('page'));
  sourcePastedBtn.addEventListener('click', () => setTextSource('pasted'));
  sourceBothBtn.addEventListener('click', () => setTextSource('both'));
  historyBtn.addEventListener('click', openHistory);
  closeHistoryBtn.addEventListener('click', closeHistory);
  clearHistoryBtn.addEventListener('click', clearAllHistory);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal || e.target.classList.contains('avo-modal-overlay')) {
      closeSettings();
    }
  });
  
  let isDragging = false;
  let offsetX, offsetY;
  widgetHeader.addEventListener('mousedown', (e) => {
    if (e.target.closest('.gemini-widget-controls')) return;
    isDragging = true;
    const rect = widgetEl.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;
    x = Math.max(0, Math.min(x, window.innerWidth - widgetEl.offsetWidth));
    y = Math.max(0, Math.min(y, window.innerHeight - widgetEl.offsetHeight));
    widgetEl.style.left = x + 'px';
    widgetEl.style.top = y + 'px';
    widgetEl.style.bottom = 'auto';
    widgetEl.style.right = 'auto';
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      const rect = widgetEl.getBoundingClientRect();
      chrome.storage.local.set({ [STORAGE_KEYS.widgetPos]: { x: rect.left, y: rect.top } });
    }
  });

  let isResizing = false;
  widgetResizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const rect = widgetEl.getBoundingClientRect();
    let width = Math.max(300, e.clientX - rect.left);
    let height = Math.max(400, e.clientY - rect.top);
    widgetEl.style.width = width + 'px';
    widgetEl.style.height = height + 'px';
  });

  window.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      const rect = widgetEl.getBoundingClientRect();
      chrome.storage.local.set({ [STORAGE_KEYS.widgetSize]: { width: rect.width, height: rect.height } });
    }
  });

  widgetMinimizeBtn.addEventListener('click', () => {
    widgetMinimized = !widgetMinimized;
    widgetEl.classList.toggle('minimized', widgetMinimized);
    widgetMinimizeBtn.textContent = widgetMinimized ? '+' : '−';
    chrome.storage.local.set({ [STORAGE_KEYS.widgetMinimized]: widgetMinimized });
  });

  widgetCloseBtn.addEventListener('click', () => {
    toggleWidget(false);
  });

  await appInit();
}

async function toggleWidget(force) {
  if (!widget) {
    await initWidget();
    widgetVisible = true;
  }
  const widgetEl = shadowRoot.getElementById('gemini-widget');
  widgetVisible = force !== undefined ? force : !widgetVisible;
  widgetEl.style.display = widgetVisible ? 'flex' : 'none';
  if (widgetVisible) {
    questionInput.focus();
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageText') {
    void (async () => {
      try {
        const pageText = await extractPageContent();
        sendResponse({ pageText });
      } catch (err) {
        sendResponse({ pageText: '' });
      }
    })();
    return true;
  }
  
  if (request.action === 'toggleWidget') {
    if (window.top === window.self) {
      void toggleWidget();
    }
    return true;
  }
});
