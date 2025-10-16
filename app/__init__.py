from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

db = SQLAlchemy()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    
    # Ensure upload directories exist
    app.config['ORIGINAL_FOLDER'].mkdir(parents=True, exist_ok=True)
    app.config['PROCESSED_FOLDER'].mkdir(parents=True, exist_ok=True)
    app.config['THUMBNAIL_FOLDER'].mkdir(parents=True, exist_ok=True)
    
    # Register blueprints
    from app.routes import main
    app.register_blueprint(main.bp)
    
    return app