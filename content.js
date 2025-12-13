(function() {
  'use strict';

  // Hugging Face API Configuration
  const HF_API_KEY = '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';
  const HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1';

  // User selections state
  let userSelections = {
    whyBuying: null,
    alreadyOwn: null,
    financiallyAvailable: null
  };

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

  // Detect product title from Amazon page
  function detectProductTitle() {
    const titleSelectors = [
      'h1 span',
      '#productTitle',
      '[data-feature-name="title"]',
      'h1'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim().length > 0) {
        return element.textContent.trim();
      }
    }

    return 'Product';
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

  // Call Hugging Face API for buyer's remorse analysis
  async function analyzeWithAI(productTitle, price, urgencySignals, selections) {
    try {
      const prompt = `[INST] You are a consumer psychology expert helping someone decide whether to make a purchase.

Product: ${productTitle}
Price: ${price}
Urgency Signals Detected: ${urgencySignals.length > 0 ? urgencySignals.join(', ') : 'None'}

User Responses:
- Why are they buying? ${selections.whyBuying}
- Do they already own something similar? ${selections.alreadyOwn}
- Is this financially available to them? ${selections.financiallyAvailable}

Based on this information, analyze the purchase risk and provide a brief JSON response with this exact structure (and ONLY this JSON, no other text):
{
  "risk": "low",
  "reason": "Brief explanation of the risk level",
  "suggestion": "wait"
}

Where:
- risk must be: "low", "medium", or "high"
- reason should be 1-2 sentences explaining the risk
- suggestion must be: "wait", "compare", or "proceed"

Respond with ONLY valid JSON, nothing else. [/INST]`;

      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            return_full_text: false,
            max_new_tokens: 500,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${errorData.error || response.statusText || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Hugging Face returns an array: [{ generated_text: "..." }]
      if (!Array.isArray(data) || !data[0] || !data[0].generated_text) {
        console.error('Unexpected API response:', data);
        throw new Error('Invalid API response format');
      }

      const responseText = data[0].generated_text.trim();
      
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Raw response:', responseText);
        throw new Error('Could not parse AI response as JSON');
      }

      const analysisResult = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!analysisResult.risk || !analysisResult.reason || !analysisResult.suggestion) {
        throw new Error('Invalid response structure from AI');
      }

      return analysisResult;
    } catch (error) {
      console.error('Error calling Hugging Face API:', error);
      throw error;
    }
  }

  // Create button group for question options
  function createButtonGroup(groupId, options, selectedValue) {
    return `
      <div class="secondthought-button-group" data-group="${groupId}">
        ${options.map(option => `
          <button class="secondthought-option-btn ${selectedValue === option ? 'active' : ''}" 
                  data-value="${option}">
            ${option}
          </button>
        `).join('')}
      </div>
    `;
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
    const productTitle = detectProductTitle();
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
          <h4>Quick Analysis</h4>
          
          <div class="secondthought-question-block">
            <label class="secondthought-question-label">Why are you buying?</label>
            ${createButtonGroup('whyBuying', ['Impulse', 'Planned', 'Need', 'Emotional'], userSelections.whyBuying)}
          </div>

          <div class="secondthought-question-block">
            <label class="secondthought-question-label">Already own something similar?</label>
            ${createButtonGroup('alreadyOwn', ['Yes', 'No'], userSelections.alreadyOwn)}
          </div>

          <div class="secondthought-question-block">
            <label class="secondthought-question-label">Financially available?</label>
            ${createButtonGroup('financiallyAvailable', ['Yes', 'No'], userSelections.financiallyAvailable)}
          </div>

          <button class="secondthought-analyze-btn" id="secondthought-analyze-btn">
            Analyze with AI
          </button>

          <div id="secondthought-analysis-result" class="secondthought-analysis-result"></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add close button functionality
    const closeBtn = document.getElementById('secondthought-close');
    closeBtn.addEventListener('click', togglePanel);

    // Add button group event listeners
    const buttonGroups = panel.querySelectorAll('.secondthought-button-group');
    buttonGroups.forEach(group => {
      const buttons = group.querySelectorAll('.secondthought-option-btn');
      buttons.forEach(button => {
        button.addEventListener('click', function() {
          const groupId = group.getAttribute('data-group');
          const value = this.getAttribute('data-value');
          
          // Update UI
          buttons.forEach(btn => btn.classList.remove('active'));
          this.classList.add('active');
          
          // Update state
          userSelections[groupId] = value;
        });
      });
    });

    // Add analyze button event listener
    const analyzeBtn = document.getElementById('secondthought-analyze-btn');
    analyzeBtn.addEventListener('click', async function() {
      const resultDiv = document.getElementById('secondthought-analysis-result');
      
      // Check if all selections are made
      if (!userSelections.whyBuying || !userSelections.alreadyOwn || !userSelections.financiallyAvailable) {
        resultDiv.innerHTML = '<div class="secondthought-error">Please answer all questions before analyzing.</div>';
        return;
      }

      // Show loading state
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = 'Analyzing...';
      resultDiv.innerHTML = '<div class="secondthought-loading">Analyzing with AI...</div>';

      try {
        const analysis = await analyzeWithAI(productTitle, price, urgencySignals, userSelections);
        
        const riskColor = analysis.risk === 'high' ? '#ef4444' : 
                         analysis.risk === 'medium' ? '#f59e0b' : '#10b981';
        
        resultDiv.innerHTML = `
          <div class="secondthought-analysis">
            <div class="secondthought-risk-badge" style="background-color: ${riskColor}">
              ${analysis.risk.toUpperCase()} RISK
            </div>
            <p class="secondthought-reason">${analysis.reason}</p>
            <p class="secondthought-suggestion">
              <strong>Suggestion:</strong> ${analysis.suggestion.charAt(0).toUpperCase() + analysis.suggestion.slice(1)}
            </p>
            <button class="secondthought-reset-btn" id="secondthought-reset-btn">
              Analyze Again
            </button>
          </div>
        `;

        // Add reset button listener
        document.getElementById('secondthought-reset-btn').addEventListener('click', resetAnalysis);
      } catch (error) {
        resultDiv.innerHTML = `<div class="secondthought-error">Error: ${error.message || 'Failed to analyze. Please try again.'}</div>`;
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze with AI';
      }
    });
  }

  // Reset analysis UI
  function resetAnalysis() {
    userSelections = {
      whyBuying: null,
      alreadyOwn: null,
      financiallyAvailable: null
    };
    
    const resultDiv = document.getElementById('secondthought-analysis-result');
    resultDiv.innerHTML = '';
    
    // Reset button states
    const buttons = document.querySelectorAll('.secondthought-option-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
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
