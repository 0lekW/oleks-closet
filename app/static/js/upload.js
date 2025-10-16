document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadProgress = document.getElementById('uploadProgress');
    const itemsGrid = document.getElementById('itemsGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const modalClose = document.querySelector('.modal-close');
    const cancelEdit = document.getElementById('cancelEdit');

    // Handle form submission
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(uploadForm);
        const submitBtn = uploadForm.querySelector('button[type="submit"]');
        
        // Show progress
        uploadProgress.style.display = 'block';
        uploadStatus.style.display = 'none';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            uploadProgress.style.display = 'none';
            uploadStatus.style.display = 'block';
            
            if (response.ok) {
                uploadStatus.className = 'status-message success';
                uploadStatus.textContent = data.message;
                uploadForm.reset();
                
                // Reload items
                loadItems();
            } else {
                uploadStatus.className = 'status-message error';
                uploadStatus.textContent = data.error || 'Upload failed';
            }
        } catch (error) {
            uploadProgress.style.display = 'none';
            uploadStatus.style.display = 'block';
            uploadStatus.className = 'status-message error';
            uploadStatus.textContent = 'Network error: ' + error.message;
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Load items
    async function loadItems() {
        const category = categoryFilter.value;
        const search = searchInput.value;
        
        let url = '/items?';
        if (category) url += `category=${category}&`;
        if (search) url += `search=${search}&`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            displayItems(data.items);
        } catch (error) {
            console.error('Failed to load items:', error);
            itemsGrid.innerHTML = '<p>Failed to load items</p>';
        }
    }

    // Display items in grid
    function displayItems(items) {
        if (items.length === 0) {
            itemsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No items found. Upload your first clothing item!</p>';
            return;
        }
        
        itemsGrid.innerHTML = items.map(item => `
            <div class="item-card" data-id="${item.id}">
                <div class="item-card-actions">
                    <button class="item-action-btn edit" onclick="editItem(${item.id}, event)" title="Edit">
                        ✏️
                    </button>
                    <button class="item-action-btn delete" onclick="deleteItem(${item.id}, event)" title="Delete">
                        🗑️
                    </button>
                </div>
                <img src="${item.thumbnail_url}" alt="${item.name || 'Clothing item'}">
                <div class="item-card-info">
                    <h3>${item.name || 'Unnamed Item'}</h3>
                    ${item.category ? `<span class="category">${item.category}</span>` : ''}
                    ${item.tags && item.tags.length > 0 ? `
                        <div class="item-tags">
                            ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Filter handlers
    searchInput.addEventListener('input', debounce(loadItems, 500));
    categoryFilter.addEventListener('change', loadItems);

    // Debounce utility
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Delete item function (global scope for onclick)
    window.deleteItem = async function(itemId, event) {
        event.stopPropagation();
        
        if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/items/${itemId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                loadItems();
                showToast('Item deleted successfully', 'success');
            } else {
                alert('Failed to delete item: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Network error: ' + error.message);
        }
    };

    // Edit item function (global scope for onclick)
    window.editItem = async function(itemId, event) {
        event.stopPropagation();
        
        try {
            const response = await fetch(`/items/${itemId}`);
            const item = await response.json();
            
            // Populate form
            document.getElementById('editItemId').value = item.id;
            document.getElementById('editName').value = item.name || '';
            document.getElementById('editCategory').value = item.category || '';
            document.getElementById('editTags').value = item.tags ? item.tags.join(', ') : '';
            document.getElementById('editPreview').src = item.processed_url;
            
            // Show modal
            editModal.style.display = 'block';
        } catch (error) {
            alert('Failed to load item: ' + error.message);
        }
    };

    // Handle edit form submission
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const itemId = document.getElementById('editItemId').value;
        const name = document.getElementById('editName').value.trim() || null;
        const category = document.getElementById('editCategory').value.trim() || null;
        const tagsStr = document.getElementById('editTags').value.trim();
        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
        
        try {
            const response = await fetch(`/items/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, category, tags })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                editModal.style.display = 'none';
                loadItems();
                showToast('Item updated successfully', 'success');
            } else {
                alert('Failed to update item: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Network error: ' + error.message);
        }
    });

    // Modal close handlers
    modalClose.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
    
    cancelEdit.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === editModal) {
            editModal.style.display = 'none';
        }
    });

    // Toast notification helper
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `status-message ${type}`;
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '1000';
        toast.style.minWidth = '250px';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Initial load
    loadItems();
});