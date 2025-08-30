const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mime = require('mime');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// API endpoint to process images with Gemini
app.post('/api/process-image', async (req, res) => {
    try {
        const { apiKey, imageData, instructions } = req.body;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API key is required'
            });
        }

        if (!imageData) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required'
            });
        }

        if (!instructions) {
            return res.status(400).json({
                success: false,
                error: 'Instructions are required'
            });
        }

        // Initialize Gemini AI
        const genAI = new GoogleGenerativeAI(apiKey);

        // Configuration for image generation
        const config = {
            responseModalities: ['IMAGE', 'TEXT']
        };

        const model = 'gemini-2.5-flash-image-preview';

        // Extract base64 data from data URL
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.split(';')[0].split(':')[1];

        // Prepare the content for the API
        const contents = [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    },
                    {
                        text: `Please edit this image according to these instructions: ${instructions}. 
                               Generate a high-quality edited version of this image. 
                               Maintain the original image quality and dimensions as much as possible.
                               Focus on making realistic and natural-looking edits.`
                    }
                ]
            }
        ];

        console.log('Processing image with Gemini AI...');

        // Generate content stream
        const response = await genAI.models.generateContentStream({
            model,
            config,
            contents
        });

        const generatedImages = [];
        let textResponse = '';

        // Process the stream
        for await (const chunk of response) {
            if (!chunk.candidates || !chunk.candidates[0] || !chunk.candidates[0].content) {
                continue;
            }

            const parts = chunk.candidates[0].content.parts;
            if (!parts) continue;

            for (const part of parts) {
                if (part.inlineData) {
                    // Handle generated image
                    const { mimeType: generatedMimeType, data: generatedData } = part.inlineData;
                    const imageDataUrl = `data:${generatedMimeType};base64,${generatedData}`;
                    generatedImages.push(imageDataUrl);
                } else if (part.text) {
                    // Handle text response
                    textResponse += part.text;
                }
            }
        }

        console.log(`Generated ${generatedImages.length} images`);

        if (generatedImages.length === 0) {
            return res.status(200).json({
                success: true,
                images: [],
                text: textResponse,
                message: 'No images were generated. The AI provided text feedback instead.'
            });
        }

        res.json({
            success: true,
            images: generatedImages,
            text: textResponse
        });

    } catch (error) {
        console.error('Error processing image:', error);
        
        let errorMessage = 'An error occurred while processing the image';
        
        if (error.message.includes('API key')) {
            errorMessage = 'Invalid API key. Please check your Gemini API key.';
        } else if (error.message.includes('quota')) {
            errorMessage = 'API quota exceeded. Please check your Gemini API usage.';
        } else if (error.message.includes('permission')) {
            errorMessage = 'Permission denied. Please check your API key permissions.';
        } else if (error.message.includes('model')) {
            errorMessage = 'Model not available. Please try again later.';
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI Image Editor server running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🤖 Gemini AI integration ready`);
    console.log('');
    console.log('To use the application:');
    console.log('1. Get your Gemini API key from: https://makersuite.google.com/app/apikey');
    console.log('2. Open http://localhost:8080 in your browser');
    console.log('3. Enter your API key when prompted');
    console.log('4. Upload an image and start editing!');
});

module.exports = app;
