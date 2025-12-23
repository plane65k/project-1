// Gemini AI Assistant - Content Script
(function() {
    'use strict';

    // Listen for messages from popup script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getPageContent') {
            const content = extractPageContent();
            sendResponse({ content });
        }
        return true; // Keep message channel open for async response
    });

    function extractPageContent() {
        try {
            // Remove unwanted elements temporarily
            const unwantedSelectors = [
                'script', 'style', 'noscript', 'iframe', 'embed', 'object',
                'nav', 'header', 'footer', '.sidebar', '.menu', '.navigation',
                '.ads', '.advertisement', '.popup', '.modal', '.overlay',
                '[aria-hidden="true"]', '[style*="display: none"]'
            ];

            const elementsToRemove = document.querySelectorAll(unwantedSelectors.join(','));
            const originalDisplays = [];

            // Hide elements temporarily
            elementsToRemove.forEach(element => {
                const style = window.getComputedStyle(element);
                originalDisplays.push(element.style.display);
                element.style.display = 'none';
            });

            // Extract text content
            let textContent = '';

            // Try different methods to get the main content
            const mainContentSelectors = [
                'main', 'article', '[role="main"]', '.content', '.main-content',
                '.post-content', '.entry-content', '.article-body', '#content'
            ];

            let mainElement = null;
            for (const selector of mainContentSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim().length > 200) {
                    mainElement = element;
                    break;
                }
            }

            // If no main content found, use body
            if (!mainElement) {
                mainElement = document.body;
            }

            // Get text content and clean it up
            textContent = mainElement.innerText || mainElement.textContent || '';

            // Restore hidden elements
            elementsToRemove.forEach((element, index) => {
                element.style.display = originalDisplays[index];
            });

            // Clean up the text content
            textContent = cleanupTextContent(textContent);

            // Limit to reasonable length (first 8000 characters)
            if (textContent.length > 8000) {
                textContent = textContent.substring(0, 8000) + '...';
            }

            return textContent;

        } catch (error) {
            console.error('Error extracting page content:', error);
            return '';
        }
    }

    function cleanupTextContent(text) {
        return text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove multiple consecutive newlines
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // Remove leading/trailing whitespace
            .trim()
            // Remove common boilerplate text
            .replace(/Skip to main content/gi, '')
            .replace(/Cookie Consent/gi, '')
            .replace(/Accept Cookies/gi, '')
            .replace(/Privacy Policy/gi, '')
            .replace(/Terms of Service/gi, '')
            .replace(/Subscribe to our newsletter/gi, '')
            .replace(/Follow us on/gi, '')
            .trim();
    }

    // Add a small indicator that the content script is loaded
    if (typeof window !== 'undefined') {
        window.geminiAssistantContentScriptLoaded = true;
    }
})();