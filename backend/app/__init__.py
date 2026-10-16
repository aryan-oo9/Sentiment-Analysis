from flask import Flask, jsonify
from flask_cors import CORS
from .config import Config
from .database import init_db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure CORS with explicit allowed origins from environment
    CORS(
        app,
        resources={r"/api/*": {"origins": Config.ALLOWED_ORIGINS}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    )

    # Initialize database tables
    with app.app_context():
        init_db()

    # Register blueprints
    from .routers.auth_routes import auth_bp
    from .routers.project_routes import project_bp
    from .routers.comment_routes import comment_bp
    from .routers.insight_routes import insight_bp
    from .routers.llm_routes import llm_bp
    from .routers.public_routes import public_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(project_bp)
    app.register_blueprint(comment_bp)
    app.register_blueprint(insight_bp)
    app.register_blueprint(llm_bp)
    app.register_blueprint(public_bp)

    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({
            "status": "error",
            "message": "Resource not found",
            "data": None
        }), 404

    @app.errorhandler(500)
    def handle_server_error(e):
        return jsonify({
            "status": "error",
            "message": "An internal server error occurred",
            "data": None
        }), 500

    return app
