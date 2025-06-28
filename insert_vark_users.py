import csv
import sqlite3

CSV_FILE = "vark_results.csv"
DB_FILE = "chat_logs.db"


def main():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    with open(CSV_FILE, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            student_id = int(row["user_id"])
            name = row["full_name"].strip()
            visual = int(row["visual"])
            aural = int(row["aural"])
            readwrite = int(row["readwrite"])
            kinesthetic = int(row["kinesthetic"])
            learning_style = row["learning_style"].strip()
            # Insert with NULL for major and api_key
            cur.execute(
                """INSERT OR REPLACE INTO users
                (student_id, name, major, api_key, visual, aural, readwrite, kinesthetic, learning_style)
                VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?)""",
                (
                    student_id,
                    name,
                    visual,
                    aural,
                    readwrite,
                    kinesthetic,
                    learning_style,
                ),
            )
    conn.commit()
    conn.close()
    print("Inserted users from vark_results.csv into users table with all columns.")


if __name__ == "__main__":
    main()
