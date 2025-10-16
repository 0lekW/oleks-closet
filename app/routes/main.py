from flask import Blueprint

bp = Blueprint('main', __name__)


@bp.route('/')
def index():
    return "Closet Fit Maker - Coming Soon!"


@bp.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'ok'}, 200