# FarmSaathi — AI Farming Assistant

Full-stack app for Indian farmers: Flask API + static frontend. **Auth:** username/password (bcrypt) + JWT (30 days). **Database:** MySQL (`farming_db`) via PyMySQL — tables are created on startup.

## Prerequisites

- Python 3.10+
- MySQL Server (user must be able to create DB `farming_db` or it is auto-created)
- API keys in `backend/.env` (OpenWeather, data.gov.in Agmarknet, Gemini, etc.)

## Backend setup

```bash
cd farming-assistant/backend
pip install -r requirements.txt
```

Ensure `backend/.env` exists (copy from your secure store; do **not** commit real secrets). MySQL variables:

- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASS`, `MYSQL_DB`

Start API:

```bash
python app.py
```

Default: `http://127.0.0.1:5000`.

### Optional Google login

Set `GOOGLE_CLIENT_ID` in `.env` and use Google Identity Services on the login page.

### Disease model

Place **`model.h5`** (or `plant_disease_model.h5`) under `backend/models/` with matching `class_names.json`. The app prefers `models/model.h5` if that file exists. You can also set `MODEL_FILE=myname.h5` or `MODEL_PATH=...` in `.env`. Without a model file, `/api/disease/predict` returns HTTP 503 with a Hindi message.

## Frontend

Serve `farming-assistant/frontend/` with Live Server (e.g. port **5500**) or any static host. The client uses `http://127.0.0.1:5000` as API base when the page port is 5500, 8080, or 3000.

**Main entry:** `login.html` → `profile-setup.html` (if incomplete) → `dashboard.html`. `index.html` redirects by auth state.

## Training (optional)

```bash
pip install -r requirements_training.txt
python tools/train_model.py
```

## Security

- Keep `backend/.env` out of git (root `.gitignore` includes `.env`).
- Rotate any API keys if they were exposed.
