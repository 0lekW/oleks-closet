import os
import uuid
from pathlib import Path
from PIL import Image
from rembg import remove
from werkzeug.utils import secure_filename
from flask import current_app


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


def generate_unique_filename(original_filename):
    """Generate a unique filename while preserving extension"""
    ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'png'
    unique_id = uuid.uuid4().hex
    return f"{unique_id}.{ext}"


def remove_background(input_path, output_path):
    """
    Remove background from image using rembg
    
    Args:
        input_path: Path to input image
        output_path: Path to save processed image
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Read input image
        with open(input_path, 'rb') as input_file:
            input_data = input_file.read()
        
        # Remove background
        output_data = remove(input_data)
        
        # Save output image
        with open(output_path, 'wb') as output_file:
            output_file.write(output_data)
        
        return True
    except Exception as e:
        current_app.logger.error(f"Background removal failed: {str(e)}")
        return False


def create_thumbnail(input_path, output_path, size=None):
    """
    Create a thumbnail from an image
    
    Args:
        input_path: Path to input image
        output_path: Path to save thumbnail
        size: Tuple of (width, height), defaults to config setting
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        max_width = current_app.config['THUMBNAIL_MAX_WIDTH']
        
        with Image.open(input_path) as img:
            # Calculate new height maintaining aspect ratio
            width, height = img.size
            if width > max_width:
                new_width = max_width
                new_height = int((max_width / width) * height)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save thumbnail with transparency intact
            img.save(output_path, 'PNG', optimize=True)
        
        return True
    except Exception as e:
        current_app.logger.error(f"Thumbnail creation failed: {str(e)}")
        return False


def process_uploaded_image(file, name=None, category=None, tags=None):
    """
    Complete pipeline for processing an uploaded clothing image
    
    Args:
        file: FileStorage object from Flask request
        name: Optional name for the clothing item
        category: Optional category for the clothing item
        tags: Optional list or comma-separated string of tags
    
    Returns:
        dict: Dictionary with filenames and metadata, or None if failed
    """
    from app.models import ClothingItem
    from app import db
    
    try:
        # Validate file
        if not file or not allowed_file(file.filename):
            current_app.logger.error("Invalid file or filename")
            return None
        
        # Generate unique filenames
        original_filename = generate_unique_filename(file.filename)
        processed_filename = generate_unique_filename(file.filename)
        thumbnail_filename = generate_unique_filename(file.filename)
        
        # Define paths
        original_path = current_app.config['ORIGINAL_FOLDER'] / original_filename
        processed_path = current_app.config['PROCESSED_FOLDER'] / processed_filename
        thumbnail_path = current_app.config['THUMBNAIL_FOLDER'] / thumbnail_filename
        
        # Save original file
        file.save(original_path)
        file_size = original_path.stat().st_size
        
        # Remove background
        if not remove_background(original_path, processed_path):
            # Clean up and return None
            original_path.unlink(missing_ok=True)
            return None
        
        # Create thumbnail from processed image
        if not create_thumbnail(processed_path, thumbnail_path):
            # Clean up and return None
            original_path.unlink(missing_ok=True)
            processed_path.unlink(missing_ok=True)
            return None
        
        # Create database entry
        clothing_item = ClothingItem(
            name=name,
            category=category,
            original_filename=original_filename,
            processed_filename=processed_filename,
            thumbnail_filename=thumbnail_filename,
            file_size=file_size
        )
        
        # Handle tags
        if tags:
            if isinstance(tags, str):
                clothing_item.tags = tags
            elif isinstance(tags, list):
                clothing_item.set_tags_list(tags)
        
        db.session.add(clothing_item)
        db.session.commit()
        
        return clothing_item.to_dict()
        
    except Exception as e:
        current_app.logger.error(f"Image processing failed: {str(e)}")
        db.session.rollback()
        
        # Clean up any created files
        for path in [original_path, processed_path, thumbnail_path]:
            if path.exists():
                path.unlink(missing_ok=True)
        
        return None