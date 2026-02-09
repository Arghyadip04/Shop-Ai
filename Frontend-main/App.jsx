import React, { useState } from "react";
import {
  ShoppingBag,
  ShoppingCart,
  Sun,
  Moon,
  LogIn,
  LogOut,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

/* 🔗 BACKEND */
const API_BASE = "http://127.0.0.1:5000";

export default function App() {
  /* ================= USER ================= */
  const [userId, setUserId] = useState(
    "AG3D6O4STAQKAY2UVGEUV46KN35Q"
  );
  const [userIdError, setUserIdError] = useState("");

  /* ================= UI ================= */
  const [dark, setDark] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [quickView, setQuickView] = useState(null);

  /* ================= PRODUCTS & CART ================= */
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  /* ================= AUTH ================= */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );
  const [profileEmail, setProfileEmail] = useState(
    localStorage.getItem("email") || ""
  );

  /* ================= HELPERS ================= */
  const checkPasswordStrength = (value) => {
    if (value.length < 6) return "weak";
    if (/[A-Z]/.test(value) && /[0-9]/.test(value)) return "strong";
    return "medium";
  };

  /* ================= CART LOGIC (WITH QTY) ================= */
  const getItemQty = (name) => {
    const item = cart.find((i) => i.product_name === name);
    return item ? item.qty : 0;
  };

  const addItem = (product) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.product_name === product.product_name
      );

      if (existing) {
        return prev.map((i) =>
          i.product_name === product.product_name
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }

      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeItem = (name) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_name === name ? { ...i, qty: i.qty - 1 } : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  /* ================= AUTH ================= */
  const loginUser = async () => {
    setError("");

    if (!email || !password) {
      setError("Email and password required");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        if (rememberMe) localStorage.setItem("email", email);

        setIsLoggedIn(true);
        setProfileEmail(email);
        setShowAuth(false);
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Login failed");
    }
  };

  const signupUser = async () => {
    setError("");

    if (!email || !password) {
      setError("Email and password required");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.message) {
        setIsLogin(true);
        setError("Signup successful. Please login.");
      } else {
        setError(data.error || "Signup failed");
      }
    } catch {
      setError("Signup failed");
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setIsLoggedIn(false);
    setProfileEmail("");
  };

  /* ================= RECOMMEND ================= */
  const getRecommendations = async () => {
    setUserIdError("");
    setProducts([]);

    if (!userId || userId.length < 10) {
      setUserIdError("Invalid User ID");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setUserIdError("Server error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className={dark ? "app dark" : "app light"}>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-left">
          <ShoppingBag />
          <span>ShopAI</span>
        </div>

        <div className="nav-right">
          <button onClick={() => setDark(!dark)}>
            {dark ? <Sun /> : <Moon />}
          </button>

          {!isLoggedIn ? (
            <button onClick={() => setShowAuth(true)}>
              <LogIn />
            </button>
          ) : (
            <div className="profile">
              <span>{profileEmail}</span>
              <button onClick={logoutUser}>
                <LogOut />
              </button>
            </div>
          )}

          <div
            className={`cart-btn ${cart.length > 0 ? "has-items" : ""}`}
            onClick={() => setShowCart(true)}
          >
            <ShoppingCart />
            <span>
              {cart.reduce((sum, i) => sum + i.qty, 0)}
            </span>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <h1 className="gradient-text">ShopAI Recommendation</h1>
        <p>Enter User ID to get personalized recommendations</p>

        <div className="hero-input">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Paste User ID"
          />
          <button
            className="recommend-btn"
            onClick={getRecommendations}
          >
            Get Recommendations
          </button>
        </div>

        {userIdError && <p className="error">{userIdError}</p>}
      </section>

      {/* PRODUCTS */}
      <section className="products">
        <div className="grid">
          {loading && <p>Loading…</p>}

          {products.map((p, i) => (
            <motion.div
              key={i}
              className="card"
              whileHover={{ scale: 1.05 }}
              onClick={() => setQuickView(p)}
            >
              <img
                src={p.image}
                alt={p.product_name}
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/300x300?text=No+Image";
                }}
              />

              <h3>{p.product_name}</h3>
              <p>⭐ {p.rating}</p>

              <div className="card-footer">
                <span>₹{p.price}</span>

                {getItemQty(p.product_name) === 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(p);
                    }}
                  >
                    Add
                  </button>
                ) : (
                  <div className="qty-control">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(p.product_name);
                      }}
                    >
                      –
                    </button>
                    <span>{getItemQty(p.product_name)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(p);
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AUTH MODAL */}
      <AnimatePresence>
        {showAuth && (
          <motion.div className="modal">
            <motion.div className="modal-box">
              <button
                className="close"
                onClick={() => setShowAuth(false)}
              >
                <X />
              </button>

              <h2>{isLogin ? "Login" : "Sign Up"}</h2>

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordStrength(
                    checkPasswordStrength(e.target.value)
                  );
                }}
              />

              {password && (
                <div className={`strength ${passwordStrength}`}>
                  Password strength: {passwordStrength}
                </div>
              )}

              <div className="remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <label>Remember me</label>
              </div>

              {error && <p className="error">{error}</p>}

              <button
                className="primary"
                onClick={isLogin ? loginUser : signupUser}
              >
                {isLogin ? "Login" : "Create Account"}
              </button>

              <p
                className="switch"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin
                  ? "No account? Sign up"
                  : "Already have an account? Login"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
