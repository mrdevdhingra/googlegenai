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
        // Import GoogleGenerativeAI using require for better Vercel compatibility
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // Convert base64 to buffer and get mime type
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Detect mime type from original data URL
        const mimeMatch = imageData.match(/^data:image\/(\w+);base64,/);
        const detectedMimeType = mimeMatch ? `image/${mimeMatch[1]}` : 'image/jpeg';

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: detectedMimeType
            }
        };

        // Create the prompt for image editing
        const prompt = `You are an expert image editor. Please edit this image according to these instructions: "${instructions}". 

Important guidelines:
- Maintain the original image quality and resolution
- Make realistic and natural-looking edits
- Preserve important details while making the requested changes
- If the instruction is unclear, make the best interpretation
- Return only the edited image

Please edit the image now.`;

        console.log('Processing image with Gemini...');
        console.log('Instructions:', instructions);
        console.log('Image mime type:', detectedMimeType);

        // Generate content with image
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        
        // Check if we got image data back
        if (response.candidates && response.candidates[0] && response.candidates[0].content) {
            const content = response.candidates[0].content;
            
            // Look for inline data in the response
            if (content.parts && content.parts[0] && content.parts[0].inlineData) {
                const editedImageData = content.parts[0].inlineData.data;
                const editedMimeType = content.parts[0].inlineData.mimeType || 'image/png';
                
                return res.json({
                    success: true,
                    editedImage: `data:${editedMimeType};base64,${editedImageData}`,
                    message: 'Image edited successfully!'
                });
            }
            
            // If no image data, check for text response
            if (content.parts && content.parts[0] && content.parts[0].text) {
                return res.status(400).json({
                    success: false,
                    error: 'AI returned text instead of edited image. Try rephrasing your request or use a different image.',
                    details: content.parts[0].text
                });
            }
        }

        // If we get here, something went wrong
        return res.status(500).json({
            success: false,
            error: 'Failed to process image. The AI did not return an edited image.',
            details: 'No image data found in AI response'
        });

    } catch (error) {
        console.error('Error processing image:', error);
        
        // Handle specific API errors
        if (error.message && error.message.includes('API key')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key. Please check your Gemini API key.'
            });
        }
        
        if (error.message && error.message.includes('quota')) {
            return res.status(429).json({
                success: false,
                error: 'API quota exceeded. Please check your Gemini API usage limits.'
            });
        }
        
        if (error.message && error.message.includes('SAFETY')) {
            return res.status(400).json({
                success: false,
                error: 'Content blocked by safety filters. Please try a different image or instruction.'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Failed to process image with AI',
            details: error.message
        });
    }
};