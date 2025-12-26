# Test Instructions for avo Extension

## Quick Test Guide

This document provides step-by-step instructions to test the avo Chrome extension with the new Material 3 UI and correct OpenRouter API integration.

## Prerequisites

1. Valid OpenRouter API key (starts with `sk-or-v1-`)
2. Chrome browser
3. Extension loaded in Chrome

## Test Steps

### Step 1: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `/avo` directory
5. The avo extension should appear in your extensions list

### Step 2: Open Chrome DevTools

1. Click the avo extension icon in your browser toolbar
2. Right-click anywhere in the popup and select "Inspect"
3. In the DevTools window, click the "Console" tab
4. Keep this window open for the remaining tests

### Step 3: Verify Material 3 UI

**Expected Visual Elements:**
- Clean white background with green (#1F8C44) accents
- "avo" logo in green in the header
- Circular icon buttons for Settings (⚙️) and Clear
- Welcome screen with green gradient icon
- Smooth animations and transitions
- Rounded buttons with Material 3 styling
- Green send button with paper plane icon
- Clean input fields with focus states

**UI Checkpoints:**
- ✅ Color scheme is green and white only
- ✅ Rounded corners throughout (buttons: 20px, inputs: 24px)
- ✅ Proper spacing and typography hierarchy
- ✅ Settings modal slides up from bottom
- ✅ Loading indicator with pulsing green dots

### Step 4: Configure Settings

1. In the avo popup, click the Settings button (⚙️)
2. Enter your OpenRouter API key (should start with `sk-or-v1-`)
3. Select a model (leave default as `openai/gpt-3.5-turbo`)
4. Click "Save"

**Expected Console Output:**
```
💾 [DEBUG] ========== Saving Settings ==========
💾 [DEBUG] Model to save: openai/gpt-3.5-turbo
💾 [DEBUG] API Key prefix: sk-or-v1-...
✅ [DEBUG] Settings saved successfully
```

**Expected UI Changes:**
- Settings modal slides down and closes
- "Settings saved!" message appears in chat
- Welcome screen is removed

### Step 5: Verify Settings Loaded

1. Close the extension popup
2. Click the extension icon again to reopen it
3. Check the Console

**Expected Console Output:**
```
✅ [DEBUG] ========== Settings Loaded ==========
✅ [DEBUG] Model: openai/gpt-3.5-turbo
✅ [DEBUG] API Key present: true
✅ [DEBUG] API Key format: Correct (sk-or-v1-)
✅ [DEBUG] Default model: openai/gpt-3.5-turbo
✅ [DEBUG] API Endpoint: https://openrouter.ai/api/v1/chat/completions
```

**Red Flags to Watch For:**
- ❌ Model shows without org prefix (e.g., just `gpt-3.5-turbo`)
- ❌ API Key format shows "Unexpected prefix"
- ❌ API Key format shows "MISSING"
- ❌ API Endpoint shows `openrouter.io` instead of `openrouter.ai`

### Step 6: Test Page Summarization

1. Navigate to any webpage (e.g., a Wikipedia article or blog post)
2. Open the avo extension
3. Click "Summarize Page" button
4. Watch the Console output

**Expected Console Output (Success):**
```
🔄 [DEBUG] ========== Preparing OpenRouter Request ==========
🔄 [DEBUG] Selected Model: openai/gpt-3.5-turbo
🔄 [DEBUG] API Endpoint: https://openrouter.ai/api/v1/chat/completions
🔄 [DEBUG] API Key (first 30 chars): sk-or-v1-xxxxxxxxxxxxx...
🔄 [DEBUG] Request Body: {
  "model": "openai/gpt-3.5-turbo",
  "messages": [...],
  "max_tokens": 1000,
  "temperature": 0.7
}
📊 [DEBUG] ========== Response Received ==========
📊 [DEBUG] Response Status: 200
📊 [DEBUG] Response Status Text: OK
📊 [DEBUG] Response Headers: {
  contentType: "application/json",
  xRatelimitLimitRequests: "10",
  xRatelimitRemainingRequests: "9"
}
📊 [DEBUG] Response Body (raw): {"id":"gen-...","model":"openai/gpt-3.5-turbo",...}
✅ [SUCCESS] OpenRouter response: {...}
```

**Expected UI Behavior:**
- "Page Summary" label appears
- AI response with summary appears in chat
- Loading animation with green pulsing dots shows briefly
- Message slides in with smooth animation

### Step 7: Test Q&A Functionality

1. In the input field, type: "What is the main topic of this page?"
2. Click Send button or press Enter
3. Watch for AI response

**Expected Behavior:**
- User message appears on right side with green background
- Loading indicator appears
- AI response appears on left side with light gray background
- Conversation history is maintained
- Scroll to bottom automatically

### Step 8: Test Conversation History

1. Ask multiple questions in succession
2. Verify that each response considers previous context
3. Check Console logs to see full messages array

**Expected:**
- All previous questions and answers are included in API requests
- AI maintains context across the conversation

### Step 9: Test Clear Conversation

1. Click the Clear button (trash icon)
2. Verify all messages are removed
3. Welcome screen reappears

**Expected:**
- All user and AI messages removed
- Input field is cleared
- Welcome screen is restored
- Conversation history is reset

### Step 10: Test Different Models

1. Open Settings (⚙️)
2. Select a different model (e.g., `meta-llama/llama-2-70b-chat`)
3. Save Settings
4. Click "Summarize Page" again
5. Verify the Console shows the new model in the request

**Expected Console Output:**
```
🔄 [DEBUG] Selected Model: meta-llama/llama-2-70b-chat
```

### Step 11: Test Error Handling

1. Open Settings and clear the API key
2. Save Settings (this will fail - as expected)
3. Try to use Summarize Page
4. Verify error message appears

**Expected Behavior:**
- "Please enter an API key" error in settings
- If API key is missing, extension prompts to open Settings
- Error messages appear in red/light red containers

## UI/UX Checklist

### Material 3 Design Compliance
- [ ] Primary color is green (#1F8C44)
- [ ] Background is white (#FFFFFF)
- [ ] Surface elements use light gray (#F8F8F8)
- [ ] All buttons have rounded corners (20px-24px)
- [ ] Input fields have rounded corners (24px)
- [ ] Proper focus states with green outline
- [ ] Smooth transitions (150ms-250ms)
- [ ] Elevation shadows on elevated elements
- [ ] Typography hierarchy is clear

### Animations
- [ ] Settings modal slides up from bottom
- [ ] Messages slide in from bottom
- [ ] Loading dots pulse smoothly
- [ ] Hover states transition smoothly
- [ ] No janky animations

### Accessibility
- [ ] All buttons have proper aria-labels
- [ ] Focus states are visible
- [ ] Color contrast meets WCAG standards
- [ ] Keyboard navigation works (Tab, Enter, Escape)

## Troubleshooting

### Issue: 405 Error Still Occurring

1. **Check Console for Request Body**
   - Look for `🔄 [DEBUG] Request Body:`
   - Verify model name has format `org/model-name`
   - Verify endpoint is `https://openrouter.ai/api/v1/chat/completions`

2. **Check API Key Format**
   - Look for `✅ [DEBUG] API Key format:`
   - Should say "Correct (sk-or-v1-)"
   - If not, get a new API key from https://openrouter.ai/keys

3. **Check Response Body**
   - Look for `📊 [DEBUG] Response Body (raw):`
   - If empty, the error is likely due to wrong request format
   - If has content, it should explain the error

### Issue: UI Not Loading Correctly

1. **Check for CSS Errors**
   - Look in Console for CSS parsing errors
   - Verify styles.css is being loaded

2. **Clear Extension Cache**
   - Go to chrome://extensions
   - Click "Reload" on avo extension
   - Close and reopen popup

### Issue: Settings Not Persisting

1. **Check Chrome Sync Storage**
   - Open DevTools > Application tab
   - Expand Storage > Chrome Sync Storage
   - Verify `avoApiKey` and `avoModel` exist

2. **Check Sync Status**
   - Ensure you're signed in to Chrome
   - Check if sync is enabled in Chrome settings

## Expected Results

After following these tests:

✅ **Success Criteria:**
- Material 3 UI loads correctly with green and white theme
- All debug logs appear in Console with correct endpoint
- Model name is always in `org/model-name` format
- API key format is validated (sk-or-v1-)
- 200 OK response from OpenRouter
- Summaries and Q&A responses appear in popup
- Conversation history is maintained
- Settings persist across sessions

❌ **If Still Failing:**
- Copy all Console logs
- Check DEBUG_GUIDE.md for additional troubleshooting
- Verify your API key is valid and has credits
- Try a different model to see if it's model-specific

## Performance Tests

### Response Time
- [ ] Page summary completes within 5-10 seconds
- [ ] Q&A responses are quick (< 5 seconds)
- [ ] Loading animation shows during API calls

### Memory Usage
- [ ] Popup loads quickly (< 500ms)
- [ ] No memory leaks after multiple messages
- [ ] Smooth scrolling in message container

## Final Checklist

Before considering the test complete:

- [ ] Extension loads without errors in Console
- [ ] UI matches Material 3 design (green/white)
- [ ] Settings modal opens and closes smoothly
- [ ] API key is saved and loaded correctly
- [ ] Model selection works
- [ ] Page summarization works
- [ ] Q&A works with context
- [ ] Conversation history is maintained
- [ ] Clear conversation works
- [ ] Error messages are clear and helpful
- [ ] All animations are smooth
- [ ] Focus states work properly
- [ ] API endpoint is correct (openrouter.ai)

## Success Indicators

Look for these in the Console to confirm everything is working:

1. Settings load with correct format ✅
2. Model name has org prefix ✅
3. API key validated ✅
4. Request shows correct endpoint (openrouter.ai) ✅
5. Response status is 200 ✅
6. Response body contains choices ✅
7. Summary appears in popup ✅
8. UI is green and white Material 3 style ✅

## Next Steps

- If all tests pass: The rebuild is complete! ✅
- If tests fail: Review DEBUG_GUIDE.md for detailed troubleshooting
- If still stuck: Check the Console logs for specific error messages
