# avo - Advanced AI Page Analyzer

A powerful Chrome extension that uses AI to analyze, summarize, and answer questions about web pages with intelligent text highlighting and conversation memory.

## Features

### Core Capabilities
- **Smart Page Summarization**: Generate concise summaries of any web page content
- **AI-Powered Q&A**: Ask questions about page content and get intelligent responses
- **Conversation Memory**: Full conversation history is maintained within sessions
- **Gemini-Inspired UI**: Clean, minimal interface with smooth animations

### Advanced Text Navigation
- **Smart Highlighting**: Automatically highlights relevant text from AI responses on the page
- **Scroll to Text**: Smooth scrolling to highlighted sections
- **Customizable Colors**: Choose your preferred highlight color
- **Auto-Highlight Toggle**: Enable/disable automatic text highlighting in settings
- **Visual Feedback**: Highlighted text with hover effects and active states

### User Experience
- **Recent Messages Panel**: Quick access to conversation history
- **Clear Conversation**: Reset conversation with one click
- **Copy Responses**: Copy any AI response to clipboard
- **Loading States**: Professional loading indicators with smooth animations
- **Error Handling**: Clear, helpful error messages
- **Responsive Design**: Works on various screen sizes

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension directory
5. The "avo" icon should now appear in your Chrome toolbar

## Setup

### Get an OpenRouter API Key

1. Visit [OpenRouter.io](https://openrouter.io)
2. Sign up for a free account
3. Navigate to API keys section
4. Copy your API key

### Configure avo

1. Click the avo extension icon
2. Click the settings button (gear icon)
3. Paste your OpenRouter API key
4. (Optional) Select your preferred AI model
5. (Optional) Customize highlight color
6. Click "Save"

## Usage

### Summarize a Page
1. Open any web page
2. Click the avo extension icon
3. Click the summarize button (document icon)
4. avo will analyze the page and provide a summary

### Ask Questions
1. Open any web page
2. Click the avo extension icon
3. Type your question in the input field
4. Press Enter or click the send button
5. View the AI response and any highlighted text

### Highlight Text
- When enabled, avo automatically highlights relevant text from AI responses
- Highlights are shown in yellow by default (customizable in settings)
- Highlighted text automatically scrolls into view
- Click on highlighted text to jump to it

### Manage Conversation
- View recent messages in the "Recent Messages" panel
- Click any recent message to scroll to it in the conversation
- Click the clear button (trash icon) to reset the conversation
- Conversation history is maintained within your session

## Advanced Features

### Conversation Context
- Full conversation history is included in each AI request
- The AI understands previous messages and maintains context
- System context includes the page content for accurate responses

### Text Highlighting System
- Intelligent text matching (case-insensitive)
- Supports multiple simultaneous highlights
- Prevents double-highlighting of text
- Smooth scroll animation to highlighted sections
- Temporary visual feedback when scrolling

### Settings & Customization
- **API Key**: Securely stored in Chrome storage
- **Model Selection**: Choose from multiple AI models:
  - Llama 2 70B (default)
  - GPT-3.5 Turbo
  - Claude 2
- **Highlight Color**: Pick any color for text highlights
- **Auto-Highlight**: Enable/disable automatic highlighting

## Supported AI Models

- **Llama 2 70B** (Default) - Fast and efficient
- **GPT-3.5 Turbo** - OpenAI's fast model
- **Claude 2** - Anthropic's powerful model

Models are provided by [OpenRouter](https://openrouter.io), which supports 100+ open and commercial models.

## How It Works

### Content Extraction
1. avo analyzes the current page
2. Removes clutter (ads, navigation, scripts)
3. Extracts main content intelligently
4. Limits content to 8,000 characters for optimal API performance

### AI Analysis
1. Sends page content and your message to OpenRouter
2. Includes conversation history for context
3. Receives and displays AI response
4. Auto-highlights relevant text on the page

### Text Highlighting
1. Scans the page content for matches
2. Highlights all occurrences of matched text
3. Automatically scrolls first highlight into view
4. Provides visual feedback for user interaction

## Privacy & Security

- **No Data Collection**: avo doesn't collect or share your data
- **Secure Storage**: API keys are stored in Chrome's secure storage
- **HTTPS Only**: All communication with OpenRouter uses HTTPS
- **No Tracking**: No analytics or tracking code
- **Content Privacy**: Page content is only sent when you request analysis

## Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension API
- **ES6+ JavaScript**: Clean, maintainable code
- **Content Scripts**: Page analysis and highlighting
- **Background Service Worker**: Memory management
- **Chrome Storage API**: Secure settings storage

### File Structure
```
avo/
├── manifest.json         # Extension configuration
├── popup.html            # UI structure
├── popup.js              # Main application logic
├── content.js            # Page analysis and highlighting
├── background.js         # Service worker for memory
├── styles.css            # Modern styling
├── icon16.png            # Extension icon (16x16)
├── icon48.png            # Extension icon (48x48)
├── icon128.png           # Extension icon (128x128)
└── README.md             # This file
```

## Troubleshooting

### "No page content available"
- Some pages may have content protection
- Try opening a different web page
- Make sure the page has loaded completely

### Highlights not appearing
- Check that "Auto-highlight" is enabled in settings
- Try manually highlighting by asking a question
- Some pages may have CSP restrictions

### API errors
- Verify your OpenRouter API key is correct
- Check your API key has sufficient credits
- Try a different AI model
- Check your internet connection

### Page content extraction fails
- Some pages are protected or have unusual layouts
- Try refreshing the page and reopening avo
- Complex single-page applications may need time to load

## Keyboard Shortcuts

- **Enter**: Send message (in input field)
- **Shift+Enter**: New line (in input field)

## Tips & Best Practices

1. **Ask Specific Questions**: More specific questions yield better results
2. **Summarize First**: Start with summarize to understand page structure
3. **Follow-up Questions**: Use conversation context for detailed analysis
4. **Manage History**: Clear conversation when switching pages
5. **Try Different Models**: Different models excel at different tasks

## Support

For issues, suggestions, or contributions, please open an issue or submit a pull request.

## License

This project is open source and available under the MIT License.

## Credits

- **UI Design**: Inspired by Google Gemini's clean interface
- **AI Models**: Powered by [OpenRouter](https://openrouter.io)
- **Icons**: Material Design Icons

## Changelog

### Version 2.0.0
- Complete rebranding from "Gemini Assistant" to "avo"
- Advanced text highlighting and navigation features
- Conversation memory system
- Improved UI with conversation history panel
- Customizable highlight colors
- Enhanced error handling
- Better content extraction
- Multiple AI model support

---

**avo** - Making web pages more interactive and understandable through AI.
