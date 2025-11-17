# Quick Start Guide: AI Summarization

## 🚀 Get Started in 3 Minutes

### Step 1: Install Extension
1. Open Chrome/Edge
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `blog-link-analyzer` folder

### Step 2: Open a Blog Post
Navigate to any blog post (Medium, WordPress, Substack, etc.)

### Step 3: Configure AI
1. Click the extension icon
2. Click the "Configure" button in the AI status banner
3. Choose your AI provider:
   - **OpenAI**: Fast, reliable (requires API key)
   - **Ollama**: Free, private (requires local setup)
   - **Anthropic**: Advanced reasoning (requires API key)

### Step 4: Start Summarizing!
- **Individual Links**: Click 🤖 next to any blog link
- **Current Page**: Click "Summarize Current Page" button

## 🔧 Popular AI Setups

### Option 1: OpenAI (Recommended)
```
Provider: OpenAI
Model: gpt-3.5-turbo
API Key: Get from platform.openai.com
Cost: ~$0.002 per 1K tokens
```

### Option 2: Ollama (Free & Private)
```
1. Install Ollama: https://ollama.ai
2. Run: ollama pull llama2
3. In extension:
   Provider: Ollama
   Model: llama2
   Endpoint: http://localhost:11434
```

### Option 3: Anthropic
```
Provider: Anthropic  
Model: claude-3-haiku-20240307
API Key: Get from console.anthropic.com
Cost: ~$0.00025 per 1K tokens
```

## 💡 Pro Tips

- **Enable Caching**: Check "Cache summaries" for faster repeat visits
- **Adjust Tokens**: Use 500-1000 tokens for quick summaries
- **Test First**: Always click "Test Connection" before using
- **Custom Models**: Use custom model names for Ollama (e.g., "mistral")

## 🆘 Troubleshooting

### "AI connection failed"
- Check your API key is correct
- Verify internet connection
- Try "Test Connection" button

### "No blog links found"
- Make sure you're on a blog post
- Try refreshing the page
- Check if the page has related blog links

### Slow summarization
- Reduce "Max Tokens" setting
- Try a different AI provider
- Enable caching for repeat visits

## 📚 Need More Help?

- **Full Documentation**: See `AI_FEATURES.md`
- **Issues**: Report problems on GitHub
- **Support**: Check browser console for errors

---

**Happy summarizing! 🎉**