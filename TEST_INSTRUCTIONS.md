# Test Instructions for OpenRouter 405 Error Fix

## Quick Test Guide

This document provides step-by-step instructions to test the debug logging and verify the 405 error has been fixed.

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

### Step 3: Configure Settings

1. In the avo popup, click the Settings button (⚙️)
2. Enter your OpenRouter API key
   - Should start with `sk-or-v1-`
3. Select a model (leave default as `openai/gpt-3.5-turbo`)
4. Click "Save Settings"

**Expected Console Output:**
```
💾 [DEBUG] ========== Saving Settings ==========
💾 [DEBUG] Model to save: openai/gpt-3.5-turbo
💾 [DEBUG] API Key prefix: sk-or-v1-...
✅ [DEBUG] Settings saved successfully
```

### Step 4: Verify Settings Loaded

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
```

**Red Flags to Watch For:**
- ❌ Model shows without org prefix (e.g., just `gpt-3.5-turbo`)
- ❌ API Key format shows "Unexpected prefix"
- ❌ API Key format shows "MISSING"

### Step 5: Test API Call

1. Navigate to any webpage (e.g., a Wikipedia article)
2. Open the avo extension
3. Click "Summarize Page"
4. Watch the Console output

**Expected Console Output (Success):**
```
🔄 [DEBUG] ========== Preparing OpenRouter Request ==========
🔄 [DEBUG] Selected Model: openai/gpt-3.5-turbo
🔄 [DEBUG] API Endpoint: https://openrouter.io/api/v1/chat/completions
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

**Expected Console Output (405 Error with Details):**
```
🔄 [DEBUG] ========== Preparing OpenRouter Request ==========
🔄 [DEBUG] Selected Model: openai/gpt-3.5-turbo
🔄 [DEBUG] API Endpoint: https://openrouter.io/api/v1/chat/completions
🔄 [DEBUG] API Key (first 30 chars): sk-or-v1-xxxxxxxxxxxxx...
🔄 [DEBUG] Request Body: {...}
📊 [DEBUG] ========== Response Received ==========
📊 [DEBUG] Response Status: 405
📊 [DEBUG] Response Status Text: Method Not Allowed
📊 [DEBUG] Response Headers: {...}
📊 [DEBUG] Response Body (raw): {"error": {"message": "...", "code": "..."}}
❌ [ERROR] API returned error status
❌ [ERROR] Parsed error: {...}
💥 [ERROR] Full error in callOpenRouter: Error: OpenRouter error (405): ...
```

### Step 6: Verify Request Format

In the Console, look for the "Request Body" log. Verify:

✅ **Checklist:**
- [ ] Model name includes org prefix (e.g., `openai/gpt-3.5-turbo`)
- [ ] Model name is NOT just `gpt-3.5-turbo`
- [ ] Messages array is present
- [ ] max_tokens is set to 1000
- [ ] temperature is set to 0.7

### Step 7: Test Different Models

1. Open Settings (⚙️)
2. Select a different model (e.g., `meta-llama/llama-2-70b-chat`)
3. Save Settings
4. Click "Summarize Page" again
5. Verify the Console shows the new model in the request

**Expected Console Output:**
```
🔄 [DEBUG] Selected Model: meta-llama/llama-2-70b-chat
```

## Troubleshooting

### Issue: 405 Error Still Occurring

1. **Check Console for Request Body**
   - Look for `🔄 [DEBUG] Request Body:`
   - Verify model name has format `org/model-name`

2. **Check API Key Format**
   - Look for `✅ [DEBUG] API Key format:`
   - Should say "Correct (sk-or-v1-)"
   - If not, get a new API key from https://openrouter.io/keys

3. **Check Response Body**
   - Look for `📊 [DEBUG] Response Body (raw):`
   - If empty, the error is likely due to wrong request format
   - If has content, it should explain the error

4. **Verify Model Exists**
   - Go to https://openrouter.io/models
   - Search for your model name
   - Confirm the exact format matches

### Issue: No Console Logs Appearing

1. Make sure DevTools is open BEFORE clicking the extension icon
2. Make sure you're looking at the Console tab, not Elements or Network
3. Try closing and reopening the extension popup
4. Check if any errors appear in the Console

### Issue: Model Name Wrong Format

1. Open DevTools Console
2. Type: `chrome.storage.sync.clear()` and press Enter
3. Close and reopen the extension
4. Reconfigure settings
5. Model should now default to `openai/gpt-3.5-turbo`

## Expected Results

After following these steps:

✅ **Success Criteria:**
- All debug logs appear in Console
- Model name is always in `org/model-name` format
- API key format is validated
- 200 OK response from OpenRouter
- Summary appears in the extension popup

❌ **If Still Failing:**
- Copy all Console logs
- Check DEBUG_GUIDE.md for additional troubleshooting
- Verify your API key is valid and has credits
- Try a different model to see if it's model-specific

## Additional Testing

### Test Edge Cases

1. **Test with no API key**
   - Open Settings, clear the API key, save
   - Try to summarize page
   - Should show error: "Please set your API key in Settings first"

2. **Test with invalid API key**
   - Enter a fake key like `sk-test-123`
   - Try to summarize page
   - Check Console for authentication error

3. **Test with wrong model format (manual)**
   - Open Console
   - Type: `chrome.storage.sync.set({avoModel: 'gpt-3.5-turbo'})`
   - Reload extension
   - Check if logs show "Unexpected" model format

## Debug Log Reference

| Emoji | Meaning | When It Appears |
|-------|---------|-----------------|
| 🔄 | Request preparation | Before making API call |
| 📊 | Response received | After API responds |
| ✅ | Success/Loaded | Settings loaded, successful response |
| ❌ | Error | API error, validation error |
| 💥 | Critical error | Unexpected exception |
| 💾 | Saving | When saving to storage |

## Success Indicators

Look for these in the Console to confirm everything is working:

1. Settings load with correct format ✅
2. Model name has org prefix ✅
3. API key validated ✅
4. Request shows correct format ✅
5. Response status is 200 ✅
6. Response body contains choices ✅
7. Summary appears in popup ✅

## Failure Indicators

If you see these, something is wrong:

1. Model name without org prefix (e.g., `gpt-3.5-turbo`) ❌
2. API key format "Unexpected prefix" ❌
3. Response status 405 ❌
4. Empty response body ❌
5. Error: "Method Not Allowed" ❌

## Next Steps

- If all tests pass: The 405 error is fixed! ✅
- If tests fail: Review DEBUG_GUIDE.md for detailed troubleshooting
- If still stuck: Check the Console logs for specific error messages
