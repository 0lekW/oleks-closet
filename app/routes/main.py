from flask import Blueprint, render_template, request, jsonify
from app.models import ClothingItem, CLOTHING_CATEGORIES
from app.utils import process_uploaded_image
from app import db

bp = Blueprint('main', __name__)


@bp.route('/')
def index():
    """Home page with upload form"""
    return render_template('index.html', categories=CLOTHING_CATEGORIES)


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
    
@bp.route('/items/<int:item_id>/update-image', methods=['POST'])
def update_item_image(item_id):
    """Update an item's image (crop or replace) - preserves true original"""
    from werkzeug.utils import secure_filename
    import os
    from flask import current_app
    from app.utils import remove_background, create_thumbnail, generate_unique_filename
    import shutil
    
    item = ClothingItem.query.get_or_404(item_id)
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    is_replacement = request.form.get('is_replacement', 'false').lower() == 'true'
    
    try:
        # Generate new filenames for processed versions
        processed_filename = generate_unique_filename('processed.png')
        thumbnail_filename = generate_unique_filename('thumb.png')
        
        # Paths
        processed_path = current_app.config['PROCESSED_FOLDER'] / processed_filename
        thumbnail_path = current_app.config['THUMBNAIL_FOLDER'] / thumbnail_filename
        
        # If this is a replacement, we need a new original file
        if is_replacement:
            original_filename = generate_unique_filename('original.png')
            original_path = current_app.config['ORIGINAL_FOLDER'] / original_filename
            
            # Save the new original
            file.save(original_path)
            
            # Delete the old original file
            try:
                old_original = current_app.config['ORIGINAL_FOLDER'] / item.original_filename
                old_original.unlink(missing_ok=True)
            except Exception as e:
                current_app.logger.error(f"Failed to delete old original: {str(e)}")
        else:
            # For cropping, save to a temp file and process, but keep original unchanged
            import tempfile
            temp_fd, temp_path = tempfile.mkstemp(suffix='.png')
            os.close(temp_fd)
            file.save(temp_path)
            original_path = temp_path
            original_filename = item.original_filename  # Keep the same original
        
        # Remove background from the cropped/new image
        if not remove_background(original_path, processed_path):
            if is_replacement:
                original_path.unlink(missing_ok=True)
            else:
                os.unlink(temp_path)
            return jsonify({'error': 'Failed to process image'}), 500
        
        # Create thumbnail
        if not create_thumbnail(processed_path, thumbnail_path):
            if is_replacement:
                original_path.unlink(missing_ok=True)
            else:
                os.unlink(temp_path)
            processed_path.unlink(missing_ok=True)
            return jsonify({'error': 'Failed to create thumbnail'}), 500
        
        # Clean up temp file if cropping
        if not is_replacement:
            os.unlink(temp_path)
        
        # Delete old processed and thumbnail files
        try:
            old_processed = current_app.config['PROCESSED_FOLDER'] / item.processed_filename
            old_thumbnail = current_app.config['THUMBNAIL_FOLDER'] / item.thumbnail_filename
            
            old_processed.unlink(missing_ok=True)
            old_thumbnail.unlink(missing_ok=True)
        except Exception as e:
            current_app.logger.error(f"Failed to delete old files: {str(e)}")
        
        # Update database - only update original_filename if this is a replacement
        if is_replacement:
            item.original_filename = original_filename
            item.file_size = current_app.config['ORIGINAL_FOLDER'].joinpath(original_filename).stat().st_size
        
        item.processed_filename = processed_filename
        item.thumbnail_filename = thumbnail_filename
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'item': item.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Image update failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

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