"""Username/password + Google auth, JWT, token blacklist."""
from __future__ import annotations

import datetime as dt
import re
import secrets
import uuid

import bcrypt
import jwt
import pymysql
import requests
from flask import Blueprint, current_app, jsonify, request

from database import get_db

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(pw: str, pw_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), pw_hash.encode("utf-8"))
    except Exception:
        return False


def _user_public(row: dict) -> dict:
    if not row:
        return {}
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "full_name": row.get("full_name") or "",
        "phone": row.get("phone") or "",
        "state": row.get("state") or "",
        "district": row.get("district") or "",
        "village": row.get("village") or "",
        "lat": float(row["lat"]) if row.get("lat") is not None else None,
        "lng": float(row["lng"]) if row.get("lng") is not None else None,
        "main_crop": row.get("main_crop") or "",
        "land_acres": float(row["land_acres"]) if row.get("land_acres") is not None else None,
        "has_irrigation": bool(row.get("has_irrigation")),
        "preferred_language": row.get("preferred_language") or "hi",
        "ui_mode": row.get("ui_mode") or "smart",
        "theme": row.get("theme") or "light",
        "profile_pic": row.get("profile_pic") or "",
        "created_at": str(row.get("created_at") or ""),
        "last_login": str(row.get("last_login") or ""),
    }


def _profile_redirect(row: dict) -> str:
    if not row.get("state") or not str(row.get("state")).strip():
        return "profile-setup"
    if not row.get("district") or not str(row.get("district")).strip():
        return "profile-setup"
    return "dashboard"


def _issue_token(user_id: int) -> tuple[str, str]:
    jti = str(uuid.uuid4())
    days = int(current_app.config.get("JWT_EXPIRY_DAYS", 30))
    exp = dt.datetime.utcnow() + dt.timedelta(days=days)
    payload = {
        "uid": user_id,
        "jti": jti,
        "exp": exp,
        "iat": dt.datetime.utcnow(),
    }
    token = jwt.encode(
        payload,
        current_app.config["JWT_SECRET"],
        algorithm=current_app.config["JWT_ALGORITHM"],
    )
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token, jti


def _is_jti_revoked(jti: str) -> bool:
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT 1 FROM revoked_tokens WHERE jti = %s LIMIT 1",
        (jti,),
    )
    row = cur.fetchone()
    cur.close()
    return row is not None


def decode_token_payload() -> dict | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            current_app.config["JWT_SECRET"],
            algorithms=[current_app.config["JWT_ALGORITHM"]],
        )
    except jwt.PyJWTError:
        return None
    jti = payload.get("jti")
    if jti and _is_jti_revoked(jti):
        return None
    return payload


def current_user_row() -> dict | None:
    payload = decode_token_payload()
    if not payload or "uid" not in payload:
        return None
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT * FROM users WHERE id = %s AND is_active = TRUE",
        (int(payload["uid"]),),
    )
    row = cur.fetchone()
    cur.close()
    return row


@auth_bp.route("/check-username", methods=["GET"])
def check_username():
    u = (request.args.get("username") or "").strip()
    if len(u) < 3:
        return jsonify({"available": False, "message": "Username too short."}), 200
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM users WHERE username = %s LIMIT 1", (u,))
    taken = cur.fetchone() is not None
    cur.close()
    return jsonify({"available": not taken, "username": u}), 200


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()
    phone = (data.get("phone") or "").strip()

    if len(username) < 3 or len(username) > 50:
        return jsonify({"success": False, "error": "Username must be 3–50 characters."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"success": False, "error": "Valid email required."}), 400
    if len(password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters."}), 400

    pw_hash = _hash_password(password)
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO users (username, email, password_hash, full_name, phone)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (username, email, pw_hash, full_name or None, phone or None),
        )
        uid = cur.lastrowid
        db.commit()
        cur.close()
    except pymysql.err.IntegrityError as exc:
        db.rollback()
        msg = str(exc)
        if "username" in msg.lower():
            return jsonify({"success": False, "error": "Username already taken."}), 409
        return jsonify({"success": False, "error": "Email already registered."}), 409

    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (uid,))
    row = cur.fetchone()
    cur.close()
    token, _ = _issue_token(uid)
    return (
        jsonify(
            {
                "success": True,
                "token": token,
                "user": _user_public(row),
                "redirect_to": _profile_redirect(row),
            }
        ),
        201,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username_or_email = (data.get("username_or_email") or data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username_or_email or not password:
        return jsonify({"success": False, "error": "Username/email and password required."}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT * FROM users WHERE username = %s OR email = %s LIMIT 1
        """,
        (username_or_email, username_or_email.lower()),
    )
    row = cur.fetchone()
    cur.close()
    if not row or not row.get("is_active", True):
        return jsonify({"success": False, "error": "Invalid credentials."}), 401
    if not _check_password(password, row["password_hash"]):
        return jsonify({"success": False, "error": "Invalid credentials."}), 401

    cur = db.cursor()
    cur.execute(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s",
        (row["id"],),
    )
    db.commit()
    cur.close()

    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (row["id"],))
    row = cur.fetchone()
    cur.close()

    token, _ = _issue_token(row["id"])
    return (
        jsonify(
            {
                "success": True,
                "token": token,
                "user": _user_public(row),
                "redirect_to": _profile_redirect(row),
            }
        ),
        200,
    )


@auth_bp.route("/google", methods=["POST"])
def google_auth():
    data = request.get_json(silent=True) or {}
    id_token = (data.get("google_token") or data.get("id_token") or "").strip()
    if not id_token:
        return jsonify({"success": False, "error": "google_token required."}), 400
    try:
        r = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=15,
        )
        info = r.json()
        if r.status_code != 200 or "email" not in info:
            return jsonify({"success": False, "error": "Invalid Google token."}), 401
        email = (info.get("email") or "").lower()
        sub = info.get("sub") or ""
        name = (info.get("name") or "").strip()
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 502

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s LIMIT 1", (email,))
    row = cur.fetchone()
    if row:
        uid = row["id"]
    else:
        base = email.split("@")[0][:20] or "farmer"
        username = base
        suffix = 0
        while True:
            cur.execute("SELECT id FROM users WHERE username = %s LIMIT 1", (username,))
            if not cur.fetchone():
                break
            suffix += 1
            username = f"{base}_{suffix}"
        dummy_pw = _hash_password(secrets.token_urlsafe(32))
        cur.execute(
            """
            INSERT INTO users (username, email, password_hash, full_name)
            VALUES (%s, %s, %s, %s)
            """,
            (username, email, dummy_pw, name or None),
        )
        uid = cur.lastrowid
        db.commit()
    cur.close()

    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (uid,))
    row = cur.fetchone()
    cur.execute(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s",
        (uid,),
    )
    db.commit()
    cur.close()

    token, _ = _issue_token(uid)
    return (
        jsonify(
            {
                "success": True,
                "token": token,
                "user": _user_public(row),
                "redirect_to": _profile_redirect(row),
            }
        ),
        200,
    )


@auth_bp.route("/me", methods=["GET"])
def me():
    row = current_user_row()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    return jsonify({"success": True, "user": _user_public(row)}), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    payload = decode_token_payload()
    if not payload:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    jti = payload.get("jti")
    exp_ts = payload.get("exp")
    if not jti:
        return jsonify({"success": True}), 200
    if isinstance(exp_ts, (int, float)):
        expires_at = dt.datetime.utcfromtimestamp(exp_ts)
    else:
        expires_at = dt.datetime.utcnow() + dt.timedelta(days=31)
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute(
            "INSERT IGNORE INTO revoked_tokens (jti, expires_at) VALUES (%s, %s)",
            (jti, expires_at),
        )
        db.commit()
        cur.close()
    except Exception:
        db.rollback()
    return jsonify({"success": True}), 200


@auth_bp.route("/change-password", methods=["PUT"])
def change_password():
    row = current_user_row()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    data = request.get_json(silent=True) or {}
    old_p = data.get("old_password") or ""
    new_p = data.get("new_password") or ""
    if len(new_p) < 8:
        return jsonify({"success": False, "error": "New password must be at least 8 characters."}), 400
    if not _check_password(old_p, row["password_hash"]):
        return jsonify({"success": False, "error": "Old password incorrect."}), 400
    new_hash = _hash_password(new_p)
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (new_hash, row["id"]),
    )
    db.commit()
    cur.close()
    return jsonify({"success": True}), 200
