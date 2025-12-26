'use strict';

const MAX_EXTRACTED_CHARS = 8000;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'getPageText') return;

  void (async () => {
    try {
      const pageText = await extractPageContent();
      sendResponse({ pageText });
    } catch (err) {
      sendResponse({ pageText: '' });
    }
  })();

  return true;
});

async function extractPageContent() {
  const currentUrl = window.location.href;

  if (isGoogleDocs(currentUrl)) {
    return await extractGoogleDocsContent();
  }

  if (isGoogleSheets(currentUrl)) {
    return await extractGoogleSheetsContent();
  }

  if (isGoogleSlides(currentUrl)) {
    return await extractGoogleSlidesContent();
  }

  if (isGoogleForms(currentUrl)) {
    return await extractGoogleFormsContent();
  }

  return extractStandardContent();
}

function isGoogleDocs(url) {
  return url.includes('docs.google.com/document');
}

function isGoogleSheets(url) {
  return url.includes('docs.google.com/spreadsheets');
}

function isGoogleSlides(url) {
  return url.includes('docs.google.com/presentation');
}

function isGoogleForms(url) {
  return url.includes('docs.google.com/forms') || url.includes('forms.gle') || url.includes('forms.google.com');
}

async function extractGoogleDocsContent() {
  const editorRoot =
    (await waitForElement('.kix-appview-editor, .kix-appview-editor-container', 2500)) || document.body;

  await waitForMutationsToSettle(editorRoot, { stableMs: 500, timeoutMs: 3000 });

  const parts = [];

  const title = (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '')
    .replace(/\s+-\s+Google Docs\s*$/i, '')
    .trim();
  if (title) parts.push(title);

  const pages = Array.from(editorRoot.querySelectorAll('.kix-page, .kix-page-paginated'));
  if (pages.length > 0) {
    for (const page of pages) {
      const pageText = page.innerText;
      if (pageText) parts.push(pageText);
    }
  } else {
    const editorText = editorRoot.innerText;
    if (editorText) parts.push(editorText);
  }

  const commentSelectors = [
    '.docos-stream-view',
    '.docos-stream-docoview',
    '.docos-commentview',
    '.docos-comment',
    '.docos-replyview',
    '.docos-suggestionview'
  ].join(',');
  const commentEls = Array.from(document.querySelectorAll(commentSelectors)).filter(isVisibleElement);
  for (const el of commentEls) {
    const t = el.innerText;
    if (t) parts.push(t);
  }

  const combined = parts.join('\n\n');
  const normalized = normalizeExtractedText(combined);

  if (normalized) return normalized;

  return extractStandardContent();
}

async function extractGoogleSheetsContent() {
  const root =
    (await waitForElement('#waffle-grid-container, .waffle-grid-container, [role="grid"]', 2500)) || document.body;

  await waitForMutationsToSettle(root, { stableMs: 400, timeoutMs: 2500 });

  const parts = [];

  const title = (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '')
    .replace(/\s+-\s+Google Sheets\s*$/i, '')
    .trim();
  if (title) parts.push(title);

  const tabNames = Array.from(document.querySelectorAll('.docs-sheet-tab-name'))
    .map((el) => el.textContent?.trim() || '')
    .filter(Boolean);
  if (tabNames.length > 0) {
    parts.push(`Sheets: ${tabNames.join(', ')}`);
  }

  const formulaInput = document.querySelector(
    '#t-formula-bar-input input, #t-formula-bar-input textarea, .cell-input textarea, .cell-input input'
  );
  const formulaValue = (formulaInput?.value || '').trim();
  if (formulaValue) {
    parts.push(`Formula Bar: ${formulaValue}`);
  }

  const cellSelectors = [
    '[role="gridcell"]',
    '.waffle-cell',
    '.waffle-cell-renderer',
    '.waffle-cell-content',
    '.waffle-cell-text',
    '.waffle-gridcell',
    '.cell'
  ].join(',');

  const gridCells = Array.from(
    new Set([...root.querySelectorAll(cellSelectors), ...document.querySelectorAll(cellSelectors)])
  );

  const cellLinesSet = new Set();
  for (const cell of gridCells) {
    if (!isPotentiallyVisibleElement(cell)) continue;

    const text = (cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim();
    const aria = (cell.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();

    const candidate = text || parseSheetsAriaLabel(aria);
    if (candidate) cellLinesSet.add(candidate);
  }

  const cellLines = Array.from(cellLinesSet);
  if (cellLines.length > 0) {
    parts.push(cellLines.join('\n'));
  }

  const noteLikeSelectors = [
    '.docs-commentview',
    '.docos-commentview',
    '.docs-suggestion',
    '.docos-suggestionview'
  ].join(',');
  const noteEls = Array.from(document.querySelectorAll(noteLikeSelectors)).filter(isVisibleElement);
  for (const el of noteEls) {
    const t = el.innerText;
    if (t) parts.push(t);
  }

  const combined = parts.join('\n\n');
  const normalized = normalizeExtractedText(combined);

  if (normalized) return normalized;

  return extractStandardContent();
}

async function extractGoogleSlidesContent() {
  const root =
    (await waitForElement('.punch-viewer-content, .punch-viewer-container, .punch-viewer', 2500)) || document.body;

  await waitForMutationsToSettle(root, { stableMs: 500, timeoutMs: 3000 });

  const partsSet = new Set();

  const title = (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '')
    .replace(/\s+-\s+Google Slides\s*$/i, '')
    .trim();
  if (title) partsSet.add(title);

  const slideTextContainers = Array.from(
    root.querySelectorAll('.punch-viewer-page, .punch-viewer-page-wrapper, [role="textbox"]')
  );

  for (const el of slideTextContainers) {
    if (!isVisibleElement(el)) continue;
    const t = el.innerText;
    if (t) partsSet.add(t);
  }

  const svgTextNodes = Array.from(root.querySelectorAll('svg text'));
  for (const el of svgTextNodes) {
    const t = (el.textContent || '').trim();
    if (t) partsSet.add(t);
  }

  const speakerNotesSelectors = [
    '.punch-speaker-notes-textarea',
    '.speaker-notes textarea',
    'textarea[aria-label*="Speaker notes"]'
  ].join(',');
  const speakerNotesEls = Array.from(document.querySelectorAll(speakerNotesSelectors)).filter(isVisibleElement);
  for (const el of speakerNotesEls) {
    const t = (el.value || el.innerText || '').trim();
    if (t) partsSet.add(`Speaker Notes: ${t}`);
  }

  const combined = Array.from(partsSet).join('\n\n');
  const normalized = normalizeExtractedText(combined);

  if (normalized) return normalized;

  return extractStandardContent();
}

async function extractGoogleFormsContent() {
  const root =
    (await waitForElement(
      'form, .freebirdFormviewerViewFormContent, .freebirdFormviewerViewFormCard, .freebirdFormviewerViewItemList',
      2500
    )) || document.body;

  await waitForMutationsToSettle(root, { stableMs: 400, timeoutMs: 2500 });

  const parts = [];

  const title = (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '')
    .replace(/\s+-\s+Google Forms\s*$/i, '')
    .trim();
  if (title) parts.push(title);

  const formText = root.innerText;
  if (formText) parts.push(formText);

  const combined = parts.join('\n\n');
  const normalized = normalizeExtractedText(combined);

  if (normalized) return normalized;

  return extractStandardContent();
}

function extractStandardContent() {
  const base = document.body?.innerText || document.documentElement?.innerText || document.body?.textContent || '';
  const normalized = normalizeExtractedText(base);

  if (normalized) return normalized;

  // Fallback for pages where innerText is empty (e.g., heavy Shadow DOM)
  const deep = normalizeExtractedText(extractVisibleTextByTraversal(document.body || document.documentElement));
  return deep;
}

function normalizeExtractedText(text) {
  const cleaned = (text || '')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return cleaned.substring(0, MAX_EXTRACTED_CHARS);
}

function isPotentiallyVisibleElement(el) {
  if (!el || !(el instanceof Element)) return false;
  if (el.closest('script, style, noscript')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;

  const style = window.getComputedStyle(el);
  if (!style) return true;
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (Number(style.opacity) === 0) return false;

  return true;
}

function isVisibleElement(el) {
  if (!isPotentiallyVisibleElement(el)) return false;

  const rect = el.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return false;

  return true;
}

function extractVisibleTextByTraversal(root) {
  if (!root) return '';

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (!isVisibleElement(parent)) return NodeFilter.FILTER_REJECT;
      const value = node.nodeValue || '';
      if (!value.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const chunks = [];
  let current = walker.nextNode();
  while (current) {
    chunks.push(current.nodeValue);
    current = walker.nextNode();
  }

  return chunks.join(' ');
}

function parseSheetsAriaLabel(ariaLabel) {
  if (!ariaLabel) return '';

  // Common patterns include:
  // - "A1 123"
  // - "B2 Formula =SUM(A1:A10)"
  // - "Column A"
  // - "Row 1"
  const stripped = ariaLabel
    .replace(/^Cell\s+/i, '')
    .replace(/^R\d+C\d+\s+/i, '')
    .trim();

  if (!stripped) return '';
  if (/^Row\s+\d+/i.test(stripped)) return '';
  if (/^Column\s+/i.test(stripped)) return '';

  // Avoid returning labels that are just coordinates.
  if (/^[A-Z]+\d+$/i.test(stripped)) return '';

  const coordMatch = stripped.match(/^([A-Z]+\d+)\s+(.+)$/i);
  if (coordMatch) {
    return `${coordMatch[1]}: ${coordMatch[2].trim()}`;
  }

  return stripped;
}

function waitForElement(selector, timeoutMs) {
  const existing = document.querySelector(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        window.clearTimeout(timeout);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

function waitForMutationsToSettle(root, { stableMs = 500, timeoutMs = 2500 } = {}) {
  return new Promise((resolve) => {
    if (!root) {
      resolve();
      return;
    }

    let done = false;
    let settleTimer = null;

    const finalize = () => {
      if (done) return;
      done = true;
      if (settleTimer) window.clearTimeout(settleTimer);
      window.clearTimeout(timeout);
      observer.disconnect();
      resolve();
    };

    const scheduleSettle = () => {
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(finalize, stableMs);
    };

    const observer = new MutationObserver(() => scheduleSettle());
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    const timeout = window.setTimeout(finalize, timeoutMs);

    scheduleSettle();
  });
}
