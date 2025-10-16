document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadProgress = document.getElementById('uploadProgress');
    const itemsGrid = document.getElementById('itemsGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

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

    // Initial load
    loadItems();


    // Delete item function (global scope for onclick)
    window.deleteItem = async function(itemId, event) {
        event.stopPropagation(); // Prevent card click
        
        if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/items/${itemId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Reload items
                loadItems();
                
                // Show success message briefly
                const statusDiv = document.createElement('div');
                statusDiv.className = 'status-message success';
                statusDiv.textContent = 'Item deleted successfully';
                statusDiv.style.position = 'fixed';
                statusDiv.style.top = '20px';
                statusDiv.style.right = '20px';
                statusDiv.style.zIndex = '1000';
                document.body.appendChild(statusDiv);
                
                setTimeout(() => {
                    statusDiv.remove();
                }, 3000);
            } else {
                alert('Failed to delete item: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Network error: ' + error.message);
        }
    };

    // Edit item function (placeholder for now)
    window.editItem = function(itemId, event) {
        event.stopPropagation();
        alert('Edit functionality coming next!');
    };
});