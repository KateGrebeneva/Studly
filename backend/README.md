# Studly Backend API

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=studly_db
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000
JWT_SECRET=your_jwt_secret_key_change_this_in_production
PORT=3000
```

4. Create database and run migrations:
```bash
mysql -u root -p < database/schema.sql
```

5. Run the server:
```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload --port 3000
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create subject
- `GET /api/subjects/{id}` - Get subject by ID
- `PUT /api/subjects/{id}` - Update subject
- `DELETE /api/subjects/{id}` - Delete subject

### Tasks
- `GET /api/tasks/subject/{subject_id}` - Get tasks by subject
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Sessions
- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create session
- `PUT /api/sessions/{id}` - Update session
- `DELETE /api/sessions/{id}` - Delete session

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile

## Authentication

All endpoints except `/api/auth/*` require JWT token in Authorization header:
```
Authorization: Bearer <token>
```
