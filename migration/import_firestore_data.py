"""One-off import of data exported from Firestore into the new SQLite DB.

Usage:
    python migration/import_firestore_data.py firestore-export.json

The input file is the firestore-export.json downloaded by
export_firestore_data.html, shaped as:
    {"people": [...], "tasks": [...], "houseParts": [...], "calendar": {...}}
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import db  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export_file", help="Path to firestore-export.json")
    args = parser.parse_args()

    # utf-8-sig transparently strips a BOM if present (e.g. added by Notepad
    # on Windows), while still reading plain UTF-8 files with no BOM fine.
    with open(args.export_file, "r", encoding="utf-8-sig") as f:
        data = json.load(f)

    db.init_db()

    imported = []
    for key in db.VALID_KEYS:
        value = data.get(key)
        if value is None:
            continue
        db.set_state(key, value)
        imported.append(key)

    print(f"Importate {len(imported)} chiavi in {db.DB_PATH}: {', '.join(imported)}")


if __name__ == "__main__":
    main()
