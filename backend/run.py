import os
import uvicorn
from app.config import Config

if __name__ == "__main__":
    port = int(os.getenv("PORT", Config.PORT))
    print(f"[*] Starting TweetSense v2 FastAPI on http://127.0.0.1:{port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
