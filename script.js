$(document).ready(function() {
    // Global variables
    let currentImage = null;
    let originalImageData = null;
    let apiKey = localStorage.getItem('gemini_api_key');
    let eventListenersSetup = false;

    // DOM elements
    const $imageInput = $('#imageInput');
    const $chatContainer = $('#chatContainer');
    const $chatMessages = $('#chatMessages');
    const $loadingSection = $('#loadingSection');
    const $editInstructions = $('#editInstructions');
    const $processBtn = $('#processBtn');
    const $resetBtn = $('#resetBtn');
    const $imageInputLabel = $('#imageInputLabel');
    const $imageInputText = $('#imageInputText');
    const $imageThumbnailContainer = $('#imageThumbnailContainer');
    const $thumbnailImage = $('#thumbnailImage');
    const $removeImageBtn = $('#removeImageBtn');
    const $apiKeyRow = $('#apiKeyRow');
    const $apiKeyInput = $('#apiKeyInput');
    const $saveApiKey = $('#saveApiKey');
    const $toast = $('#toast');

    // Initialize app
    init();

    function init() {
        setupEventListeners();
        updateApiKeyVisibility();
        $processBtn.prop('disabled', true);
        
        // Auto-resize textarea
        autoResizeTextarea();
    }

    function setupEventListeners() {
        // Prevent duplicate event listener setup
        if (eventListenersSetup) {
            return;
        }
        eventListenersSetup = true;
        
        // File upload events
        $imageInput.on('change', handleFileSelect);
        $removeImageBtn.on('click', removeImage);
        
        // Edit instructions input with auto-resize
        $editInstructions.on('input', function() {
            autoResizeTextarea();
            updateProcessButtonState();
        });
        
        // Enter key to submit (Shift+Enter for new line)
        $editInstructions.on('keydown', function(e) {
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();
                if (!$processBtn.prop('disabled')) {
                    processImage();
                }
            }
        });
        
        // Action buttons
        $processBtn.on('click', processImage);
        $resetBtn.on('click', resetToOriginal);
        
        // API key input
        $saveApiKey.on('click', saveApiKey);
        $apiKeyInput.on('keypress', function(e) {
            if (e.which === 13) saveApiKey();
        });
        

    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            loadImage(file);
        }
    }

    function loadImage(file) {
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size must be less than 10MB', 'error');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imageData = e.target.result;
                currentImage = file;
                originalImageData = imageData;
                
                // Update image input state
                updateImageInputState(true, file.name);
                updateProcessButtonState();
                showToast('Image loaded successfully!', 'success');
            } catch (error) {
                console.error('Error processing image data:', error);
                showToast('Error processing image', 'error');
            }
            
            // Clean up reader references
            reader.onload = null;
            reader.onerror = null;
        };
        
        reader.onerror = function(error) {
            console.error('FileReader error:', error);
            showToast('Error reading file', 'error');
            
            // Clean up reader references
            reader.onload = null;
            reader.onerror = null;
        };
        
        reader.readAsDataURL(file);
    }

    async function processImage() {
        if (!apiKey) {
            showToast('Please enter your API key first', 'error');
            return;
        }

        if (!currentImage) {
            showToast('Please attach an image first', 'error');
            return;
        }

        const instructions = $editInstructions.val().trim();
        if (!instructions) {
            showToast('Please enter editing instructions', 'error');
            return;
        }

        try {
            // Convert image to base64
            const imageBase64 = originalImageData || await fileToBase64(currentImage);
            
            // Store current prompt and image for context
            const currentContext = {
                prompt: instructions,
                originalImage: imageBase64
            };
            
            // Show prompt immediately with loading state
            showPromptWithLoading(instructions, imageBase64);
            
            // Call Gemini API
            const result = await callGeminiAPI(imageBase64, instructions);
            
            // Remove loading message and replace with actual result
            removeLoadingMessage();
            
            if (result.success) {
                console.log('Full API response:', result); // Debug log
                
                // Check for images more robustly
                const hasImages = (result.images && result.images.length > 0) || 
                                 (result.editedImage && result.editedImage.length > 0);
                
                // Check for text more robustly  
                const hasText = (result.text && result.text.trim().length > 0);
                
                console.log('Detected hasImages:', hasImages, 'hasText:', hasText); // Debug log
                
                // Handle text response first (if any)
                if (hasText) {
                    addChatMessage(result.text.trim(), 'ai-text');
                }
                
                // Handle images (if any)
                if (hasImages) {
                    // Handle both formats - array of images or single editedImage
                    const imagesToDisplay = result.images && result.images.length > 0 
                        ? result.images 
                        : result.editedImage 
                            ? [result.editedImage] 
                            : [];
                    
                    if (imagesToDisplay.length > 0) {
                        displayResults(imagesToDisplay, currentContext);
                    }
                } else if (hasText) {
                    // If only text response, keep the prompt visible and just remove loading
                    $('.simple-loading').remove();
                }
                
                // Show appropriate toast message
                if (hasImages && hasText) {
                    showToast('AI provided both text and images!', 'success');
                } else if (hasImages) {
                    showToast('AI processing completed!', 'success');
                } else if (hasText) {
                    showToast('AI provided text response', 'info');
                } else {
                    showToast('No response received from AI', 'error');
                    console.log('No images or text detected in result:', result); // Debug log
                }
                
                // Clear input after any successful processing
                if (hasImages || hasText) {
                    $editInstructions.val('');
                    autoResizeTextarea();
                    updateProcessButtonState();
                }
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('Processing error:', error);
            removeLoadingMessage();
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    async function callGeminiAPI(imageBase64, instructions) {
        try {
            // Since we're in the browser, we need to call our backend API
            const response = await fetch('/api/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: apiKey,
                    imageData: imageBase64,
                    instructions: instructions
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
            
        } catch (error) {
            // If backend is not available, show instructions for manual setup
            console.error('API call failed:', error);
            
            // For demo purposes, we'll simulate a response
            // In a real implementation, you'd need a backend server
            showToast('Backend server required. Please check the README for setup instructions.', 'error');
            
            return {
                success: false,
                error: 'Backend server not available. Please set up the Node.js server to use AI features.'
            };
        }
    }

    function displayResults(images, context) {
        if (!images || images.length === 0) {
            showToast('No images were generated. Please try a different prompt.', 'error');
            return;
        }

        // Remove the loading text and replace with image results
        const $loadingMessage = $('.loading-message');
        if ($loadingMessage.length > 0) {
            // Replace loading text with the first image
            const $loadingText = $loadingMessage.find('.simple-loading');
            if ($loadingText.length > 0) {
                const firstImage = images[0];
                const $imageContainer = $('<div class="message-image"></div>');
                
                const $img = $(`<img src="${firstImage}" alt="AI Generated Image" />`);
                const $actions = $(`
                    <div class="message-actions">
                        <button class="btn btn-secondary download-btn" data-image="${firstImage}">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                `);
                

                
                $actions.find('.download-btn').on('click', function() {
                    downloadImage(firstImage, `ai-edited-image-${Date.now()}.png`);
                });
                
                $imageContainer.append($img).append($actions);
                $loadingText.replaceWith($imageContainer);
                
                $loadingMessage.removeClass('loading-message');
                
                // Add any additional images as separate messages
                for (let i = 1; i < images.length; i++) {
                    addChatMessage(images[i], 'ai', context);
                }
            }
        } else {
            // Fallback: add all images as separate messages
            images.forEach((imageData, index) => {
                addChatMessage(imageData, 'ai', context);
            });
        }
        
        // Scroll to bottom to show new results
        scrollToBottom();
    }

    function downloadImage(imageData, filename) {
        try {
            const link = document.createElement('a');
            link.download = filename;
            link.href = imageData;
            link.click();
            showToast('Download started!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            showToast('Download failed', 'error');
        }
    }

    function resetToOriginal() {
        // Clear chat messages
        $chatMessages.empty();
        
        // Reset form state
        $processBtn.prop('disabled', true);
        $editInstructions.val('');
        currentImage = null;
        originalImageData = null;
        $imageInput.val('');
        
        // Reset image input state
        updateImageInputState(false);
        autoResizeTextarea();
        
        showToast('Reset complete', 'info');
    }

    function showSection(section) {
        // Hide all sections
        $resultsSection.hide();
        $loadingSection.hide();
        
        // Show requested section
        switch (section) {
            case 'editor':
                $editorSection.show().addClass('fade-in');
                break;
            case 'results':
                $editorSection.show();
                $resultsSection.show().addClass('slide-up');
                break;
            case 'loading':
                $loadingSection.show().addClass('fade-in');
                break;
        }
    }

    function updateApiKeyVisibility() {
        if (apiKey) {
            $apiKeyRow.hide();
        } else {
            $apiKeyRow.show();
        }
    }



    function saveApiKey() {
        const key = $apiKeyInput.val().trim();
        if (!key) {
            showToast('Please enter a valid API key', 'error');
            return;
        }

        // Basic validation (Gemini API keys typically start with 'AIza')
        if (!key.startsWith('AIza')) {
            showToast('API key format appears invalid. Please verify.', 'error');
            return;
        }

        apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        updateApiKeyVisibility();
        showToast('API key saved successfully!', 'success');
    }

    function showToast(message, type = 'info') {
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        $toast.removeClass('success error info show')
              .addClass(type)
              .find('.toast-icon').attr('class', `toast-icon ${iconMap[type]}`);
        
        $toast.find('.toast-message').text(message);
        $toast.addClass('show');

        // Auto hide after 4 seconds
        setTimeout(() => {
            $toast.removeClass('show');
        }, 4000);
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Utility function to get file extension from mime type
    function getFileExtension(mimeType) {
        const mimeMap = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/bmp': 'bmp',
            'image/tiff': 'tiff'
        };
        return mimeMap[mimeType] || 'png';
    }

    // Handle window resize for responsive behavior
    $(window).on('resize', function() {
        // Adjust layout if needed
        if ($(window).width() < 768) {
            $('.editing-panel').css('order', '-1');
        } else {
            $('.editing-panel').css('order', '');
        }
    });

    // Keyboard shortcuts
    $(document).on('keydown', function(e) {
        // Ctrl/Cmd + Enter to process image
        if ((e.ctrlKey || e.metaKey) && e.which === 13) {
            e.preventDefault();
            if ($editorSection.is(':visible')) {
                processImage();
            }
        }
        

    });

    // New helper functions for chat interface
    function addChatMessage(content, type, context) {
        const $message = $('<div class="chat-message"></div>');
        
        if (type === 'user') {
            // User prompt message
            const $prompt = $(`<div class="message-prompt">${content}</div>`);
            $message.append($prompt);
        } else if (type === 'ai') {
            // AI generated image with context
            const $imageContainer = $('<div class="message-image"></div>');
            
            // Add context prompt with thumbnail if provided
            if (context && context.prompt && context.originalImage) {
                const $contextPrompt = $(`
                    <div class="message-prompt-with-thumbnail">
                        <img src="${context.originalImage}" alt="Original image" class="prompt-thumbnail" />
                        <span class="prompt-text">${context.prompt}</span>
                    </div>
                `);
                $message.append($contextPrompt);
            }
            
            const $img = $(`<img src="${content}" alt="AI Generated Image" />`);
            const $actions = $(`
                <div class="message-actions">
                    <button class="btn btn-secondary download-btn" data-image="${content}">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `);
            

            
            $actions.find('.download-btn').on('click', function() {
                downloadImage(content, `ai-edited-image-${Date.now()}.png`);
            });
            
            $imageContainer.append($img).append($actions);
            $message.append($imageContainer);
        } else if (type === 'error') {
            // Error message
            const $error = $(`<div class="message-prompt" style="color: #ef4444;">${content}</div>`);
            $message.append($error);
        } else if (type === 'text') {
            // Generic text message
            const $text = $(`<div class="message-prompt" style="color: #a1a1aa; font-weight: 500;">${content}</div>`);
            $message.append($text);
        } else if (type === 'ai-text') {
            // AI text response (questions, clarifications, explanations)
            const $aiText = $(`<div class="ai-text-response">${content}</div>`);
            $message.append($aiText);
        }
        
        $chatMessages.append($message);
        scrollToBottom();
    }
    
    function showPromptWithLoading(prompt, imageBase64) {
        const $message = $('<div class="chat-message loading-message"></div>');
        
        // Add prompt with thumbnail immediately
        const $contextPrompt = $(`
            <div class="message-prompt-with-thumbnail">
                <img src="${imageBase64}" alt="Original image" class="prompt-thumbnail" />
                <span class="prompt-text">${prompt}</span>
            </div>
        `);
        $message.append($contextPrompt);
        
        // Add simple loading text with animated dots
        const $loadingText = $(`
            <div class="simple-loading">loading</div>
        `);
        $message.append($loadingText);
        
        $chatMessages.append($message);
        scrollToBottom();
    }
    
    function removeLoadingMessage() {
        $('.loading-message').remove();
    }
    
    function updateImageInputState(hasImage, filename) {
        if (hasImage) {
            $imageInputLabel.addClass('has-image').hide();
            
            // Show thumbnail if we have image data
            if (originalImageData) {
                $thumbnailImage.attr('src', originalImageData);
                $imageThumbnailContainer.show();
            }
        } else {
            $imageInputLabel.removeClass('has-image').show();
            $imageInputText.text('Attach Image');
            $imageThumbnailContainer.hide();
            $thumbnailImage.attr('src', '');
        }
    }
    
    function removeImage() {
        currentImage = null;
        originalImageData = null;
        $imageInput.val('');
        updateImageInputState(false);
        updateProcessButtonState();
        showToast('Image removed', 'info');
    }
    
    function updateProcessButtonState() {
        const hasImage = currentImage || originalImageData;
        const hasText = $editInstructions.val().trim().length > 0;
        $processBtn.prop('disabled', !(hasImage && hasText));
    }
    
    function autoResizeTextarea() {
        const textarea = $editInstructions[0];
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    
    function scrollToBottom() {
        setTimeout(() => {
            $chatContainer.animate({
                scrollTop: $chatContainer[0].scrollHeight
            }, 300);
        }, 100);
    }

    // Initialize tooltips and animations
    setTimeout(() => {
        $('.fade-in').addClass('fade-in');
    }, 100);
});
