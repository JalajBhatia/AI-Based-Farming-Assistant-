from flask import Blueprint, request, jsonify, current_app
import requests

mandi_bp = Blueprint("mandi", __name__)

@mandi_bp.route("/", methods=["GET"])
def get_mandi_prices():
    crop = request.args.get('crop', '').lower()
    state = request.args.get('state', '').lower()

    try:
        api_key = current_app.config.get("AGMARKNET_API_KEY", "579b464db66ec23bdd000001fafa1e8eee0a42ef7a32fedce09dbc4f")
        url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
        params = {
            "api-key": api_key,
            "format": "json",
            "limit": 500
        }
        
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        
        data = response.json().get("records", [])
        if not data:
            raise ValueError("Empty API response")
            
        # 3. Handle bad data (replace null with 0)
        for d in data:
            price = d.get("modal_price")
            if price is None:
                d["modal_price"] = 0
            else:
                try:
                    d["modal_price"] = float(price)
                except (ValueError, TypeError):
                    d["modal_price"] = 0
                    
        # 4. Flexible filtering
        filtered = []
        for d in data:
            commodity = str(d.get("commodity", "")).lower()
            state_name = str(d.get("state", "")).lower()
            
            crop_match = (crop in commodity) or (commodity in crop) if crop else True
            state_match = True if not state else (state in state_name)
            
            if crop_match and state_match:
                filtered.append(d)
                
        # 5. Fallback system if no filtered results
        note = "Real-time data fetched"
        if not filtered and len(data) > 0:
            filtered = data[:10]
            note = "Showing nearest available data"
            
        # 7 & 8. Add Insights and Smart Advice
        insights = {
            "average": 0,
            "max": 0,
            "min": 0,
            "advice": "Wait for better price"
        }
        
        if filtered:
            prices = [float(d["modal_price"]) for d in filtered if float(d.get("modal_price", 0)) > 0]
            if prices:
                avg_price = sum(prices) / len(prices)
                max_price = max(prices)
                min_price = min(prices)
                
                threshold = min_price * 1.15
                advice = "Good time to sell" if avg_price > threshold else "Wait for better price"
                
                insights = {
                    "average": round(avg_price, 2),
                    "max": round(max_price, 2),
                    "min": round(min_price, 2),
                    "advice": advice
                }
                
        # 6. Always return valid response
        return jsonify({
            "success": True,
            "data": filtered,
            "insights": insights,
            "note": note
        }), 200
        
    except Exception as e:
        # 9. Error Handling
        fallback_crop = crop.capitalize() if crop else "Wheat"
        return jsonify({
            "success": True,
            "data": [
                {"crop": fallback_crop, "price": 2100, "market": "Fallback Market", "modal_price": 2100, "commodity": fallback_crop, "state": state.capitalize() if state else "India"}
            ],
            "note": "Using fallback data",
            "insights": {
                "average": 2100,
                "max": 2100,
                "min": 2100,
                "advice": "Good time to sell"
            }
        }), 200

def build_mandi_payload(crop: str, state: str) -> dict:
    """Helper method for farmer.py dashboard fallback."""
    return {
        "best_mandi": {
            "modal_price": 2200, 
            "market": "Local Mandi", 
            "commodity": crop.capitalize() if crop else "Wheat"
        }
    }