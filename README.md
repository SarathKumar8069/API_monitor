
API Sentinel is a small project I built to monitor APIs and keep track of their availability and performance.

The idea is simple: add an API endpoint, let the application check it at regular intervals, and see whether it's responding properly. It also keeps a record of previous checks so you can get an idea of how reliable an endpoint has been over time.

What it does

- Add API endpoints that you want to monitor.
- Check an endpoint manually whenever needed.
- Run automatic checks at configured intervals.
- View API uptime and average response time.
- Keep track of successful and failed requests.
- View previous checks through a response-time chart.
- Pause and resume monitoring whenever required.

Built with

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI
- **Database:** MySQL
- **Other tools:** SQLAlchemy, HTTPX, APScheduler, Axios, Recharts

Getting started

You'll need Python, Node.js and MySQL installed on your machine.

**1. Clone the repository**

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Api_setinels
```

**2. Set up the backend**

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the required packages:

```bash
pip install fastapi uvicorn sqlalchemy aiomysql httpx apscheduler python-dotenv pydantic-settings
```

Create a `.env` file inside the `backend` folder:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sentinel_db
```

Create the database in MySQL:

```sql
CREATE DATABASE sentinel_db;
```

Start the backend:

```bash
uvicorn main:app --reload
```

The API documentation will be available at `http://localhost:8000/docs`.

**3. Start the frontend**

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check backend status |
| POST | `/api/monitors` | Add an API to monitor |
| GET | `/api/monitors` | Get all monitors |
| POST | `/api/monitors/{id}/check` | Run a manual check |
| GET | `/api/monitors/{id}/history` | View check history |
| GET | `/api/monitors/{id}/stats` | Get monitoring statistics |
| PATCH | `/api/monitors/{id}/toggle` | Pause or resume monitoring |

A little more about the project

I built this project to get hands-on experience with connecting a React frontend to a Python backend, working with a relational database, and handling scheduled background tasks.

There are plenty of things that could be added later, such as downtime notifications, user authentication and deployment. For now, the focus is on the core monitoring functionality.
