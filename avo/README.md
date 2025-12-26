# avo

avo is an AI page analyzer Chrome extension with a Material 3-inspired design.

## Features

- **Clean Material 3 UI** - Green and white color palette matching Google's design language
- **OpenRouter API Integration** - Connect to multiple AI models (GPT-4, Claude, Llama, etc.)
- **Page Summarization** - Get concise summaries of any webpage
- **Q&A with Context** - Ask questions about page content with conversation history
- **Persistent Settings** - API key and model selection saved to chrome.storage.sync
- **Smart Content Extraction** - Extracts readable text from any webpage

## Setup

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `avo/` folder in this repository

## Usage

1. Click the **avo** extension icon to open the popup
2. Click the **Settings** (⚙️) button and paste your OpenRouter API key
3. Choose an AI model from the dropdown
4. Click **Save**
5. Use **Summarize Page** to get a quick summary, or type questions in the input field

## Getting an API Key

1. Visit [openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up or log in
3. Generate a new API key (starts with `sk-or-v1-`)
4. Copy and paste it into the extension settings

## Available Models

- **OpenAI**: GPT-4, GPT-3.5 Turbo
- **Meta**: Llama 2 70B, Llama 2 13B
- **Anthropic**: Claude 2, Claude Instant
- **Mistral**: Mistral 7B Instruct

## Notes

- Settings persist and sync across Chrome instances when signed in
- Some pages (Chrome Web Store, internal pages) may block content scripts
- All API calls use the correct OpenRouter endpoint: `https://openrouter.ai/api/v1/chat/completions`

## Tech Stack

- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- Material 3 Design System
- OpenRouter API
