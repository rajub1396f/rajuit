const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
require("dotenv").config();
const nodemailer = require("nodemailer");

const app = express();

// Middleware (CORS, JSON parsing)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// View Engine (EJS or HTML)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));



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

// ✅ Create persistent Gmail transporter (reuse across requests)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER || "rajuit1396@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD || "txcbwzsekhdciba"
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify transporter connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Gmail transporter error:", error);
    } else {
        console.log("✅ Gmail transporter ready!");
    }
});

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
    console.log("📝 Registration request received:", req.body);
    const { name, email, password, confirmpassword, phone } = req.body;

    if (!name || !email || !password) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (password !== confirmpassword) {
      console.log("❌ Passwords do not match");
      return res.status(400).json({ message: "Passwords do not match" });
    }

    console.log("🔍 Checking if email exists:", email);
    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing && existing.length > 0) {
      console.log("❌ Email already registered");
      return res.status(409).json({ message: "Email already registered" });
    }

    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("💾 Inserting user into database...");
    const result = await sql`
      INSERT INTO users (name, email, password, phone)
      VALUES (${name}, ${email}, ${hashedPassword}, ${phone})
      RETURNING id, name, email, phone;
    `;

    const inserted = result[0] || null;
    console.log("✅ User registered successfully:", inserted);

    res.status(201).json({
      message: "User registered successfully",
      user: inserted
    });

  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
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

// check-login route
app.get("/check-login", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  return res.json({ loggedIn: false });
});

// Verify token middleware
function verifyToken(req, res, next) {
  const header = req.headers["authorization"];
  const token = header?.split(" ")[1];

  console.log("🔍 Auth Header:", header); // ✅ Debug log
  console.log("🔍 Token:", token ? "Found" : "Not found");

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY", (err, decoded) => {
      if (err) {
        console.error("❌ Token verification failed:", err.message);
        return res.status(401).json({ message: "Invalid token", error: err.message });
      }
      console.log("✅ Token valid, user:", decoded.email);
      req.user = decoded;
      next();
    });
  } else if (req.session && req.session.user) {
    console.log("✅ Using session user:", req.session.user.email);
    req.user = req.session.user;
    next();
  } else {
    console.error("❌ No token or session found");
    return res.status(403).json({ message: "No token provided" });
  }
}

// ✅ PROTECTED ROUTES (BEFORE static files)
app.get("/dashboard.html", (req, res) => {
  if (req.session && req.session.user) {
    return res.sendFile(path.join(__dirname, "dashboard.html"));
  }
  
  const header = req.headers["authorization"];
  const token = header?.split(" ")[1];
  
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY", (err, decoded) => {
      if (err) return res.redirect("/");
      return res.sendFile(path.join(__dirname, "dashboard.html"));
    });
  } else {
    return res.redirect("/");
  }
});

app.get("/dashboard", verifyToken, async (req, res) => {
  if (req.user && req.user.id) {
    try {
      const userRows = await sql`SELECT id, name, email, phone, address, last_profile_edit FROM users WHERE id = ${req.user.id} LIMIT 1`;
      const user = (userRows && userRows[0]) || req.user;
      return res.json({ message: "Welcome!", user });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
  return res.json({ message: "Welcome!", user: req.user });
});

// Update Profile Route
app.post("/update-profile", verifyToken, async (req, res) => {
  try {
    console.log("📝 Update profile request received");
    console.log("Request body:", req.body);
    console.log("User from token:", req.user);
    
    const userId = req.user?.id;
    const { name, phone, address } = req.body;

    if (!userId) {
      console.log("❌ No user ID found");
      return res.status(401).json({ message: "User not authenticated" });
    }

    console.log("📝 Updating profile for user:", userId);

    // Check last edit date
    const userRows = await sql`SELECT last_profile_edit FROM users WHERE id = ${userId} LIMIT 1`;
    
    if (userRows && userRows[0] && userRows[0].last_profile_edit) {
      const lastEdit = new Date(userRows[0].last_profile_edit);
      const now = new Date();
      const daysSinceEdit = Math.floor((now - lastEdit) / (1000 * 60 * 60 * 24));
      
      if (daysSinceEdit < 7) {
        const daysLeft = 7 - daysSinceEdit;
        console.log(`❌ User tried to edit before 7 days. Days left: ${daysLeft}`);
        return res.status(403).json({ 
          message: `You can only edit your profile once every 7 days. Please try again in ${daysLeft} day(s).`,
          daysLeft
        });
      }
    }

    // Update profile
    console.log("💾 Updating profile...");
    const result = await sql`
      UPDATE users 
      SET name = ${name}, 
          phone = ${phone || null}, 
          address = ${address || null},
          last_profile_edit = NOW()
      WHERE id = ${userId}
      RETURNING id, name, email, phone, address, last_profile_edit;
    `;

    const updatedUser = result[0];
    console.log("✅ Profile updated successfully:", updatedUser);

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
      lastEditDate: updatedUser.last_profile_edit
    });

  } catch (err) {
    console.error("❌ Update profile error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid', { path: '/' });
        // ✅ Send HTML that clears localStorage before redirect
        res.send(`
          <script>
            localStorage.removeItem("token");
            window.location.href = "/";
          </script>
        `);
    });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid', { path: '/' });
        res.json({ success: true, redirect: "/" });
    });
});

app.get("/", (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard.html');
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ STATIC FILES LAST (so routes execute first)
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'project')));

// POST route for contact form - OPTIMIZED
app.post("/send", async (req, res) => {
    const { name, email, phone, message } = req.body;

    console.log("📧 Contact form submission:", { name, email, phone });

    try {
        // Email content
        const mailOptions = {
            from: process.env.GMAIL_USER || "rajuit1396@gmail.com",
            to: process.env.GMAIL_USER || "rajuit1396@gmail.com",
            subject: "New Contact Form Message from Raju IT Website",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                    <div style="background-color: white; padding: 20px; border-radius: 5px;">
                        <h2 style="color: #ffc800;">New Contact Form Submission</h2>
                        <hr style="border: 1px solid #eee;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <hr style="border: 1px solid #eee;">
                        <h3>Message:</h3>
                        <p style="background-color: #f9f9f9; padding: 15px; border-left: 3px solid #ffc800;">${message}</p>
                        <hr style="border: 1px solid #eee;">
                        <p style="color: #999; font-size: 12px;">This email was sent from the Raju IT contact form.</p>
                    </div>
                </div>
            `
        };

        console.log("📤 Sending email...");
        await transporter.sendMail(mailOptions);
        
        console.log("✅ Email sent successfully!");
        res.json({ success: true, message: "Message sent successfully!" });

    } catch (error) {
        console.error("❌ Email sending error:", error.message);
        console.error("Full error:", error);
        res.status(500).json({ success: false, message: "Failed to send message.", error: error.message });
    }
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});