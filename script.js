$(document).ready(function() {
    // Global variables
    let currentImage = null;
    let originalImageData = null;
    let apiKey = localStorage.getItem('gemini_api_key');
    let eventListenersSetup = false;

    // DOM elements
    const $uploadArea = $('#uploadArea');
    const $imageInput = $('#imageInput');
    const $uploadSection = $('#uploadSection');
    const $editorSection = $('#editorSection');
    const $resultsSection = $('#resultsSection');
    const $loadingSection = $('#loadingSection');
    const $previewImage = $('#previewImage');
    const $imageInfo = $('#imageInfo');
    const $editInstructions = $('#editInstructions');
    const $processBtn = $('#processBtn');
    const $resetBtn = $('#resetBtn');
    const $newImageBtn = $('#newImageBtn');
    const $resultsGrid = $('#resultsGrid');
    const $apiKeyModal = $('#apiKeyModal');
    const $apiKeyInput = $('#apiKeyInput');
    const $saveApiKey = $('#saveApiKey');
    const $toast = $('#toast');
    const $imagePreviewModal = $('#imagePreviewModal');
    const $modalPreviewImage = $('#modalPreviewImage');
    const $closeImageModal = $('#closeImageModal');
    const $modalDownloadBtn = $('#modalDownloadBtn');
    const $modalUseBtn = $('#modalUseBtn');

    // Initialize app
    init();

    function init() {
        setupEventListeners();
        if (!apiKey) {
            showApiKeyModal();
        }
    }

    function setupEventListeners() {
        // Prevent duplicate event listener setup
        if (eventListenersSetup) {
            return;
        }
        eventListenersSetup = true;
        
        // File upload events
        $uploadArea.on('click', function(e) {
            // Prevent infinite recursion by checking if the click came from the input itself
            if (e.target !== $imageInput[0]) {
                $imageInput.click();
            }
        });
        $imageInput.on('change', handleFileSelect);
        
        // Drag and drop events
        $uploadArea.on('dragover', handleDragOver);
        $uploadArea.on('dragleave', handleDragLeave);
        $uploadArea.on('drop', handleDrop);
        
        // Quick edit buttons
        $('.quick-edit-btn').on('click', handleQuickEdit);
        
        // Action buttons
        $processBtn.on('click', processImage);
        $resetBtn.on('click', resetToOriginal);
        $newImageBtn.on('click', startNew);
        
        // API key modal
        $saveApiKey.on('click', saveApiKey);
        $apiKeyInput.on('keypress', function(e) {
            if (e.which === 13) saveApiKey();
        });
        
        // Image preview modal events
        $closeImageModal.on('click', hideImagePreviewModal);
        $imagePreviewModal.on('click', function(e) {
            // Close modal if clicking on the backdrop (not the content)
            if (e.target === this) {
                hideImagePreviewModal();
            }
        });
        $modalDownloadBtn.on('click', function() {
            const imageData = $modalPreviewImage.attr('src');
            if (imageData) {
                downloadImage(imageData, `ai-edited-image-${Date.now()}.png`);
            }
        });
        $modalUseBtn.on('click', function() {
            const imageData = $modalPreviewImage.attr('src');
            if (imageData) {
                $previewImage.attr('src', imageData);
                hideImagePreviewModal();
                showSection('editor');
                showToast('Image updated in editor', 'success');
            }
        });
        
        // Prevent default drag behaviors on document
        $(document).on('dragover drop', function(e) {
            e.preventDefault();
        });
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            loadImage(file);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        $uploadArea.addClass('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        $uploadArea.removeClass('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        $uploadArea.removeClass('dragover');
        
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                loadImage(file);
            } else {
                showToast('Please drop an image file', 'error');
            }
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
                
                // Display image
                $previewImage.attr('src', imageData);
                
                // Update image info
                const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
                $imageInfo.html(`
                    <strong>${file.name}</strong><br>
                    Size: ${sizeInMB}MB<br>
                    Type: ${file.type}
                `);
                
                // Show editor section
                showSection('editor');
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

    function handleQuickEdit(e) {
        const $btn = $(e.currentTarget);
        const prompt = $btn.data('prompt');
        
        // Update active state
        $('.quick-edit-btn').removeClass('active');
        $btn.addClass('active');
        
        // Set the prompt in textarea
        $editInstructions.val(prompt);
        
        showToast('Quick edit selected', 'info');
    }

    async function processImage() {
        if (!apiKey) {
            showApiKeyModal();
            return;
        }

        if (!currentImage) {
            showToast('Please upload an image first', 'error');
            return;
        }

        const instructions = $editInstructions.val().trim();
        if (!instructions) {
            showToast('Please enter editing instructions', 'error');
            return;
        }

        try {
            showSection('loading');
            
            // Convert image to base64
            const imageBase64 = await fileToBase64(currentImage);
            
            // Call Gemini API
            const result = await callGeminiAPI(imageBase64, instructions);
            
            if (result.success) {
                displayResults(result.images);
                showSection('results');
                showToast('AI processing completed!', 'success');
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('Processing error:', error);
            showToast(`Error: ${error.message}`, 'error');
            showSection('editor');
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

    function displayResults(images) {
        $resultsGrid.empty();
        
        if (!images || images.length === 0) {
            $resultsGrid.html('<p>No images were generated. Please try a different prompt.</p>');
            return;
        }

        images.forEach((imageData, index) => {
            const $resultItem = $(`
                <div class="result-item fade-in">
                    <img src="${imageData}" alt="Generated result ${index + 1}" title="Click to view full size">
                    <div class="result-actions">
                        <button class="btn btn-primary download-btn" data-image="${imageData}">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="btn btn-secondary use-btn" data-image="${imageData}">
                            <i class="fas fa-check"></i> Use This
                        </button>
                    </div>
                </div>
            `);
            
            // Attach event listeners directly to the specific elements
            $resultItem.find('img').on('click', function() {
                const imageData = $(this).attr('src');
                showImagePreviewModal(imageData);
            });

            $resultItem.find('.download-btn').on('click', function() {
                const imageData = $(this).data('image');
                downloadImage(imageData, `ai-edited-image-${Date.now()}.png`);
            });

            $resultItem.find('.use-btn').on('click', function() {
                const imageData = $(this).data('image');
                $previewImage.attr('src', imageData);
                showSection('editor');
                showToast('Image updated in editor', 'success');
            });
            
            $resultsGrid.append($resultItem);
        });
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
        if (originalImageData) {
            $previewImage.attr('src', originalImageData);
            $editInstructions.val('');
            $('.quick-edit-btn').removeClass('active');
            showToast('Reset to original image', 'info');
        }
    }

    function startNew() {
        currentImage = null;
        originalImageData = null;
        $imageInput.val('');
        $editInstructions.val('');
        $('.quick-edit-btn').removeClass('active');
        $resultsGrid.empty();
        showSection('upload');
        showToast('Ready for new image', 'info');
    }

    function showSection(section) {
        // Hide all sections
        $uploadSection.hide();
        $editorSection.hide();
        $resultsSection.hide();
        $loadingSection.hide();
        
        // Show requested section
        switch (section) {
            case 'upload':
                $uploadSection.show().addClass('fade-in');
                break;
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

    function showApiKeyModal() {
        $apiKeyModal.show().addClass('fade-in');
    }

    function hideApiKeyModal() {
        $apiKeyModal.hide();
    }

    function showImagePreviewModal(imageData) {
        $modalPreviewImage.attr('src', imageData);
        $imagePreviewModal.show().addClass('fade-in');
        // Prevent body scrolling when modal is open
        $('body').css('overflow', 'hidden');
    }

    function hideImagePreviewModal() {
        $imagePreviewModal.hide().removeClass('fade-in');
        // Restore body scrolling
        $('body').css('overflow', '');
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
        hideApiKeyModal();
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
        
        // Escape to close modal
        if (e.which === 27) {
            if ($imagePreviewModal.is(':visible')) {
                hideImagePreviewModal();
            } else if ($apiKeyModal.is(':visible')) {
                // Don't close if no API key is set
                if (apiKey) {
                    hideApiKeyModal();
                }
            }
        }
    });

    // Initialize tooltips and animations
    setTimeout(() => {
        $('.fade-in').addClass('fade-in');
    }, 100);
});
