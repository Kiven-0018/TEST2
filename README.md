# Chatbot Application

A full-stack chatbot web application with persistent chat history, Markdown rendering, user authentication via student ID, and optional API key support. The backend uses Flask and SQLite by default, with instructions to migrate to MySQL.

---

## Features

- **User Authentication:** Login and registration using `student_id` as the primary key.
- **API Key Management:** Users can provide a custom API key or use the system default.
- **Persistent Chat History:** All conversations are stored and loaded per user.
- **Markdown Rendering:** Bot responses support Markdown, including code blocks and lists.
- **New Chat Threads:** Users can start new conversations without losing previous logs.
- **Responsive UI:** Modern, clean interface with compact Markdown formatting.

---

## System Architecture

### Backend

- **Framework:** Flask (Python)
- **Database:** SQLite (default), with support for MySQL (see below)
- **ORM:** SQLAlchemy
- **Key Endpoints:**
  - `/register`: Register a new user with `student_id`, password, and optional API key.
  - `/login`: Authenticate user and load chat history.
  - `/chat`: Send/receive chat messages, store and retrieve chat logs.
  - `/new_chat`: Start a new chat thread for the user.

### Frontend

- **HTML/CSS/JS:** Responsive layout, chat interface, and sidebar for login/API key.
- **Markdown Rendering:** Uses the `marked` library for rendering bot responses.
- **Chat History:** Loads previous messages on login; "New Chat" button starts a new thread.

---

## Database Schema

### Users Table

| Column      | Type    | Description                        |
|-------------|---------|------------------------------------|
| student_id  | TEXT    | Primary key, unique student ID     |
| password    | TEXT    | Hashed password                    |
| api_key     | TEXT    | Optional, user's API key           |

### Chat Logs Table

| Column      | Type    | Description                        |
|-------------|---------|------------------------------------|
| id          | INTEGER | Primary key, auto-increment        |
| student_id  | TEXT    | Foreign key to users.student_id    |
| role        | TEXT    | 'user' or 'assistant'              |
| message     | TEXT    | Message content                    |
| timestamp   | TEXT    | ISO timestamp                      |
| thread_id   | TEXT    | Conversation thread identifier     |

---

## API Key System

- On registration, users may provide an API key.
- If not provided, the backend uses a default API key from `.env`.
- API keys are stored per user and used for all their chat requests.
- Users can update their API key in their profile.

---

## Software Methodology

- **MVC Pattern:** Separation of concerns between data (models), logic (controllers/routes), and presentation (templates/static).
- **Security:** Passwords are hashed; API keys are never exposed to the frontend.
- **Persistence:** All chat logs are stored per user and per thread.
- **Extensibility:** Easily switch databases or add new authentication providers.

---

## How to Run

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   - Create a `.env` file with:
     ```
     API_KEY=your_default_api_key
     SECRET_KEY=your_flask_secret
     ```

3. **Initialize the database:**
   ```bash
   python database_setup.sql
   ```

4. **Run the Flask app:**
   ```bash
   python app.py
   ```

5. **Open in browser:**
   - Navigate to `http://localhost:5000`

---

## Migrating from SQLite to MySQL

1. **Install MySQL and Python driver:**
   ```bash
   pip install mysqlclient
   ```

2. **Update SQLAlchemy URI in `app.py`:**
   ```python
   app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://username:password@localhost/dbname'
   ```

3. **Update schema:**
   - Convert `database_setup.sql` to MySQL syntax if needed.
   - Create the database and tables in MySQL.

4. **Migrate data (optional):**
   - Export data from SQLite and import into MySQL using tools like `mysqldump` or custom scripts.

5. **Restart the Flask app.**

---

## Notes

- For production, use HTTPS and secure session management.
- To further customize Markdown rendering, edit `static/chatbot.css`.
- For advanced features, extend the Flask backend and JS frontend as needed.