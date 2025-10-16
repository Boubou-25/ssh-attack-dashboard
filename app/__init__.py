from flask import Flask
from flask_cors import CORS
from app.config import config

def create_app(config_name='default'):
    """Factory pattern pour créer l'app Flask"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Active CORS pour API
    CORS(app)
    
    # Enregistre les routes API
    from app.api import routes
    app.register_blueprint(routes.api_bp)
    
    return app

