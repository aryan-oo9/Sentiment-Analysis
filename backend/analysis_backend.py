import joblib
import spacy
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from textblob import TextBlob
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer
import base64
from io import BytesIO
from wordcloud import WordCloud
import os
import math

# --- Setup Flask App ---
app = Flask(__name__)
CORS(app) 

# --- Load NLP Models and Classifiers ---
try:
    vectorizer = joblib.load('vectorizer.sav')
    model = joblib.load('trained_model.sav')
    from transformers import pipeline
    priority_classifier = pipeline("zero-shot-classification")
except Exception as e:
    print(f"Error loading models: {e}")
    priority_classifier = None

# Load spaCy for text preprocessing
try:
    nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])
except Exception as e:
    print(f"Error loading spaCy model: {e}")
    nlp = None

# --- Helper Functions ---

def preprocess_text(text):
    """Lemmatizes the text for model input."""
    if nlp is None:
        return text
    doc = nlp(text)
    return " ".join([token.lemma_ for token in doc])

def get_sentiment_label(text, prediction):
    """Combines TextBlob polarity with model prediction for a nuanced sentiment label."""
    polarity = TextBlob(text).sentiment.polarity
    if -0.1 <= polarity <= 0.1:
        return "Neutral"
    else:
        return "Negative" if prediction == 0 else "Positive"

def prioritize_comment(text):
    """Classifies text into priority categories using zero-shot classification."""
    if priority_classifier is None:
        return "N/A"
    candidate_labels = ["High Priority", "Medium Priority", "Low Priority"]
    result = priority_classifier(text, candidate_labels)
    return result['labels'][0]

def get_summary(text, num_sentences=2):
    """Generates a text summary using the LSA algorithm from the Sumy library."""
    try:
        parser = PlaintextParser.from_string(text, Tokenizer("english"))
        summarizer = LsaSummarizer()
        summary = summarizer(parser.document, num_sentences)
        return " ".join([str(sentence) for sentence in summary])
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Summary could not be generated."

def generate_wordcloud(text):
    """Generates a word cloud image and returns it as a Base64 encoded string."""
    if not text:
        return None
    try:
        wordcloud = WordCloud(
            width=800,
            height=400,
            background_color='white',
            max_words=100
        ).generate(text)
        
        img_buffer = BytesIO()
        wordcloud.to_image().save(img_buffer, format="PNG")
        img_str = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        print(f"Error generating word cloud: {e}")
        return None

# --- API Endpoints ---

@app.route('/api/batch_analyze', methods=['POST'])
def batch_analyze():
    """
    Enhanced batch analysis endpoint that processes CSV files and returns
    comprehensive analysis including sentiment distribution, summary, and word cloud.
    """
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400
        
        file = request.files['file']
        
        # Read CSV file
        try:
            df = pd.read_csv(file)
        except Exception as e:
            return jsonify({'status': 'error', 'message': f'Error reading CSV: {str(e)}'}), 400
        
        if 'text' not in df.columns:
            return jsonify({'status': 'error', 'message': 'CSV must include a "text" column'}), 400

        # Initialize result lists
        sentiments = []
        confidences = []
        priorities = []
        word_counts = []

        # Process each row
        for text in df['text']:
            # Preprocess and predict
            proc_text = preprocess_text(str(text))
            X = vectorizer.transform([proc_text])
            pred = model.predict(X)[0]
            proba = model.predict_proba(X)[0]
            confidence = max(proba)
            
            # Get sentiment label
            sentiment_label = get_sentiment_label(str(text), pred)
            
            # Get priority
            priority = prioritize_comment(str(text))
            
            # Get word count
            word_count = len(str(text).split())
            
            sentiments.append(sentiment_label)
            confidences.append(float(confidence))
            priorities.append(priority)
            word_counts.append(word_count)

        # Add results to dataframe
        df['sentiment'] = sentiments
        df['confidence'] = confidences
        df['priority'] = priorities
        df['word_count'] = word_counts

        # Generate overall summary from all texts
        all_text = " ".join(df['text'].astype(str).tolist())
        overall_summary = get_summary(all_text, num_sentences=3)

        # Generate word cloud from all texts
        wordcloud_img = generate_wordcloud(all_text)

        # Calculate sentiment distribution
        sentiment_counts = df['sentiment'].value_counts().to_dict()
        
        # Calculate priority distribution
        priority_counts = df['priority'].value_counts().to_dict()

        # Calculate statistics
        avg_confidence = df['confidence'].mean()
        avg_word_count = df['word_count'].mean()
        total_records = len(df)

        # Prepare individual results
        individual_results = df[['text', 'sentiment', 'confidence', 'priority', 'word_count']].to_dict(orient='records')

        # Prepare response
        response = {
            'status': 'success',
            'summary': {
                'total_records': total_records,
                'overall_summary': overall_summary,
                'sentiment_distribution': sentiment_counts,
                'priority_distribution': priority_counts,
                'avg_confidence': float(avg_confidence),
                'avg_word_count': float(avg_word_count),
                'wordcloud_img': wordcloud_img
            },
            'individual_results': individual_results
        }

        return jsonify(response)

    except Exception as e:
        print(f"An error occurred in batch_analyze: {e}")
        return jsonify({'status': 'error', 'message': f'Internal server error: {str(e)}'}), 500


@app.route('/api/analyze', methods=['POST'])
def analyze_tweet():
    """
    Main API endpoint to receive text, perform a full NLP analysis, 
    and return a JSON object with all the results.
    """
    try:
        data = request.get_json()
        if 'text' not in data:
            return jsonify({'status': 'error', 'message': 'No text provided'}), 400

        user_input = data['text']

        # 1. Preprocess and Predict Sentiment
        processed_text = preprocess_text(user_input)
        X = vectorizer.transform([processed_text])
        prediction = model.predict(X)
        proba = model.predict_proba(X)[0]
        confidence = max(proba)
        sentiment_label = get_sentiment_label(user_input, prediction)
        
        # 2. Get Priority
        priority = prioritize_comment(user_input)

        # 3. Get Word Count
        input_length = len(user_input.split())

        # 4. Get Summary
        summary = get_summary(user_input, num_sentences=2)

        # 5. Generate Word Cloud (as a Base64 string)
        wordcloud_img = generate_wordcloud(user_input)

        # Return all results in a single JSON response
        response = {
            'status': 'success',
            'sentiment': sentiment_label,
            'confidence': f"{confidence:.4f}",
            'priority': priority,
            'input_length': input_length,
            'summary': summary,
            'wordcloud_img': wordcloud_img,
        }
        
        return jsonify(response)

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)