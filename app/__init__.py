from flask import Flask, render_template
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    # Active CORS pour API
    CORS(app)
    
    # Configuration
    app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'
    app.config['DEBUG'] = True
    
    # Import et enregistre blueprint API
    from app.api.routes import api
    app.register_blueprint(api)
    
    # Route principale dashboard
    @app.route('/')
    def index():
        return render_template('index.html')
    
    return app