import streamlit as st
import joblib
import spacy
import time
import math
import pandas as pd
import matplotlib.pyplot as plt
import plotly.express as px
from wordcloud import WordCloud
from transformers import pipeline
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer
from textblob import TextBlob
import tweepy
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import torch

# Load models
vectorizer = joblib.load('vectorizer.sav')
model = joblib.load('trained_model.sav')


try:
    device = 0 if torch.cuda.is_available() else -1
    print(f"Using device: {'cuda:0' if device==0 else 'cpu'}")
    priority_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli", device=device)
except Exception as e:
    print("Pipeline initialization error:", e)
    priority_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli", device=-1)  # fallback to CPU

@st.cache_resource(show_spinner=False)
def load_summarizer():
    return pipeline("summarization", model="google/pegasus-xsum")

summarizer = load_summarizer()

nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])

st.sidebar.title("About")
st.sidebar.info(
    """
    **How to use:**  
    1. Enter a tweet in the text box.  
    2. Click Analyze to see the sentiment and confidence level.  

    This tool helps you quickly understand the sentiment of tweets by analyzing the text content.  

    Feel free to explore and test different tweets to see how the model responds.
    """
)



def preprocess_text(text):
    doc = nlp(text)
    return " ".join([token.lemma_ for token in doc])

def prioritize_comment(text):
    candidate_labels = ["High Priority", "Medium Priority", "Low Priority"]
    result = priority_classifier(text, candidate_labels)
    return result['labels'][0]

def sumy_summarize(text, num_sentences=3):
    parser = PlaintextParser.from_string(text, Tokenizer("english"))
    summarizer = LsaSummarizer()
    summary = summarizer(parser.document, num_sentences)
    return " ".join([str(sentence) for sentence in summary])

def get_sentiment_label(text, prediction):
    polarity = TextBlob(text).sentiment.polarity
    if -0.1 <= polarity <= 0.1:
        return "Neutral"
    else:
        return "Negative" if prediction[0] == 0 else "Positive"
def batch_sentiment_label(row, pred):
    polarity = TextBlob(row).sentiment.polarity
    if -0.1 <= polarity <= 0.1:
        return "Neutral"
    else:
        return "Negative" if pred == 0 else "Positive"
def chunk_text(text, max_tokens=512):
    # Naive chunk based on words count (approx.), adjust as needed
    words = text.split()
    n_chunks = math.ceil(len(words) / max_tokens)
    chunks = [" ".join(words[i*max_tokens:(i+1)*max_tokens]) for i in range(n_chunks)]
    return chunks

def summarize_text(text, max_length=130, min_length=30):
    chunks = chunk_text(text)
    summaries = []
    for chunk in chunks:
        summary = summarizer(chunk, max_length=max_length, min_length=min_length, do_sample=False)
        summaries.append(summary[0]['summary_text'])
    # Finally summarize the concatenated summaries
    combined_text = " ".join(summaries)
    final_summary = summarizer(combined_text, max_length=max_length, min_length=min_length, do_sample=False)
    return final_summary[0]['summary_text']

def scrape_tweets(query, num_tweets=10):
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('log-level=3')
    driver = webdriver.Chrome(options=options)  # If needed: specify executable_path
    try:
        driver.get(f'https://twitter.com/search?q={query}&src=typed_query&f=live')
        time.sleep(3)
        last_height = driver.execute_script("return document.body.scrollHeight")
        tweets = []
        while len(tweets) < num_tweets:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            new_tweets = []
            for tweet in soup.find_all('div', {'data-testid': 'tweet'}):
                tweet_text = tweet.get_text(separator=' ', strip=True)
                if tweet_text not in [t['text'] for t in tweets]:
                    new_tweets.append({'text': tweet_text})
                if len(tweets) + len(new_tweets) >= num_tweets:
                    break
            tweets.extend(new_tweets)
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height or not new_tweets:
                break
            last_height = new_height
    finally:
        driver.quit()
    return tweets[:num_tweets]

# Page settings and header
st.set_page_config(page_title="Twitter Sentiment Analysis", page_icon="✨", layout="centered")
st.markdown(
    """
    <style>
        .main { background-color: #222; color: #fff; }
        div[data-testid="stTextArea"] textarea { background-color: #222 !important; color: #fff !important; }
        .css-1cpxqw2 { color: #fff !important; }
    </style>
    """,
    unsafe_allow_html=True
)

st.markdown("<h1 style='text-align: center; color: #FC7300;'>🟣 Twitter Sentiment Analysis</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align: center;'>Enter your tweet below and discover its sentiment instantly!</p>", unsafe_allow_html=True)

# Layout with columns for centering
col1, col2, col3 = st.columns([1, 6, 1])
with col2:
    user_input = st.text_area("Enter a tweet:")

    if st.button("Analyze", key="analyze_button"):
        if user_input:
            with st.spinner('Analyzing sentiment...'):
                time.sleep(3)
                processed = preprocess_text(user_input)
                X = vectorizer.transform([processed])  # Only transform
                prediction = model.predict(X)
                proba = model.predict_proba(X)[0]
                confidence = max(proba)
                sentiment_label = get_sentiment_label(user_input, prediction)
                priority = prioritize_comment(user_input)
                length = len(user_input.split())
                summary = sumy_summarize(user_input, num_sentences=2)

                st.markdown(f"**Priority:** {priority}")
                st.markdown(f"**Comment Length:** {length} words")
                st.markdown(f"**Summary:** {summary}")

                # Set colors for all three sentiments
                color_map = {
                    "Positive": "#4caf50",
                    "Negative": "#f44336",
                    "Neutral": "#607d8b"  # greyish blue for Neutral
                }
                color = color_map.get(sentiment_label, "#607d8b")
                badge = f"<span style='background-color: {color}; color: white; border-radius: 8px; padding: 0.35em 0.8em; font-weight:bold;'>{sentiment_label}</span>"
                st.markdown(f"<h3>Sentiment: {badge}</h3>", unsafe_allow_html=True)
                st.markdown(f"<h4>Confidence: {confidence:.2%}</h4>", unsafe_allow_html=True)

                if sentiment_label == "Positive":
                    st.markdown("<h1 style='text-align: center; font-size: 64px;'>😊</h1>", unsafe_allow_html=True)
                elif sentiment_label == "Negative":
                    st.markdown("<h1 style='text-align: center; font-size: 64px;'>😞</h1>", unsafe_allow_html=True)
                else:
                    st.markdown("<h1 style='text-align: center; font-size: 64px;'>😐</h1>", unsafe_allow_html=True)


        else:
            st.warning("Please enter text to analyze.")
    
    uploaded_file = st.file_uploader("Upload CSV file for batch prediction (must contain a 'text' column)", type=["csv"])
    if uploaded_file:
        import pandas as pd
        df_batch = pd.read_csv(uploaded_file)
        
        if 'text' not in df_batch.columns:
            st.error("CSV must have a 'text' column with tweets/comments")
        else:
            with st.spinner("Predicting sentiments for batch file..."):
                # Preprocess texts in batch
                df_batch['processed_text'] = df_batch['text'].apply(preprocess_text)
                X_batch = vectorizer.transform(df_batch['processed_text'])
                preds = model.predict(X_batch)
                
                # Map predictions (0,1) to sentiment strings
                probas = model.predict_proba(X_batch)
                confidences = [max(prob) for prob in probas]

                df_batch['sentiment'] = [batch_sentiment_label(text, p) for text, p in zip(df_batch['text'], preds)]
                df_batch['confidence'] = confidences

                df_batch.drop(columns=['processed_text'], inplace=True)
                
                # Add priority classification column
                df_batch['priority'] = df_batch['text'].apply(prioritize_comment)

                # Generate and display summary of all comments
                all_text = " ".join(df_batch['text'].tolist())
                summary_text = sumy_summarize(all_text, num_sentences=3)
                st.subheader("Summary of All Comments")
                st.write(summary_text)

                # Sentiment distribution pie chart
                sentiment_counts = df_batch['sentiment'].value_counts().reset_index()
                sentiment_counts.columns = ['sentiment', 'count']
                fig_pie = px.pie(sentiment_counts, values='count', names='sentiment', title="Sentiment Distribution")
                st.plotly_chart(fig_pie)

                # Sentiment distribution bar chart
                fig_bar = px.bar(sentiment_counts, x='sentiment', y='count', title="Sentiment Distribution (Bar Chart)", color='sentiment')
                st.plotly_chart(fig_bar)

                # Calculate comment lengths
                df_batch['comment_length'] = df_batch['text'].apply(lambda x: len(str(x).split()))
                st.subheader("Comment Length Analysis")
                st.write(df_batch[['text', 'comment_length']].head())

                # Plot comment length distribution (Matplotlib)
                fig, ax = plt.subplots()
                ax.hist(df_batch['comment_length'], bins=10, color='skyblue', edgecolor='black')
                ax.set_title('Distribution of Comment Lengths')
                ax.set_xlabel('Number of Words')
                ax.set_ylabel('Number of Comments')
                st.pyplot(fig)

                # WordCloud visualization for batch comments
                all_text_wordcloud = ' '.join(df_batch['text'])
                wordcloud = WordCloud(width=400, height=300, background_color='white').generate(all_text_wordcloud)
                fig_wc, ax_wc = plt.subplots()
                ax_wc.imshow(wordcloud, interpolation='bilinear')
                ax_wc.axis('off')
                st.pyplot(fig_wc)

                # Priority levels display
                st.subheader("Priority Levels")
                priority_counts = df_batch['priority'].value_counts()
                st.write(priority_counts)

                # Update CSV download button with priority column included
                csv_result = df_batch.to_csv(index=False)
                st.download_button("Download Results CSV with Priority", csv_result, file_name="batch_sentiment_priority_results.csv")

                st.subheader("Batch Prediction Results")
                st.dataframe(df_batch[['text', 'sentiment', 'confidence', 'priority']])
                st.success("Batch prediction completed!")


