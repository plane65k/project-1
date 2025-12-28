'use strict';

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleWidget' }).catch((err) => {
      // If content script is not yet injected or loaded, we might need to inject it
      // But according to manifest.json it's injected on all_urls
      console.error('Failed to send toggleWidget message:', err);
    });
  }
});
