from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token
)
from werkzeug.security import generate_password_hash, check_password_hash
import pandas as pd
import pickle
import sqlite3

# =========================
# APP SETUP
# =========================
app = Flask(__name__)
CORS(app)

# JWT CONFIG
app.config["JWT_SECRET_KEY"] = "super-secret-key"
jwt = JWTManager(app)

# =========================
# LOAD ML MODEL & DATA
# =========================
print("⏳ Loading Model...")
with open("svd_model.pkl", "rb") as f:
    model = pickle.load(f)

product_data = pd.read_pickle("product_data.pkl")
print("✅ Model Loaded!")

# =========================
# DATABASE INIT
# =========================
def init_db():
    conn = sqlite3.connect("users.db")
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

# =========================
# ROUTES
# =========================
@app.route("/")
def home():
    return "The ShopAI API is Running!"

# ---------- SIGNUP ----------
@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    hashed = generate_password_hash(password)

    try:
        conn = sqlite3.connect("users.db")
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (email, password) VALUES (?, ?)",
            (email, hashed)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "User created"})
    except sqlite3.IntegrityError:
        return jsonify({"error": "User already exists"}), 400

# ---------- LOGIN ----------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    conn = sqlite3.connect("users.db")
    cur = conn.cursor()
    cur.execute(
        "SELECT id, password FROM users WHERE email = ?",
        (email,)
    )
    user = cur.fetchone()
    conn.close()

    if not user or not check_password_hash(user[1], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=user[0])
    return jsonify({"access_token": token})

# ---------- RECOMMEND ----------
@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json
    user_id = data.get("user_id", 1)

    # get all products
    all_product_ids = product_data["product_id"].unique()
    predictions = []

    for pid in all_product_ids:
        try:
            pred = model.predict(user_id, pid)
            predictions.append((pid, pred.est))
        except Exception:
            # fallback rating if model fails
            predictions.append((pid, 3.5))

    predictions.sort(key=lambda x: x[1], reverse=True)
    top_5 = predictions[:5]

    results = []
    for pid, rating in top_5:
        item = product_data[product_data["product_id"] == pid].iloc[0]
        results.append({
            "product_name": item["product_name"],
            "image": item["img_link"],
            "price": item["discounted_price"],
            "rating": round(rating, 2)
        })

    return jsonify(results)

# =========================
# RUN SERVER
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
