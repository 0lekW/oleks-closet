document.addEventListener('DOMContentLoaded', function() {
    const builderItemsList = document.getElementById('builderItemsList');
    const builderSearch = document.getElementById('builderSearch');
    const builderCategoryFilter = document.getElementById('builderCategoryFilter');
    const clearOutfitBtn = document.getElementById('clearOutfit');
    const saveOutfitBtn = document.getElementById('saveOutfit');
    
    // Store current outfit state
    const currentOutfit = {
        hat: null,
        top: null,
        outerwear: null,
        bottom: null,
        shoes: null,
        accessory: null
    };

    // Load items for sidebar
    async function loadBuilderItems() {
        const category = builderCategoryFilter.value;
        const search = builderSearch.value;
        
        let url = '/items?';
        if (category) url += `category=${category}&`;
        if (search) url += `search=${search}&`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            displayBuilderItems(data.items);
        } catch (error) {
            console.error('Failed to load items:', error);
            builderItemsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Failed to load items</p>';
        }
    }

    // Display items in sidebar
    function displayBuilderItems(items) {
        if (items.length === 0) {
            builderItemsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No items found</p>';
            return;
        }
        
        builderItemsList.innerHTML = items.map(item => `
            <div class="builder-item" data-id="${item.id}" data-category="${item.category || 'other'}">
                <img src="${item.thumbnail_url}" alt="${item.name || 'Item'}">
                <div class="builder-item-name">${item.name || 'Unnamed'}</div>
                <span class="builder-item-category">${item.category || 'other'}</span>
            </div>
        `).join('');
        
        // Add click handlers to items
        document.querySelectorAll('.builder-item').forEach(item => {
            item.addEventListener('click', function() {
                addItemToOutfit(this);
            });
        });
    }

    // Add item to outfit
    function addItemToOutfit(itemElement) {
        const itemId = itemElement.dataset.id;
        const category = itemElement.dataset.category;
        const imgSrc = itemElement.querySelector('img').src;
        const itemName = itemElement.querySelector('.builder-item-name').textContent;
        
        // Find the appropriate layer
        const layerContent = document.querySelector(`.layer-content[data-layer="${category}"]`);
        
        if (!layerContent) {
            alert('Cannot place item - category not supported');
            return;
        }
        
        // Store in current outfit
        currentOutfit[category] = {
            id: itemId,
            name: itemName,
            imgSrc: imgSrc.replace('thumbnails', 'processed') // Use processed image for canvas
        };
        
        // Update the layer
        updateLayer(category);
    }

    // Update a specific layer
    function updateLayer(category) {
        const layerContent = document.querySelector(`.layer-content[data-layer="${category}"]`);
        const layerElement = layerContent.closest('.outfit-layer');
        const item = currentOutfit[category];
        
        if (item) {
            layerContent.classList.remove('empty');
            layerElement.classList.add('has-item');
            layerContent.innerHTML = `
                <div class="outfit-item">
                    <img src="${item.imgSrc}" alt="${item.name}">
                    <button class="outfit-item-remove" data-category="${category}">&times;</button>
                </div>
            `;
            
            // Add remove handler
            layerContent.querySelector('.outfit-item-remove').addEventListener('click', function() {
                removeItemFromOutfit(this.dataset.category);
            });
        } else {
            layerContent.classList.add('empty');
            layerElement.classList.remove('has-item');
            layerContent.innerHTML = '';
        }
    }

    // Remove item from outfit
    function removeItemFromOutfit(category) {
        currentOutfit[category] = null;
        updateLayer(category);
    }

    // Clear entire outfit
    function clearOutfit() {
        if (!confirm('Clear the entire outfit?')) return;
        
        Object.keys(currentOutfit).forEach(category => {
            currentOutfit[category] = null;
            updateLayer(category);
        });
    }

    // Save outfit (placeholder for now)
    function saveOutfit() {
        const items = Object.values(currentOutfit).filter(item => item !== null);
        
        if (items.length === 0) {
            alert('Add some items to your outfit first!');
            return;
        }
        
        // For now, just show what's in the outfit
        const outfitSummary = items.map(item => item.name).join(', ');
        alert(`Outfit contains: ${outfitSummary}\n\nSaving outfits will be implemented next!`);
        
        // TODO: Implement actual outfit saving to database
    }

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

    // Event listeners
    builderSearch.addEventListener('input', debounce(loadBuilderItems, 500));
    builderCategoryFilter.addEventListener('change', loadBuilderItems);
    clearOutfitBtn.addEventListener('click', clearOutfit);
    saveOutfitBtn.addEventListener('click', saveOutfit);

    // Initial load
    loadBuilderItems();
});