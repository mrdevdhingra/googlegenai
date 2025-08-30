# AI Image Editor

A powerful web-based image editor that uses Google's Gemini AI to perform intelligent image edits. Upload any image, describe your desired edits in natural language, and download high-quality results.

## Features

✨ **AI-Powered Editing**: Use natural language to describe image edits
🖼️ **High-Quality Output**: Download images in the highest possible quality
🎨 **Quick Edit Templates**: Pre-built editing options for common tasks
📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
🔒 **Privacy-Focused**: Your API key is stored locally, images processed securely
⚡ **Real-Time Preview**: See your original image before processing
🎯 **Intuitive Interface**: Drag & drop upload with modern UI

## Quick Start

### 1. Get Your API Key
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create a new API key for Gemini
- Copy the key (starts with "AIza...")

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Application
```bash
npm start
```

### 4. Open in Browser
Navigate to `http://localhost:3000` and enter your API key when prompted.

## Usage Guide

### Basic Workflow
1. **Upload Image**: Drag & drop or click to upload (max 10MB)
2. **Describe Edit**: Type natural language instructions or use quick edit buttons
3. **Process**: Click "Process with AI" and wait for results
4. **Download**: Save your edited images in high quality

### Example Edit Instructions
- "Make the sky more dramatic with storm clouds"
- "Change the background to a tropical beach"
- "Convert to black and white with high contrast"
- "Add warm sunset lighting"
- "Make it look like a vintage photograph"
- "Enhance the colors and make it more vibrant"
- "Remove the background and make it transparent"
- "Add artistic painting effects"

### Quick Edit Options
The app includes pre-built quick edit buttons for common tasks:
- **Enhance Colors**: Make images more vibrant
- **B&W Dramatic**: High-contrast black and white conversion
- **Sunset Sky**: Add beautiful sunset lighting
- **Vintage Style**: Apply retro photo effects
- **Artistic**: Add painting-like effects
- **Better Lighting**: Enhance shadows and highlights

## Technical Details

### Architecture
- **Frontend**: HTML5, CSS3, jQuery
- **Backend**: Node.js with Express
- **AI Integration**: Google Gemini 2.5 Flash Image Preview
- **Image Processing**: Base64 encoding for browser compatibility

### Supported Formats
- **Input**: JPG, PNG, GIF, WebP, BMP, TIFF
- **Output**: PNG (highest quality), JPG
- **Size Limit**: 10MB per image

### API Endpoints
- `POST /api/process-image`: Process image with AI
- `GET /api/health`: Server health check
- `GET /`: Serve main application

## Development

### Project Structure
```
GoogleGenAI/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # Frontend JavaScript
├── server.js           # Backend server
├── package.json        # Dependencies
└── README.md          # This file
```

### Environment Variables
```bash
GEMINI_API_KEY=your_api_key_here  # Optional: set API key server-side
PORT=3000                         # Server port (default: 3000)
NODE_ENV=development             # Environment mode
```

### Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

## Troubleshooting

### Common Issues

**"API Key Required" Error**
- Ensure you have a valid Gemini API key
- Check that the key starts with "AIza"
- Verify the key has proper permissions

**"Backend Server Not Available"**
- Make sure the server is running (`npm start`)
- Check that port 3000 is not blocked
- Verify all dependencies are installed

**Image Upload Fails**
- Check file size (must be under 10MB)
- Ensure file is a valid image format
- Try a different image file

**Processing Takes Too Long**
- Complex edits may take 30-60 seconds
- Check your internet connection
- Verify API quota hasn't been exceeded

**Poor Edit Quality**
- Try more specific instructions
- Use higher quality input images
- Experiment with different prompts

### Performance Tips
- Use images under 5MB for faster processing
- Be specific in your edit instructions
- Try multiple variations of your prompt
- Use the quick edit buttons for common tasks

## API Usage & Costs

This application uses Google's Gemini AI API:
- Check current pricing at [Google AI Pricing](https://ai.google.dev/pricing)
- Monitor your usage in the Google Cloud Console
- Set up billing alerts to avoid unexpected charges

## Security & Privacy

- API keys are stored locally in browser localStorage
- Images are processed through Google's secure API
- No images are stored on our servers
- All processing happens in real-time

## Contributing

Feel free to submit issues and enhancement requests!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify your API key and setup
3. Check the browser console for error messages
4. Ensure all dependencies are properly installed

---

**Powered by Google Gemini AI** 🤖✨
