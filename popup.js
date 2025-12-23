// avo - Advanced AI Page Analyzer
class AvoAssistant {
    constructor() {
        this.messages = [];
        this.pageContent = '';
        this.currentTab = null;
        this.settings = {
            apiKey: '',
            model: 'meta-llama/llama-2-70b-chat',
            highlightColor: '#FFEB3B',
            autoHighlight: true
        };
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.getCurrentTab();
        this.setupEventListeners();
        this.loadPageContent();
        this.autoResizeTextarea();
    }

    async getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tab;
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        messageInput.addEventListener('input', () => this.autoResizeTextarea());

        document.getElementById('summarizeBtn').addEventListener('click', () => this.summarizePage());
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearConversation());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancelSettings').addEventListener('click', () => this.hideSettings());

        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.hideSettings();
            }
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['apiKey', 'model', 'highlightColor', 'autoHighlight']);
            this.settings.apiKey = result.apiKey || '';
            this.settings.model = result.model || 'meta-llama/llama-2-70b-chat';
            this.settings.highlightColor = result.highlightColor || '#FFEB3B';
            this.settings.autoHighlight = result.autoHighlight !== false;
            
            document.getElementById('apiKey').value = this.settings.apiKey;
            document.getElementById('model').value = this.settings.model;
            document.getElementById('highlightColor').value = this.settings.highlightColor;
            document.getElementById('autoHighlight').checked = this.settings.autoHighlight;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        const apiKey = document.getElementById('apiKey').value.trim();
        const model = document.getElementById('model').value;
        const highlightColor = document.getElementById('highlightColor').value;
        const autoHighlight = document.getElementById('autoHighlight').checked;

        if (!apiKey) {
            this.showError('Please enter an OpenRouter API key');
            return;
        }

        try {
            await chrome.storage.sync.set({ apiKey, model, highlightColor, autoHighlight });
            this.settings.apiKey = apiKey;
            this.settings.model = model;
            this.settings.highlightColor = highlightColor;
            this.settings.autoHighlight = autoHighlight;
            this.hideSettings();
            this.showSuccess('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    showSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
    }

    hideSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    async loadPageContent() {
        try {
            const response = await chrome.tabs.sendMessage(this.currentTab.id, { action: 'getPageContent' });
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

        input.value = '';
        this.hideWelcomeMessage();
        this.autoResizeTextarea();

        this.addMessage('user', message);
        this.showLoading();

        try {
            const response = await this.callOpenRouter(message);
            this.hideLoading();
            this.addMessage('assistant', response);
            
            // Auto-highlight text if enabled
            if (this.settings.autoHighlight) {
                this.autoHighlightMatches(response);
            }
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
            
            if (this.settings.autoHighlight) {
                this.autoHighlightMatches(response);
            }
        } catch (error) {
            this.hideLoading();
            this.addMessage('assistant', `Error: ${error.message}`);
        }
    }

    async callOpenRouter(message) {
        const systemPrompt = `You are an advanced AI assistant helping users understand web pages. 
You have access to the page content and should provide accurate, helpful responses.
When you mention specific text or sections from the page, be precise and quote them if relevant.
Maintain context from previous messages in the conversation.`;

        const messages = [
            {
                role: 'system',
                content: systemPrompt + '\n\nPage content:\n' + this.pageContent.substring(0, 8000)
            },
            ...this.messages.filter(m => m.role !== 'system').map(m => ({
                role: m.role,
                content: m.content
            })),
            {
                role: 'user',
                content: message
            }
        ];

        const response = await fetch('https://openrouter.io/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`,
                'HTTP-Referer': 'https://avo.chrome-extension',
                'X-Title': 'avo - AI Page Analyzer'
            },
            body: JSON.stringify({
                model: this.settings.model,
                messages: messages,
                max_tokens: 1500,
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

    autoHighlightMatches(responseText) {
        try {
            const sentences = responseText.match(/[^.!?]+[.!?]+/g) || [];
            const textPieces = [];

            for (const sentence of sentences) {
                const words = sentence.trim().split(/\s+/).slice(0, 5).join(' ');
                if (words.length > 10) {
                    textPieces.push(words);
                }
            }

            if (textPieces.length > 0) {
                this.highlightTextOnPage(textPieces[0]);
            }
        } catch (error) {
            console.error('Error auto-highlighting:', error);
        }
    }

    highlightTextOnPage(searchText) {
        try {
            chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'highlightText',
                searchText: searchText,
                color: this.settings.highlightColor
            }).catch(error => console.error('Error highlighting text:', error));
        } catch (error) {
            console.error('Error in highlightTextOnPage:', error);
        }
    }

    scrollToText(searchText) {
        try {
            chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'scrollToText',
                searchText: searchText
            }).catch(error => console.error('Error scrolling to text:', error));
        } catch (error) {
            console.error('Error in scrollToText:', error);
        }
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('messages');
        const messageId = Date.now().toString();
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        messageElement.dataset.messageId = messageId;
        
        const avatar = role === 'user' ? 'You' : 'AI';
        
        const messageContent = this.parseMessageContent(content);
        
        messageElement.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">${messageContent}</div>
                ${role === 'assistant' ? `
                    <div class="message-actions">
                        <button class="copy-btn" onclick="avoAssistant.copyMessage('${messageId}')">
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
        this.updateConversationHistory();
    }

    parseMessageContent(content) {
        const div = document.createElement('div');
        div.textContent = content;
        return div.innerHTML;
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

    updateConversationHistory() {
        const historyList = document.getElementById('historyList');
        const recentMessages = this.messages.slice(-5);
        
        historyList.innerHTML = recentMessages.map((msg, idx) => `
            <div class="history-item" title="${msg.content}" onclick="avoAssistant.scrollToMessage('${msg.id}')">
                <strong>${msg.role === 'user' ? 'You:' : 'AI:'}</strong> ${msg.content.substring(0, 30)}...
            </div>
        `).join('');

        if (this.messages.length > 0) {
            document.getElementById('conversationHistory').classList.add('visible');
        }
    }

    scrollToMessage(messageId) {
        const element = document.querySelector(`[data-message-id="${messageId}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    clearConversation() {
        if (confirm('Are you sure you want to clear the conversation history?')) {
            this.messages = [];
            document.getElementById('messages').innerHTML = '';
            document.getElementById('conversationHistory').classList.remove('visible');
            this.showWelcomeMessage();
            this.showSuccess('Conversation cleared');
        }
    }

    hideWelcomeMessage() {
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    showWelcomeMessage() {
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
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
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ea4335' : type === 'success' ? '#34a853' : '#667eea'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    autoResizeTextarea() {
        const textarea = document.getElementById('messageInput');
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
}

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

const avoAssistant = new AvoAssistant();
