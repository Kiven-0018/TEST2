# test_style.py
import sqlite3

def test_user_style(user_id):
    conn = sqlite3.connect("chat_logs.db")
    cursor = conn.cursor()
    cursor.execute("SELECT learning_style FROM vark_results WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row

if __name__ == "__main__":
    for uid in [2501, 2502, 2503]:
        style = test_user_style(uid)
        print(f"user_id={uid} -> learning_style={style}")
