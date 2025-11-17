# Store Listing Assets Guide

This document outlines the required assets for Chrome Web Store and Firefox Add-ons publication.

## Required Store Assets

### Chrome Web Store
- **Store Icon**: 128x128px PNG (already generated)
- **Screenshots**: 
  - 1280x800px or 640x400px
  - Minimum 1, maximum 5 screenshots
- **Promotional Images** (optional but recommended):
  - 440x280px small tile
  - 1280x800px large marquee

### Firefox Add-ons
- **Icon**: 64x64px PNG (already generated)
- **Screenshots**: 
  - Minimum 1, maximum 5 screenshots
  - Recommended size: 1280x800px
- **Promotional Images** (optional):
  - 720x480px
  - 1200x600px

## Screenshot Guidelines

### Required Screenshots
1. **Main Interface**: Extension popup showing detected blog links
2. **AI Features**: AI configuration and summarization in action
3. **Settings Page**: Extension options and preferences
4. **Blog Detection**: Extension working on a real blog post
5. **Mobile/Responsive**: Extension interface on different screen sizes

### Screenshot Content Ideas
- WordPress blog with detected links
- Medium article with extracted metadata
- Substack newsletter analysis
- AI summary generation
- Settings and configuration screens

## Asset Creation Tools

### Recommended Tools
- **Chrome DevTools**: Device mode for responsive screenshots
- **Firefox Responsive Design Mode**: Cross-browser screenshots
- **Figma/Sketch**: Professional promotional graphics
- **Canva**: Quick promotional image creation

### Screenshot Best Practices
- Use high-resolution displays
- Show real functionality, not mockups
- Include browser chrome for context
- Ensure text is readable
- Use consistent branding

## Asset Storage

All generated assets should be stored in:
```
store-assets/
├── screenshots/
│   ├── chrome-1-1280x800.png
│   ├── chrome-2-1280x800.png
│   ├── firefox-1-1280x800.png
│   └── firefox-2-1280x800.png
├── promotional/
│   ├── chrome-small-440x280.png
│   ├── chrome-large-1280x800.png
│   └── firefox-720x480.png
└── icons/
    ├── chrome-128x128.png
    └── firefox-64x64.png
```

## Next Steps

1. Take screenshots of the extension in action
2. Create promotional graphics using the new icon design
3. Optimize images for web (compress PNGs)
4. Test assets on both Chrome and Firefox
5. Prepare store descriptions and categories