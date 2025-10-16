from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from app.models import ClothingItem, CLOTHING_CATEGORIES
from app.utils import process_uploaded_image
from app import db

bp = Blueprint('main', __name__)


@bp.route('/')
def index():
    """Home page with upload form"""
    return render_template('index.html', categories=CLOTHING_CATEGORIES)

@bp.route('/builder')
def builder():
    """Outfit builder page"""
    return render_template('outfit_builder.html', categories=CLOTHING_CATEGORIES)

@bp.route('/upload', methods=['POST'])
def upload():
    """Handle file upload and processing"""
    # Check if file is in request
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    # Check if user selected a file
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Get optional metadata
    name = request.form.get('name', '').strip() or None
    category = request.form.get('category', '').strip() or None
    tags = request.form.get('tags', '').strip() or None
    
    # Validate category if provided
    if category and category not in CLOTHING_CATEGORIES:
        return jsonify({'error': 'Invalid category'}), 400
    
    # Process the image
    result = process_uploaded_image(file, name=name, category=category, tags=tags)
    
    if result is None:
        return jsonify({'error': 'Failed to process image'}), 500
    
    return jsonify({
        'success': True,
        'message': 'Image uploaded and processed successfully',
        'item': result
    }), 201

@bp.route('/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    """Update a clothing item's metadata"""
    item = ClothingItem.query.get_or_404(item_id)
    
    data = request.get_json()
    
    # Update name
    if 'name' in data:
        item.name = data['name'].strip() or None
    
    # Update category
    if 'category' in data:
        category = data['category'].strip() or None
        if category and category not in CLOTHING_CATEGORIES:
            return jsonify({'error': 'Invalid category'}), 400
        item.category = category
    
    # Update tags
    if 'tags' in data:
        if isinstance(data['tags'], list):
            item.set_tags_list(data['tags'])
        elif isinstance(data['tags'], str):
            item.tags = data['tags'].strip() or None
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Item updated successfully',
            'item': item.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/items')
def list_items():
    """Get all clothing items (with optional filtering)"""
    category = request.args.get('category')
    search = request.args.get('search', '').strip()
    
    # Build query
    query = ClothingItem.query
    
    if category:
        query = query.filter_by(category=category)
    
    if search:
        query = query.filter(ClothingItem.name.ilike(f'%{search}%'))
    
    # Order by most recent first
    items = query.order_by(ClothingItem.upload_date.desc()).all()
    
    return jsonify({
        'items': [item.to_dict() for item in items],
        'count': len(items)
    })


@bp.route('/items/<int:item_id>')
def get_item(item_id):
    """Get a single clothing item"""
    item = ClothingItem.query.get_or_404(item_id)
    return jsonify(item.to_dict())


@bp.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete a clothing item"""
    from pathlib import Path
    from flask import current_app
    
    item = ClothingItem.query.get_or_404(item_id)
    
    # Delete files
    try:
        original_path = current_app.config['ORIGINAL_FOLDER'] / item.original_filename
        processed_path = current_app.config['PROCESSED_FOLDER'] / item.processed_filename
        thumbnail_path = current_app.config['THUMBNAIL_FOLDER'] / item.thumbnail_filename
        
        original_path.unlink(missing_ok=True)
        processed_path.unlink(missing_ok=True)
        thumbnail_path.unlink(missing_ok=True)
    except Exception as e:
        current_app.logger.error(f"Failed to delete files: {str(e)}")
    
    # Delete from database
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Item deleted'}), 200


@bp.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'ok'}, 200