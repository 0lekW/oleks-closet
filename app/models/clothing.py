from datetime import datetime
from app import db


class ClothingItem(db.Model):
    """Model for storing clothing items"""
    __tablename__ = 'clothing_items'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=True)
    category = db.Column(db.String(50), nullable=True)  # shirt, pants, shoes, etc.
    
    # File paths (stored relative to static/uploads/)
    original_filename = db.Column(db.String(255), nullable=False)
    processed_filename = db.Column(db.String(255), nullable=False)
    thumbnail_filename = db.Column(db.String(255), nullable=False)
    
    # Metadata
    upload_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    file_size = db.Column(db.Integer)  # Size in bytes
    
    def __repr__(self):
        return f'<ClothingItem {self.id}: {self.name or "Unnamed"} ({self.category or "Uncategorized"})>'
    
    def to_dict(self):
        """Convert model to dictionary for JSON responses"""
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'original_url': f'/static/uploads/original/{self.original_filename}',
            'processed_url': f'/static/uploads/processed/{self.processed_filename}',
            'thumbnail_url': f'/static/uploads/thumbnails/{self.thumbnail_filename}',
            'upload_date': self.upload_date.isoformat(),
            'file_size': self.file_size
        }


# Category choices for validation and UI
CLOTHING_CATEGORIES = [
    'hat',
    'top',          # shirts, t-shirts, blouses, etc.
    'outerwear',    # jackets, coats, hoodies
    'bottom',       # pants, shorts, skirts
    'shoes',
    'accessory',    # watches, jewelry, bags, etc.
    'other'
]