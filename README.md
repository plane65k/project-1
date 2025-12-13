# SecondThought Chrome Extension

A Chrome extension that helps you make better purchasing decisions by detecting prices and urgency signals on Amazon product pages.

## Features

- **Smart Price Detection**: Uses Amazon-specific DOM selectors to accurately detect product prices
- **Urgency Signal Detection**: Identifies marketing tactics like "limited time", "deal of the day", etc.
- **Clean UI**: Slide-in panel with smooth animations
- **Interactive Questions**: Expandable sections to help you think through purchases
- **Product Page Detection**: Only activates on Amazon product pages

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked"
4. Select the directory containing this extension
5. The SecondThought extension should now appear in your extensions list

## Usage

1. Navigate to any Amazon product page (e.g., amazon.com/dp/[product-id])
2. Click the purple thought bubble button (💭) in the bottom-right corner
3. The panel will slide in from the right showing:
   - Detected product price
   - Any urgency signals found on the page
   - Questions to help you make a thoughtful decision
4. Click the × button or the toggle button again to close the panel

## Files

- `manifest.json` - Chrome extension manifest (MV3)
- `content.js` - Main content script with price detection and UI logic
- `style.css` - Panel styling with animations
- `icon16.png`, `icon48.png`, `icon128.png` - Extension icons

## Price Detection Strategy

1. **Primary Method**: DOM selectors specific to Amazon's price elements
   - `#priceblock_ourprice`
   - `#priceblock_dealprice`
   - `.a-price .a-offscreen`
   - `[data-a-price-whole]`
   - And more...

2. **Fallback Method**: Regex pattern matching for currency symbols ($, £, €, ¥)

## Supported Amazon Domains

- amazon.com
- amazon.co.uk
- amazon.ca
- amazon.de
- amazon.fr
- amazon.it
- amazon.es

## Requirements

- Chrome browser (Manifest V3 compatible)
- Tested on Chrome version 88+

## License

MIT
