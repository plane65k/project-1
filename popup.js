class AvoAssistant {
  constructor() {
    this.chatArea = document.getElementById('chatArea');
    this.userInput = document.getElementById('userInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.loading = document.getElementById('loading');
    this.errorMessage = document.getElementById('errorMessage');
    this.summarizeBtn = document.getElementById('summarizeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    
    this.pageContent = '';
    this.conversationHistory = [];
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadPageContent();
    this.loadApiKey();
  }

  setupEventListeners() {
    // Send message on button click
    this.sendBtn.addEventListener('click', () => this.handleSendMessage());
    
    // Send message on Enter key
    this.userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSendMessage();
      }
    });

    // Summarize page
    this.summarizeBtn.addEventListener('click', () => this.summarizePage());
    
    // Clear chat
    this.clearBtn.addEventListener('click', () => this.clearChat());
    
    // Focus input on load
    this.userInput.focus();
  }

  async loadPageContent() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Check if content script is injected, if not, inject it
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      } catch {
        // Content script not injected, inject it
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      }

      // Get page content
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
      
      if (response && response.content) {
        this.pageContent = response.content;
        console.log('Page content loaded successfully. Length:', this.pageContent.length);
      } else {
        throw new Error('Failed to extract page content');
      }
    } catch (error) {
      console.error('Error loading page content:', error);
      this.showError('Failed to load page content');
    }
  }

  async loadApiKey() {
    try {
      const result = await chrome.storage.sync.get(['openRouterApiKey']);
      this.apiKey = result.openRouterApiKey || null;
    } catch (error) {
      console.error('Error loading API key:', error);
      this.apiKey = null;
    }
  }

  getApiKey() {
    return this.apiKey || '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';
  }

  async handleSendMessage() {
    const message = this.userInput.value.trim();
    
    if (!message) return;

    if (!this.pageContent) {
      this.showError('Page content not loaded yet. Please wait...');
      return;
    }

    // Add user message to chat
    this.addMessage(message, 'user');
    this.userInput.value = '';
    this.userInput.disabled = true;
    this.sendBtn.disabled = true;

    // Show loading
    this.showLoading(true);

    try {
      // Get AI response
      const response = await this.askQuestion(message);
      
      // Add AI response to chat
      this.addMessage(response, 'ai');
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      this.showError(error.message || 'Failed to get response from AI');
    } finally {
      this.showLoading(false);
      this.userInput.disabled = false;
      this.sendBtn.disabled = false;
      this.userInput.focus();
    }
  }

  async summarizePage() {
    if (!this.pageContent) {
      this.showError('Page content not loaded yet. Please wait...');
      return;
    }

    // Add system message
    this.addMessage('Summarizing this page...', 'system');
    this.showLoading(true);
    this.summarizeBtn.disabled = true;

    try {
      const summary = await this.callOpenRouter(
        this.pageContent,
        'Summarize this page content in a clear, concise way. Focus on the main points and key information.'
      );
      
      this.addMessage(`📄 **Page Summary**\n\n${summary}`, 'ai');
      
    } catch (error) {
      console.error('Error summarizing page:', error);
      this.showError(error.message || 'Failed to summarize page');
    } finally {
      this.showLoading(false);
      this.summarizeBtn.disabled = false;
    }
  }

  async askQuestion(question) {
    return await this.callOpenRouter(this.pageContent, question);
  }

  async callOpenRouter(content, question) {
    const apiKey = this.getApiKey();
    
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant that answers questions about web page content. Be concise, accurate, and helpful. When summarizing or answering questions, focus on extracting key information clearly.'
      },
      {
        role: 'user',
        content: `Page content:\n${content.substring(0, 8000)}\n\nQuestion: ${question}`
      }
    ];

    const response = await fetch('https://openrouter.io/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-2-70b-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid API response format');
    }

    return data.choices[0].message.content;
  }

  addMessage(content, sender) {
    // Remove welcome message on first message
    const welcome = this.chatArea.querySelector('.avo-welcome');
    if (welcome) {
      welcome.remove();
    }

    // Remove system messages
    if (sender === 'system') {
      const systemMessage = this.chatArea.querySelector('.avo-message-system');
      if (systemMessage) {
        systemMessage.remove();
      }
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `avo-message avo-message-${sender}`;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      <div class="avo-message-content">
        ${this.formatMessage(content)}
      </div>
      <div class="avo-timestamp">${timestamp}</div>
    `;

    if (sender === 'ai') {
      // Add copy button for AI messages
      const copyBtn = document.createElement('button');
      copyBtn.className = 'avo-copy-btn';
      copyBtn.innerHTML = '📋 Copy';
      copyBtn.addEventListener('click', () => this.copyToClipboard(content));
      messageDiv.querySelector('.avo-message-content').appendChild(copyBtn);
    }

    if (sender === 'system') {
      messageDiv.classList.add('avo-message-system');
    }

    this.chatArea.appendChild(messageDiv);
    this.chatArea.scrollTop = this.chatArea.scrollHeight;
  }

  formatMessage(content) {
    // Convert markdown-like bold text to HTML
    return content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                  .replace(/\n/g, '<br>');
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showError('Copied to clipboard!', 'success');
      setTimeout(() => this.hideError(), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      this.showError('Failed to copy to clipboard');
    }
  }

  clearChat() {
    this.chatArea.innerHTML = `
      <div class="avo-welcome">
        <div class="avo-welcome-icon">🤖</div>
        <h2>Welcome to avo</h2>
        <p>Your AI assistant for understanding web content</p>
      </div>
    `;
    this.conversationHistory = [];
    this.hideError();
  }

  showLoading(show) {
    this.loading.classList.toggle('avo-hidden', !show);
  }

  showError(message, type = 'error') {
    this.errorMessage.textContent = message;
    this.errorMessage.className = `avo-error avo-${type}`;
    this.errorMessage.classList.remove('avo-hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.hideError(), 5000);
  }

  hideError() {
    this.errorMessage.classList.add('avo-hidden');
  }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AvoAssistant();
});