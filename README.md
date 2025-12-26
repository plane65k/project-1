# avo - AI Page Assistant

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![OpenRouter](https://img.shields.io/badge/Powered%20by-OpenRouter-purple.svg)](https://openrouter.ai)

avo is a powerful Chrome extension that brings AI-powered content analysis to your browsing experience. Extract, summarize, and ask questions about any web page content with a clean, Gemini-inspired interface.

## 🚀 Features

- **Page Summarization**: Get concise summaries of any web page with a single click
- **Smart Q&A**: Ask questions about page content and get intelligent answers
- **Clean UI**: Google Gemini-inspired design with smooth animations
- **Copy to Clipboard**: Easily copy AI responses for later use
- **Real-time Processing**: Extracts page content instantly when you open the extension
- **Error Handling**: Robust error handling with clear user feedback
- **Loading States**: Smooth animations while AI processes your requests

## 🛠️ Installation

### Option 1: Load Unpacked Extension

1. **Clone or download** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **The avo icon** will appear in your Chrome toolbar

### Option 2: Install from Chrome Web Store

*(Coming soon - currently in development)*

## 🔧 Configuration

### API Key Setup (Optional)

The extension comes pre-configured with an OpenRouter API key for testing. For production use:

1. **Get your API key** from [OpenRouter](https://openrouter.ai/keys)
2. **Open the extension** popup
3. **The extension will automatically prompt you** to add your API key
4. **Your key is stored securely** in Chrome's sync storage

## 🎯 Usage

### Basic Usage

1. **Navigate to any webpage** (news articles, blogs, docs, etc.)
2. **Click the avo extension icon** in your Chrome toolbar
3. **The page content is automatically extracted** and ready for analysis

### Summarize a Page

1. **Open avo** on the page you want to summarize
2. **Click "Summarize Page"** button
3. **Wait a few seconds** for the AI to process
4. **Read your summary** - it's copied to the chat area

### Ask Questions

1. **Open avo** on any page
2. **Type your question** in the input field
3. **Press Enter or click send** (paper airplane icon)
4. **Get instant answers** based on the page content

#### Example Questions

- "What are the main points of this article?"
- "Summarize the key findings"
- "What products are mentioned?"
- "Who is the author and what are their credentials?"
- "What are the pros and cons discussed?"

### Copy Responses

- **Click the "📋 Copy" button** below any AI response
- **Content is copied to clipboard** with a confirmation message

### Clear Chat

- **Click "Clear Chat"** to start fresh
- **Removes all messages** and conversation history
- **Page content remains loaded** for new questions

## 🏗️ Architecture

```
├── manifest.json          # Extension manifest (Manifest V3)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic and API integration
├── content.js            # Page content extraction
├── styles.css            # Styling (Gemini-inspired)
├── icons/                # Extension icons (16px, 48px, 128px)
└── README.md            # This file
```

## 🎨 Design Philosophy

- **Clean & Minimal**: Inspired by Google's Material Design
- **Gemini-like UI**: Familiar chat interface with smooth animations
- **User-Friendly**: Intuitive controls and clear feedback
- **Responsive**: Works across different screen sizes

## 🧠 Tech Stack

- **Chrome Extension Manifest V3**: Modern extension architecture
- **Vanilla JavaScript**: No frameworks, pure ES6+ JavaScript
- **OpenRouter API**: Multiple AI models (Llama 2 70B, GPT-3.5, etc.)
- **CSS3**: Modern styling with animations
- **Chrome Storage API**: Secure API key storage

## 🔒 Security & Privacy

- **API keys stored locally** in Chrome's secure storage
- **No data transmitted** except to OpenRouter API
- **No tracking or analytics**
- **Open source** - code is transparent and auditable

## 📊 Performance

- **Lightweight**: < 50KB total extension size
- **Fast**: Page content extraction in < 1 second
- **Efficient**: Truncates content to ~8000 characters for optimal API usage
- **Responsive**: Smooth 60fps animations

## 🛡️ Error Handling

- **Network errors**: Clear error messages for API failures
- **Content extraction**: Fallbacks for various page structures
- **Rate limiting**: Automatic handling of API rate limits
- **Timeout protection**: Request timeouts to prevent hanging

## 🌟 Roadmap

- [ ] Dark mode support
- [ ] Conversation history
- [ ] Export chat as PDF/TXT
- [ ] Multiple AI model selection
- [ ] Custom prompt templates
- [ ] Keyboard shortcuts
- [ ] Context menu integration
- [ ] Mobile browser support

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter** for providing the AI API infrastructure
- **Google** for UI design inspiration
- **Chrome Extension team** for the excellent documentation

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/avo/issues)
- **Documentation**: Check this README and inline code comments
- **Contact**: [your-email@example.com](mailto:your-email@example.com)

## ⚠️ Important Notes

- **API Key**: The included API key is for testing purposes. For heavy usage, get your own key at [OpenRouter](https://openrouter.ai/keys).
- **Rate Limits**: Be mindful of API rate limits. The extension handles errors gracefully but frequent requests may be throttled.
- **Content Length**: Pages longer than ~8000 characters are truncated to ensure API compatibility.

---

**Happy browsing with AI!** 🚀

*avo - Making the web smarter, one page at a time.*