# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify, session
import openai
import os
import sqlite3
from dotenv import load_dotenv
import httpx
import pandas as pd
from pathlib import Path
from adaptive_generator import generate_adaptive_prompt, adaptive_generator
import logging

# Load environment variables
load_dotenv()

# Configure logging for VARK user type debugging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

app = Flask(__name__)

app.secret_key = "9250018"  # 必须设置一个 secret key 才能使用 session

# Database configuration - Easy switching between SQLite and MySQL
DATABASE_CONFIG = {
    "type": "sqlite",  # Change to "mysql" to switch databases
    "sqlite": {"path": "chat_logs.db"},
    "mysql": {
        "host": "localhost",
        "user": "root",
        "password": "",
        "database": "chat_logs",
    },
}
# vark function
STYLE_MAP = {"V": "visual", "A": "aural", "R": "readwrite", "K": "kinesthetic"}


def import_csv_to_sqlite(csv_path: str, db_path: str):
    df = pd.read_csv(csv_path)
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS vark_results (
            user_id INTEGER PRIMARY KEY,
            visual INTEGER,
            aural INTEGER,
            read_write INTEGER,
            kinesthetic INTEGER,
            learning_style TEXT
        )
    """
    )
    df.to_sql("vark_results", conn, if_exists="replace", index=False)
    conn.commit()
    conn.close()


def get_user_style(user_id: int) -> str:
    """
    Enhanced function to get user's primary learning style for adaptive prompts
    Returns primary style as string for compatibility with adaptive generator
    """
    db_path = DATABASE_CONFIG["sqlite"]["path"]
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        logging.info(f"Querying for user_id: {user_id} (type: {type(user_id)})")
        cursor.execute(
            "SELECT learning_style FROM users WHERE student_id = ?", (user_id,)
        )
        row = cursor.fetchone()
        logging.info(f"DB row result: {row}")

        if row and row[0]:
            learning_style = row[0].strip()
            logging.info(
                f"🎯 Retrieved learning style from users table for User {user_id}: {learning_style}"
            )
            return learning_style

    except Exception as e:
        logging.error(f"❌ Error retrieving learning style for User {user_id}: {e}")
    finally:
        conn.close()

    # Default fallback
    logging.warning(
        f"⚠️ No learning style found for User {user_id}, using default: Read/Write"
    )
    return "Read/Write"


def generate_prompt(message, style):
    if style == "visual":
        return f"You're a visual-style AI tutor. Use diagrams, bulleted lists, and spatial metaphors.\nQ: {message}\nA:"
    elif style == "aural":
        return f"You're an auditory-style AI tutor. Use storytelling, voice tones, and conversation.\nQ: {message}\nA:"
    elif style == "readwrite":
        return f"You're a read/write-style AI tutor. Use summaries, headings, lists, and structured text.\nQ: {message}\nA:"
    elif style == "kinesthetic":
        return f"You're a kinesthetic-style AI tutor. Use interactive examples, real-world analogies, and hands-on suggestions.\nQ: {message}\nA:"
    else:
        return f"You are a helpful AI tutor. Answer the question:\nQ: {message}\nA:"


def init_vark_data():
    db_path = DATABASE_CONFIG["sqlite"]["path"]
    csv_path = "vark_results.csv"
    if Path(csv_path).exists():
        import_csv_to_sqlite(csv_path, db_path)
    else:
        print(f"⚠️ CSV 文件未找到：{csv_path}，跳过导入 VARK 数据")


# Initialize VARK
init_vark_data()


def get_db_connection():
    """Database abstraction layer - supports both SQLite and MySQL"""
    db_type = DATABASE_CONFIG["type"]

    if db_type == "sqlite":
        try:
            conn = sqlite3.connect(DATABASE_CONFIG["sqlite"]["path"])
            conn.row_factory = sqlite3.Row  # This allows dict-like access to rows
            return conn
        except sqlite3.Error as e:
            print("SQLite connection error:", e)
            return None

    elif db_type == "mysql":
        try:
            import mysql.connector

            config = DATABASE_CONFIG["mysql"]
            conn = mysql.connector.connect(
                host=config["host"],
                user=config["user"],
                password=config["password"],
                database=config["database"],
            )
            return conn
        except Exception as e:
            print("MySQL connection error:", e)
            return None

    else:
        print(f"Unsupported database type: {db_type}")
        return None


def get_db_placeholder():
    """Return appropriate parameter placeholder for current database type"""
    return "?" if DATABASE_CONFIG["type"] == "sqlite" else "%s"


def get_client(api_key):
    proxy_url = os.getenv("OPENAI_PROXY_URL")
    if proxy_url:
        return openai.OpenAI(api_key=api_key, base_url=proxy_url)
    else:
        return openai.OpenAI(
            api_key=api_key, base_url="https://api.openai.com/v1"  # 指定新地址
        )


@app.route("/")
def index():
    return render_template("index.html")


# Load OpenAI API key from environment variable (.env file)
# Set OPENAI_API_KEY environment variable before running the app
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
print(
    f"🔑 Environment API Key loaded: {'✅ Available' if OPENAI_API_KEY else '❌ Not found'}"
)


def get_chat_history(user_id):
    """Get last 10 chat logs for a user."""
    if not user_id:
        return []

    conn = get_db_connection()
    if not conn:
        return []

    cursor = conn.cursor()
    placeholder = get_db_placeholder()

    try:
        cursor.execute(
            f"SELECT user_message, ai_reply FROM logs WHERE user_id = {placeholder} ORDER BY id DESC LIMIT 10",
            (user_id,),
        )
        history = cursor.fetchall()
        # Format history for OpenAI API
        formatted_history = []
        for row in reversed(history):
            formatted_history.append({"role": "user", "content": row["user_message"]})
            if row["ai_reply"]:
                formatted_history.append(
                    {"role": "assistant", "content": row["ai_reply"]}
                )
        return formatted_history
    except Exception as e:
        print(f"Error fetching chat history: {e}")
        return []
    finally:
        cursor.close()
        conn.close()


@app.route("/chat", methods=["POST"])
def chat_endpoint():
    data = request.get_json()
    user_msg = data.get("message", "")
    temp = float(data.get("temperature", 1))
    user_id = data.get("userId")

    # Use environment variable API key only
    final_api_key = OPENAI_API_KEY

    if not final_api_key:
        return (
            jsonify(
                {
                    "error": "Missing API key. Please set an API key in sidebar or .env file"
                }
            ),
            400,
        )

    if not final_api_key.startswith("sk-"):
        return jsonify({"error": "Invalid API key format. Must start with 'sk-'"}), 400

    if not data or "message" not in data:
        return jsonify({"error": "Invalid request"}), 400

    # 🎯 ADAPTIVE PROMPT GENERATION - Get user's learning style and generate adaptive prompt
    try:
        if user_id:
            user_style = get_user_style(user_id)
            # Generate adaptive prompt using the new generator
            adaptive_prompt = generate_adaptive_prompt(user_msg, user_style, user_id)
            logging.info(
                f"🚀 Generated adaptive prompt for User {user_id} ({user_style}): {adaptive_prompt}"
            )
        else:
            # Fallback for users without ID
            adaptive_prompt = generate_adaptive_prompt(user_msg, "Read/Write", None)
            logging.info("🚀 Generated default adaptive prompt for anonymous user")
    except Exception as e:
        logging.error(f"❌ Error generating adaptive prompt: {e}")
        # Fallback to basic prompt
        adaptive_prompt = (
            f"You are Learnix AI, a helpful tutor. Answer this question: {user_msg}"
        )

    # Prepend chat history to the messages
    history = get_chat_history(user_id)

    messages_for_api = history + [
        {"role": "system", "content": adaptive_prompt},
        {"role": "user", "content": user_msg},
    ]
    client = get_client(final_api_key)

    try:
        # Call OpenAI ChatCompletion with GPT-4 model
        response = client.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=messages_for_api,
            temperature=temp,  # adjust as needed
        )
        # Extract the assistant's reply from response
        reply = response.choices[0].message.content.strip()
        # Return the assistant's reply as JSON
        return jsonify({"reply": reply})
    except Exception as e:
        # Log error (and potentially return error info)
        logging.error(f"❌ OpenAI API call error: {e}")
        print("OpenAI API call error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/log", methods=["POST"])
def log_interaction():
    data = request.get_json()
    logs = data.get("logs", [])

    if not logs:
        return jsonify({"error": "No logs provided"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    placeholder = get_db_placeholder()

    try:
        for log in logs:
            start_time = log["startTime"].split(".")[0].replace("T", " ")
            end_time = (
                log["endTime"].split(".")[0].replace("T", " ")
                if log["endTime"]
                else None
            )

            cursor.execute(
                f"""
                INSERT INTO logs
                (user_id, start_time, end_time, response_time, prompt_count, user_message, ai_reply, error_message)
                VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                """,
                (
                    log["userId"],
                    start_time,
                    end_time,
                    log["responseTime"],
                    log["promptCount"],
                    log["userMessage"],
                    log["aiReply"],
                    log.get("errorMessage"),
                ),
            )
        conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        conn.rollback()
        print("Log insertion error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    student_id = data.get("student_id")
    major = data.get("major")

    if not student_id:
        return jsonify({"error": "Student ID is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    placeholder = get_db_placeholder()

    try:
        # Check if user exists and get their data
        cursor.execute(
            f"SELECT student_id, name, major FROM users WHERE student_id = {placeholder}",
            (student_id,),
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not pre-registered"}), 404

        # If user already has a major, they're already registered
        if user["major"]:
            return jsonify({"error": "User already registered"}), 400

        # If no major provided, prompt for it
        if not major:
            return jsonify(
                {
                    "require_major": True,
                    "student_id": user["student_id"],
                    "name": user["name"],
                    "message": "Please provide your major to complete registration",
                }
            )

        # Update the user's major
        cursor.execute(
            f"UPDATE users SET major = {placeholder} WHERE student_id = {placeholder}",
            (major, student_id),
        )
        conn.commit()

        return jsonify(
            {
                "success": True,
                "message": "Registration completed successfully! You can now log in.",
            }
        )

    except Exception as e:
        conn.rollback()
        print("Registration error:", e)
        return jsonify({"error": "Internal server error"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    student_id = data.get("student_id")

    if not student_id:
        return jsonify({"error": "Student ID is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    placeholder = get_db_placeholder()

    try:
        cursor.execute(
            f"SELECT student_id, name, major FROM users WHERE student_id = {placeholder}",
            (student_id,),
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        # If user doesn't have a major, they need to complete registration
        if user["major"] is None:
            return jsonify(
                {
                    "require_registration": True,
                    "message": "Please complete your registration by providing your major",
                }
            )

        # User is fully registered, get learning style and return all data
        learning_style = get_user_style(user["student_id"])
        return jsonify(
            {
                "success": True,
                "user": {
                    "student_id": user["student_id"],
                    "name": user["name"],
                    "major": user["major"],
                    "learning_style": learning_style,
                },
            }
        )

    except Exception as e:
        print("Login error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/update_user", methods=["POST"])
def update_user():
    data = request.get_json()
    student_id = data.get("student_id")
    name = data.get("name")
    major = data.get("major")

    if not student_id or not name or not major:
        return jsonify({"error": "All fields are required"}), 400

    try:
        student_id = int(student_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid student ID"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    placeholder = get_db_placeholder()

    try:
        cursor.execute(
            f"UPDATE users SET name = {placeholder}, major = {placeholder} WHERE student_id = {placeholder}",
            (name, major, student_id),
        )
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "User not found"}), 404

        return jsonify(
            {"status": "success", "message": "User details updated successfully"}
        )
    except Exception as e:
        conn.rollback()
        print("Update user error:", e)
        return jsonify({"error": "Internal server error"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/history", methods=["GET"])
def history():
    user_id = request.args.get("userId")
    history = get_chat_history(user_id)
    return jsonify(history)


@app.route("/user_learning_style", methods=["GET"])
def user_learning_style():
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "userId parameter is required"}), 400

    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid userId"}), 400

    learning_style = get_learning_style(user_id)

    if learning_style:
        return jsonify({"learning_style": learning_style})
    else:
        return jsonify({"learning_style": "Unknown"})


if __name__ == "__main__":
    from flask_cors import CORS

    CORS(app)
    app.run(debug=True, port=5001)
