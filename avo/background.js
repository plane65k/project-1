'use strict';

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggleWidget' });
  } catch (error) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleWidget' });
    } catch (injectError) {
      console.error('Failed to inject content script or send message:', injectError);
    }
  }
});
