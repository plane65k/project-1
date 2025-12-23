// avo - Content Script for Page Analysis and Highlighting
(function() {
    'use strict';

    const highlights = new Map();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getPageContent') {
            const content = extractPageContent();
            sendResponse({ content });
        } else if (request.action === 'highlightText') {
            highlightTextOnPage(request.searchText, request.color || '#FFEB3B');
            sendResponse({ success: true });
        } else if (request.action === 'scrollToText') {
            scrollToText(request.searchText);
            sendResponse({ success: true });
        } else if (request.action === 'clearHighlights') {
            clearAllHighlights();
            sendResponse({ success: true });
        }
        return true;
    });

    function extractPageContent() {
        try {
            const unwantedSelectors = [
                'script', 'style', 'noscript', 'iframe', 'embed', 'object',
                'nav', 'header', 'footer', '.sidebar', '.menu', '.navigation',
                '.ads', '.advertisement', '.popup', '.modal', '.overlay',
                '[aria-hidden="true"]', '[style*="display: none"]'
            ];

            const elementsToRemove = document.querySelectorAll(unwantedSelectors.join(','));
            const originalDisplays = [];

            elementsToRemove.forEach(element => {
                originalDisplays.push(element.style.display);
                element.style.display = 'none';
            });

            let textContent = '';

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

            if (!mainElement) {
                mainElement = document.body;
            }

            textContent = mainElement.innerText || mainElement.textContent || '';

            elementsToRemove.forEach((element, index) => {
                element.style.display = originalDisplays[index];
            });

            textContent = cleanupTextContent(textContent);

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
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim()
            .replace(/Skip to main content/gi, '')
            .replace(/Cookie Consent/gi, '')
            .replace(/Accept Cookies/gi, '')
            .replace(/Privacy Policy/gi, '')
            .replace(/Terms of Service/gi, '')
            .replace(/Subscribe to our newsletter/gi, '')
            .replace(/Follow us on/gi, '')
            .trim();
    }

    function highlightTextOnPage(searchText, color = '#FFEB3B') {
        try {
            clearAllHighlights();

            if (!searchText || searchText.trim().length === 0) {
                return;
            }

            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const nodesToHighlight = [];
            let node;

            while (node = walker.nextNode()) {
                const text = node.nodeValue;
                if (text && text.toLowerCase().includes(searchText.toLowerCase())) {
                    nodesToHighlight.push(node);
                }
            }

            let highlightCount = 0;

            nodesToHighlight.forEach(node => {
                const parent = node.parentNode;
                if (!parent || parent.classList.contains('avo-highlight')) {
                    return;
                }

                const regex = new RegExp(`(${escapeRegex(searchText)})`, 'gi');
                const parts = node.nodeValue.split(regex);

                const fragment = document.createDocumentFragment();

                parts.forEach(part => {
                    if (regex.test(part)) {
                        const span = document.createElement('span');
                        span.className = 'avo-highlight';
                        span.style.backgroundColor = color;
                        span.textContent = part;
                        fragment.appendChild(span);
                        highlightCount++;
                    } else {
                        fragment.appendChild(document.createTextNode(part));
                    }
                });

                parent.replaceChild(fragment, node);
            });

            if (highlightCount > 0 && nodesToHighlight.length > 0) {
                const firstHighlight = document.querySelector('.avo-highlight');
                if (firstHighlight) {
                    firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }

        } catch (error) {
            console.error('Error highlighting text:', error);
        }
    }

    function scrollToText(searchText) {
        try {
            if (!searchText || searchText.trim().length === 0) {
                return;
            }

            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let node;
            let found = false;

            while (node = walker.nextNode()) {
                const text = node.nodeValue;
                if (text && text.toLowerCase().includes(searchText.toLowerCase())) {
                    const element = node.parentElement;
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        element.style.backgroundColor = 'rgba(255, 235, 59, 0.3)';
                        setTimeout(() => {
                            element.style.backgroundColor = '';
                        }, 2000);

                        found = true;
                        break;
                    }
                }
            }

            if (!found) {
                console.log('Text not found on page');
            }

        } catch (error) {
            console.error('Error scrolling to text:', error);
        }
    }

    function clearAllHighlights() {
        try {
            const highlightedElements = document.querySelectorAll('.avo-highlight');
            highlightedElements.forEach(element => {
                const parent = element.parentNode;
                while (element.firstChild) {
                    parent.insertBefore(element.firstChild, element);
                }
                parent.removeChild(element);
                parent.normalize();
            });
            highlights.clear();
        } catch (error) {
            console.error('Error clearing highlights:', error);
        }
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    if (typeof window !== 'undefined') {
        window.avoContentScriptLoaded = true;
    }

})();
