// Image Cropper Functionality

let cropperInstance = null;
let cropTargetItemId = null;
let isReplacingImage = false;
let replacementFile = null;

document.addEventListener('DOMContentLoaded', function() {
    const cropImageBtn = document.getElementById('cropImageBtn');
    const replaceImageBtn = document.getElementById('replaceImageBtn');
    const editImageFile = document.getElementById('editImageFile');
    const cropModal = document.getElementById('cropModal');
    const cropModalClose = document.getElementById('cropModalClose');
    const cancelCrop = document.getElementById('cancelCrop');
    const applyCrop = document.getElementById('applyCrop');
    const cropImage = document.getElementById('cropImage');

    // Crop existing image
    if (cropImageBtn) {
        cropImageBtn.addEventListener('click', async function() {
            const itemId = document.getElementById('editItemId').value;
            
            cropTargetItemId = itemId;
            isReplacingImage = false;
            
            // Fetch the original unprocessed image
            try {
                const response = await fetch(`/items/${itemId}`);
                const data = await response.json();
                
                // Use the original_url instead of processed_url
                cropImage.src = data.original_url;
                cropModal.style.display = 'block';
                
                // Initialize cropper
                setTimeout(() => {
                    initCropper(cropImage);
                }, 100);
            } catch (error) {
                showToast('Failed to load original image: ' + error.message, 'error');
            }
        });
    }

    // Replace image
    if (replaceImageBtn) {
        replaceImageBtn.addEventListener('click', function() {
            editImageFile.click();
        });
    }

    // Handle file selection for replacement
    if (editImageFile) {
        editImageFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const itemId = document.getElementById('editItemId').value;
            cropTargetItemId = itemId;
            isReplacingImage = true;
            replacementFile = file;
            
            // Read file and show in crop modal
            const reader = new FileReader();
            reader.onload = function(event) {
                cropImage.src = event.target.result;
                cropModal.style.display = 'block';
                
                // Initialize cropper
                setTimeout(() => {
                    initCropper(cropImage);
                }, 100);
            };
            reader.readAsDataURL(file);
        });
    }

    // Close crop modal
    if (cropModalClose) {
        cropModalClose.addEventListener('click', closeCropModal);
    }
    if (cancelCrop) {
        cancelCrop.addEventListener('click', closeCropModal);
    }

    // Apply crop
    if (applyCrop) {
        applyCrop.addEventListener('click', async function() {
            if (!cropperInstance) return;
            
            applyCrop.disabled = true;
            applyCrop.textContent = 'Processing...';
            
            try {
                // Get cropped canvas
                const canvas = cropperInstance.getCroppedCanvas({
                    maxWidth: 2000,
                    maxHeight: 2000,
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high'
                });
                
                // Convert to blob
                canvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    formData.append('image', blob, 'cropped.png');
                    // Indicate if this is a replacement or just a crop
                    formData.append('is_replacement', isReplacingImage ? 'true' : 'false');
                    
                    // Send to server - will process the cropped image
                    const response = await fetch(`/items/${cropTargetItemId}/update-image`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Update preview with the newly processed image
                        document.getElementById('editPreview').src = data.item.processed_url + '?t=' + Date.now();
                        
                        // Close modal
                        closeCropModal();
                        
                        // Reload items to show updated image
                        if (window.loadItems) {
                            window.loadItems();
                        }
                        
                        showToast('Image cropped and processed successfully!', 'success');
                    } else {
                        const data = await response.json();
                        showToast('Failed to update image: ' + (data.error || 'Unknown error'), 'error');
                    }
                }, 'image/png');
                
            } catch (error) {
                showToast('Failed to crop image: ' + error.message, 'error');
            } finally {
                applyCrop.disabled = false;
                applyCrop.textContent = 'Apply Crop';
            }
        });
    }

    // Close on background click
    window.addEventListener('click', function(event) {
        if (event.target === cropModal) {
            closeCropModal();
        }
    });
});

function initCropper(imgElement) {
    // Destroy existing instance
    if (cropperInstance) {
        cropperInstance.destroy();
    }
    
    // Create new cropper
    cropperInstance = new Cropper(imgElement, {
        aspectRatio: NaN, // Free aspect ratio
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
    });
}

function closeCropModal() {
    const cropModal = document.getElementById('cropModal');
    cropModal.style.display = 'none';
    
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    
    // Reset file input
    document.getElementById('editImageFile').value = '';
    cropTargetItemId = null;
    isReplacingImage = false;
    replacementFile = null;
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `status-message ${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '100px';
    toast.style.right = '20px';
    toast.style.zIndex = '10001';
    toast.style.minWidth = '250px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}