"""Flask backend for CleanSchedule.

Serves the static frontend (index.html, app.js, style.css, images/) and a
small REST API under /api/state that replaces the old Firebase Firestore
storage with a local SQLite database (see db.py).
"""
import os

from flask import Flask, jsonify, request, send_from_directory

import db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
db.init_db()


@app.route("/api/state", methods=["GET"])
def get_state():
    return jsonify(db.get_all_state())


@app.route("/api/state/<key>", methods=["PUT"])
def put_state(key):
    if key not in db.VALID_KEYS:
        return jsonify({"error": "invalid key"}), 400
    payload = request.get_json(silent=True) or {}
    if "value" not in payload:
        return jsonify({"error": "missing value"}), 400
    db.set_state(key, payload["value"])
    return jsonify({"ok": True})


@app.route("/")
def serve_index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(BASE_DIR, filename)


if __name__ == "__main__":
    app.run(debug=True)
