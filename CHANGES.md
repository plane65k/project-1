# Changes Made to Fix OpenRouter 405 Error

## Summary
Added comprehensive debug logging throughout the avo extension to help diagnose and fix 405 Method Not Allowed errors from the OpenRouter API.

## Files Modified

### 1. `/avo/popup.js`

#### Enhanced `loadSettings()` function (lines 89-111)
- Added detailed logging when settings are loaded
- Shows selected model name
- Validates API key format (checks for `sk-or-v1-` prefix)
- Displays default model being used
- Helps identify if settings are loaded correctly

#### Enhanced `saveSettings()` function (lines 113-142)
- Added logging before saving settings
- Shows what model is being saved
- Shows API key prefix being saved
- Confirms successful save or logs errors
- Helps verify correct values are persisted to storage

#### Completely rewrote `callOpenRouter()` function (lines 255-368)
**Request Preparation Logs:**
- Shows selected model name (must be in `org/model-name` format)
- Shows API endpoint being called
- Shows first 30 characters of API key for verification
- Shows full request body in formatted JSON

**Response Logs:**
- Shows HTTP status code and status text
- Shows response headers (content-type, rate limits)
- Shows raw response body before parsing
- Helps identify exactly what OpenRouter is returning

**Error Handling:**
- Better detection of empty response bodies
- Attempts to parse error messages from JSON
- Falls back to showing raw error text
- Provides specific error message for empty 405 responses
- All errors include context about what went wrong

**Success Logs:**
- Confirms successful API response
- Shows parsed response data
- Validates response structure

## Files Created

### 2. `/avo/DEBUG_GUIDE.md`
Comprehensive debugging guide that includes:
- Explanation of 405 errors
- What each debug log means
- Common issues and solutions
- Step-by-step testing instructions
- List of all available models in correct format
- Troubleshooting checklist

## Key Improvements

### 1. Better Error Messages
Before:
```
OpenRouter API error (405): 
```

After:
```
OpenRouter API error: 405 Method Not Allowed - Empty response (request format may be incorrect)
```

### 2. Request Visibility
Now you can see exactly what's being sent to OpenRouter:
```json
{
  "model": "openai/gpt-3.5-turbo",
  "messages": [...],
  "max_tokens": 1000,
  "temperature": 0.7
}
```

### 3. API Key Validation
The extension now checks if your API key has the correct format:
```
✅ [DEBUG] API Key format: Correct (sk-or-v1-)
```
or
```
⚠️ [DEBUG] API Key format: Unexpected prefix: sk-abc123...
```

### 4. Model Name Verification
All logs show the model name being used, making it easy to verify it's in the correct `org/model-name` format.

### 5. Response Analysis
Can now see:
- HTTP status code
- Status text
- Content type
- Rate limit information
- Raw response body (before parsing)

## How to Use

1. **Open Chrome DevTools**
   - Press F12 or Right-click > Inspect
   - Go to Console tab

2. **Open the Extension**
   - Click the avo extension icon

3. **Check the Logs**
   - Look for logs with emoji prefixes:
     - 🔄 [DEBUG] = Request preparation
     - 📊 [DEBUG] = Response received
     - ✅ [DEBUG] = Success/Confirmation
     - ❌ [ERROR] = Error occurred
     - 💥 [ERROR] = Critical error
     - 💾 [DEBUG] = Saving data

4. **Test the API**
   - Click "Summarize Page" or ask a question
   - Watch the console for detailed logs

5. **Analyze Results**
   - If you see 405 error, check:
     - Model name format (should be `org/model-name`)
     - API key format (should start with `sk-or-v1-`)
     - Response body for error details

## What This Fixes

### Problem: 405 Method Not Allowed with Empty Response
This usually means:
- Model name is in wrong format (missing org prefix)
- API key is invalid or malformed
- Request structure doesn't match OpenRouter's expectations

### Solution: Comprehensive Debugging
Now you can:
- Verify the exact request being sent
- Confirm model names are correct
- Validate API key format
- See detailed error messages
- Identify the root cause quickly

## Expected Model Format

All models MUST include the organization prefix:

✅ **CORRECT:**
- `openai/gpt-3.5-turbo`
- `openai/gpt-4`
- `meta-llama/llama-2-70b-chat`
- `anthropic/claude-2`
- `mistralai/mistral-7b-instruct`

❌ **WRONG:**
- `gpt-3.5-turbo`
- `gpt-4`
- `llama-2-70b-chat`
- `claude-2`
- `mistral-7b-instruct`

## Testing Checklist

After loading the extension:

- [ ] Open DevTools Console (F12)
- [ ] Open avo extension popup
- [ ] Check "Settings Loaded" logs
- [ ] Verify model format is `org/model-name`
- [ ] Verify API key format shows "Correct (sk-or-v1-)"
- [ ] Click "Summarize Page"
- [ ] Check "Preparing OpenRouter Request" logs
- [ ] Verify request body has correct model name
- [ ] Check "Response Received" logs
- [ ] If 200: Success! ✅
- [ ] If 405: Check raw response body for error details

## Additional Resources

- See `DEBUG_GUIDE.md` for comprehensive troubleshooting
- OpenRouter API Docs: https://openrouter.io/docs
- OpenRouter Models: https://openrouter.io/models
- Get API Key: https://openrouter.io/keys
