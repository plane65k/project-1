# Gemini AI Assistant Chrome Extension

A Google Gemini-inspired Chrome extension that provides AI-powered page summarization and Q&A capabilities using OpenRouter API.

## Features

- **Page Summarization**: Generate concise summaries of any webpage with one click
- **Q&A Interface**: Ask questions about the current page content
- **Gemini-Inspired UI**: Clean, modern interface similar to Google Gemini
- **Multiple AI Models**: Support for various models via OpenRouter (Llama 2, GPT-3.5, Claude 2)
- **Smart Content Extraction**: Intelligently extracts main content while filtering out navigation, ads, and boilerplate
- **Copy to Clipboard**: Easily copy AI responses
- **Secure API Key Storage**: Uses Chrome's secure storage for API keys

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your Chrome toolbar

## Setup

1. Click the Gemini AI Assistant icon in your toolbar
2. Click the settings button (gear icon) in the top right
3. Enter your OpenRouter API key
4. Choose your preferred AI model
5. Click "Save"

### Getting an OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Create an account or sign in
3. Navigate to the API keys section
4. Generate a new API key
5. Copy the key and paste it in the extension settings

## Usage

### Summarizing a Page

1. Navigate to any webpage
2. Click the extension icon to open the Gemini interface
3. Click the summarize button (document icon) in the input area
4. Wait for the AI to generate a summary

### Asking Questions

1. With the extension open, type your question in the input field
2. Press Enter or click the send button
3. The AI will respond based on the current page content

### Example Questions

- "What is the main topic of this page?"
- "Summarize the key findings mentioned"
- "What are the important dates mentioned?"
- "Explain the technical concepts discussed"
- "What are the author's main arguments?"

## Supported AI Models

- **Llama 2 70B** (Default) - Meta's large language model
- **GPT-3.5 Turbo** - OpenAI's fast and efficient model
- **Claude 2** - Anthropic's capable assistant model

## Technical Details

### Content Extraction

The extension intelligently extracts page content by:

- Identifying main content areas using semantic HTML5 elements
- Filtering out navigation, headers, footers, and advertisements
- Cleaning up boilerplate text and excessive whitespace
- Limiting content to 8,000 characters for optimal API performance

### Privacy & Security

- API keys are stored securely using Chrome's storage API
- Page content is only sent to OpenRouter API when you actively use the extension
- No data is stored or transmitted without your explicit action
- The extension works entirely locally except for API calls

### Browser Compatibility

- Chrome 88+
- Manifest V3 compliant
- Works on all websites (HTTP/HTTPS)

## File Structure

```
├── manifest.json          # Extension configuration
├── popup.html             # Main UI interface
├── popup.js               # UI logic and API integration
├── content.js             # Page content extraction
├── styles.css             # Gemini-inspired styling
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Development

### Building from Source

1. Clone the repository
2. Make changes to the source files
3. Load the extension in Chrome developer mode
4. Test your changes

### Key Components

- **popup.js**: Main application logic, API integration, UI management
- **content.js**: Content extraction and message passing
- **styles.css**: Complete UI styling with Google design language
- **manifest.json**: Extension permissions and configuration

## Troubleshooting

### Extension Not Loading

- Ensure Developer mode is enabled in Chrome
- Check that all files are in the same directory
- Verify manifest.json syntax is valid

### API Errors

- Confirm your OpenRouter API key is valid
- Check if you have sufficient API credits
- Verify internet connectivity
- Try switching to a different AI model

### Content Extraction Issues

- Some websites may block content extraction
- Try refreshing the page and reopening the extension
- Content extraction works best on article-style pages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

**Note**: This extension requires an active OpenRouter API subscription. API usage costs apply based on the models you choose.