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
});