"""Profile management — update, delete, image upload, password change."""
from __future__ import annotations

import os
from pathlib import Path
from werkzeug.utils import secure_filename

from flask import Blueprint, current_app, jsonify, request
from database import get_db
from routes.auth import current_user_row, _hash_password, _check_password

profile_bp = Blueprint("profile", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@profile_bp.route("/update", methods=["PUT"])
def update_profile():
    row = current_user_row()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    
    body = request.get_json(silent=True) or {}
    
    fields = []
    values = []
    mapping = {
        "name": "full_name",
        "phone": "phone",
        "state": "state",
        "district": "district",
        "crop": "main_crop",
        "acres": "land_acres",
    }
    
    for key, col in mapping.items():
        if key not in body:
            continue
        val = body[key]
        if key == "acres" and val is not None and val != "":
            try:
                val = float(val)
            except (TypeError, ValueError):
                continue
        fields.append(f"{col} = %s")
        values.append(val)
    
    if not fields:
        return jsonify({"success": True, "message": "No changes."}), 200
    
    values.append(row["id"])
    sql = "UPDATE users SET " + ", ".join(fields) + " WHERE id = %s"
    db = get_db()
    cur = db.cursor()
    cur.execute(sql, tuple(values))
    db.commit()
    cur.close()
    
    # Return updated user
    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (row["id"],))
    updated = cur.fetchone()
    cur.close()
    
    return jsonify({
        "success": True,
        "user": {
            "id": updated["id"],
            "username": updated["username"],
            "email": updated["email"],
            "full_name": updated.get("full_name") or "",
            "phone": updated.get("phone") or "",
            "state": updated.get("state") or "",
            "district": updated.get("district") or "",
            "main_crop": updated.get("main_crop") or "",
            "land_acres": float(updated["land_acres"]) if updated.get("land_acres") is not None else None,
            "profile_pic": updated.get("profile_pic") or "",
        }
    }), 200


@profile_bp.route("/delete", methods=["DELETE"])
def delete_profile():
    row = current_user_row()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    
    db = get_db()
    cur = db.cursor()
    
    # Delete user (cascades will handle related data)
    cur.execute("DELETE FROM users WHERE id = %s", (row["id"],))
    db.commit()
    cur.close()
    
    return jsonify({"success": True, "message": "Account deleted."}), 200


@profile_bp.route("/upload-image", methods=["POST"])
def upload_image():
    row = current_user_row()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file provided."}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected."}), 400
    
    if not _allowed_file(file.filename):
        return jsonify({"success": False, "error": "Invalid file type. Use PNG, JPG, JPEG, GIF, or WEBP."}), 400
    
    # Create profile directory
    upload_dir = Path(current_app.config["UPLOAD_FOLDER"]) / "profile"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    filename = secure_filename(f"user_{row['id']}_{file.filename}")
    filepath = upload_dir / filename
    file.save(str(filepath))
    
    # Update DB
    relative_path = f"profile/{filename}"
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "UPDATE users SET profile_pic = %s WHERE id = %s",
        (relative_path, row["id"])
    )
    db.commit()
    cur.close()
    
    image_url = f"/uploads/{relative_path}"
    return jsonify({"success": True, "image_url": image_url}), 200


@profile_bp.route("/change-password", methods=["POST"])
def change_password():
    row = current_user_row()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    
    data = request.get_json(silent=True) or {}
    old_password = data.get("old_password") or ""
    new_password = data.get("new_password") or ""
    confirm_password = data.get("confirm_password") or ""
    
    if len(new_password) < 8:
        return jsonify({"success": False, "error": "New password must be at least 8 characters."}), 400
    
    if new_password != confirm_password:
        return jsonify({"success": False, "error": "Passwords do not match."}), 400
    
    if not _check_password(old_password, row["password_hash"]):
        return jsonify({"success": False, "error": "Old password is incorrect."}), 400
    
    new_hash = _hash_password(new_password)
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (new_hash, row["id"])
    )
    db.commit()
    cur.close()
    
    return jsonify({"success": True, "message": "Password changed successfully."}), 200
