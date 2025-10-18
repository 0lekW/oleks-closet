// Outfit Builder Drag & Drop Logic

class OutfitBuilder {
    constructor() {
        this.outfit = {
            top: null,
            bottom: null,
            shoes: null,
            flexible: []
        };
        
        this.draggingItem = null;
        this.draggingFromBuilder = false;
        this.draggingFlexibleIndex = null;
        this.builderDropOverlay = document.getElementById('builderDropOverlay');
        this.builderLayout = document.getElementById('builderLayout');
        this.isMobile = this.checkMobile();
        this.init();
    }

    checkMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || window.innerWidth <= 768;
    }

    init() {
        if (this.isMobile) {
            this.setupMobileMode();
        } else {
            this.setupDragFromGrid();
        }
    }

    setupMobileMode() {
        // On mobile, tapping an item adds it to the builder
        // This will be handled by modifying the onclick in app.js
        console.log('Mobile mode enabled - tap to add items');
    }

    setupDragFromGrid() {
        document.addEventListener('mousedown', (e) => {
            const card = e.target.closest('.item-card');
            if (!card) return;
            
            // Don't interfere with action buttons or if clicking on view
            if (e.target.closest('.item-card-actions')) return;
            
            // Check if builder is open
            const builderPanel = document.getElementById('builderPanel');
            if (!builderPanel.classList.contains('open')) return;
            
            const itemId = card.dataset.id;
            this.startDragFromGrid(itemId, e);
            e.preventDefault(); // Prevent default to avoid triggering view modal
        });
    }

    async startDragFromGrid(itemId, startEvent) {
        try {
            const response = await fetch(`/items/${itemId}`);
            const item = await response.json();
            
            const ghost = this.createDragGhost(item);
            document.body.appendChild(ghost);
            
            this.draggingItem = {
                id: itemId,
                data: item,
                ghost: ghost
            };
            this.draggingFromBuilder = false;

            ghost.style.left = startEvent.clientX + 10 + 'px';
            ghost.style.top = startEvent.clientY + 10 + 'px';

            const moveHandler = (e) => {
                if (!this.draggingItem) return;
                ghost.style.left = e.clientX + 10 + 'px';
                ghost.style.top = e.clientY + 10 + 'px';
                this.checkBuilderHover(e.clientX, e.clientY);
            };

            const upHandler = (e) => {
                this.endDrag(e);
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
            
        } catch (error) {
            console.error('Failed to start drag:', error);
        }
    }

    createDragGhost(item) {
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        
        const img = document.createElement('img');
        img.src = item.processed_url;
        
        ghost.appendChild(img);
        return ghost;
    }

    checkBuilderHover(x, y) {
        const rect = this.builderLayout.getBoundingClientRect();
        const isOverBuilder = x >= rect.left && x <= rect.right && 
                             y >= rect.top && y <= rect.bottom;
        
        if (isOverBuilder) {
            this.builderDropOverlay.classList.add('active');
        } else {
            this.builderDropOverlay.classList.remove('active');
        }
    }

    endDrag(e) {
        if (!this.draggingItem) return;
        
        this.draggingItem.ghost.remove();
        this.builderDropOverlay.classList.remove('active');
        
        // Check if dropped on builder panel
        const rect = this.builderLayout.getBoundingClientRect();
        const isOverBuilder = e.clientX >= rect.left && e.clientX <= rect.right && 
                             e.clientY >= rect.top && e.clientY <= rect.bottom;
        
        if (isOverBuilder) {
            this.addItemToBuilder(this.draggingItem.data);
        }
        
        this.draggingItem = null;
        this.draggingFromBuilder = false;
        this.draggingFlexibleIndex = null;
    }

    addItemToBuilder(item) {
        const category = item.category;
        
        if (!category) {
            this.showToast('Item has no category!', 'error');
            return;
        }

        // Route to correct zone based on category
        if (category === 'top' || category === 'outerwear') {
            this.outfit.top = item;
            this.renderFixedZone('zoneTop', item);
        } else if (category === 'bottom') {
            this.outfit.bottom = item;
            this.renderFixedZone('zoneBottom', item);
        } else if (category === 'shoes') {
            this.outfit.shoes = item;
            this.renderFixedZone('zoneShoes', item);
        } else if (category === 'hat' || category === 'accessory' || category === 'other') {
            if (this.outfit.flexible.length >= 5) {
                this.showToast('Maximum 5 items in accessories section!', 'error');
                return;
            }
            
            // Check if already exists
            const exists = this.outfit.flexible.some(i => i.id === item.id);
            if (exists) {
                this.showToast('Item already in builder!', 'error');
                return;
            }
            
            this.outfit.flexible.push(item);
            this.renderFlexibleZone();
        } else {
            this.showToast('Unknown category: ' + category, 'error');
        }
    }

    renderFixedZone(zoneId, item) {
        const zone = document.getElementById(zoneId);
        
        zone.innerHTML = `
            <div class="builder-item-wrapper">
                <img src="${item.processed_url}" alt="" class="builder-item-image">
                <button class="builder-item-remove" onclick="outfitBuilder.removeFixedItem('${zoneId}')">
                    <img src="/static/images/icons/close.png" alt="Remove">
                </button>
            </div>
        `;

        this.updateBadges();
    }

    renderFlexibleZone() {
        const zone = document.getElementById('zoneFlexible');
        
        if (this.outfit.flexible.length === 0) {
            zone.innerHTML = '';
            return;
        }
        
        // Adjust grid based on number of items
        if (this.outfit.flexible.length === 1) {
            zone.style.gridTemplateColumns = '1fr';
            zone.style.gridTemplateRows = '1fr';
        } else if (this.outfit.flexible.length === 2) {
            zone.style.gridTemplateColumns = 'repeat(2, 1fr)';
            zone.style.gridTemplateRows = '1fr';
        } else if (this.outfit.flexible.length <= 4) {
            zone.style.gridTemplateColumns = 'repeat(2, 1fr)';
            zone.style.gridTemplateRows = 'repeat(2, 1fr)';
        } else {
            zone.style.gridTemplateColumns = 'repeat(3, 1fr)';
            zone.style.gridTemplateRows = 'repeat(2, 1fr)';
        }
        
        zone.innerHTML = this.outfit.flexible.map((item, index) => `
            <div class="flexible-item" data-index="${index}">
                <div class="builder-item-wrapper">
                    <img src="${item.processed_url}" alt="" class="builder-item-image">
                    <button class="builder-item-remove" onclick="outfitBuilder.removeFlexibleItem(${index})">
                        <img src="/static/images/icons/close.png" alt="Remove">
                    </button>
                </div>
            </div>
        `).join('');
        
        // Setup drag-to-reorder for flexible items
        this.setupFlexibleDrag();
        this.updateBadges();
    }

    setupFlexibleDrag() {
        const flexibleItems = document.querySelectorAll('.flexible-item');
        
        flexibleItems.forEach((itemEl, index) => {
            itemEl.addEventListener('mousedown', (e) => {
                // Don't drag if clicking remove button
                if (e.target.closest('.builder-item-remove')) return;
                
                this.startDragFlexible(index, itemEl, e);
                e.stopPropagation();
                e.preventDefault();
            });
        });
    }

    startDragFlexible(index, itemElement, startEvent) {
        const item = this.outfit.flexible[index];
        
        this.draggingFromBuilder = true;
        this.draggingFlexibleIndex = index;
        
        // Add dragging class
        itemElement.classList.add('dragging');
        
        // Store original opacity
        const originalOpacity = itemElement.style.opacity;
        itemElement.style.opacity = '0.3';
        
        let lastHoveredIndex = null;

        const moveHandler = (e) => {
            // Find which item we're hovering over
            const flexibleItems = document.querySelectorAll('.flexible-item');
            let hoveredIndex = null;
            
            flexibleItems.forEach((el, idx) => {
                if (idx === index) return; // Skip self
                
                const rect = el.getBoundingClientRect();
                const isOver = e.clientX >= rect.left && e.clientX <= rect.right && 
                              e.clientY >= rect.top && e.clientY <= rect.bottom;
                
                if (isOver) {
                    hoveredIndex = idx;
                    el.style.background = 'rgba(52, 152, 219, 0.2)';
                } else {
                    el.style.background = '';
                }
            });
            
            lastHoveredIndex = hoveredIndex;
        };

        const upHandler = (e) => {
            // Remove dragging class
            itemElement.classList.remove('dragging');
            itemElement.style.opacity = originalOpacity;
            
            // Clear all backgrounds
            document.querySelectorAll('.flexible-item').forEach(el => {
                el.style.background = '';
            });
            
            // Swap items if we have a valid drop target
            if (lastHoveredIndex !== null && lastHoveredIndex !== index) {
                // Swap in array
                const temp = this.outfit.flexible[index];
                this.outfit.flexible[index] = this.outfit.flexible[lastHoveredIndex];
                this.outfit.flexible[lastHoveredIndex] = temp;
                
                // Re-render
                this.renderFlexibleZone();
            }
            
            this.draggingFromBuilder = false;
            this.draggingFlexibleIndex = null;
            
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    getItemsInBuilder() {
        const items = new Set();
        if (this.outfit.top) items.add(this.outfit.top.id);
        if (this.outfit.bottom) items.add(this.outfit.bottom.id);
        if (this.outfit.shoes) items.add(this.outfit.shoes.id);
        this.outfit.flexible.forEach(item => items.add(item.id));
        return items;
    }

    // Modify renderFixedZone and renderFlexibleZone to update badges
    renderFixedZone(zoneId, item) {
        const zone = document.getElementById(zoneId);
        
        zone.innerHTML = `
            <div class="builder-item-wrapper">
                <img src="${item.processed_url}" alt="" class="builder-item-image">
                <button class="builder-item-remove" onclick="outfitBuilder.removeFixedItem('${zoneId}')">
                    <img src="/static/images/icons/close.png" alt="Remove">
                </button>
            </div>
        `;
        
        this.updateBadges();
    }

    updateBadges() {
        const itemsInBuilder = this.getItemsInBuilder();
        
        document.querySelectorAll('.item-card').forEach(card => {
            const itemId = parseInt(card.dataset.id);
            const badge = card.querySelector('.item-in-builder-badge');
            
            if (itemsInBuilder.has(itemId)) {
                if (!badge) {
                    const newBadge = document.createElement('div');
                    newBadge.className = 'item-in-builder-badge';
                    newBadge.textContent = '✓';
                    card.insertBefore(newBadge, card.firstChild);
                }
            } else {
                if (badge) badge.remove();
            }
        });
    }

    removeFixedItem(zoneId) {
        const zone = document.getElementById(zoneId);
        zone.innerHTML = '';
        
        if (zoneId === 'zoneTop') this.outfit.top = null;
        else if (zoneId === 'zoneBottom') this.outfit.bottom = null;
        else if (zoneId === 'zoneShoes') this.outfit.shoes = null;
        
        this.updateBadges();
    }

    removeFlexibleItem(index) {
        this.outfit.flexible.splice(index, 1);
        this.renderFlexibleZone();
        this.updateBadges();
    }

    showToast(message, type = 'error') {
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

    async exportOutfit() {
        const builderLayout = document.getElementById('builderLayout');
        const exportBtn = document.getElementById('exportOutfitBtn');
        
        // Check if outfit has any items
        const hasItems = this.outfit.top || this.outfit.bottom || 
                        this.outfit.shoes || this.outfit.flexible.length > 0;
        
        if (!hasItems) {
            this.showToast('Add some items to your outfit first!', 'error');
            return;
        }
        
        // Disable button during export
        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
        
        try {
            // Hide remove buttons temporarily
            const removeButtons = builderLayout.querySelectorAll('.builder-item-remove');
            removeButtons.forEach(btn => btn.style.display = 'none');
            
            // Store original styles for flexible items
            const flexibleItems = builderLayout.querySelectorAll('.flexible-item');
            const originalStyles = [];
            flexibleItems.forEach(item => {
                const img = item.querySelector('.builder-item-image');
                originalStyles.push({
                    element: img,
                    width: img.style.width,
                    height: img.style.height,
                    objectFit: img.style.objectFit
                });
                // Force maintain aspect ratio for export
                img.style.width = 'auto';
                img.style.height = 'auto';
                img.style.objectFit = 'contain';
                img.style.maxWidth = '100%';
                img.style.maxHeight = '100%';
            });
            
            // Capture the builder layout as canvas
            const canvas = await html2canvas(builderLayout, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true
            });
            
            // Restore original styles
            originalStyles.forEach(({element, width, height, objectFit}) => {
                element.style.width = width;
                element.style.height = height;
                element.style.objectFit = objectFit;
            });
            
            // Show remove buttons again
            removeButtons.forEach(btn => btn.style.display = '');
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                link.download = `outfit-${timestamp}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                
                this.showToast('Outfit exported successfully!', 'success');
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Failed to export outfit: ' + error.message, 'error');
        } finally {
            // Re-enable button
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export as Image';
        }
    }

    async randomizeOutfit() {
        try {
            // Fetch all items
            const response = await fetch('/items');
            const data = await response.json();
            const allItems = data.items;
            
            if (allItems.length === 0) {
                this.showToast('No items available to randomize!', 'error');
                return;
            }
            
            // Clear current outfit
            this.outfit = {
                top: null,
                bottom: null,
                shoes: null,
                flexible: []
            };
            
            // Filter items by category
            const tops = allItems.filter(item => item.category === 'top' || item.category === 'outerwear');
            const bottoms = allItems.filter(item => item.category === 'bottom');
            const shoes = allItems.filter(item => item.category === 'shoes');
            const hats = allItems.filter(item => item.category === 'hat');
            const accessories = allItems.filter(item => item.category === 'accessory' || item.category === 'other');
            
            // Pick random items
            if (tops.length > 0) {
                this.outfit.top = tops[Math.floor(Math.random() * tops.length)];
                this.renderFixedZone('zoneTop', this.outfit.top);
            } else {
                document.getElementById('zoneTop').innerHTML = '';
            }
            
            if (bottoms.length > 0) {
                this.outfit.bottom = bottoms[Math.floor(Math.random() * bottoms.length)];
                this.renderFixedZone('zoneBottom', this.outfit.bottom);
            } else {
                document.getElementById('zoneBottom').innerHTML = '';
            }
            
            if (shoes.length > 0) {
                this.outfit.shoes = shoes[Math.floor(Math.random() * shoes.length)];
                this.renderFixedZone('zoneShoes', this.outfit.shoes);
            } else {
                document.getElementById('zoneShoes').innerHTML = '';
            }
            
            // Pick flexible items (max 4, max 1 hat, no duplicates)
            const flexiblePool = [];
            const usedIds = new Set();
            
            // Add one random hat if available
            if (hats.length > 0) {
                const randomHat = hats[Math.floor(Math.random() * hats.length)];
                flexiblePool.push(randomHat);
                usedIds.add(randomHat.id);
            }
            
            // Fill remaining slots with accessories (up to 3 more)
            const remainingSlots = 4 - flexiblePool.length;
            const shuffledAccessories = accessories
                .filter(item => !usedIds.has(item.id))
                .sort(() => Math.random() - 0.5);
            
            for (let i = 0; i < Math.min(remainingSlots, shuffledAccessories.length); i++) {
                flexiblePool.push(shuffledAccessories[i]);
            }
            
            this.outfit.flexible = flexiblePool;
            this.renderFlexibleZone();
            
            this.showToast('Outfit randomized!', 'success');

            this.updateBadges();
            
        } catch (error) {
            console.error('Randomize failed:', error);
            this.showToast('Failed to randomize outfit: ' + error.message, 'error');
        }
    }
}

// Initialize builder
window.outfitBuilder = null;
document.addEventListener('DOMContentLoaded', () => {
    window.outfitBuilder = new OutfitBuilder();
});