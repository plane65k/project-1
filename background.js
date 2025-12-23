// avo - Background Service Worker
// Manages conversation memory and cross-tab communication

const CONVERSATION_MEMORY_KEY = 'avo_conversation_memory';
const MAX_MEMORIES = 50; // Keep last 50 messages

// Store conversation history in background service worker memory
let conversationHistory = [];

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveMessage') {
        addMessageToHistory(request.role, request.content);
        sendResponse({ success: true, messageCount: conversationHistory.length });
    } else if (request.action === 'getConversationHistory') {
        sendResponse({ messages: conversationHistory });
    } else if (request.action === 'clearConversation') {
        conversationHistory = [];
        sendResponse({ success: true });
    } else if (request.action === 'highlightTextOnPage') {
        highlightTextOnPage(request.searchText, request.tabId);
        sendResponse({ success: true });
    } else if (request.action === 'scrollToText') {
        scrollToTextOnPage(request.searchText, request.tabId);
        sendResponse({ success: true });
    }
    return true;
});

function addMessageToHistory(role, content) {
    const timestamp = new Date().toISOString();
    conversationHistory.push({
        role,
        content,
        timestamp,
        id: Date.now().toString()
    });

    // Keep only recent messages
    if (conversationHistory.length > MAX_MEMORIES) {
        conversationHistory = conversationHistory.slice(-MAX_MEMORIES);
    }
}

function getConversationContext() {
    // Return formatted conversation history for API context
    return conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

async function highlightTextOnPage(searchText, tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'highlightText',
            searchText: searchText
        });
    } catch (error) {
        console.error('Error highlighting text:', error);
    }
}

async function scrollToTextOnPage(searchText, tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'scrollToText',
            searchText: searchText
        });
    } catch (error) {
        console.error('Error scrolling to text:', error);
    }
}

// Initialize with default settings
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        const defaultSettings = {
            apiKey: '',
            model: 'meta-llama/llama-2-70b-chat',
            highlightColor: '#FFEB3B',
            autoHighlight: true
        };
        await chrome.storage.sync.set(defaultSettings);
    }
});
