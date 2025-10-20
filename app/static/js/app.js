document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const addButton = document.getElementById('addButton');
    const addModal = document.getElementById('addModal');
    const addModalClose = document.getElementById('addModalClose');
    const cancelAdd = document.getElementById('cancelAdd');
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');
    const itemsGrid = document.getElementById('itemsGrid');
    const itemsGridContainer = document.getElementById('itemsGridContainer');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const builderToggle = document.getElementById('builderToggle');
    const builderPanel = document.getElementById('builderPanel');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editModalClose = document.querySelector('#editModal .modal-close');
    const cancelEdit = document.getElementById('cancelEdit');
    const viewModal = document.getElementById('viewModal');
    const viewModalClose = document.getElementById('viewModalClose');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.querySelector('.dark-mode-icon');

    // Builder toggle functionality
    builderToggle.addEventListener('click', function() {
        const isOpen = builderPanel.classList.contains('open');
        
        if (isOpen) {
            closeBuilder();
        } else {
            openBuilder();
        }
    });

    function openBuilder() {
        builderPanel.classList.add('open');
        builderToggle.classList.add('hidden');
        itemsGridContainer.classList.add('builder-open');
    }

    function closeBuilder() {
        builderPanel.classList.remove('open');
        builderToggle.classList.remove('hidden');
        itemsGridContainer.classList.remove('builder-open');
    }

    // Add button - open modal
    addButton.addEventListener('click', function() {
        addModal.style.display = 'block';
    });

    // Close add modal
    addModalClose.addEventListener('click', function() {
        addModal.style.display = 'none';
        uploadForm.reset();
    });

    cancelAdd.addEventListener('click', function() {
        addModal.style.display = 'none';
        uploadForm.reset();
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === addModal) {
            addModal.style.display = 'none';
            uploadForm.reset();
        }
        if (event.target === editModal) {
            editModal.style.display = 'none';
        }
        if (event.target === viewModal) {
            viewModal.style.display = 'none';
        }
    });

    // Handle upload form submission
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(uploadForm);
        const submitBtn = uploadForm.querySelector('button[type="submit"]');
        
        uploadProgress.style.display = 'block';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            uploadProgress.style.display = 'none';
            
            if (response.ok) {
                addModal.style.display = 'none';
                uploadForm.reset();
                loadItems();
                showToast('Item uploaded successfully!', 'success');
            } else {
                showToast(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            uploadProgress.style.display = 'none';
            showToast('Network error: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Load items
    async function loadItems() {
        const category = categoryFilter.value;
        const search = searchInput.value;
        const sort = sortFilter.value;
        
        let url = '/items?';
        if (category) url += `category=${category}&`;
        if (search) url += `search=${search}&`;
        if (sort) url += `sort=${sort}&`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            displayItems(data.items);
        } catch (error) {
            console.error('Failed to load items:', error);
            itemsGrid.innerHTML = '<div class="empty-state"><h3>Failed to load items</h3></div>';
        }
    }

    // Display items in grid
    function displayItems(items) {
        if (items.length === 0) {
            itemsGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No items found</h3>
                    <p>Click the ADD button to upload your first clothing item!</p>
                </div>
            `;
            return;
        }
        
        const isMobile = window.innerWidth <= 768;
        const clickHandler = isMobile ? 'addItemToBuilder' : 'viewItem';
        
        itemsGrid.innerHTML = items.map(item => `
            <div class="item-card" data-id="${item.id}" onclick="${clickHandler}(${item.id})">
                ${item.inBuilder ? '<div class="item-in-builder-badge">✓</div>' : ''}
                <div class="item-card-actions">
                    <button class="item-action-btn edit" onclick="editItem(${item.id}, event)" title="Edit">
                        <img src="/static/images/icons/edit.png" alt="Edit">
                    </button>
                    <button class="item-action-btn delete" onclick="deleteItem(${item.id}, event)" title="Delete">
                        <img src="/static/images/icons/trash.png" alt="Delete">
                    </button>
                </div>
                <img src="${item.thumbnail_url}" alt="${item.name || 'Clothing item'}" class="clothing-photo">
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

        // Initialize Masonry
        setTimeout(() => {
            const msnry = new Masonry(itemsGrid, {
                itemSelector: '.item-card',
                columnWidth: 220,
                gutter: 24,
                fitWidth: true
                //transitionDuration: 0
            });
            
            window.masonryInstance = msnry;
            
            // Re-layout after images load
            const images = itemsGrid.querySelectorAll('img');
            let loadedCount = 0;
            images.forEach(img => {
                if (img.complete) {
                    loadedCount++;
                    if (loadedCount === images.length) msnry.layout();
                } else {
                    img.addEventListener('load', () => {
                        loadedCount++;
                        if (loadedCount === images.length) msnry.layout();
                    });
                }
            });
        }, 100);
    }

    // Add function for mobile tap-to-add
    window.addItemToBuilder = async function(itemId) {
        if (!window.outfitBuilder) return;
        
        try {
            const response = await fetch(`/items/${itemId}`);
            const item = await response.json();
            
            window.outfitBuilder.addItemToBuilder(item);
            
            // Mark item as in builder
            const card = document.querySelector(`.item-card[data-id="${itemId}"]`);
            if (card && !card.querySelector('.item-in-builder-badge')) {
                const badge = document.createElement('div');
                badge.className = 'item-in-builder-badge';
                badge.textContent = '✓';
                card.insertBefore(badge, card.firstChild);
            }
            
            showToast('Added to outfit!', 'success');
        } catch (error) {
            showToast('Failed to add item', 'error');
        }
    };

    // Delete item
    window.deleteItem = async function(itemId, event) {
        event.stopPropagation();
        
        if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/items/${itemId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadItems();
                showToast('Item deleted successfully', 'success');
            } else {
                const data = await response.json();
                showToast('Failed to delete: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            showToast('Network error: ' + error.message, 'error');
        }
    };

    // Edit item
    window.editItem = async function(itemId, event) {
        event.stopPropagation();
        
        try {
            const response = await fetch(`/items/${itemId}`);
            const item = await response.json();
            
            document.getElementById('editItemId').value = item.id;
            document.getElementById('editName').value = item.name || '';
            document.getElementById('editCategory').value = item.category || '';
            document.getElementById('editTags').value = item.tags ? item.tags.join(', ') : '';
            document.getElementById('editPreview').src = item.processed_url;
            
            editModal.style.display = 'block';
        } catch (error) {
            showToast('Failed to load item: ' + error.message, 'error');
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
            
            if (response.ok) {
                editModal.style.display = 'none';
                loadItems();
                showToast('Item updated successfully', 'success');
            } else {
                const data = await response.json();
                showToast('Failed to update: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            showToast('Network error: ' + error.message, 'error');
        }
    });

    // Edit modal close handlers
    editModalClose.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
    
    cancelEdit.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    // Filter handlers
    searchInput.addEventListener('input', debounce(loadItems, 500));
    categoryFilter.addEventListener('change', loadItems);
    sortFilter.addEventListener('change', loadItems);

    // Utility functions
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

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `status-message ${type}`;
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '100px';
        toast.style.right = '20px';
        toast.style.zIndex = '1001';
        toast.style.minWidth = '250px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // View item modal
    window.viewItem = async function(itemId) {
        try {
            const response = await fetch(`/items/${itemId}`);
            const item = await response.json();
            
            // Set image
            document.getElementById('viewModalImage').src = item.processed_url;
            
            // Set name
            document.getElementById('viewModalName').textContent = item.name || 'Unnamed Item';
            
            // Set category
            const categoryEl = document.getElementById('viewModalCategory');
            if (item.category) {
                categoryEl.textContent = item.category;
                categoryEl.style.display = 'inline-block';
            } else {
                categoryEl.style.display = 'none';
            }
            
            // Set tags
            const tagsEl = document.getElementById('viewModalTags');
            if (item.tags && item.tags.length > 0) {
                tagsEl.innerHTML = item.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
                tagsEl.style.display = 'flex';
            } else {
                tagsEl.style.display = 'none';
            }
            
            // Show modal
            viewModal.style.display = 'block';
        } catch (error) {
            showToast('Failed to load item: ' + error.message, 'error');
        }
    };

    // Close view modal
    viewModalClose.addEventListener('click', () => {
        viewModal.style.display = 'none';
    });

    // Close modals with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            // Close add modal
            if (addModal.style.display === 'block') {
                addModal.style.display = 'none';
                uploadForm.reset();
            }
            // Close edit modal
            if (editModal.style.display === 'block') {
                editModal.style.display = 'none';
            }
            // Close view modal
            if (viewModal.style.display === 'block') {
                viewModal.style.display = 'none';
            }
            // Close crop modal
            const cropModal = document.getElementById('cropModal');
            if (cropModal && cropModal.style.display === 'block') {
                if (window.closeCropModal) {
                    window.closeCropModal();
                } else {
                    cropModal.style.display = 'none';
                }
            }
        }
    });

    // Export outfit button
    const exportOutfitBtn = document.getElementById('exportOutfitBtn');
    if (exportOutfitBtn) {
        exportOutfitBtn.addEventListener('click', () => {
            if (window.outfitBuilder) {
                window.outfitBuilder.exportOutfit();
            } else {
                console.error('outfitBuilder not initialized');
            }
        });
    }

    // Randomize outfit button
    const randomizeOutfitBtn = document.getElementById('randomizeOutfitBtn');
    if (randomizeOutfitBtn) {
        randomizeOutfitBtn.addEventListener('click', () => {
            if (window.outfitBuilder) {
                window.outfitBuilder.randomizeOutfit();
            }
        });
    }

    // Check for saved preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeIcon.src = '/static/images/icons/sun.png';
    }

    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            darkModeIcon.src = '/static/images/icons/sun.png';
            localStorage.setItem('darkMode', 'enabled');
        } else {
            darkModeIcon.src = '/static/images/icons/moon.png';
            localStorage.setItem('darkMode', 'disabled');
        }
    });

    // Load saved sort preference
    const savedSort = localStorage.getItem('preferredSort');
    if (savedSort && sortFilter) {
        sortFilter.value = savedSort;
    }

    sortFilter.addEventListener('change', function() {
        localStorage.setItem('preferredSort', this.value);
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.masonryInstance) {
                window.masonryInstance.layout();
            }
        }, 1); // Very short delay
    });

    // Initial load
    loadItems();
});