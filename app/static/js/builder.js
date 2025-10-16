// Outfit Builder Drag & Drop Logic

class OutfitBuilder {
    constructor() {
        this.outfit = {
            top: null,
            bottom: null,
            shoes: null,
            flexible: [] // Max 5 items: hat, accessories, other
        };
        
        this.draggingItem = null;
        this.draggingFromBuilder = false;
        this.draggingFlexibleIndex = null;
        this.builderDropOverlay = document.getElementById('builderDropOverlay');
        this.builderLayout = document.getElementById('builderLayout');
        this.init();
    }

    init() {
        this.setupDragFromGrid();
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
                <button class="builder-item-remove" onclick="outfitBuilder.removeFixedItem('${zoneId}')">&times;</button>
            </div>
        `;
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
                    <button class="builder-item-remove" onclick="outfitBuilder.removeFlexibleItem(${index})">&times;</button>
                </div>
            </div>
        `).join('');
        
        // Setup drag-to-reorder for flexible items
        this.setupFlexibleDrag();
    }

    setupFlexibleDrag() {
        const flexibleItems = document.querySelectorAll('.flexible-item');
        
        flexibleItems.forEach((item, index) => {
            item.addEventListener('mousedown', (e) => {
                // Don't drag if clicking remove button
                if (e.target.closest('.builder-item-remove')) return;
                
                this.startDragFlexible(index, e);
                e.stopPropagation();
            });
        });
    }

    startDragFlexible(index, startEvent) {
        const item = this.outfit.flexible[index];
        const ghost = this.createDragGhost(item);
        document.body.appendChild(ghost);
        
        this.draggingItem = {
            data: item,
            ghost: ghost
        };
        this.draggingFromBuilder = true;
        this.draggingFlexibleIndex = index;
        
        ghost.style.left = startEvent.clientX + 10 + 'px';
        ghost.style.top = startEvent.clientY + 10 + 'px';
        
        // Add dragging class to original
        document.querySelectorAll('.flexible-item')[index].classList.add('dragging');

        const moveHandler = (e) => {
            if (!this.draggingItem) return;
            ghost.style.left = e.clientX + 10 + 'px';
            ghost.style.top = e.clientY + 10 + 'px';
            
            // Check if over another flexible item
            this.checkFlexibleSwap(e.clientX, e.clientY);
        };

        const upHandler = (e) => {
            this.endFlexibleDrag(e);
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    checkFlexibleSwap(x, y) {
        const flexibleItems = document.querySelectorAll('.flexible-item');
        
        flexibleItems.forEach((item, index) => {
            if (index === this.draggingFlexibleIndex) return;
            
            const rect = item.getBoundingClientRect();
            const isOver = x >= rect.left && x <= rect.right && 
                          y >= rect.top && y <= rect.bottom;
            
            if (isOver) {
                item.style.background = 'rgba(52, 152, 219, 0.2)';
            } else {
                item.style.background = '';
            }
        });
    }

    endFlexibleDrag(e) {
        if (!this.draggingItem || this.draggingFlexibleIndex === null) return;
        
        this.draggingItem.ghost.remove();
        
        // Check if dropped on another flexible item
        const flexibleItems = document.querySelectorAll('.flexible-item');
        let dropIndex = null;
        
        flexibleItems.forEach((item, index) => {
            if (index === this.draggingFlexibleIndex) return;
            
            const rect = item.getBoundingClientRect();
            const isOver = e.clientX >= rect.left && e.clientX <= rect.right && 
                          e.clientY >= rect.top && e.clientY <= rect.bottom;
            
            if (isOver) {
                dropIndex = index;
            }
            
            item.style.background = '';
        });
        
        // Swap items if dropped on another
        if (dropIndex !== null) {
            const temp = this.outfit.flexible[this.draggingFlexibleIndex];
            this.outfit.flexible[this.draggingFlexibleIndex] = this.outfit.flexible[dropIndex];
            this.outfit.flexible[dropIndex] = temp;
            this.renderFlexibleZone();
        } else {
            // Remove dragging class
            document.querySelectorAll('.flexible-item').forEach(item => {
                item.classList.remove('dragging');
            });
        }
        
        this.draggingItem = null;
        this.draggingFromBuilder = false;
        this.draggingFlexibleIndex = null;
    }

    removeFixedItem(zoneId) {
        const zone = document.getElementById(zoneId);
        zone.innerHTML = '';
        
        if (zoneId === 'zoneTop') this.outfit.top = null;
        else if (zoneId === 'zoneBottom') this.outfit.bottom = null;
        else if (zoneId === 'zoneShoes') this.outfit.shoes = null;
    }

    removeFlexibleItem(index) {
        this.outfit.flexible.splice(index, 1);
        this.renderFlexibleZone();
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
}

// Initialize builder
let outfitBuilder;
document.addEventListener('DOMContentLoaded', () => {
    outfitBuilder = new OutfitBuilder();
});