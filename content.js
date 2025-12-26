// Content script for avo - AI Page Assistant
// Handles page content extraction and communication with popup

(function() {
  'use strict';

  // Extract visible text content from the page
  function extractPageContent() {
    try {
      // Remove script, style, and other unwanted elements
      const unwantedSelectors = [
        'script',
        'style',
        'noscript',
        'iframe',
        'nav',
        'footer',
        '.nav',
        '.navigation',
        '.menu',
        '.footer',
        '.sidebar',
        '.ads',
        '.advertisement',
        '.social',
        '.share',
        'header nav'
      ];

      // Clone the body to avoid modifying the actual page
      const bodyClone = document.body.cloneNode(true);
      
      // Remove unwanted elements from clone
      unwantedSelectors.forEach(selector => {
        const elements = bodyClone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });

      // Get text content and clean it up
      let text = bodyClone.innerText || bodyClone.textContent || '';
      
      // Clean up the text
      text = text
        .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n\n')   // Normalize line breaks
        .replace(/\t/g, ' ')            // Replace tabs with spaces
        .replace(/\s+$/gm, '')          // Remove trailing spaces from each line
        .replace(/^\s+/gm, '')          // Remove leading spaces from each line
        .trim();

      // Limit to first ~8000 characters (reasonable for API limits)
      if (text.length > 8000) {
        // Try to break at a sentence boundary
        const truncated = text.substring(0, 8000);
        const lastSentence = truncated.lastIndexOf('.');
        if (lastSentence > 7500) {
          text = truncated.substring(0, lastSentence + 1);
        } else {
          text = truncated + '...';
        }
      }

      console.log('Extracted page content:', text.length, 'characters');
      return text;
    } catch (error) {
      console.error('Error extracting page content:', error);
      return '';
    }
  }

  // Listen for messages from popup
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'ping') {
        // Pong back to indicate content script is ready
        sendResponse({ status: 'ready' });
        return true;
      }

      if (request.action === 'getPageContent') {
        try {
          const content = extractPageContent();
          sendResponse({ content: content });
        } catch (error) {
          console.error('Error getting page content:', error);
          sendResponse({ error: error.message });
        }
        return true;
      }

      return false;
    });
  }

  // Run initialization
  function init() {
    console.log('avo content script initialized');
    setupMessageListener();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();