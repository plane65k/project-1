# avo

avo is a Google Gemini-inspired AI page analyzer Chrome extension.

## Features

- Extracts readable text from the current page (no HTML tags)
- Persistent settings (stored in `chrome.storage.sync`):
  - OpenRouter API key
  - Model selection
- Page summarization
- Q&A with in-popup conversation history

## Setup

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `avo/` folder in this repository

## Usage

1. Click the **avo** extension icon to open the popup.
2. Click **⚙️ Settings** and paste your OpenRouter API key.
3. Choose an AI model.
4. Click **Summarize Page** or ask questions in the input field.

## Notes

- Settings persist and sync across Chrome instances when signed in.
- Some pages (e.g. Chrome Web Store / internal pages) may block content scripts, preventing text extraction.
