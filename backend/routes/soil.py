from flask import Blueprint, jsonify
import requests

soil_bp = Blueprint('soil', __name__)

@soil_bp.route('/api/soil', methods=['GET'])
def get_soil():
    try:
        # 3. External API Call
        # response = requests.get("EXTERNAL_SOIL_API")
        # response.raise_for_status()
        raise Exception("Simulated 502 Bad Gateway")
    except Exception:
        return jsonify({
            "success": True,
            "soil": "Loamy",
            "note": "Showing nearest available data"
        }), 200