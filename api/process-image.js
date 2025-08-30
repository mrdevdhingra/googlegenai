module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        // Import GoogleGenAI using the old package that works (matching server.js)
        const { GoogleGenAI } = require('@google/genai');
        
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

        // Initialize Gemini AI (matching server.js)
        const genAI = new GoogleGenAI({
            apiKey: apiKey
        });

        // Configuration for image generation (matching server.js)
        const config = {
            responseModalities: ['IMAGE', 'TEXT']
        };

        const model = 'gemini-2.5-flash-image-preview';

        // Extract base64 data from data URL (matching server.js)
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.split(';')[0].split(':')[1];

        // Prepare the content for the API (matching server.js)
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

        // Generate content stream (matching server.js)
        const response = await genAI.models.generateContentStream({
            model,
            config,
            contents
        });

        const generatedImages = [];
        let textResponse = '';

        // Process the stream (matching server.js)
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
                message: 'No images were generated. The AI provided text feedback instead.',
                debugInfo: {
                    textResponse: textResponse,
                    instructions: instructions
                }
            });
        }

        // Return the first generated image in the expected format
        res.json({
            success: true,
            editedImage: generatedImages[0], // Match the expected response format
            images: generatedImages,
            text: textResponse,
            message: 'Image edited successfully!'
        });

    } catch (error) {
        console.error('Error processing image:', error);
        
        // Handle specific API errors (matching server.js)
        let errorMessage = 'An error occurred while processing the image';
        
        if (error.message && error.message.includes('API key')) {
            errorMessage = 'Invalid API key. Please check your Gemini API key.';
        } else if (error.message && error.message.includes('quota')) {
            errorMessage = 'API quota exceeded. Please check your Gemini API usage.';
        } else if (error.message && error.message.includes('permission')) {
            errorMessage = 'Permission denied. Please check your API key permissions.';
        } else if (error.message && error.message.includes('model')) {
            errorMessage = 'Model not available. Please try again later.';
        } else if (error.message && error.message.includes('SAFETY')) {
            errorMessage = 'Content blocked by safety filters. Please try a different image or instruction.';
        }

        return res.status(500).json({
            success: false,
            error: errorMessage,
            details: error.message,
            debugInfo: {
                originalError: error.toString(),
                stack: error.stack
            }
        });
    }
};