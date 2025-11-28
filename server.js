const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'project'))); // folder name

// SESSION SETUP (localhost)
app.use(session({
    secret: process.env.SESSION_SECRET || "yoursecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
    }
}));

const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.NEON_DB);

// Test connection
(async () => {
  try {
    await sql`SELECT 1`;
    console.log("✅ Connected to Neon DB!");
  } catch (err) {
    console.error("❌ Neon DB connection error:", err);
  }
})();

// Register Route
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmpassword, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (password !== confirmpassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check if email exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing && existing.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await sql`
      INSERT INTO users (name, email, password, phone)
      VALUES (${name}, ${email}, ${hashedPassword}, ${phone})
      RETURNING id, name, email, phone;
    `;

    const inserted = result[0] || null;

    res.status(201).json({
      message: "User registered successfully",
      user: inserted
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const userRows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;

    if (!userRows || userRows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const storedUser = userRows[0];

    const isMatch = await bcrypt.compare(password, storedUser.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const payload = {
      id: storedUser.id,
      name: storedUser.name,
      phone: storedUser.phone,
      address: storedUser.address,
      email: storedUser.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || "SECRET_KEY", { expiresIn: "2d" });

    // set session for legacy session-based checks
    req.session.user = { id: storedUser.id, name: storedUser.name, email: storedUser.email };

    return res.json({
      success: true,
      token,
      user: { id: storedUser.id, name: storedUser.name, email: storedUser.email },
      redirect: "/dashboard.html"
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// check-login route (used by client to detect session-based login)
app.get("/check-login", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  return res.json({ loggedIn: false });
});

// Verify token middleware (accepts JWT or session)
function verifyToken(req, res, next) {
  const header = req.headers["authorization"];
  const token = header?.split(" ")[1];  // ✅ Correct split

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY", (err, decoded) => {
      if (err) return res.status(401).json({ message: "Invalid token" });
      req.user = decoded;
      next();
    });
  } else if (req.session && req.session.user) {
    req.user = req.session.user;
    next();
  } else {
    return res.status(403).json({ message: "No token provided" });
  }
}

// New middleware: Check auth for HTML file serving (uses session OR token)
function authCheckHTML(req, res, next) {
  const header = req.headers["authorization"];
  const token = header?.split(" ")[1];
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY", (err, decoded) => {
      if (err) return res.redirect("/");
      req.user = decoded;
      next();
    });
  } else if (req.session && req.session.user) {
    req.user = req.session.user;
    next();
  } else {
    return res.redirect("/");
  }
}

// Serve dashboard.html ONLY if authenticated
app.get("/dashboard.html", (req, res) => {
  const header = req.headers["authorization"];
  const token = header?.split(" ")[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY", (err, decoded) => {
      if (err) return res.redirect("/");
      return res.sendFile(path.join(__dirname, "dashboard.html"));
    });
  } else if (req.session && req.session.user) {
    return res.sendFile(path.join(__dirname, "dashboard.html"));
  } else {
    return res.redirect("/");
  }
});

// Dashboard API (returns JSON for fetch calls)
app.get("/dashboard", verifyToken, async (req, res) => {
  if (req.user && req.user.id) {
    try {
      const userRows = await sql`SELECT id, name, email, phone, address FROM users WHERE id = ${req.user.id} LIMIT 1`;
      const user = (userRows && userRows[0]) || req.user;
      return res.json({ message: "Welcome!", user });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
  return res.json({ message: "Welcome!", user: req.user });
});

// Logout route (session)
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        // clear possible cookie; redirect to home
        res.clearCookie('connect.sid', { path: '/' });
        res.redirect("/");
    });
});

// Home route - redirect ONLY if session exists (not just any login)
app.get("/", (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard.html');
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});