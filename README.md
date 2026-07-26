# Prysm

**AI data analysis, refracted into insight.** Prysm is an AI-powered automated data analysis platform. Upload CSV datasets, ask questions in plain English, and receive AI-generated Python analysis pipelines with preprocessing, statistical analysis, and Plotly visualizations.

## Architecture

```
frontend/          Next.js dashboard (auth, upload, analyze, history)
backend/           Flask REST API (JWT auth, SQLite, local/S3 storage)
data_analyst_system.py   DSPy multi-agent analysis engine
```

### AI Agent Pipeline

1. **Planner Agent** — Creates an execution plan from your query
2. **Preprocessing Agent** — EDA, cleaning, transformations (pandas/numpy)
3. **Statistical Analytics Agent** — Regression, hypothesis tests (statsmodels)
4. **Data Viz Agent** — Plotly visualizations
5. **Code Combiner Agent** — Merges all code into one script

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API key (for running analyses)

### 1. Backend

```bash
cd backend
export SECRET_KEY="your-jwt-secret"
export OPENAI_API_KEY="your-openai-api-key"
pip install -r requirements.txt
python app.py
```

API runs at `http://localhost:8000`

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # or create .env.local
npm install
npm run dev
```

Dashboard runs at `http://localhost:3000`

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | JWT signing secret |
| `OPENAI_API_KEY` | Yes* | OpenAI API key for analysis |
| `USE_S3` | No | Set `true` to use AWS S3 storage |
| `S3_BUCKET` | No | S3 bucket name (default: `prysm-data`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

\* Required only when running analyses

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: `http://localhost:8000`) |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/auth/register` | POST | No | Create account |
| `/api/auth/login` | POST | No | Sign in |
| `/api/auth/me` | GET | JWT | User profile + stats |
| `/api/datasets` | GET | JWT | List datasets |
| `/api/datasets/upload` | POST | JWT | Upload CSV |
| `/api/datasets/sample` | POST | JWT | Load demo sales CSV |
| `/api/datasets/:id` | DELETE | JWT | Delete dataset |
| `/api/analyses` | GET | JWT | List analyses |
| `/api/analyses` | POST | JWT | Run analysis (generate + execute) |
| `/api/analyses/:id` | GET | JWT | Get analysis details |
| `/api/analyses/:id` | DELETE | JWT | Delete analysis |
| `/api/analyses/:id/report` | GET | JWT | Download stakeholder HTML report |
| `/api/demo/status` | GET | No | Demo readiness flags |

Legacy routes (`/login`, `/upload`, `/query`, `/results`) remain for backward compatibility.

## Stakeholder demo (fundraiser-ready)

**Fastest path (no OpenAI key required):**

```bash
# Terminal 1 — API
cd backend
export SECRET_KEY="demo-secret-change-me"
export DEMO_MODE=true   # optional; auto-enables when OPENAI_API_KEY is unset
pip install -r requirements.txt
python3 app.py

# Terminal 2 — UI
cd frontend
npm install && npm run dev
```

Then open:

1. http://localhost:3000/pitch — investor brief
2. Register → **Analyze → One-click demo**
3. Show **Executive summary** + live charts
4. Click **Present** (Esc to exit) → **Export report**

Preflight:

```bash
chmod +x scripts/demo_preflight.sh
./scripts/demo_preflight.sh
```

## Production Deployment

### Docker Compose (recommended for demos)

```bash
export SECRET_KEY="a-long-unique-secret"
export ADMIN_PASSWORD="adminpass123"
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000

### Backend (Gunicorn)

```bash
cd backend
gunicorn -w 2 -b 0.0.0.0:8000 --timeout 120 app:app
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

### AWS S3 (optional)

```bash
export USE_S3=true
export S3_BUCKET=prysm-data
export AWS_REGION=ap-southeast-2
```

## Design System

Prysm uses a **sunset glassmorphism** visual language across the entire product — marketing site, auth, and dashboard:

- **Style**: Frosted-glass panels (`backdrop-blur` + translucent surfaces) over a deep violet canvas with sunset glow orbs
- **Colors**: Violet `#a855f7` → magenta `#ec4899` → rose `#fb7185` gradient on a `#0a0612` background
- **Typography**: Fira Sans + Fira Code
- **Patterns**: Glass KPI cards, gradient CTAs, glow orbs, drag-and-drop upload, code viewer with copy
- **Utilities**: `.glass`, `.glass-panel`, `.glass-strong`, `.text-gradient`, `.bg-sunset`, `.orb` (defined in `frontend/src/app/globals.css`)

## Admin account

Prysm provisions an admin from environment variables on startup (no seed script):

```bash
# backend/.env
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-strong-password   # 8+ chars
```

Restart the backend and log in with those credentials. You can also create/update
an admin on demand:

```bash
cd backend
flask --app app create-admin
```

## Testing

A pytest suite covers every endpoint plus the engine helpers and the DB migration.

```bash
cd backend
pip install -r requirements.txt
pytest -q
```

Tests run fully isolated (each uses a temporary data dir via `PRYSM_DATA_DIR`) and
stub the AI engine, so they need no OpenAI key or network access.

## License

MIT
