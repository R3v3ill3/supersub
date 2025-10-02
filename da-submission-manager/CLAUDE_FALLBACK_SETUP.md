# Claude (Anthropic) Fallback Setup

**Date**: October 2, 2025  
**Change**: Replaced Gemini with Claude as fallback AI provider  
**Reason**: Claude has superior instruction-following capabilities and produces higher quality output

---

## 🎯 **What Changed**

### **Before:**
- Primary: OpenAI (GPT-4o)
- Fallback: Google Gemini → Poor quality output

### **After:**
- Primary: OpenAI (GPT-4o)
- Fallback: **Claude (Anthropic) 3.5 Sonnet** → Excellent quality

---

## 📦 **Installation**

The Anthropic SDK has been added to `package.json`:

```bash
cd da-submission-manager/apps/api
npm install
# or
pnpm install
```

This will install `@anthropic-ai/sdk@^0.27.0`

---

## 🔧 **Configuration**

### **Railway Environment Variables**

Add these to your Railway API service:

```bash
# Enable Claude as fallback
ANTHROPIC_ENABLED=true

# Get API key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-...

# Model (recommended: Claude 3.5 Sonnet)
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Temperature (0.05 for high fidelity)
ANTHROPIC_TEMPERATURE=0.05

# Max tokens (4000 allows ~3000 word outputs)
ANTHROPIC_MAX_TOKENS=4000
```

### **Optional: Remove Old Gemini Variables**

You can remove these from Railway (no longer used):
- `GEMINI_ENABLED`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_TEMPERATURE`
- `GEMINI_MAX_TOKENS`

---

## 🆚 **Why Claude Instead of Gemini?**

### **Claude Advantages:**
- ✅ **Better instruction following** - Very precise at following complex prompts
- ✅ **Higher quality output** - More natural, comprehensive writing
- ✅ **Better at preserving specific data** - Measurements, statistics, technical terms
- ✅ **Consistent formatting** - Better JSON compliance
- ✅ **Longer context** - Can handle more complex prompts
- ✅ **More reliable** - Fewer errors, better error messages

### **Gemini Issues (why we switched):**
- ❌ Sometimes produces generic/static output
- ❌ Less precise at following detailed instructions
- ❌ Tendency to summarize even when told not to
- ❌ Less consistent JSON formatting

---

## 🔄 **Fallback Behavior**

The system now works like this:

1. **Try OpenAI first** (GPT-4o/gpt-4o-mini)
   - If succeeds → Use OpenAI result ✅
   - If fails → Go to step 2

2. **Try Claude as fallback** (Claude 3.5 Sonnet)
   - If succeeds → Use Claude result ✅
   - If fails → Return error to user ❌

**Logs will show:**
```
🤖 Attempting generation with OpenAI...
⚠️ OpenAI generation failed: [error message]
🤖 Falling back to Claude...
✅ Claude generation successful with claude-3-5-sonnet-20241022
```

---

## 💰 **Cost Considerations**

### **OpenAI (Primary):**
- GPT-4o: $2.50 per 1M input tokens, $10 per 1M output tokens
- Typical submission: ~$0.02-0.04

### **Claude (Fallback):**
- Claude 3.5 Sonnet: $3 per 1M input tokens, $15 per 1M output tokens
- Typical submission: ~$0.03-0.05

**Cost impact:** Minimal - fallback only triggers if OpenAI fails (rare).

---

## 🧪 **Testing**

### **Test 1: Verify Configuration**

```bash
curl https://supersub-production.up.railway.app/api/diagnostic/ai-config
```

Should show:
```json
{
  "claude": {
    "enabled": "true",
    "hasApiKey": true,
    "model": "claude-3-5-sonnet-20241022"
  },
  "primaryProvider": "OpenAI"
}
```

### **Test 2: Force Claude Fallback**

Temporarily disable OpenAI in Railway:
```
OPENAI_ENABLED=false
```

Generate a submission → Should use Claude.

Check logs for:
```
🤖 Falling back to Claude...
✅ Claude generation successful
```

Re-enable OpenAI after testing:
```
OPENAI_ENABLED=true
```

### **Test 3: Quality Check**

Generate submissions with both providers and compare:
- Measurements preserved (12,600 m³)?
- Comprehensive (1500-2500 words)?
- Follows user priority order?
- Includes custom input?

---

## 📝 **Claude API Key Setup**

### **1. Create Anthropic Account**

Go to: https://console.anthropic.com/

### **2. Get API Key**

1. Sign up/log in
2. Go to "API Keys" section
3. Click "Create Key"
4. Copy the key (starts with `sk-ant-api03-...`)

### **3. Add to Railway**

1. Railway Dashboard → Your API service
2. Variables tab
3. Add `ANTHROPIC_API_KEY` with your key
4. Redeploy

---

## 🔍 **Monitoring**

### **Check Which Provider Was Used**

Look in Railway logs after generation:

**OpenAI used:**
```
✅ OpenAI generation successful with gpt-4o
[generate] LLM generation complete { "provider": "openai" }
```

**Claude used (fallback):**
```
⚠️ OpenAI generation failed: [reason]
🤖 Falling back to Claude...
✅ Claude generation successful
[generate] LLM generation complete { "provider": "claude" }
```

### **Check Token Usage**

Both providers report token usage:
```json
{
  "provider": "claude",
  "tokensUsed": 1523,
  "model": "claude-3-5-sonnet-20241022"
}
```

---

## 🐛 **Troubleshooting**

### **Issue: "ANTHROPIC_API_KEY not configured"**

**Solution:** Add the API key to Railway environment variables.

### **Issue: "Invalid API key"**

**Solution:** 
- Check key starts with `sk-ant-api03-`
- Regenerate key in Anthropic console
- Ensure no extra spaces in Railway variable

### **Issue: "Claude generation failed"**

**Check:**
1. API key is valid
2. Account has credits/billing setup
3. Model name is correct: `claude-3-5-sonnet-20241022`

### **Issue: Output quality still poor**

**If Claude is being used but output is generic:**
- The OpenAI schema fix should have resolved this
- OpenAI should be working now (not falling back)
- Check logs to confirm OpenAI is succeeding

---

## 🎓 **Technical Details**

### **Claude Models Available**

- **claude-3-5-sonnet-20241022** (Recommended) - Best balance of quality/cost
- **claude-3-5-haiku-20241022** - Faster, cheaper, good quality
- **claude-3-opus-20240229** - Highest quality, most expensive

### **Key Differences from Gemini Implementation**

1. **System prompts:** Claude supports native system messages (Gemini doesn't)
2. **JSON handling:** Claude is more reliable with structured output
3. **Token counting:** Claude provides accurate input/output token counts
4. **Error handling:** Better error messages

### **Integration Code**

The `generateWithClaude` function:
- Uses Anthropic's Messages API
- Supports system prompts natively
- Returns proper token usage
- Handles JSON extraction reliably

---

## ✅ **Deployment Checklist**

- [ ] Install dependencies (`npm install` or `pnpm install`)
- [ ] Add `ANTHROPIC_API_KEY` to Railway
- [ ] Add `ANTHROPIC_ENABLED=true` to Railway
- [ ] (Optional) Add other Anthropic settings (model, temperature, etc.)
- [ ] Deploy to Railway
- [ ] Test `/api/diagnostic/ai-config` endpoint
- [ ] Generate test submission
- [ ] Check logs for successful OpenAI generation
- [ ] (Optional) Test Claude fallback by temporarily disabling OpenAI

---

## 📚 **Resources**

- **Anthropic Console:** https://console.anthropic.com/
- **Claude API Docs:** https://docs.anthropic.com/
- **Model Pricing:** https://www.anthropic.com/api
- **Claude Models:** https://docs.anthropic.com/en/docs/about-claude/models

---

**Summary:** Claude provides much better fallback quality than Gemini. Combined with the OpenAI schema fix, your system should now produce consistently high-quality submissions with proper data preservation. 🎉

