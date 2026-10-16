from app.ml import ml_engine

def test_ml_models_loaded():
    assert ml_engine.model is not None
    assert ml_engine.vectorizer is not None
    assert ml_engine.coef is not None
    assert len(ml_engine.feature_names) > 0

def test_sentiment_prediction_positive():
    res = ml_engine.predict_sentiment("This tool is completely awesome and super helpful!", neutral_band=0.10)
    assert res["sentiment"] == "Positive"
    assert res["confidence"] > 0.5
    assert "top_words" in res
    assert "latency_ms" in res

def test_sentiment_prediction_negative():
    res = ml_engine.predict_sentiment("Horrible service, total waste of money and broke everything", neutral_band=0.10)
    assert res["sentiment"] == "Negative"
    assert res["confidence"] > 0.5
    assert len(res["top_words"]["negative"]) > 0

def test_neutral_band_override():
    # A statement with mild/factual tone
    res = ml_engine.predict_sentiment("The item arrived today by mail.", neutral_band=0.15)
    assert res["sentiment"] == "Neutral"
    assert res["neutral_band_active"] is True

def test_linear_explainability():
    exp = ml_engine.explain("crash login update error", top_n=3)
    assert "negative" in exp
    assert "positive" in exp
    # 'crash' should have a strong negative coefficient
    neg_words = [item[0] for item in exp["negative"]]
    assert "crash" in neg_words
