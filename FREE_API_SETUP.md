# Free API Setup Guide

This project now supports **100% FREE** APIs! No credit card required, no budget needed.

## 🎉 Free API Options

### 1. **Replicate** (Image Generation) - FREE & MOST RELIABLE ⭐ RECOMMENDED
- **What it does**: Generates images using Stable Diffusion XL
- **Free tier**: $5 credit/month (plenty for testing!)
- **Get API token**: https://replicate.com/account/api-tokens
- **Steps**:
  1. Sign up for free at Replicate
  2. Go to Account → API Tokens
  3. Create a new token
  4. Copy the token
- **Why recommended**: Most reliable, fast, and works consistently

### 2. **Hugging Face** (Image Generation) - FREE (Alternative)
- **What it does**: Generates images using Stable Diffusion
- **Free tier**: Unlimited requests (with rate limits)
- **Get API key**: https://huggingface.co/settings/tokens
- **Steps**:
  1. Sign up for free at Hugging Face
  2. Go to Settings → Access Tokens
  3. Create a new token (read permission is enough)
  4. Copy the token
- **Note**: Currently experiencing endpoint issues, Replicate is recommended

### 3. **Groq** (Copy Fixing) - FREE
- **What it does**: Uses AI to fix marketing copy for compliance
- **Free tier**: 14,400 requests/day (plenty for development!)
- **Get API key**: https://console.groq.com/keys
- **Steps**:
  1. Sign up for free at Groq
  2. Go to API Keys section
  3. Create a new API key
  4. Copy the key

## ⚙️ Setup Instructions

1. **Get your free API keys** (links above)

2. **Update `backend/.env` file**:
   ```env
   PORT=5000
   
   # Free APIs (no credit card needed!)
   # RECOMMENDED: Replicate (most reliable for images)
   REPLICATE_API_TOKEN=your-actual-replicate-token-here
   
   # Alternative: Hugging Face (if Replicate not available)
   HUGGINGFACE_API_KEY=your-actual-huggingface-token-here
   
   # Groq (for copy fixing)
   GROQ_API_KEY=your-actual-groq-key-here
   ```

3. **Replace the placeholder values** with your actual API keys

4. **Start the servers**:
   ```bash
   # Terminal 1 - Backend
   npm run dev:backend
   
   # Terminal 2 - Frontend  
   npm run dev:frontend
   ```

## ✅ What Works with Free APIs

- ✅ **Image Generation**: Uses Replicate (recommended) or Hugging Face Stable Diffusion (free)
- ✅ **Copy Fixing**: Uses Groq Llama 3.1 (free, very fast!)
- ✅ **Compliance Checking**: Works without any API (built-in)
- ✅ **Auto-Fix**: Works without APIs (rule-based fixes)
- ✅ **All Canvas Features**: Upload, edit, export - all free!

## 🔄 Fallback Behavior

- If **no API keys** are configured: Basic rule-based fixes still work
- If **Replicate fails**: Falls back to Hugging Face
- If **Hugging Face fails**: You'll see an error message (endpoint issues may occur)
- If **Groq fails**: Falls back to rule-based text sanitization

## 💡 Tips

1. **Replicate**: Very reliable, usually takes 10-30 seconds per image. Free tier: $5/month credit.
2. **Hugging Face**: First request might take 10-20 seconds (model loading). May have endpoint issues.
3. **Groq**: Very fast! Usually responds in < 1 second.
4. **Rate Limits**: All services have generous free tiers. You won't hit limits during normal use.

## 🆚 Comparison: Free vs Paid

| Feature | Free (Replicate + Groq) | Paid (OpenAI) |
|---------|-------------------------|---------------|
| Image Quality | Excellent (SDXL) | Excellent (DALL-E 3) |
| Copy Fixing | Fast & Good (Llama 3.1) | Excellent (GPT-4) |
| Speed | Fast (Groq), Moderate (Replicate) | Moderate |
| Cost | **$0** (free tier) | ~$0.01-0.10 per request |

## 🎯 Recommendation

**Start with free APIs!** They work great for development and testing. You can always add OpenAI later if you need premium quality.

---

**Need help?** Check the main README.md for more details.

