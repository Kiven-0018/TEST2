-- Database schema for chat_logs (SQLite version)
-- SQLite database will be created as chat_logs.db

DROP TABLE IF EXISTS logs;
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME DEFAULT NULL,
    response_time INTEGER DEFAULT NULL,
    prompt_count INTEGER NOT NULL,
    user_message TEXT NOT NULL,
    ai_reply TEXT,
    error_message TEXT
);

DROP TABLE IF EXISTS interactions;
CREATE TABLE interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time DATETIME NOT NULL,
    end_time DATETIME DEFAULT NULL,
    response_time INTEGER DEFAULT NULL,
    prompt_count INTEGER NOT NULL,
    user_message TEXT NOT NULL,
    ai_reply TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    student_id INTEGER PRIMARY KEY,
    name TEXT,
    major TEXT,
    api_key TEXT,
    learning_style TEXT
);

DROP TABLE IF EXISTS vark_results;
CREATE TABLE vark_results (
  user_id INTEGER,
  full_name TEXT,
  visual INTEGER,
  aural INTEGER,
  readwrite INTEGER,
  kinesthetic INTEGER,
  learning_style TEXT
);