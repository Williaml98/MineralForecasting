# AI-Driven Mineral Demand Forecasting System
### BF Mining Group Ltd — Academic Final Year Project

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Client                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP :3000
┌───────────────────────────▼─────────────────────────────────┐
│               Frontend — Next.js 14  (port 3000)            │
│         TypeScript · Tailwind CSS · shadcn/ui · Recharts    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP :8080
┌───────────────────────────▼─────────────────────────────────┐
│            Backend — Spring Boot 3  (port 8080)             │
│    Java 21 · Spring Security · JWT · Flyway · JPA · Maven    │
└──────────────┬────────────────────────┬─────────────────────┘
               │ JDBC :5432             │ HTTP :8000
┌──────────────▼───────────┐  ┌─────────▼───────────────────┐
│  PostgreSQL  (port 5432)  │  │  ML Service — FastAPI :8000  │
│  (local installation)    │  │  Python 3.11 · ARIMA ·       │
│                          │  │  Prophet · LSTM · SHAP       │
└──────────────────────────┘  └─────────────────────────────┘
```

---

## Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | 20 LTS |
| Java (JDK) | 21 |
| Python | 3.11 |
| PostgreSQL | 15 |
| Maven | Wrapper included — no install needed (`mvnw` / `mvnw.cmd`) |

---

## First-Time Setup

### 1. Create the PostgreSQL database

```sql
-- In psql or pgAdmin:
CREATE DATABASE mineral_forecasting;
```

### 2. Copy environment template and fill in real values

```bash
cp .env.example .env
# Open .env and replace all placeholder values
```

### 3. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Backend — dependencies are downloaded automatically by the Gradle wrapper

# ML service
cd ml-service && pip install -r requirements.txt
```

---

## Running Each Service

### 1. Start PostgreSQL

PostgreSQL must already be running on your machine before starting the backend.

### 2. Start the ML service

```bash
cd ml-service
uvicorn main:app --reload --port 8000
```

### 3. Start the backend

```bash
cd backend
./mvnw spring-boot:run
```

On Windows:
```cmd
cd backend
mvnw.cmd spring-boot:run
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Tests

### Backend

```bash
cd backend
./mvnw test
```

On Windows:
```cmd
cd backend
mvnw.cmd test
```

Test report: `backend/target/surefire-reports/`

### ML Service

```bash
cd ml-service
pytest
```

### Frontend

```bash
cd frontend
npm test
```

---

## Environment Variable Reference

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host (default: `localhost`) |
| `DB_PORT` | PostgreSQL port (default: `5432`) |
| `DB_NAME` | Database name (`mineral_forecasting`) |
| `DB_USERNAME` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `ADMIN_EMAIL` | Email address for the seeded admin account |
| `ADMIN_PASSWORD` | Password for the seeded admin account |
| `JWT_SECRET` | 256-bit random string used to sign JWTs |
| `JWT_ACCESS_EXPIRY_MS` | Access token lifetime in ms (default: 900000 = 15 min) |
| `JWT_REFRESH_EXPIRY_MS` | Refresh token lifetime in ms (default: 604800000 = 7 days) |
| `MAIL_USERNAME` | Gmail address used to send emails |
| `MAIL_APP_PASSWORD` | Google App Password (not your Gmail login password) |
| `MAIL_FROM` | Display "from" address on outgoing emails |
| `ML_SERVICE_URL` | Base URL of the Python ML service (default: `http://localhost:8000`) |
| `BACKEND_URL` | Spring Boot backend URL used by Next.js server-side proxy (default: `http://localhost:8080`) |
| `FRONTEND_URL` | Frontend URL used in emails sent to users (default: `http://localhost:3000`) |

---

## Generating a Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Navigate to **Security** → **2-Step Verification** (must be enabled)
3. Scroll down to **App Passwords**
4. Select app: **Mail**, device: **Other** → type `BF Mining`
5. Click **Generate** — copy the 16-character password into `MAIL_APP_PASSWORD` in your `.env`

---

## Default Admin Credentials

On first startup, the admin account is automatically seeded using the values in your `.env`:

- **Email:** value of `ADMIN_EMAIL`
- **Password:** value of `ADMIN_PASSWORD`

The admin can then create other users through the **Admin → User Management** page.

---

*BF Mining Group Ltd — Final Year Project, 2026*
