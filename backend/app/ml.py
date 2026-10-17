import time
import base64
from io import BytesIO
import joblib
import spacy
from textblob import TextBlob
from wordcloud import WordCloud
from .config import Config

class MLEngine:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.feature_names = None
        self.coef = None
        self.nlp = None
        self.load_models()

    def load_models(self):
        try:
            self.model = joblib.load(Config.MODEL_PATH)
            self.vectorizer = joblib.load(Config.VECTORIZER_PATH)
            self.feature_names = self.vectorizer.get_feature_names_out()
            self.coef = self.model.coef_[0]  # class 1 = positive
        except Exception as e:
            print(f"[ML Engine] Error loading ML models: {e}")

        try:
            self.nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])
        except Exception as e:
            print(f"[ML Engine] Error loading spaCy: {e}")
            self.nlp = None

    def preprocess_text(self, text: str) -> str:
        if not text:
            return ""
        if self.nlp is None:
            return text.lower().strip()
        doc = self.nlp(text)
        lemmas = [token.lemma_.lower() for token in doc if not token.is_punct and not token.is_space]
        return " ".join(lemmas)

    def explain(self, clean_text: str, top_n: int = 3):
        if self.vectorizer is None or self.coef is None or not clean_text:
            return {"negative": [], "positive": []}
        
        row = self.vectorizer.transform([clean_text]).tocoo()
        contrib = [
            (self.feature_names[j], float(self.coef[j] * v))
            for j, v in zip(row.col, row.data)
        ]
        contrib.sort(key=lambda t: t[1])
        return {
            "negative": contrib[:top_n],
            "positive": contrib[-top_n:][::-1]
        }

    def predict_sentiment(self, text: str, neutral_band: float = 0.10):
        start_time = time.time()
        clean_text = self.preprocess_text(text)
        
        polarity = float(TextBlob(text).sentiment.polarity)
        features = self.vectorizer.transform([clean_text])
        probabilities = self.model.predict_proba(features)[0]
        
        # Binary prediction: 0 = Negative, 1 = Positive
        raw_prediction = int(self.model.predict(features)[0])
        raw_confidence = float(max(probabilities))
        
        # Neutral Band heuristic:
        # If TextBlob polarity falls inside the configurable neutral threshold
        if -neutral_band <= polarity <= neutral_band:
            sentiment = "Neutral"
            confidence = round(1.0 - abs(polarity), 3)
            neutral_band_active = True
        else:
            sentiment = "Positive" if raw_prediction in (1, 4) else "Negative"
            confidence = round(raw_confidence, 3)
            neutral_band_active = False

        top_words = self.explain(clean_text, top_n=3)
        latency_ms = round((time.time() - start_time) * 1000, 1)

        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "polarity": round(polarity, 3),
            "neutral_band_active": neutral_band_active,
            "clean_text": clean_text,
            "top_words": top_words,
            "latency_ms": latency_ms,
            "model_version": "v2.0-linear"
        }

    def generate_wordcloud(self, text: str, width: int = 800, height: int = 500) -> str:
        try:
            if not text or len(text.strip()) < 3:
                return ""
            w = max(200, min(1600, int(width)))
            h = max(200, min(1600, int(height)))
            wc = WordCloud(
                width=w,
                height=h,
                background_color="#dcd5c5",
                colormap="Dark2",
                stopwords=None,
                max_words=80
            ).generate(text)
            
            buf = BytesIO()
            wc.to_image().save(buf, format="PNG")
            b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
            return f"data:image/png;base64,{b64_str}"
        except Exception as e:
            print(f"[ML Engine] WordCloud error: {e}")
            return ""

# Singleton instance
ml_engine = MLEngine()
