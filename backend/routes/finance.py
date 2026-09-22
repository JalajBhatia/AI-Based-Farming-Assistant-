"""Subsidies and static scheme data."""
from __future__ import annotations

import json
from pathlib import Path

from flask import Blueprint, jsonify, request

finance_bp = Blueprint("finance", __name__)


def build_subsidies_response():
    state = request.args.get("state", "").strip()
    crop = request.args.get("crop", "").strip()
    category = request.args.get("category", "").strip()

    path = Path(__file__).resolve().parent.parent / "data" / "subsidies.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    schemes = data.get("schemes", [])

    def match(s: dict) -> bool:
        if state and s.get("states") and state not in s["states"]:
            return False
        if crop and s.get("crops") and crop not in s["crops"]:
            return False
        if category and s.get("categories") and category not in s["categories"]:
            return False
        return True

    filtered = [s for s in schemes if match(s)]
    return jsonify({"success": True, "schemes": filtered}), 200


@finance_bp.route("/subsidies", methods=["GET"])
def subsidies():
    return build_subsidies_response()
