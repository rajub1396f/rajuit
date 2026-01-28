// Add this to your server.js - Enhanced Login/Register with JWT Tokens

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Generate JWT Token
function generateToken(userId, email) {
  return jwt.sign(
    { userId, email, timestamp: Date.now() },
    process.env.JWT_SECRET || "your-secret-key-change-this",
    { expiresIn: "30d" }
  );
}

// Save token to database
async function saveToken(userId, token) {
  try {
    await sql`
      INSERT INTO user_tokens (user_id, token, token_type, expires_at)
      VALUES (
        ${userId},
        ${token},
        'bearer',
        NOW() + INTERVAL '30 days'
      )
      ON CONFLICT (token) DO UPDATE SET last_used_at = NOW()
    `;
    return true;
  } catch (error) {
    console.error("Error saving token:", error);
    return false;
  }
}

// Enhanced Register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if email exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `;
    
    if (existing && existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await sql`
      INSERT INTO users (name, email, password, is_active)
      VALUES (${name}, ${email}, ${hashedPassword}, true)
      RETURNING id, name, email, is_admin
    `;

    const user = result[0];
    const token = generateToken(user.id, user.email);
    await saveToken(user.id, token);

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
      },
      token: token,
      token_type: "bearer",
      expires_in: 2592000, // 30 days in seconds
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Enhanced Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Find user
    const users = await sql`
      SELECT id, name, email, password, is_admin FROM users WHERE email = ${email} LIMIT 1
    `;

    if (!users || users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // Check password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user.id, user.email);
    await saveToken(user.id, token);

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
      },
      token: token,
      token_type: "bearer",
      expires_in: 2592000, // 30 days in seconds
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Middleware to verify token
async function verifyTokenMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.slice(7);

    // Verify token in database
    const tokenData = await sql`
      SELECT user_id, expires_at FROM user_tokens
      WHERE token = ${token} AND is_active = true
      AND expires_at > NOW()
      LIMIT 1
    `;

    if (!tokenData || tokenData.length === 0) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Update last used time
    await sql`
      UPDATE user_tokens SET last_used_at = NOW()
      WHERE token = ${token}
    `;

    // Verify JWT signature
    jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-this");

    req.userId = tokenData[0].user_id;
    req.token = token;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
}

// Protected endpoint example - Get user profile
app.get("/api/user/profile", verifyTokenMiddleware, async (req, res) => {
  try {
    const user = await sql`
      SELECT id, name, email, phone, address, is_admin
      FROM users WHERE id = ${req.userId} LIMIT 1
    `;

    if (!user || user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user[0]);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
});

// Logout endpoint - Invalidate token
app.post("/api/logout", verifyTokenMiddleware, async (req, res) => {
  try {
    await sql`
      UPDATE user_tokens SET is_active = false
      WHERE token = ${req.token}
    `;

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

// Refresh token endpoint
app.post("/api/refresh-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }

    // Verify token exists in database
    const tokenData = await sql`
      SELECT user_id, expires_at FROM user_tokens
      WHERE token = ${token} AND is_active = true
      LIMIT 1
    `;

    if (!tokenData || tokenData.length === 0) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-this");

    // Generate new token
    const newToken = generateToken(decoded.userId, decoded.email);
    await saveToken(decoded.userId, newToken);

    // Invalidate old token
    await sql`
      UPDATE user_tokens SET is_active = false WHERE token = ${token}
    `;

    res.json({
      token: newToken,
      token_type: "bearer",
      expires_in: 2592000,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ message: "Token refresh failed" });
  }
});
