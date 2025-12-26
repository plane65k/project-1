# Debug Guide for OpenRouter 405 Error

## Overview
This guide explains how to debug and fix the 405 Method Not Allowed error from OpenRouter API.

## What is a 405 Error?
HTTP 405 Method Not Allowed with an empty response body typically indicates that the request format is incorrect. This usually means:
- Wrong model name format
- Invalid request structure
- Missing or malformed headers
- Incorrect API endpoint

## Debug Logs Explained

The extension now includes comprehensive debug logging. Open Chrome DevTools (F12) and go to the Console tab to see these logs.

### 1. Settings Loaded
```
✅ [DEBUG] ========== Settings Loaded ==========
✅ [DEBUG] Model: openai/gpt-3.5-turbo
✅ [DEBUG] API Key present: true
✅ [DEBUG] API Key format: Correct (sk-or-v1-)
✅ [DEBUG] Default model: openai/gpt-3.5-turbo
```

**What to check:**
- Model name should be in `org/model-name` format (e.g., `openai/gpt-3.5-turbo`)
- API Key should start with `sk-or-v1-`
- If API Key format shows "Unexpected prefix", your key may be invalid

### 2. Saving Settings
```
💾 [DEBUG] ========== Saving Settings ==========
💾 [DEBUG] Model to save: openai/gpt-3.5-turbo
💾 [DEBUG] API Key prefix: sk-or-v1-...
✅ [DEBUG] Settings saved successfully
```

**What to check:**
- Verify the model name being saved is correct
- Verify API key prefix is `sk-or-v1-`

### 3. OpenRouter Request
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
```

**What to check:**
- Model name MUST include org prefix (e.g., `openai/`, `meta-llama/`, `anthropic/`)
- API endpoint should be `https://openrouter.io/api/v1/chat/completions`
- API key should start with `sk-or-v1-`
- Request body should have all required fields

### 4. OpenRouter Response
```
📊 [DEBUG] ========== Response Received ==========
📊 [DEBUG] Response Status: 200
📊 [DEBUG] Response Status Text: OK
📊 [DEBUG] Response Headers: {
  contentType: "application/json",
  xRatelimitLimitRequests: "10",
  xRatelimitRemainingRequests: "9"
}
📊 [DEBUG] Response Body (raw): {...}
✅ [SUCCESS] OpenRouter response: {...}
```

**What to check:**
- Status should be 200 for success
- If status is 405, check the "Response Body (raw)" for error details
- Rate limit headers show your usage quota

### 5. Error Handling
```
❌ [ERROR] API returned error status
❌ [ERROR] Empty response body with error status
❌ [ERROR] OpenRouter API error: 405 Method Not Allowed - Empty response (request format may be incorrect)
```

## Common Issues and Solutions

### Issue 1: Model Name Format
**Problem:** Model name doesn't include org prefix
```javascript
// WRONG ❌
'gpt-3.5-turbo'
'gpt-4'
'llama-2-70b-chat'

// CORRECT ✅
'openai/gpt-3.5-turbo'
'openai/gpt-4'
'meta-llama/llama-2-70b-chat'
```

**Solution:** All model names in popup.html are already in correct format. If you see a model without the prefix in the debug logs, clear your browser storage:
1. Open DevTools (F12)
2. Go to Application tab
3. Expand Storage > Chrome Sync Storage
4. Delete the `avoModel` entry
5. Reload the extension

### Issue 2: Invalid API Key
**Problem:** API key doesn't start with `sk-or-v1-`

**Solution:**
1. Get a valid API key from https://openrouter.io/
2. Open Settings in the extension
3. Paste the key (should start with `sk-or-v1-`)
4. Click Save Settings
5. Check the console for "API Key format: Correct (sk-or-v1-)"

### Issue 3: Wrong Endpoint
**Problem:** Using `.ai` instead of `.io`

**Solution:** The endpoint is hardcoded correctly as `https://openrouter.io/api/v1/chat/completions` in popup.js line 9. If you see a different endpoint in the logs, the file may have been modified.

### Issue 4: Missing Headers
**Problem:** Required headers not included

**Solution:** The following headers are automatically included:
- `Content-Type: application/json`
- `Authorization: Bearer ${apiKey}`
- `HTTP-Referer: https://github.com`
- `X-Title: avo`

If you still get 405 errors, check that your API key has proper permissions and credits.

## Testing Steps

1. **Open Chrome DevTools**
   - Press F12 or right-click > Inspect
   - Go to Console tab

2. **Open the Extension**
   - Click the avo extension icon
   - Go to Settings (⚙️ button)
   - Enter your API key (should start with `sk-or-v1-`)
   - Select a model (default is `openai/gpt-3.5-turbo`)
   - Click Save Settings

3. **Check Settings Logs**
   - Look for "Settings Loaded" section
   - Verify model format is correct
   - Verify API key format shows "Correct (sk-or-v1-)"

4. **Test API Call**
   - Click "Summarize Page" button
   - Watch the Console for debug logs

5. **Analyze Results**
   - If you see "Response Status: 200", it worked! ✅
   - If you see "Response Status: 405", check the error details
   - Look at "Request Body" to verify model name format
   - Look at "Response Body (raw)" for error message

## Available Models

All models in the dropdown are in correct OpenRouter format:

**OpenAI:**
- `openai/gpt-4`
- `openai/gpt-3.5-turbo` (default)

**Llama (Meta):**
- `meta-llama/llama-2-70b-chat`
- `meta-llama/llama-2-13b-chat`
- `meta-llama/llama-2-7b-chat`

**Mistral:**
- `mistralai/mistral-7b-instruct`
- `mistralai/mistral-medium`
- `mistralai/mistral-large`
- `mistralai/dolphin-2.5-mixtral-8x7b`

**Anthropic:**
- `anthropic/claude-2`
- `anthropic/claude-instant`

## Still Getting 405 Errors?

If you still get 405 errors after following this guide:

1. **Copy the full request body from console logs** and verify it matches OpenRouter's expected format
2. **Check your API key** at https://openrouter.io/ - ensure it has credits and proper permissions
3. **Try a different model** to see if it's model-specific
4. **Check OpenRouter's status page** for any service issues
5. **Look for additional error details** in the "Response Body (raw)" log

## Additional Resources

- OpenRouter API Docs: https://openrouter.io/docs
- OpenRouter Models: https://openrouter.io/models
- Get API Key: https://openrouter.io/keys
