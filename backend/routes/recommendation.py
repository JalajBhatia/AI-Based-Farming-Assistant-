"""AI-based Crop Recommendation and Profit Prediction System."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from database import get_db
from routes.auth import current_user_row

recommendation_bp = Blueprint("recommendation", __name__)

# Crop database with characteristics
CROP_DATABASE = {
    "Wheat": {
        "soil": ["loamy", "clay"],
        "season": ["rabi"],
        "water": ["low", "medium"],
        "yield_per_acre": 20,
        "cost_per_acre": 15000,
        "base_price": 2200,
        "description": "Stable returns with moderate water requirement"
    },
    "Rice": {
        "soil": ["clay", "loamy"],
        "season": ["kharif"],
        "water": ["high"],
        "yield_per_acre": 25,
        "cost_per_acre": 20000,
        "base_price": 2000,
        "description": "High yield crop requiring abundant water"
    },
    "Maize": {
        "soil": ["loamy", "sandy"],
        "season": ["kharif", "rabi"],
        "water": ["medium"],
        "yield_per_acre": 18,
        "cost_per_acre": 12000,
        "base_price": 1800,
        "description": "Versatile crop with good market demand"
    },
    "Cotton": {
        "soil": ["clay", "loamy"],
        "season": ["kharif"],
        "water": ["medium", "high"],
        "yield_per_acre": 15,
        "cost_per_acre": 18000,
        "base_price": 5500,
        "description": "High value cash crop with good returns"
    },
    "Sugarcane": {
        "soil": ["loamy", "clay"],
        "season": ["kharif"],
        "water": ["high"],
        "yield_per_acre": 300,
        "cost_per_acre": 35000,
        "base_price": 350,
        "description": "Long duration crop with consistent demand"
    },
    "Potato": {
        "soil": ["loamy", "sandy"],
        "season": ["rabi"],
        "water": ["medium"],
        "yield_per_acre": 80,
        "cost_per_acre": 25000,
        "base_price": 1200,
        "description": "Short duration crop with quick returns"
    },
    "Onion": {
        "soil": ["loamy", "sandy"],
        "season": ["rabi", "kharif"],
        "water": ["medium"],
        "yield_per_acre": 100,
        "cost_per_acre": 20000,
        "base_price": 1500,
        "description": "High demand vegetable with good profit margins"
    },
    "Tomato": {
        "soil": ["loamy", "sandy"],
        "season": ["rabi", "kharif"],
        "water": ["medium", "high"],
        "yield_per_acre": 120,
        "cost_per_acre": 22000,
        "base_price": 1800,
        "description": "High value vegetable with year-round demand"
    },
    "Mustard": {
        "soil": ["loamy", "clay"],
        "season": ["rabi"],
        "water": ["low", "medium"],
        "yield_per_acre": 12,
        "cost_per_acre": 10000,
        "base_price": 4500,
        "description": "Oilseed crop with good market price"
    },
    "Soybean": {
        "soil": ["loamy", "clay"],
        "season": ["kharif"],
        "water": ["medium"],
        "yield_per_acre": 15,
        "cost_per_acre": 14000,
        "base_price": 3800,
        "description": "Protein-rich crop with stable demand"
    },
    "Groundnut": {
        "soil": ["sandy", "loamy"],
        "season": ["kharif", "rabi"],
        "water": ["low", "medium"],
        "yield_per_acre": 18,
        "cost_per_acre": 16000,
        "base_price": 5000,
        "description": "Oilseed crop suitable for dry regions"
    },
    "Bajra": {
        "soil": ["sandy", "loamy"],
        "season": ["kharif"],
        "water": ["low"],
        "yield_per_acre": 12,
        "cost_per_acre": 8000,
        "base_price": 1800,
        "description": "Drought-resistant crop for arid regions"
    }
}


def calculate_suitability_score(crop_data: dict, soil: str, season: str, water: str) -> float:
    """Calculate how suitable a crop is based on input conditions."""
    score = 0.0
    
    # Soil match (40% weight)
    if soil.lower() in crop_data["soil"]:
        score += 40
    
    # Season match (40% weight)
    if season.lower() in crop_data["season"]:
        score += 40
    
    # Water match (20% weight)
    if water.lower() in crop_data["water"]:
        score += 20
    
    return score


def get_market_price(crop: str, state: str) -> float:
    """Get current market price from mandi data or use base price."""
    try:
        from routes.mandi import build_mandi_payload
        
        # Try to get real market price
        mandi_data = build_mandi_payload(crop, state)
        if mandi_data.get("best_mandi") and mandi_data["best_mandi"].get("modal_price"):
            return float(mandi_data["best_mandi"]["modal_price"])
    except Exception:
        pass
    
    # Fallback to base price
    return CROP_DATABASE[crop]["base_price"]


def calculate_profit(crop: str, state: str) -> dict:
    """Calculate profit for a crop."""
    crop_data = CROP_DATABASE[crop]
    
    # Get market price
    market_price = get_market_price(crop, state)
    
    # Calculate revenue
    yield_per_acre = crop_data["yield_per_acre"]
    revenue = yield_per_acre * market_price
    
    # Calculate profit
    cost = crop_data["cost_per_acre"]
    profit = revenue - cost
    
    return {
        "crop": crop,
        "yield_per_acre": yield_per_acre,
        "market_price": round(market_price, 2),
        "cost": cost,
        "revenue": round(revenue, 2),
        "profit": round(profit, 2),
        "description": crop_data["description"],
        "roi": round((profit / cost) * 100, 2) if cost > 0 else 0
    }


def generate_ai_advice(recommendations: list, soil: str, season: str, water: str) -> str:
    """Generate AI-based advice for the farmer."""
    if not recommendations:
        return "No suitable crops found for the given conditions. Please adjust your inputs."
    
    best_crop = recommendations[0]
    crop_name = best_crop["crop"]
    profit = best_crop["profit"]
    
    advice = f"{crop_name} is best suited for your farm conditions. "
    
    # Add soil-specific advice
    if soil.lower() == "loamy":
        advice += "Your loamy soil provides excellent drainage and nutrient retention. "
    elif soil.lower() == "clay":
        advice += "Your clay soil retains water well, ideal for water-intensive crops. "
    elif soil.lower() == "sandy":
        advice += "Your sandy soil drains quickly, suitable for drought-resistant crops. "
    
    # Add season-specific advice
    if season.lower() == "kharif":
        advice += "Kharif season (monsoon) provides natural irrigation. "
    elif season.lower() == "rabi":
        advice += "Rabi season (winter) offers cooler temperatures for crop growth. "
    elif season.lower() == "zaid":
        advice += "Zaid season (summer) requires careful water management. "
    
    # Add profit advice
    if profit > 30000:
        advice += f"Expected profit of ₹{profit:,.0f} per acre makes this a highly profitable choice. "
    elif profit > 15000:
        advice += f"Expected profit of ₹{profit:,.0f} per acre provides stable returns. "
    else:
        advice += f"Expected profit of ₹{profit:,.0f} per acre is moderate but reliable. "
    
    # Add water advice
    if water.lower() == "high":
        advice += "Your high water availability supports water-intensive crops."
    elif water.lower() == "medium":
        advice += "Your moderate water availability is suitable for most crops."
    else:
        advice += "Your limited water availability requires drought-resistant varieties."
    
    return advice


@recommendation_bp.route("/recommend-crop", methods=["POST"])
def recommend_crop():
    """AI-based crop recommendation endpoint."""
    data = request.get_json(silent=True) or {}
    
    soil = data.get("soil", "").strip().lower()
    season = data.get("season", "").strip().lower()
    state = data.get("state", "").strip()
    district = data.get("district", "").strip()
    water = data.get("water", "").strip().lower()
    
    # Validate inputs
    if not soil or soil not in ["sandy", "loamy", "clay"]:
        return jsonify({"success": False, "error": "Valid soil type required (sandy, loamy, clay)."}), 400
    
    if not season or season not in ["kharif", "rabi", "zaid"]:
        return jsonify({"success": False, "error": "Valid season required (kharif, rabi, zaid)."}), 400
    
    if not water or water not in ["low", "medium", "high"]:
        return jsonify({"success": False, "error": "Valid water availability required (low, medium, high)."}), 400
    
    if not state:
        return jsonify({"success": False, "error": "State is required."}), 400
    
    # Calculate suitability scores for all crops
    crop_scores = []
    for crop_name, crop_data in CROP_DATABASE.items():
        score = calculate_suitability_score(crop_data, soil, season, water)
        if score > 0:  # Only include crops with some suitability
            crop_scores.append({
                "crop": crop_name,
                "score": score
            })
    
    # Sort by score (descending)
    crop_scores.sort(key=lambda x: x["score"], reverse=True)
    
    # Get top 3 crops
    top_crops = crop_scores[:3]
    
    # Calculate profit for each recommended crop
    recommendations = []
    for item in top_crops:
        profit_data = calculate_profit(item["crop"], state)
        profit_data["suitability_score"] = item["score"]
        recommendations.append(profit_data)
    
    # Sort by profit (descending)
    recommendations.sort(key=lambda x: x["profit"], reverse=True)
    
    # Generate AI advice
    advice = generate_ai_advice(recommendations, soil, season, water)
    
    # Prepare response
    response = {
        "success": True,
        "recommendations": recommendations,
        "ai_advice": advice,
        "input_conditions": {
            "soil": soil,
            "season": season,
            "state": state,
            "district": district,
            "water": water
        },
        "best_crop": recommendations[0]["crop"] if recommendations else None
    }
    
    return jsonify(response), 200
