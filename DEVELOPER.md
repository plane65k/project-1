# Developer Guide

## Quick Reference

### File Overview

| File | Purpose | Lines |
|------|---------|-------|
| `manifest.json` | Chrome extension manifest (MV3) | 43 |
| `content.js` | Main content script with all logic | 264 |
| `style.css` | Complete styling for panel and button | 194 |
| `icon*.png` | Extension icons (16, 48, 128px) | - |

### Key Functions

#### `isAmazonProductPage()`
Checks if current URL contains `/dp/` or `/gp/product/`

#### `detectAmazonPrice()`
Primary price detection using 10 Amazon-specific DOM selectors, falls back to regex

#### `detectPriceWithRegex()`
Fallback method using regex patterns for $, £, €, ¥

#### `detectUrgencySignals()`
Scans page for 17 different urgency keywords/patterns

#### `createPanel()`
Builds and injects the slide-in panel into the DOM

#### `createToggleButton()`
Creates the floating button with thought bubble emoji

#### `togglePanel()`
Handles opening/closing animation and panel lifecycle

### DOM Elements

#### IDs
- `#secondthought-panel` - Main panel container
- `#secondthought-toggle` - Floating toggle button
- `#secondthought-close` - Close button in panel header

#### Classes
- `.secondthought-panel-open` - Applied when panel is visible
- `.secondthought-price` - Price display element
- `.secondthought-signals` - Urgency signals list
- `.secondthought-question` - Expandable question container

### CSS Variables (Implicit)

Colors used throughout:
```css
--purple-gradient-start: #667eea
--purple-gradient-end: #764ba2
--amber-bg: #fef3c7
--amber-border: #f59e0b
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
```

### Event Handlers

1. **Toggle button click** → `togglePanel()`
2. **Close button click** → `togglePanel()`
3. **Details element toggle** → Native HTML behavior

### Animations

- Panel slide: `right` property transition (0.3s ease-in-out)
- Button hover: `transform: scale(1.1)`
- Arrow rotation: `transform: rotate(90deg)` on expand
- Content fade: `fadeIn` keyframe animation

### Z-Index Hierarchy

- Toggle button: `2147483646`
- Panel: `2147483647` (maximum z-index)

### Timing

- Content script runs at: `document_idle`
- Panel slide duration: 300ms
- Panel removal delay: 300ms (after slide-out)

## Development Workflow

### Local Testing

1. Make changes to files
2. Go to `chrome://extensions/`
3. Click reload button for SecondThought
4. Refresh Amazon product page
5. Test functionality

### Debugging

```javascript
// Already included in content.js:
console.log('SecondThought extension loaded');

// Add more logging as needed:
console.log('Price detected:', price);
console.log('Signals found:', urgencySignals);
```

### Common Customizations

#### Add New Price Selector
```javascript
// In detectAmazonPrice(), add to selectors array:
const selectors = [
  // ... existing selectors ...
  '.your-new-selector',
];
```

#### Add New Urgency Keyword
```javascript
// In detectUrgencySignals(), add to urgencyKeywords array:
const urgencyKeywords = [
  // ... existing keywords ...
  'your new keyword',
];
```

#### Change Panel Width
```css
/* In style.css, update: */
.secondthought-panel {
  width: 420px; /* change from 380px */
  right: -420px; /* update to match */
}
```

#### Change Color Scheme
```css
/* Update gradient in style.css: */
background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
```

## Browser Compatibility

### Minimum Requirements
- Chrome 88+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, Opera)

### Not Supported
- Firefox (uses different extension format)
- Safari (uses different extension format)

## Performance Considerations

### Current Implementation
- ✅ Runs at `document_idle` (doesn't block page load)
- ✅ No external requests
- ✅ Minimal DOM queries
- ✅ No heavy computations
- ✅ IIFE wrapper prevents global pollution

### Potential Optimizations
- Cache DOM queries if performance becomes an issue
- Use MutationObserver if price changes dynamically
- Debounce toggle clicks (currently not needed)

## Extension Size

Total size: ~30KB (uncompressed)
- JavaScript: ~8KB
- CSS: ~5KB
- Documentation: ~15KB
- Icons: ~1KB

## Security Notes

- No external scripts loaded
- No eval() or Function() constructors
- No inline styles (uses CSS file)
- Content Security Policy compliant
- No data collection or transmission

## Future Enhancements (Not Implemented)

Potential features to add:
- Price history tracking
- Comparison shopping links
- Fake review detection
- Options page for customization
- Keyboard shortcuts
- Dark mode support
- Multi-language support

## Testing Checklist

Before releasing changes:

```
□ Run JSON validator on manifest.json
□ Check JavaScript syntax (node --check content.js)
□ Test on real Amazon product pages
□ Verify price detection accuracy
□ Check urgency signal detection
□ Test panel animations
□ Verify button placement
□ Check console for errors
□ Test on different screen sizes
□ Verify accessibility (keyboard nav, screen readers)
□ Check all dropdown questions work
□ Test close button functionality
□ Verify no conflicts with Amazon's own scripts
```

## Troubleshooting

### Panel doesn't appear
- Check URL contains `/dp/` or `/gp/product/`
- Verify extension is enabled
- Check console for JavaScript errors

### Price not detected
- Amazon may have changed their layout
- Add new selectors to the array
- Check if regex fallback catches it

### Styling issues
- Check for CSS conflicts with Amazon's styles
- Verify z-index is high enough
- Check for !important flags if needed

## Contributing Guidelines

1. Keep code simple and readable
2. Follow existing naming conventions
3. Add comments for complex logic
4. Test on multiple Amazon domains
5. Update documentation when adding features
6. Maintain backward compatibility
7. Keep bundle size small
