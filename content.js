(function() {
  'use strict';

  // Check if we're on an Amazon product page
  function isAmazonProductPage() {
    return window.location.href.includes('/dp/') || 
           window.location.href.includes('/gp/product/');
  }

  // Amazon-specific price detection using DOM selectors
  function detectAmazonPrice() {
    const selectors = [
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#priceblock_saleprice',
      '.a-price.a-text-price .a-offscreen',
      '.a-price .a-offscreen',
      'span.a-price-whole',
      '[data-a-price-whole]',
      '.a-price-whole',
      '#corePrice_feature_div .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-offscreen'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        let priceText = element.textContent || element.innerText;
        
        // Handle data attribute
        if (selector.includes('[data-a-price-whole]')) {
          const whole = element.getAttribute('data-a-price-whole');
          const fraction = element.getAttribute('data-a-price-fraction') || '00';
          if (whole) {
            priceText = `$${whole}.${fraction}`;
          }
        }
        
        // Clean and validate the price
        const cleanedPrice = priceText.replace(/[^\d.,]/g, '');
        if (cleanedPrice && parseFloat(cleanedPrice.replace(',', '')) > 0) {
          // Extract currency symbol
          const currencyMatch = priceText.match(/[$£€¥]/);
          const currency = currencyMatch ? currencyMatch[0] : '$';
          return `${currency}${cleanedPrice}`;
        }
      }
    }

    // Fallback to regex pattern matching
    return detectPriceWithRegex();
  }

  // Fallback regex-based price detection
  function detectPriceWithRegex() {
    const bodyText = document.body.innerText;
    const pricePatterns = [
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /USD\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /£\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /€\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g
    ];

    for (const pattern of pricePatterns) {
      const matches = bodyText.match(pattern);
      if (matches && matches.length > 0) {
        // Return the first reasonable price (between $1 and $99,999)
        for (const match of matches) {
          const numericValue = parseFloat(match.replace(/[^\d.]/g, ''));
          if (numericValue >= 1 && numericValue <= 99999) {
            return match.trim();
          }
        }
      }
    }

    return null;
  }

  // Detect urgency signals in the page content
  function detectUrgencySignals() {
    const urgencyKeywords = [
      'limited time',
      'deal of the day',
      'only.*left',
      'hurry',
      'ends soon',
      'last chance',
      'while supplies last',
      'limited stock',
      'almost gone',
      'selling fast',
      'low stock',
      'deal ends',
      'save.*%',
      'lightning deal',
      'prime day',
      'black friday',
      'cyber monday'
    ];

    const bodyText = document.body.innerText.toLowerCase();
    const foundSignals = [];

    for (const keyword of urgencyKeywords) {
      const regex = new RegExp(keyword, 'i');
      if (regex.test(bodyText)) {
        foundSignals.push(keyword.replace(/\.\*/g, ' '));
      }
    }

    return foundSignals;
  }

  // Create the SecondThought panel
  function createPanel() {
    if (document.getElementById('secondthought-panel')) {
      return; // Panel already exists
    }

    const panel = document.createElement('div');
    panel.id = 'secondthought-panel';
    panel.className = 'secondthought-panel';

    const price = detectAmazonPrice();
    const urgencySignals = detectUrgencySignals();

    panel.innerHTML = `
      <div class="secondthought-header">
        <h3>SecondThought</h3>
        <button class="secondthought-close" id="secondthought-close">×</button>
      </div>
      <div class="secondthought-content">
        <div class="secondthought-section">
          <h4>Detected Price</h4>
          <p class="secondthought-price">${price || 'Price not detected'}</p>
        </div>
        
        <div class="secondthought-section">
          <h4>Urgency Signals</h4>
          ${urgencySignals.length > 0 
            ? `<ul class="secondthought-signals">${urgencySignals.map(signal => `<li>${signal}</li>`).join('')}</ul>`
            : '<p class="secondthought-no-signals">No urgency signals detected</p>'
          }
        </div>

        <div class="secondthought-section">
          <h4>Before You Buy</h4>
          <div class="secondthought-questions">
            <details class="secondthought-question">
              <summary>Do I really need this?</summary>
              <div class="secondthought-answer">
                <p>Consider:</p>
                <ul>
                  <li>Will I use this regularly?</li>
                  <li>Do I already own something similar?</li>
                  <li>Can I wait 24 hours to decide?</li>
                </ul>
              </div>
            </details>
            
            <details class="secondthought-question">
              <summary>Is this the best price?</summary>
              <div class="secondthought-answer">
                <p>Check:</p>
                <ul>
                  <li>Price history on CamelCamelCamel</li>
                  <li>Competitor prices</li>
                  <li>Used or refurbished options</li>
                </ul>
              </div>
            </details>
            
            <details class="secondthought-question">
              <summary>Am I being manipulated?</summary>
              <div class="secondthought-answer">
                <p>Watch out for:</p>
                <ul>
                  <li>Artificial urgency (${urgencySignals.length} signals detected)</li>
                  <li>Inflated original prices</li>
                  <li>Fake scarcity</li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add close button functionality
    const closeBtn = document.getElementById('secondthought-close');
    closeBtn.addEventListener('click', togglePanel);
  }

  // Create the toggle button
  function createToggleButton() {
    if (document.getElementById('secondthought-toggle')) {
      return; // Button already exists
    }

    const button = document.createElement('button');
    button.id = 'secondthought-toggle';
    button.className = 'secondthought-toggle';
    button.innerHTML = '💭';
    button.title = 'Toggle SecondThought';
    button.setAttribute('aria-label', 'Toggle SecondThought panel');

    document.body.appendChild(button);

    button.addEventListener('click', togglePanel);
  }

  // Toggle panel visibility
  function togglePanel() {
    const panel = document.getElementById('secondthought-panel');
    
    if (!panel) {
      createPanel();
      setTimeout(() => {
        const newPanel = document.getElementById('secondthought-panel');
        if (newPanel) {
          newPanel.classList.add('secondthought-panel-open');
        }
      }, 10);
    } else {
      if (panel.classList.contains('secondthought-panel-open')) {
        panel.classList.remove('secondthought-panel-open');
        setTimeout(() => {
          if (panel && !panel.classList.contains('secondthought-panel-open')) {
            panel.remove();
          }
        }, 300);
      } else {
        panel.classList.add('secondthought-panel-open');
      }
    }
  }

  // Initialize the extension
  function init() {
    // Only run on Amazon product pages
    if (!isAmazonProductPage()) {
      return;
    }

    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        createToggleButton();
      });
    } else {
      createToggleButton();
    }
  }

  // Start the extension
  init();

  // Log for debugging
  console.log('SecondThought extension loaded');
})();
