# SecondThought - Installation Guide

## Quick Start

### 1. Load the Extension

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `SecondThought` directory (this folder)
6. The extension icon should appear in your extensions toolbar

### 2. Test the Extension

#### Option A: Use a Real Amazon Product Page
1. Go to any Amazon product page, for example:
   - https://www.amazon.com/dp/B08N5WRWNW
   - https://www.amazon.com/dp/B0BSHF7WHW
2. Look for the purple thought bubble (💭) button in the bottom-right corner
3. Click it to open the SecondThought panel

#### Option B: Use the Test HTML File
1. Open `test-amazon-page.html` in Chrome
2. Manually edit the URL in the address bar to include `/dp/` in the path
   - Example: `file:///path/to/dp/test-amazon-page.html`
3. Refresh the page
4. The toggle button should appear

### 3. Using the Extension

Once loaded on an Amazon product page:

1. **Toggle Button**: Click the purple thought bubble (💭) in the bottom-right
2. **Panel Opens**: Slides in from the right side
3. **View Information**:
   - **Detected Price**: Shows the current product price
   - **Urgency Signals**: Lists any marketing tactics detected
   - **Before You Buy**: Expandable questions to help you decide
4. **Close Panel**: Click the × button or click the toggle button again

### What You Should See

✅ **Detected Price Section**: Should show the product price (e.g., $89.99)

✅ **Urgency Signals**: Lists detected phrases like:
   - "limited time"
   - "deal of the day"
   - "only X left"
   - "hurry"
   - "ends soon"
   - etc.

✅ **Interactive Questions**: Three expandable sections:
   - "Do I really need this?"
   - "Is this the best price?"
   - "Am I being manipulated?"

### Troubleshooting

**Extension doesn't appear on the page:**
- Make sure you're on a URL containing `/dp/` or `/gp/product/`
- Check that the extension is enabled in `chrome://extensions/`
- Try refreshing the page

**Price not detected:**
- Some Amazon pages have different layouts
- The extension tries multiple selectors and falls back to regex
- Check the browser console (F12) for any errors

**Panel doesn't open:**
- Look for JavaScript errors in the console (F12)
- Make sure the toggle button is visible (check z-index issues)
- Try reloading the extension

### Console Logging

Open Chrome DevTools (F12) and check the Console tab. You should see:
```
SecondThought extension loaded
```

This confirms the content script is running.

### File Structure

```
SecondThought/
├── manifest.json          # Extension manifest (MV3)
├── content.js            # Main content script
├── style.css             # Panel styling
├── icon16.png            # 16x16 icon
├── icon48.png            # 48x48 icon
├── icon128.png           # 128x128 icon
├── README.md             # Documentation
├── INSTALLATION.md       # This file
└── test-amazon-page.html # Test page
```

### Supported Amazon Domains

- amazon.com (United States)
- amazon.co.uk (United Kingdom)
- amazon.ca (Canada)
- amazon.de (Germany)
- amazon.fr (France)
- amazon.it (Italy)
- amazon.es (Spain)

### Permissions

The extension requires:
- **activeTab**: To interact with the current tab
- **host_permissions**: To run on Amazon domains

No data is collected or sent anywhere. Everything runs locally in your browser.

### Next Steps

After confirming the extension works:
1. Use it on real Amazon product pages
2. Test the price detection accuracy
3. Check that urgency signals are properly identified
4. Ensure the UI is smooth and responsive

### Need Help?

If you encounter issues:
1. Check `chrome://extensions/` for error messages
2. Open DevTools Console (F12) for JavaScript errors
3. Verify you're on a valid Amazon product page URL
4. Try disabling and re-enabling the extension
