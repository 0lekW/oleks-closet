import os
from pathlib import Path

basedir = Path(__file__).parent.absolute()


class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production' # only using locally so not going to deal with this
    
    # Database - check if running in Docker
    if os.environ.get('SQLALCHEMY_DATABASE_URI'):
        SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI')
    else:
        SQLALCHEMY_DATABASE_URI = f'sqlite:///{basedir / "closet.db"}'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload settings
    UPLOAD_FOLDER = basedir / 'app' / 'static' / 'uploads'
    ORIGINAL_FOLDER = UPLOAD_FOLDER / 'original'
    PROCESSED_FOLDER = UPLOAD_FOLDER / 'processed'
    THUMBNAIL_FOLDER = UPLOAD_FOLDER / 'thumbnails'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
    
    # Thumbnail settings
    THUMBNAIL_MAX_WIDTH = 400  # Max width, height varies by aspect ratio