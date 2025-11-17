# User Guide: Blog Link Analyzer Extension

## 🚀 Quick Start

### Installation

#### Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore)
2. Search for "Blog Link Analyzer"
3. Click "Add to Chrome"
4. Grant permissions when prompted

#### Firefox Add-ons
1. Visit the [Firefox Add-ons Store](https://addons.mozilla.org)
2. Search for "Blog Link Analyzer"
3. Click "Add to Firefox"
4. Approve permissions

#### Manual Installation (Developers)
**Chrome:**
1. Download the extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

**Firefox:**
1. Download the extension files
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select the `manifest.json` file

## 📖 How to Use

### Basic Usage

1. **Navigate to a blog post** on any supported platform
2. **Click the extension icon** in your browser toolbar
3. **View detected links** in the popup window

### What the Extension Shows

- **📊 Blog Detection Status**: Whether the current page is detected as a blog post
- **🔗 Found Links**: Number of blog post links discovered
- **📝 Link Details**: Title, author, and confidence score for each link
- **🔄 Nested Links**: Expandable links to discover more content

### Supported Blog Platforms

- ✅ **WordPress** - Most WordPress blogs and self-hosted sites
- ✅ **Medium** - Medium publications and personal blogs
- ✅ **Substack** - Newsletter-style blogs
- ✅ **Ghost** - Ghost-powered blogs
- ✅ **Custom Blogs** - Generic detection for other platforms

## 🤖 AI Features (Optional)

### Setting Up AI Summarization

1. **Click the extension icon** on any page
2. **Click the AI status banner** at the top of the popup
3. **Choose your AI provider**:
   - **OpenAI** (GPT models) - Fast and reliable
   - **Anthropic** (Claude) - Advanced reasoning
   - **Ollama** - Free and private (requires local setup)
   - **Custom** - Your own API endpoint

4. **Enter your API key** (not required for Ollama)
5. **Click "Test Connection"** to verify setup
6. **Start summarizing!**

### Using AI Features

- **📄 Summarize Current Page**: Get an AI summary of the blog post you're reading
- **🔗 Summarize Individual Links**: Click the 🤖 button next to any detected link
- **💾 Save Summaries**: Enable caching to save summaries for later
- **⚙️ Customize Settings**: Choose models, adjust length, set preferences

### AI Provider Setup

#### OpenAI
1. Sign up at [OpenAI](https://platform.openai.com)
2. Get your API key from the dashboard
3. Enter the key in the extension settings
4. Choose your preferred model (GPT-3.5-turbo, GPT-4, etc.)

#### Anthropic (Claude)
1. Sign up at [Anthropic](https://console.anthropic.com)
2. Get your API key
3. Enter the key in the extension settings
4. Choose your model (Claude-3-haiku, Claude-3-sonnet, etc.)

#### Ollama (Local & Free)
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Run `ollama pull llama2` (or your preferred model)
3. In extension settings, select "Ollama" as provider
4. Use default URL `http://localhost:11434` or customize if needed

## 🔧 Advanced Features

### Search and Filter
- **🔍 Search**: Find specific posts by title or author
- **📊 Filter by Confidence**: Show only high-confidence blog links
- **🏷️ Platform Filter**: Filter by blog platform (WordPress, Medium, etc.)

### Link Management
- **📂 Expand Nested Links**: Discover links within linked posts
- **🔗 Open in New Tab**: Right-click any link to open in a new tab
- **📋 Copy Link**: Copy link URLs to clipboard
- **⭐ Mark as Favorite**: Save important links for later

### Settings and Preferences
- **🎨 Theme**: Choose between light and dark themes
- **📏 Link Limit**: Set maximum number of links to display
- **⚡ Performance**: Enable/disable caching for better performance
- **🔔 Notifications**: Get alerts when new blog posts are detected

## 🛠️ Troubleshooting

### Common Issues

**Extension not working?**
- Refresh the page and try again
- Check if the page is actually a blog post
- Verify you have the latest version installed

**Blog not detected?**
- Some pages may not match blog patterns
- Try the extension on different blog platforms
- Check the URL structure (should contain blog indicators)

**AI features not working?**
- Verify your API key is correct
- Check your internet connection
- Ensure you have API credits available
- Try testing the connection in settings

**No links found?**
- The blog post might not contain links to other posts
- Links in navigation areas are automatically filtered out
- Try adjusting the confidence threshold in settings

### Getting Help

- **📖 Documentation**: Check our [full documentation](https://github.com/codingnooob/blogbranch)
- **🐛 Report Issues**: [GitHub Issues](https://github.com/codingnooob/blogbranch/issues)
- **💬 Community**: [Discussions](https://github.com/codingnooob/blogbranch/discussions)
- **📧 Email**: codingnooob3@gmail.com

## 🔒 Privacy & Security

- **🔒 Local Processing**: All blog analysis happens in your browser
- **🤖 AI Privacy**: Content is only sent to AI providers you choose
- **🔑 Secure Keys**: API keys are stored locally and encrypted
- **📊 No Tracking**: We don't track your browsing behavior
- **🗑️ Data Control**: Clear all data anytime in settings

Read our full [Privacy Policy](PRIVACY.md) for details.

## 🎯 Tips & Tricks

### Power User Features

1. **Keyboard Shortcuts**:
   - `Alt + B`: Open extension popup
   - `Alt + S`: Summarize current page (if AI is configured)

2. **Batch Operations**:
   - Select multiple links to open all at once
   - Export detected links as JSON or CSV

3. **Integration**:
   - Works with RSS readers for blog discovery
   - Compatible with read-it-later services

### Best Practices

- **Start with AI disabled** to understand basic functionality
- **Use Ollama for privacy** if you have a capable computer
- **Enable caching** for frequently visited blogs
- **Adjust confidence thresholds** for better results on specific sites

## 📱 Mobile Support

The extension works on:
- ✅ Chrome Desktop
- ✅ Firefox Desktop
- ✅ Chrome for Android (limited features)
- ❌ Firefox Mobile (not supported)

## 🔄 Updates

The extension automatically updates from the store. New features include:
- **AI provider improvements**
- **New blog platform support**
- **Performance enhancements**
- **Security updates**

## 📚 Resources

- **[Full Documentation](README.md)** - Technical details for developers
- **[Privacy Policy](PRIVACY.md)** - How we handle your data
- **[Store Assets Guide](STORE_ASSETS.md)** - For store publishers
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to development

---

**Happy Blog Reading! 📖✨**

If you find the extension helpful, please consider:
- ⭐ Rating it on the store
- 🐛 Reporting bugs
- 💡 Suggesting features
- 🤝 Contributing to development