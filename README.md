# 🌱 AI-Based Farming Assistant

An AI-powered full-stack farming assistant designed to help farmers with plant disease detection, crop recommendations, weather information, market prices, financial assistance, and voice-based interaction.

The system combines **Artificial Intelligence, Machine Learning, Flask, MySQL, HTML, CSS, and JavaScript** to provide useful farming-related information through a single web application.

---

## 🚀 Features

### 🌿 Plant Disease Detection
- Upload an image of a plant leaf.
- AI-based model analyzes the image.
- Provides the predicted plant disease.
- Helps farmers identify potential crop diseases quickly.

### 🤖 AI Farming Assistant
- Provides farming-related assistance.
- Answers agriculture-related questions.
- Supports AI-powered recommendations.
- Can work with demo/fallback responses when external services are unavailable.

### 🎤 Voice Assistant
- Voice-based interaction with the farming assistant.
- Supports Hindi and English.
- Uses browser Speech Recognition and Speech Synthesis APIs.
- Users can speak questions instead of typing them.

### 🌾 Crop Recommendations
- Provides crop-related recommendations.
- Uses farming and crop data stored in the backend.
- Helps users make better crop-related decisions.

### 🌦️ Weather Information
- Provides weather-related information for farming.
- Helps farmers understand weather conditions relevant to their crops.

### 📊 Farm Dashboard
- Dashboard for viewing farming information.
- Displays crop health and farm-related data.
- Includes data visualization using charts.

### 💰 Mandi / Market Prices
- Provides agricultural market price information.
- Helps farmers understand current crop market prices.

### 💳 Financial Assistance
- Provides information related to agricultural financial support and subsidies.

### 🦠 Disease and Pest Information
- Provides information about common crop diseases and pests.
- Includes prevention and management information.

### 🧑‍🌾 Farmer Profile
- User profile management.
- Stores farmer-related information used by different features of the application.

### 🎨 Multi-language Support
- Frontend contains language-selection functionality.
- Designed to make the application more accessible to farmers.

### 🧪 Demo Mode
- Provides fallback/demo functionality when required services are unavailable.
- Useful for demonstrating the application without connecting all external services.

---

## 🛠️ Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript
- Chart.js
- Browser Speech Recognition API
- Browser Speech Synthesis API

### Backend
- Python
- Flask
- REST APIs
- MySQL

### AI / Machine Learning
- TensorFlow
- CNN-based plant disease classification
- Image processing
- AI-powered farming assistance

### Development Tools
- VS Code
- Git
- GitHub

---

## 📂 Project Structure

```text
AI-Based-Farming-Assistant/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── database.py
│   ├── ai_client.py
│   │
│   ├── data/
│   │   ├── crop_avg_yields.json
│   │   ├── crop_calendars.json
│   │   ├── disease_info.json
│   │   ├── district_coords.json
│   │   ├── pest_alerts.json
│   │   └── subsidies.json
│   │
│   ├── models/
│   │   └── class_names.json
│   │
│   ├── routes/
│   │   ├── ai_advisor.py
│   │   ├── assistant.py
│   │   ├── auth.py
│   │   ├── community.py
│   │   ├── disease.py
│   │   ├── farmer.py
│   │   ├── finance.py
│   │   ├── mandi.py
│   │   ├── ndvi.py
│   │   ├── profile.py
│   │   ├── recommendation.py
│   │   ├── soil.py
│   │   ├── voice.py
│   │   └── weather.py
│   │
│   ├── tools/
│   │   └── train_model.py
│   │
│   ├── requirements.txt
│   └── requirements_training.txt
│
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── dashboard.html
│   ├── disease.html
│   ├── finance.html
│   ├── mandi.html
│   ├── ndvi-map.html
│   ├── profile.html
│   ├── recommendation.html
│   ├── subsidies.html
│   ├── voice.html
│   └── weather.html
│
├── templates/
│   └── voice.html
│
├── .gitignore
├── README.md
└── ...
