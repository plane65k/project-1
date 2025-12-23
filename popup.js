// Gemini AI Assistant - Popup Script
class GeminiAssistant {
    constructor() {
        this.messages = [];
        this.pageContent = '';
        this.settings = {
            apiKey: '',
            model: 'meta-llama/llama-2-70b-chat'
        };
        
        this.init();
    }

    async init() {
        this.loadSettings();
        this.setupEventListeners();
        this.loadPageContent();
        this.autoResizeTextarea();
    }

    setupEventListeners() {
        // Send message
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', () => this.autoResizeTextarea());

        // Summarize button
        document.getElementById('summarizeBtn').addEventListener('click', () => this.summarizePage());

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancelSettings').addEventListener('click', () => this.hideSettings());

        // Close modal on backdrop click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.hideSettings();
            }
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['apiKey', 'model']);
            this.settings.apiKey = result.apiKey || '';
            this.settings.model = result.model || 'meta-llama/llama-2-70b-chat';
            
            // Update UI with loaded settings
            document.getElementById('apiKey').value = this.settings.apiKey;
            document.getElementById('model').value = this.settings.model;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        const apiKey = document.getElementById('apiKey').value.trim();
        const model = document.getElementById('model').value;

        if (!apiKey) {
            this.showError('Please enter an OpenRouter API key');
            return;
        }

        try {
            await chrome.storage.sync.set({ apiKey, model });
            this.settings.apiKey = apiKey;
            this.settings.model = model;
            this.hideSettings();
            this.showSuccess('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    showSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
        document.getElementById('apiKey').value = this.settings.apiKey;
        document.getElementById('model').value = this.settings.model;
    }

    hideSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    async loadPageContent() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
            
            if (response && response.content) {
                this.pageContent = response.content;
                console.log('Page content loaded:', this.pageContent.length, 'characters');
            } else {
                this.showError('Unable to extract page content');
            }
        } catch (error) {
            console.error('Error loading page content:', error);
            this.showError('Failed to load page content');
        }
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        if (!this.settings.apiKey) {
            this.showError('Please set your OpenRouter API key first');
            this.showSettings();
            return;
        }

        if (!this.pageContent) {
            this.showError('No page content available');
            return;
        }

        // Clear input and hide welcome message
        input.value = '';
        this.hideWelcomeMessage();
        this.autoResizeTextarea();

        // Add user message
        this.addMessage('user', message);
        
        // Show loading
        this.showLoading();

        try {
            const response = await this.callOpenRouter(message);
            this.hideLoading();
            this.addMessage('assistant', response);
        } catch (error) {
            this.hideLoading();
            this.addMessage('assistant', `Error: ${error.message}`);
        }
    }

    async summarizePage() {
        if (!this.settings.apiKey) {
            this.showError('Please set your OpenRouter API key first');
            this.showSettings();
            return;
        }

        if (!this.pageContent) {
            this.showError('No page content available');
            return;
        }

        this.hideWelcomeMessage();
        this.addMessage('user', 'Please summarize this page');
        this.showLoading();

        try {
            const response = await this.callOpenRouter('Please provide a concise summary of the main content and key points from this page.');
            this.hideLoading();
            this.addMessage('assistant', response);
        } catch (error) {
            this.hideLoading();
            this.addMessage('assistant', `Error: ${error.message}`);
        }
    }

    async callOpenRouter(message) {
        const prompt = `You are an AI assistant helping a user understand a web page. The user is asking about the following page content:

---
${this.pageContent.substring(0, 8000)}
---

User question: ${message}

Please provide a helpful response based on the page content. If the content doesn't contain relevant information, please say so politely.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`,
                'HTTP-Referer': 'https://gemini-assistant.chrome-extension',
                'X-Title': 'Gemini AI Assistant'
            },
            body: JSON.stringify({
                model: this.settings.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid API response format');
        }

        return data.choices[0].message.content.trim();
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('messages');
        const messageId = Date.now().toString();
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        messageElement.dataset.messageId = messageId;
        
        const avatar = role === 'user' ? 'U' : 'AI';
        
        messageElement.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">${this.escapeHtml(content)}</div>
                ${role === 'assistant' ? `
                    <div class="message-actions">
                        <button class="copy-btn" onclick="geminiAssistant.copyMessage('${messageId}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.messages.push({ role, content, id: messageId });
    }

    copyMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            navigator.clipboard.writeText(message.content).then(() => {
                this.showSuccess('Message copied to clipboard');
            }).catch(() => {
                this.showError('Failed to copy message');
            });
        }
    }

    hideWelcomeMessage() {
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ea4335' : type === 'success' ? '#34a853' : '#1a73e8'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    autoResizeTextarea() {
        const textarea = document.getElementById('messageInput');
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translate(-50%, -20px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -20px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize the app
const geminiAssistant = new GeminiAssistant();