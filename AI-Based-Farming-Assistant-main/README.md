# AI Farming Assistant

A full-stack AI-powered farming assistant with plant disease prediction, dashboard analytics, and voice assistant capabilities.

## Features

- **Plant Disease Prediction**: Upload leaf images to detect diseases using AI
- **Dashboard Analytics**: Real-time farm monitoring with NDVI, crop health scores
- **Voice Assistant**: Hindi and English voice interaction with farming advice
- **Demo Mode**: Fallback functionality when services are unavailable

## Setup Instructions

### Backend Setup

1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables in `.env`:
   ```
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=farming_ai
   OPENAI_API_KEY=your_openai_api_key
   DEMO_MODE=false
   ```

4. Start MySQL and create database (if not exists, the app will create it)

5. Run the Flask backend:
   ```bash
   python app.py
   ```

### Frontend Setup

1. Open `Frontend/index.html` in a web browser, or serve via a local server

2. For best experience, use a local server:
   ```bash
   # Using Python
   cd Frontend
   python -m http.server 5500
   ```

3. Open http://127.0.0.1:5500 in your browser

## Usage

### Disease Prediction
1. Go to Dashboard
2. Set backend API URL to http://127.0.0.1:5000
3. Upload a leaf image
4. View prediction results

### Voice Assistant
1. Go to Voice Assistant page
2. Select language (Hindi/English)
3. Click microphone or type questions
4. Get AI-powered farming advice

### Demo Mode
- Set `DEMO_MODE=true` in backend `.env` for offline demo
- System will use fallback responses and demo data

## API Endpoints

- `GET /health` - Health check
- `POST /predict` - Disease prediction
- `GET /dashboard` - Dashboard data
- `POST /voice` - Voice assistant queries

## Technologies Used

- **Backend**: Flask, TensorFlow, MySQL, OpenAI API
- **Frontend**: HTML, CSS, JavaScript, Chart.js
- **AI/ML**: Hierarchical CNN model for plant disease detection
- **Voice**: Browser Speech Recognition & Synthesis APIs

## Browser Requirements

- Modern browser with Speech Recognition API support (Chrome recommended)
- Microphone access for voice features
- File upload support for image prediction

## Troubleshooting

- **Backend not connecting**: Check Flask is running on port 5000
- **Database errors**: Ensure MySQL is running and credentials are correct
- **Voice not working**: Check microphone permissions and browser support
- **Demo mode**: Enable DEMO_MODE for offline testing