"""Community posts, likes, comments — public read, auth write."""
from __future__ import annotations

import uuid
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from database import get_db
from routes.auth import current_user_row

community_bp = Blueprint("community", __name__)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_COMM = BASE_DIR / "uploads" / "community_images"


@community_bp.route("/posts", methods=["GET"])
def list_posts():
    page = max(1, int(request.args.get("page", 1)))
    limit = min(50, max(1, int(request.args.get("limit", 10))))
    state = (request.args.get("state") or "").strip()
    category = (request.args.get("category") or "").strip()
    offset = (page - 1) * limit

    where = ["1=1"]
    params: list = []
    if state:
        where.append("p.state = %s")
        params.append(state)
    if category:
        where.append("p.category = %s")
        params.append(category)

    wclause = " AND ".join(where)
    sql = f"""
        SELECT p.*, u.username, u.full_name,
          (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS comment_count
        FROM community_posts p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE {wclause}
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
    """
    page_params = list(params) + [limit, offset]

    db = get_db()
    cur = db.cursor()
    cur.execute(sql, tuple(page_params))
    rows = cur.fetchall()
    cur.execute(f"SELECT COUNT(*) AS c FROM community_posts p WHERE {wclause}", tuple(params))
    total_row = cur.fetchone()
    cur.close()
    total = total_row["c"] if total_row else 0

    posts = []
    for r in rows:
        posts.append(
            {
                "id": r["id"],
                "title": r.get("title"),
                "content": r.get("content"),
                "category": r.get("category"),
                "image_path": r.get("image_path"),
                "likes": r.get("likes") or 0,
                "state": r.get("state"),
                "district": r.get("district"),
                "language": r.get("language"),
                "created_at": str(r.get("created_at") or ""),
                "author": {
                    "username": r.get("username"),
                    "full_name": r.get("full_name"),
                },
                "comment_count": r.get("comment_count") or 0,
            }
        )

    return jsonify({"success": True, "posts": posts, "page": page, "limit": limit, "total": total}), 200


@community_bp.route("/posts", methods=["POST"])
def create_post():
    user = current_user_row()
    if not user:
        return jsonify({"success": False, "error": "Unauthorized."}), 401

    title = ""
    content = ""
    category = "general"
    image_path = None

    if request.content_type and "multipart/form-data" in request.content_type:
        title = (request.form.get("title") or "").strip()
        content = (request.form.get("content") or "").strip()
        category = (request.form.get("category") or "general").strip()
        f = request.files.get("image")
        if f and f.filename:
            UPLOAD_COMM.mkdir(parents=True, exist_ok=True)
            ext = Path(f.filename).suffix[:8] or ".jpg"
            name = f"{uuid.uuid4().hex}{ext}"
            dest = UPLOAD_COMM / name
            f.save(str(dest))
            image_path = f"community_images/{name}"
    else:
        body = request.get_json(silent=True) or {}
        title = (body.get("title") or "").strip()
        content = (body.get("content") or "").strip()
        category = (body.get("category") or "general").strip()

    if not title or not content:
        return jsonify({"success": False, "error": "title and content required."}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        INSERT INTO community_posts (user_id, title, content, category, image_path, state, district, language)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user["id"],
            title,
            content,
            category,
            image_path,
            user.get("state"),
            user.get("district"),
            user.get("preferred_language") or "hi",
        ),
    )
    pid = cur.lastrowid
    db.commit()
    cur.close()
    return jsonify({"success": True, "id": pid}), 201


@community_bp.route("/posts/<int:post_id>/like", methods=["POST"])
def toggle_like(post_id: int):
    user = current_user_row()
    if not user:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, likes FROM community_posts WHERE id = %s", (post_id,))
    post = cur.fetchone()
    if not post:
        cur.close()
        return jsonify({"success": False, "error": "Post not found."}), 404
    cur.execute(
        "SELECT 1 FROM post_likes WHERE post_id = %s AND user_id = %s",
        (post_id, user["id"]),
    )
    liked = cur.fetchone() is not None
    if liked:
        cur.execute(
            "DELETE FROM post_likes WHERE post_id = %s AND user_id = %s",
            (post_id, user["id"]),
        )
        new_likes = max(0, (post["likes"] or 0) - 1)
    else:
        cur.execute(
            "INSERT INTO post_likes (post_id, user_id) VALUES (%s, %s)",
            (post_id, user["id"]),
        )
        new_likes = (post["likes"] or 0) + 1
    cur.execute(
        "UPDATE community_posts SET likes = %s WHERE id = %s",
        (new_likes, post_id),
    )
    db.commit()
    cur.close()
    return jsonify({"success": True, "likes": new_likes, "liked": not liked}), 200


@community_bp.route("/posts/<int:post_id>/comments", methods=["GET"])
def list_comments(post_id: int):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT c.*, u.username, u.full_name
        FROM post_comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.post_id = %s
        ORDER BY c.created_at ASC
        """,
        (post_id,),
    )
    rows = cur.fetchall()
    cur.close()
    out = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "post_id": r["post_id"],
                "user_id": r["user_id"],
                "comment": r.get("comment"),
                "created_at": str(r.get("created_at") or ""),
                "username": r.get("username"),
                "full_name": r.get("full_name"),
            }
        )
    return jsonify({"success": True, "comments": out}), 200


@community_bp.route("/posts/<int:post_id>/comments", methods=["POST"])
def add_comment(post_id: int):
    user = current_user_row()
    if not user:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    body = request.get_json(silent=True) or {}
    text = (body.get("comment") or "").strip()
    if not text:
        return jsonify({"success": False, "error": "comment required."}), 400
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM community_posts WHERE id = %s", (post_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"success": False, "error": "Post not found."}), 404
    cur.execute(
        "INSERT INTO post_comments (post_id, user_id, comment) VALUES (%s, %s, %s)",
        (post_id, user["id"], text),
    )
    cid = cur.lastrowid
    db.commit()
    cur.close()
    return jsonify({"success": True, "id": cid}), 201
