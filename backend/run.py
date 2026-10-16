import os
from app import create_app
from app.config import Config

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", Config.PORT))
    debug = Config.FLASK_DEBUG
    print(f"[*] Starting TweetSense v2 API on http://127.0.0.1:{port} (debug={debug})")
    app.run(host="0.0.0.0", port=port, debug=debug)
