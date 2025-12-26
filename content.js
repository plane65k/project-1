'use strict';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageText') {
    const pageText = extractPageText();
    sendResponse({ pageText: pageText });
  }
});

function extractPageText() {
  const text = document.body.innerText || document.body.textContent || '';
  
  // Clean up whitespace
  const cleaned = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  // Limit to first 8000 characters
  return cleaned.substring(0, 8000);
}
