"""SQLite-backed key/value store for the app state.

Replaces the Firestore "appState" collection: same 4 keys (people, tasks,
houseParts, calendar), each holding a JSON-serializable value.
"""
import json
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "app.db")

DEFAULT_ADMIN = {
    "id": "admin-default",
    "name": "ADMIN",
    "email": "ADMIN@gmail.com",
    "password": "ADMIN",
    "role": "admin",
}

DEFAULT_PEOPLE = [
    DEFAULT_ADMIN,
    {"id": "p1", "name": "Mario Rossi", "email": "mario@gmail.com", "password": "mario", "role": "cadetto"},
    {"id": "p2", "name": "Luigi Verdi", "email": "luigi@gmail.com", "password": "luigi", "role": "cadetto"},
    {"id": "p3", "name": "Anna Bianchi", "email": "anna@gmail.com", "password": "anna", "role": "cadetto"},
    {"id": "p4", "name": "Sofia Neri", "email": "sofia@gmail.com", "password": "sofia", "role": "cadetto"},
    {"id": "p5", "name": "Luca Gialli", "email": "luca@gmail.com", "password": "luca", "role": "cadetto"},
    {"id": "p6", "name": "Elena Viola", "email": "elena@gmail.com", "password": "elena", "role": "cadetto"},
    {"id": "p7", "name": "Marco Bruno", "email": "marco@gmail.com", "password": "marco", "role": "cadetto"},
]

DEFAULT_TASKS = [
    {"id": "t1", "name": "Lavare i piatti", "minPeople": 2, "priority": 1, "linkedTask": "none"},
    {"id": "t2", "name": "Cucinare pranzo", "minPeople": 1, "priority": 2, "linkedTask": "none"},
    {"id": "t3", "name": "Cucinare cena", "minPeople": 2, "priority": 3, "linkedTask": "none"},
    {"id": "t4", "name": "Buttare spazzatura", "minPeople": 1, "priority": 4, "linkedTask": "none"},
    {"id": "t5", "name": "Asciugare stoviglie", "minPeople": 1, "priority": 5, "linkedTask": "t1"},
]

DEFAULT_HOUSE_PARTS = [
    {"id": "hp1", "name": "Cucina", "minPeople": 1, "priority": 1},
    {"id": "hp2", "name": "Bagno Primo Piano", "minPeople": 1, "priority": 2},
    {"id": "hp3", "name": "Bagno Secondo Piano", "minPeople": 1, "priority": 3},
    {"id": "hp4", "name": "Salotto & Corridoio", "minPeople": 1, "priority": 4},
    {"id": "hp5", "name": "Scale & Vetrate", "minPeople": 1, "priority": 5},
]

# The single shared "aspirante" viewer account: passwordless login, read-only
# access to the Settembre tab only. There must only ever be one of these -
# see savePerson() in app.js.
ASPIRANTE_VIEWER = {
    "id": "aspirante-default",
    "name": "Aspirante",
    "email": "aspirante@settembre.local",
    "password": "",
    "role": "aspirante",
}

# Fixed 16-slot roster (13 "U" + 3 "F") backing the Settembre shower-shift
# table. Slot ids/genders never change (the shower schedule grid is fixed);
# only "name" is editable by an admin.
DEFAULT_SETTEMBRE_ASPIRANTI = (
    [{"id": f"u{i}", "slot": f"U{i}", "gender": "U", "name": f"Aspirante U{i}"} for i in range(1, 14)]
    + [{"id": f"f{i}", "slot": f"F{i}", "gender": "F", "name": f"Aspirante F{i}"} for i in range(1, 4)]
)

DEFAULT_SETTEMBRE_TASKS = []

DEFAULT_SETTEMBRE_HOUSE_PARTS = []

DEFAULTS = {
    "people": DEFAULT_PEOPLE,
    "tasks": DEFAULT_TASKS,
    "houseParts": DEFAULT_HOUSE_PARTS,
    "settembreAspiranti": DEFAULT_SETTEMBRE_ASPIRANTI,
    "settembreTasks": DEFAULT_SETTEMBRE_TASKS,
    "settembreHouseParts": DEFAULT_SETTEMBRE_HOUSE_PARTS,
}

VALID_KEYS = {
    "people",
    "tasks",
    "houseParts",
    "calendar",
    "settembreAspiranti",
    "settembreTasks",
    "settembreHouseParts",
    "settembreCalendar",
}


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS app_state ("
            "key TEXT PRIMARY KEY, "
            "value TEXT NOT NULL"
            ")"
        )
        existing_keys = {row["key"] for row in conn.execute("SELECT key FROM app_state")}
        for key, default_value in DEFAULTS.items():
            if key not in existing_keys:
                conn.execute(
                    "INSERT INTO app_state (key, value) VALUES (?, ?)",
                    (key, json.dumps(default_value)),
                )
        conn.commit()

        # "people" may already have existed before the "aspirante" role was
        # introduced, so DEFAULTS above never gets a chance to seed the
        # shared viewer account for those pre-existing databases. Make sure
        # it's always present, appending it if missing.
        row = conn.execute("SELECT value FROM app_state WHERE key = 'people'").fetchone()
        people = json.loads(row["value"]) if row else []
        if not any(p.get("role") == "aspirante" for p in people):
            people.append(ASPIRANTE_VIEWER)
            conn.execute(
                "INSERT INTO app_state (key, value) VALUES ('people', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (json.dumps(people),),
            )
        conn.commit()
    finally:
        conn.close()


def get_all_state():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT key, value FROM app_state").fetchall()
        data = {row["key"]: json.loads(row["value"]) for row in rows}
    finally:
        conn.close()
    return {
        "people": data.get("people", []),
        "tasks": data.get("tasks", []),
        "houseParts": data.get("houseParts", []),
        "calendar": data.get("calendar"),
        "settembreAspiranti": data.get("settembreAspiranti", []),
        "settembreTasks": data.get("settembreTasks", []),
        "settembreHouseParts": data.get("settembreHouseParts", []),
        "settembreCalendar": data.get("settembreCalendar"),
    }


def set_state(key, value):
    if key not in VALID_KEYS:
        raise ValueError(f"Invalid state key: {key}")
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO app_state (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value)),
        )
        conn.commit()
    finally:
        conn.close()
