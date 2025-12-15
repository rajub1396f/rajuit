const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
require("dotenv").config();
const nodemailer = require("nodemailer");
const brevo = require('@getbrevo/brevo');
const puppeteer = require('puppeteer');
const ImageKit = require('imagekit');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

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

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const users = await sql`SELECT * FROM users WHERE id = ${id}`;
        done(null, users[0]);
    } catch (err) {
        done(err, null);
    }
});

// Google OAuth Strategy - only initialize if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log("✅ Initializing Google OAuth Strategy");
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://rajuit.online/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user exists
            const existingUser = await sql`SELECT * FROM users WHERE email = ${profile.emails[0].value}`;
            
            if (existingUser.length > 0) {
                // User exists, return user
                return done(null, existingUser[0]);
            }
            
            // Create new user
            const newUser = await sql`
                INSERT INTO users (name, email, is_verified, password, phone)
                VALUES (${profile.displayName}, ${profile.emails[0].value}, true, 'google-oauth', '')
                RETURNING *
            `;
            
            done(null, newUser[0]);
        } catch (err) {
            console.error("Google OAuth error:", err);
            done(err, null);
        }
    }));
} else {
    console.log("⚠️ Google OAuth not configured - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing");
}

const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.POSTGRES_URL || process.env.NEON_DB);

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// ✅ Initialize Brevo API Client
let brevoApiInstance = new brevo.TransactionalEmailsApi();
let brevoApiKey = brevoApiInstance.authentications['apiKey'];
brevoApiKey.apiKey = process.env.BREVO_API_KEY;

// Brevo sender configuration
const BREVO_SENDER = {
    email: process.env.BREVO_SENDER_EMAIL || "rajuit1396@gmail.com",
    name: process.env.BREVO_SENDER_NAME || "Raju IT"
};

// Helper function to send email via Brevo
async function sendBrevoEmail({ to, subject, htmlContent, replyTo = null }) {
    try {
        console.log(`📧 Sending email via Brevo to: ${to}, subject: ${subject}`);
        console.log(`🔑 Using sender: ${BREVO_SENDER.email} (${BREVO_SENDER.name})`);
        
        let sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.sender = BREVO_SENDER;
        sendSmtpEmail.to = [{ email: to }];
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;
        if (replyTo) {
            sendSmtpEmail.replyTo = { email: replyTo };
        }
        
        const result = await brevoApiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Email sent via Brevo successfully!');
        console.log('📬 Full Brevo response:', JSON.stringify(result, null, 2));
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Brevo email error:', {
            message: error.message,
            response: error.response?.text || error.response?.body,
            status: error.status
        });
        throw error;
    }
}

// Verify Brevo API connection
console.log("✅ Brevo email service initialized");

// Test connection and create tables
(async () => {
  try {
    await sql`SELECT 1`;
    console.log("✅ Connected to Neon DB!");
    
    // Create orders table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        shipping_address TEXT,
        invoice_pdf_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("✅ Orders table ready");
    
    // Add invoice_pdf_url column if it doesn't exist (for existing tables)
    try {
      await sql`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT
      `;
      console.log("✅ invoice_pdf_url column added/verified");
    } catch (alterErr) {
      console.log("Note: Column might already exist or other issue:", alterErr.message);
    }
    
    // Create order_items table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_name VARCHAR(255) NOT NULL,
        product_image TEXT,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("✅ Order_items table ready");
    
    // Add email verification columns to users table
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE
      `;
      console.log("✅ is_verified column added/verified");
    } catch (alterErr) {
      console.log("Note: is_verified column might already exist:", alterErr.message);
    }
    
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS verification_token TEXT
      `;
      console.log("✅ verification_token column added/verified");
    } catch (alterErr) {
      console.log("Note: verification_token column might already exist:", alterErr.message);
    }
    
    // Add last_password_reset column to users table
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMP
      `;
      console.log("✅ last_password_reset column added/verified");
    } catch (alterErr) {
      console.log("Note: last_password_reset column might already exist:", alterErr.message);
    }
    
    // Add last_reset_request_time column to track password reset requests
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_reset_request_time TIMESTAMP
      `;
      console.log("✅ last_reset_request_time column added/verified");
    } catch (alterErr) {
      console.log("Note: last_reset_request_time column might already exist:", alterErr.message);
    }
    
    // Add is_admin column to users table
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
      `;
      console.log("✅ is_admin column added/verified");
    } catch (alterErr) {
      console.log("Note: is_admin column might already exist:", alterErr.message);
    }
    
    // Create products table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          category VARCHAR(100) NOT NULL,
          subcategory VARCHAR(100),
          image_url TEXT,
          stock_quantity INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log("✅ Products table ready");
    } catch (productsErr) {
      console.log("Note: Products table might already exist:", productsErr.message);
    }
    
  } catch (err) {
    console.error("❌ Database initialization error:", err);
  }
  
  // Add instagram_video_url column if it doesn't exist
  try {
    await sql`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS instagram_video_url TEXT
    `;
    console.log("✅ Instagram video URL column added to products table");
    
    // Verify the column exists
    const tableInfo = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'instagram_video_url'
    `;
    if (tableInfo.length > 0) {
      console.log("✅ Confirmed: instagram_video_url column exists");
    } else {
      console.log("⚠️ Warning: instagram_video_url column not found");
    }
  } catch (err) {
    console.error("❌ Error adding instagram_video_url column:", err.message);
  }
})();

// Function to generate PDF and upload to ImageKit
async function generateAndUploadInvoice(htmlContent, orderId) {
  let browser;
  try {
    console.log(`📄 Generating PDF for order #${orderId}...`);
    
    // Launch puppeteer browser with Render-compatible settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Generate PDF as buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    await browser.close();
    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
    
    // Upload PDF to ImageKit
    console.log(`☁️ Uploading PDF to ImageKit...`);
    const uploadResponse = await imagekit.upload({
      file: pdfBuffer.toString('base64'),
      fileName: `invoice_${orderId}_${Date.now()}.pdf`,
      folder: '/invoices',
      useUniqueFileName: true,
      tags: ['invoice', `order_${orderId}`]
    });
    
    console.log('✅ PDF uploaded to ImageKit:', uploadResponse.url);
    return uploadResponse.url;
    
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    console.error('❌ Error generating/uploading invoice:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

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

    // Generate email verification token
    const verificationToken = jwt.sign(
      { email: email }, 
      process.env.JWT_SECRET || "SECRET_KEY", 
      { expiresIn: "24h" }
    );

    console.log("💾 Inserting user into database...");
    const result = await sql`
      INSERT INTO users (name, email, password, phone, is_verified, verification_token)
      VALUES (${name}, ${email}, ${hashedPassword}, ${phone}, FALSE, ${verificationToken})
      RETURNING id, name, email, phone;
    `;

    const inserted = result[0] || null;
    console.log("✅ User registered successfully:", inserted);

    // Send verification email
    try {
      const verificationLink = `https://rajuit.online/verify-email?token=${verificationToken}`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #ffc800; margin-bottom: 20px;">Welcome to Raju IT! 🎉</h2>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${name},</p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Thank you for registering with us! To complete your registration and access your dashboard, 
              please verify your email address by clicking the button below:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background: #ffc800; color: #000; padding: 15px 40px; text-decoration: none; 
                        border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationLink}" style="color: #ffc800; word-break: break-all;">${verificationLink}</a>
            </p>
            <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
              This verification link will expire in 24 hours.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              If you didn't create this account, please ignore this email.
            </p>
          </div>
        </div>
      `;

      await sendBrevoEmail({
        to: email,
        subject: "Verify Your Email - Raju IT",
        htmlContent: emailHtml
      });

      console.log("✅ Verification email sent to:", email);

      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
        user: inserted,
        requiresVerification: true,
        emailSent: true
      });

    } catch (emailError) {
      console.error("❌ Error sending verification email:", emailError);
      console.error("Email error details:", emailError.message);
      console.error("Email error response:", emailError.response?.text || emailError.response?.body);
      
      // Still return success but warn about email issue
      res.status(201).json({
        message: "Registration successful! However, there was an issue sending the verification email. Please contact support.",
        user: inserted,
        requiresVerification: true,
        emailSent: false,
        emailError: emailError.message
      });
    }

  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Google OAuth Routes - only enable if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      // Successful authentication
      const token = jwt.sign(
        { id: req.user.id, email: req.user.email },
        process.env.JWT_SECRET || "SECRET_KEY",
        { expiresIn: "7d" }
      );
      
      // Redirect to homepage with token as query parameter
      res.redirect(`/?token=${token}&googleAuth=true`);
    }
  );
} else {
  // Fallback routes if Google OAuth not configured
  app.get('/auth/google', (req, res) => {
    res.status(503).send('Google authentication is not configured on this server');
  });
  
  app.get('/auth/google/callback', (req, res) => {
    res.redirect('/');
  });
}

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

    // Check if email is verified (handles NULL, false, or undefined)
    if (storedUser.is_verified !== true) {
      console.log("⚠️ Login attempt with unverified email:", email);
      console.log("User verification status:", storedUser.is_verified);
      
      // Generate new verification token or use existing one
      let verificationToken = storedUser.verification_token;
      
      // If no token exists or token is null, generate a new one
      if (!verificationToken) {
        verificationToken = jwt.sign(
          { email: email }, 
          process.env.JWT_SECRET || "SECRET_KEY", 
          { expiresIn: "24h" }
        );
        
        // Update the token in database
        await sql`
          UPDATE users 
          SET verification_token = ${verificationToken} 
          WHERE id = ${storedUser.id}
        `;
      }
      
      // Send verification email
      try {
        const verificationLink = `https://rajuit.online/verify-email?token=${verificationToken}`;
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #ffc800; margin-bottom: 20px;">Email Verification Required 🔐</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${storedUser.name},</p>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                You tried to log in, but your email address hasn't been verified yet. 
                To access your account, please verify your email by clicking the button below:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" 
                   style="background: #ffc800; color: #000; padding: 15px 40px; text-decoration: none; 
                          border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              <p style="font-size: 14px; color: #666; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${verificationLink}" style="color: #ffc800; word-break: break-all;">${verificationLink}</a>
              </p>
              <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
                This verification link will expire in 24 hours.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 12px; color: #999; text-align: center;">
                If you didn't try to log in, please ignore this email.
              </p>
            </div>
          </div>
        `;

        console.log("📧 Attempting to send verification email to:", email);
        
        await sendBrevoEmail({
          to: email,
          subject: "Verify Your Email to Login - Raju IT",
          htmlContent: emailHtml
        });

        console.log("✅ Verification email sent successfully to:", email);
        
        return res.status(403).json({ 
          message: "Please verify your email address before logging in. We've sent a verification link to your email.",
          requiresVerification: true,
          email: email,
          emailSent: true
        });
        
      } catch (emailError) {
        console.error("❌ Error sending verification email during login:", emailError);
        console.error("Email error details:", emailError.message);
        console.error("Email error stack:", emailError.stack);
        
        return res.status(403).json({ 
          message: "Please verify your email address before logging in. If you didn't receive the verification email, please use the 'Resend Verification' option.",
          requiresVerification: true,
          email: email,
          emailSent: false
        });
      }
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

// Admin Login Route
app.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const userRows = await sql`SELECT * FROM users WHERE email = ${email} AND is_admin = true LIMIT 1`;

    if (!userRows || userRows.length === 0) {
      return res.status(403).json({ message: "Access denied. Admin credentials required." });
    }

    const admin = userRows[0];

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const payload = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      isAdmin: true
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || "SECRET_KEY", { expiresIn: "8h" });

    req.session.admin = { id: admin.id, name: admin.name, email: admin.email, isAdmin: true };

    console.log("✅ Admin logged in:", admin.email);

    return res.json({
      success: true,
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
      redirect: "/admin-dashboard.html"
    });

  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Email Verification Route
app.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9f9f9; }
            .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc3545; }
            a { color: #ffc800; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Invalid Verification Link</h1>
            <p>The verification link is missing or invalid.</p>
            <p><a href="/index.html">Return to Home</a></p>
          </div>
        </body>
        </html>
      `);
    }

    console.log("📧 Email verification attempt with token:", token.substring(0, 20) + "...");

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
    } catch (jwtError) {
      console.error("❌ Invalid or expired token:", jwtError.message);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9f9f9; }
            .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc3545; }
            a { color: #ffc800; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⏰ Verification Link Expired</h1>
            <p>This verification link has expired. Please register again or contact support.</p>
            <p><a href="/index.html">Return to Home</a></p>
          </div>
        </body>
        </html>
      `);
    }

    const { email } = decoded;

    // Find user by email and verification token
    const userRows = await sql`
      SELECT id, name, email, is_verified, verification_token 
      FROM users 
      WHERE email = ${email} AND verification_token = ${token}
      LIMIT 1
    `;

    if (!userRows || userRows.length === 0) {
      console.log("❌ User not found or token mismatch");
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9f9f9; }
            .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc3545; }
            a { color: #ffc800; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Verification Failed</h1>
            <p>Unable to verify your email. The link may have already been used.</p>
            <p><a href="/index.html">Return to Home</a></p>
          </div>
        </body>
        </html>
      `);
    }

    const user = userRows[0];

    // Check if already verified
    if (user.is_verified) {
      console.log("⚠️ User already verified:", email);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Already Verified</title>
          <meta http-equiv="refresh" content="3;url=/dashboard.html">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9f9f9; }
            .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #28a745; }
            a { color: #ffc800; text-decoration: none; font-weight: bold; }
            .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #ffc800; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Email Already Verified!</h1>
            <p>Your email has already been verified. Redirecting to dashboard...</p>
            <div class="spinner"></div>
            <p><a href="/dashboard.html">Click here if not redirected automatically</a></p>
          </div>
        </body>
        </html>
      `);
    }

    // Update user as verified and clear verification token
    await sql`
      UPDATE users 
      SET is_verified = TRUE, verification_token = NULL 
      WHERE id = ${user.id}
    `;

    console.log("✅ Email verified successfully for:", email);

    // Send success page with redirect to dashboard
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified Successfully</title>
        <meta http-equiv="refresh" content="3;url=/dashboard.html">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9f9f9; }
          .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #28a745; }
          .checkmark { font-size: 60px; color: #28a745; margin-bottom: 20px; }
          a { color: #ffc800; text-decoration: none; font-weight: bold; }
          .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #ffc800; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✓</div>
          <h1>Email Verified Successfully!</h1>
          <p>Welcome, ${user.name}! Your account has been activated.</p>
          <p>Redirecting to your dashboard...</p>
          <div class="spinner"></div>
          <p><a href="/dashboard.html">Click here if not redirected automatically</a></p>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    console.error("❌ Email verification error:", err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9f9f9; }
          .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #dc3545; }
          a { color: #ffc800; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Server Error</h1>
          <p>An error occurred while verifying your email. Please try again later.</p>
          <p><a href="/index.html">Return to Home</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

// Resend Verification Email
app.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    console.log(`📧 Resend verification request for: ${email}`);

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Check if Brevo API key is configured
    if (!process.env.BREVO_API_KEY) {
      console.error("❌ BREVO_API_KEY not configured!");
      return res.status(500).json({ 
        success: false, 
        message: "Email service not configured. Please contact support." 
      });
    }

    // Find user
    const userRows = await sql`
      SELECT id, name, email, is_verified 
      FROM users 
      WHERE email = ${email} 
      LIMIT 1
    `;

    if (!userRows || userRows.length === 0) {
      // Don't reveal if email exists for security
      return res.json({ 
        success: true, 
        message: "If an account exists with this email, you will receive a verification link." 
      });
    }

    const user = userRows[0];

    // Check if already verified
    if (user.is_verified) {
      return res.json({ 
        success: true, 
        message: "This email is already verified. You can login now." 
      });
    }

    // Generate new verification token
    const verificationToken = jwt.sign(
      { email: user.email }, 
      process.env.JWT_SECRET || "SECRET_KEY", 
      { expiresIn: "24h" }
    );

    // Update user with new token
    await sql`
      UPDATE users 
      SET verification_token = ${verificationToken} 
      WHERE id = ${user.id}
    `;

    // Send verification email
    const verificationLink = `https://rajuit.online/verify-email?token=${verificationToken}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #ffc800; margin-bottom: 20px;">Verify Your Email 📧</h2>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${user.name},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            You requested a new verification link. Please verify your email address by clicking the button below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background: #ffc800; color: #000; padding: 15px 40px; text-decoration: none; 
                      border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">
            Or copy and paste this link into your browser:<br>
            <a href="${verificationLink}" style="color: #ffc800; word-break: break-all;">${verificationLink}</a>
          </p>
          <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 30px;">
            This verification link will expire in 24 hours.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `;

    await sendBrevoEmail({
      to: email,
      subject: "Verify Your Email - Raju IT",
      htmlContent: emailHtml
    });

    console.log("✅ Verification email resent to:", email);

    res.json({ 
      success: true, 
      message: "Verification email sent! Please check your inbox." 
    });

  } catch (error) {
    console.error("❌ Resend verification error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send verification email. Please try again later.",
      error: error.message
    });
  }
});

// Test email endpoint - send test email to verify Brevo configuration
app.get("/test-email", async (req, res) => {
  try {
    console.log("🧪 Test email endpoint called");
    
    // Check if Brevo API key is configured
    if (!process.env.BREVO_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: "BREVO_API_KEY not configured in environment variables" 
      });
    }

    const testEmail = process.env.BREVO_SENDER_EMAIL || "rajuit1396@gmail.com";
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ffc800;">✅ Brevo Email Test Successful!</h2>
        <p>This is a test email to verify your Brevo email configuration is working correctly.</p>
        <p><strong>If you received this email, your password reset feature should work!</strong></p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Sent from: Raju IT Email System<br>
          Time: ${new Date().toLocaleString()}<br>
          API Key: ${process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 15) + '...' : 'NOT SET'}<br>
          Sender: ${BREVO_SENDER.email}
        </p>
      </div>
    `;

    await sendBrevoEmail({
      to: testEmail,
      subject: "Test Email from Raju IT - Brevo Configuration",
      htmlContent: emailHtml
    });

    res.json({ 
      success: true, 
      message: `Test email sent to ${testEmail}. Check your inbox!`,
      config: {
        apiKeySet: !!process.env.BREVO_API_KEY,
        senderEmail: BREVO_SENDER.email,
        senderName: BREVO_SENDER.name
      }
    });

  } catch (error) {
    console.error("❌ Test email error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.text || error.response?.body
    });
  }
});

// Forgot password - send reset link via Brevo
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    console.log(`📧 Password reset request received for: ${email}`);

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Check if Brevo API key is configured
    if (!process.env.BREVO_API_KEY) {
      console.error("❌ BREVO_API_KEY not configured!");
      return res.status(500).json({ success: false, message: "Email service not configured. Please contact support." });
    }

    // Check if user exists
    const userRows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;

    if (!userRows || userRows.length === 0) {
      console.log(`⚠️ No user found with email: ${email}`);
      // Don't reveal if email exists for security, but still return success
      return res.json({ success: true, message: "If an account exists with this email, you will receive a password reset link." });
    }

    const user = userRows[0];
    console.log(`✅ User found: ${user.name} (ID: ${user.id})`);

    const now = new Date();

    // Check if user has successfully reset password within 24 hours (strict limit)
    if (user.last_password_reset) {
      const lastResetTime = new Date(user.last_password_reset);
      const hoursSinceLastReset = (now - lastResetTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastReset < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastReset);
        console.log(`⏰ User ${email} tried to reset password too soon after successful reset. Last reset: ${lastResetTime}`);
        return res.status(429).json({ 
          success: false, 
          message: `You have recently reset your password. You can request another reset in ${hoursRemaining} hour(s).`,
          rateLimited: true,
          hoursRemaining: hoursRemaining
        });
      }
    }

    // Check if user has requested reset within last 5 minutes (before successful reset)
    if (user.last_reset_request_time) {
      const lastRequestTime = new Date(user.last_reset_request_time);
      const minutesSinceLastRequest = (now - lastRequestTime) / (1000 * 60);
      
      if (minutesSinceLastRequest < 5) {
        const minutesRemaining = Math.ceil(5 - minutesSinceLastRequest);
        console.log(`⏰ User ${email} tried to request reset too soon. Last request: ${lastRequestTime}`);
        return res.status(429).json({ 
          success: false, 
          message: `Please wait ${minutesRemaining} minute(s) before requesting another password reset link.`,
          rateLimited: true,
          minutesRemaining: minutesRemaining
        });
      }
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email }, 
      process.env.JWT_SECRET || "SECRET_KEY", 
      { expiresIn: "1h" }
    );

    // Send reset email via Brevo
    const resetLink = `https://rajuit.online/reset-password?token=${resetToken}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: white; padding: 30px; border-radius: 5px;">
          <h2 style="color: #ffc800;">Password Reset Request - Raju IT</h2>
          <hr style="border: 1px solid #eee;">
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background: #ffc800; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: #f9f9f9; padding: 10px; word-break: break-all; font-size: 12px;">${resetLink}</p>
          <hr style="border: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;"><strong>This link will expire in 1 hour.</strong></p>
          <p style="color: #999; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
        </div>
      </div>
    `;

    try {
      console.log(`📤 Attempting to send password reset email via Brevo to: ${email}`);
      console.log(`🔑 Brevo API Key configured: ${!!process.env.BREVO_API_KEY}`);
      console.log(`📧 Sender email: ${BREVO_SENDER.email}`);
      
      const emailResult = await sendBrevoEmail({
        to: email,
        subject: "Password Reset Request - Raju IT",
        htmlContent: emailHtml
      });

      console.log(`✅ Password reset email sent successfully to ${email}`, emailResult);
      
      // Update last reset request time
      await sql`
        UPDATE users 
        SET last_reset_request_time = NOW() 
        WHERE id = ${user.id}
      `;
      
      return res.json({ 
        success: true, 
        message: "Password reset link sent! Check your email (including spam folder). The link expires in 1 hour.",
        emailSent: true
      });
    } catch (emailError) {
      console.error(`❌ Failed to send password reset email to ${email}:`, {
        error: emailError.message,
        stack: emailError.stack,
        response: emailError.response?.text || emailError.response?.body || 'No response details'
      });
      
      // Return error to user so they know something went wrong
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send reset email. Please try again later or contact support.",
        emailSent: false,
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }

  } catch (error) {
    console.error("❌ Forgot password error:", {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: "Server error. Please try again later.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reset password with token
app.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and last_password_reset timestamp in database
    await sql`
      UPDATE users 
      SET password = ${hashedPassword}, last_password_reset = NOW() 
      WHERE id = ${decoded.userId}
    `;

    console.log(`✅ Password reset successful for user ID: ${decoded.userId}`);
    console.log(`⏰ Password reset timestamp updated for rate limiting`);
    
    // Send confirmation email via Brevo
    const userRows = await sql`SELECT name, email FROM users WHERE id = ${decoded.userId} LIMIT 1`;
    if (userRows && userRows.length > 0) {
      const user = userRows[0];
      
      const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: white; padding: 30px; border-radius: 5px;">
            <h2 style="color: #ffc800;">Password Changed Successfully - Raju IT</h2>
            <hr style="border: 1px solid #eee;">
            <p>Hello ${user.name},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you did not make this change, please contact us immediately at rajuit1396@gmail.com</p>
            <hr style="border: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">This is an automated email from Raju IT.</p>
          </div>
        </div>
      `;

      try {
        await sendBrevoEmail({
          to: user.email,
          subject: "Password Changed Successfully - Raju IT",
          htmlContent: confirmationHtml
        });
        console.log(`✅ Password change confirmation sent to ${user.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send confirmation email:", emailError.message);
      }
    }

    res.json({ success: true, message: "Password reset successful. You can now login with your new password." });

  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Change Password endpoint (with 24-hour rate limiting)
app.post("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id; // From verifyToken middleware

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    // Get user from database
    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Check rate limiting - user can change password only once every 24 hours
    if (user.last_password_reset) {
      const lastReset = new Date(user.last_password_reset);
      const now = new Date();
      const hoursSinceLastReset = (now - lastReset) / (1000 * 60 * 60);

      if (hoursSinceLastReset < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastReset);
        console.log(`⏰ Password change rate limited for user ${userId}. ${hoursRemaining} hours remaining.`);
        return res.status(429).json({
          rateLimited: true,
          message: `You can only change your password once every 24 hours. Please try again in ${hoursRemaining} hour(s).`,
          hoursRemaining
        });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and last_password_reset timestamp
    await sql`
      UPDATE users 
      SET password = ${hashedPassword}, last_password_reset = NOW() 
      WHERE id = ${userId}
    `;

    console.log(`✅ Password changed successfully for user ID: ${userId}`);
    console.log(`⏰ Password change timestamp updated for rate limiting`);

    // Send confirmation email via Brevo
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: white; padding: 30px; border-radius: 5px;">
          <h2 style="color: #ffc800;">Password Changed Successfully - Raju IT</h2>
          <hr style="border: 1px solid #eee;">
          <p>Hello ${user.name},</p>
          <p>Your password has been successfully changed from your dashboard.</p>
          <p><strong>Note:</strong> You can change your password again in 24 hours.</p>
          <p>If you did not make this change, please contact us immediately at rajuit1396@gmail.com</p>
          <hr style="border: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">This is an automated email from Raju IT.</p>
        </div>
      </div>
    `;

    try {
      await sendBrevoEmail({
        to: user.email,
        subject: "Password Changed Successfully - Raju IT",
        htmlContent: confirmationHtml
      });
      console.log(`✅ Password change confirmation sent to ${user.email}`);
    } catch (emailError) {
      console.error("❌ Failed to send confirmation email:", emailError.message);
    }

    res.json({ 
      success: true, 
      message: "Password changed successfully. You can change it again in 24 hours." 
    });

  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Check Password Reset Status endpoint
app.get("/check-password-reset-status", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    const userRows = await sql`SELECT last_password_reset FROM users WHERE id = ${userId} LIMIT 1`;
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];
    
    if (!user.last_password_reset) {
      return res.json({ 
        lastPasswordReset: null,
        canChange: true 
      });
    }

    const lastReset = new Date(user.last_password_reset);
    const now = new Date();
    const hoursSinceLastReset = (now - lastReset) / (1000 * 60 * 60);
    const canChange = hoursSinceLastReset >= 24;
    const hoursRemaining = canChange ? 0 : Math.ceil(24 - hoursSinceLastReset);

    res.json({
      lastPasswordReset: user.last_password_reset,
      canChange,
      hoursRemaining: hoursRemaining > 0 ? hoursRemaining : null
    });

  } catch (error) {
    console.error("❌ Check password reset status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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

// Admin verification middleware
function verifyAdmin(req, res, next) {
  const header = req.headers["authorization"];
  const token = header?.split(" ")[1];

  console.log("🔍 Admin Auth Check");

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY", (err, decoded) => {
      if (err) {
        console.error("❌ Admin token verification failed:", err.message);
        return res.status(401).json({ message: "Invalid token", error: err.message });
      }
      if (!decoded.isAdmin) {
        console.error("❌ User is not admin");
        return res.status(403).json({ message: "Access denied. Admin only." });
      }
      console.log("✅ Admin token valid:", decoded.email);
      req.user = decoded;
      next();
    });
  } else if (req.session && req.session.admin) {
    console.log("✅ Using admin session:", req.session.admin.email);
    req.user = req.session.admin;
    next();
  } else {
    console.error("❌ No admin token or session found");
    return res.status(403).json({ message: "Access denied. Admin login required." });
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

app.get("/dashboard", async (req, res) => {
  // Check if request expects JSON (API call)
  const wantsJson = req.headers["accept"]?.includes("application/json") || req.headers["authorization"];
  
  // For browser navigation (not API calls), always serve the HTML file
  // The dashboard.html will check localStorage for token and redirect if needed
  if (!wantsJson) {
    return res.sendFile(path.join(__dirname, "dashboard.html"));
  }
  
  // API call - return JSON data
  if (req.session && req.session.user) {
    try {
      const userRows = await sql`SELECT id, name, email, phone, address, last_profile_edit FROM users WHERE id = ${req.session.user.id} LIMIT 1`;
      const user = (userRows && userRows[0]) || req.session.user;
      return res.json({ message: "Welcome!", user });
    } catch (err) {
      console.error("User data fetch error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
  
  const header = req.headers["authorization"];
  const token = header?.split(" ")[1];
  
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY", async (err, decoded) => {
      if (err) return res.status(401).json({ message: "Invalid token" });
      
      try {
        const userRows = await sql`SELECT id, name, email, phone, address, last_profile_edit FROM users WHERE id = ${decoded.id} LIMIT 1`;
        const user = (userRows && userRows[0]) || decoded;
        return res.json({ message: "Welcome!", user });
      } catch (err) {
        console.error("User data fetch error:", err);
        return res.status(500).json({ message: "Server error" });
      }
    });
  } else {
    return res.status(401).json({ message: "Not authenticated" });
  }
});

// Get User Data API
app.get("/api/user-data", verifyToken, async (req, res) => {
  if (req.user && req.user.id) {
    try {
      const userRows = await sql`SELECT id, name, email, phone, address, last_profile_edit FROM users WHERE id = ${req.user.id} LIMIT 1`;
      const user = (userRows && userRows[0]) || req.user;
      return res.json({ message: "Welcome!", user });
    } catch (err) {
      console.error("User data fetch error:", err);
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

// Get Shipping Address
app.get("/get-shipping", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await sql`
      SELECT shipping_name, shipping_phone, shipping_address1, shipping_address2, 
             shipping_city, shipping_state, shipping_postal, shipping_country
      FROM users 
      WHERE id = ${userId} 
      LIMIT 1
    `;

    res.json({ shipping: result[0] || {} });
  } catch (err) {
    console.error("❌ Get shipping error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update Shipping Address
app.post("/update-shipping", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { shippingName, shippingPhone, shippingAddress1, shippingAddress2, 
            shippingCity, shippingState, shippingPostal, shippingCountry } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await sql`
      UPDATE users 
      SET shipping_name = ${shippingName},
          shipping_phone = ${shippingPhone},
          shipping_address1 = ${shippingAddress1},
          shipping_address2 = ${shippingAddress2 || null},
          shipping_city = ${shippingCity},
          shipping_state = ${shippingState},
          shipping_postal = ${shippingPostal},
          shipping_country = ${shippingCountry}
      WHERE id = ${userId}
      RETURNING id
    `;

    res.json({ message: "Shipping address updated successfully" });
  } catch (err) {
    console.error("❌ Update shipping error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get Orders
app.get("/get-orders", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log(`📋 Fetching orders for user ID: ${userId}`);
    
    if (!userId) {
      console.log("❌ User not authenticated");
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get all orders for the user first
    const ordersData = await sql`
      SELECT 
        id, 
        total_amount, 
        status, 
        shipping_address, 
        invoice_pdf_url,
        created_at
      FROM orders
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    console.log(`✅ Found ${ordersData.length} orders for user ${userId}`);

    // If no orders, return empty array
    if (ordersData.length === 0) {
      console.log("No orders found, returning empty array");
      return res.json({ orders: [] });
    }

    // Get items for each order
    const orders = [];
    for (const order of ordersData) {
      try {
        const items = await sql`
          SELECT 
            product_name as name,
            product_image as image,
            quantity,
            price
          FROM order_items
          WHERE order_id = ${order.id}
        `;
        
        orders.push({
          id: order.id,
          total_amount: order.total_amount,
          status: order.status,
          shipping_address: order.shipping_address,
          invoice_pdf_url: order.invoice_pdf_url,
          created_at: order.created_at,
          items: items || []
        });
      } catch (itemErr) {
        console.error(`Error fetching items for order ${order.id}:`, itemErr);
        // Include order without items if item fetch fails
        orders.push({
          id: order.id,
          total_amount: order.total_amount,
          status: order.status,
          shipping_address: order.shipping_address,
          invoice_pdf_url: order.invoice_pdf_url,
          created_at: order.created_at,
          items: []
        });
      }
    }

    console.log(`✅ Returning ${orders.length} orders with items`);
    res.json({ orders });
  } catch (err) {
    console.error("❌ Get orders error:", err);
    console.error("Error message:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({ message: "Server error", error: err.message, stack: err.stack });
  }
});



// Create Order (for future purchase functionality)
app.post("/create-order", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

    console.log(`🛒 Create order request from user ID: ${userId}`);
    console.log(`📦 Items count: ${items?.length}, Total: ৳${totalAmount}`);

    if (!userId) {
      console.log("❌ User not authenticated");
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!items || items.length === 0) {
      console.log("❌ No items in order");
      return res.status(400).json({ message: "No items in order" });
    }

    // Get user details
    const userResult = await sql`SELECT name, email FROM users WHERE id = ${userId}`;
    const user = userResult[0];
    console.log(`👤 Creating order for: ${user.name} (${user.email})`);

    // Create order (without PDF URL initially)
    const orderResult = await sql`
      INSERT INTO orders (user_id, total_amount, status, shipping_address)
      VALUES (${userId}, ${totalAmount}, 'pending', ${shippingAddress})
      RETURNING id, created_at
    `;

    const orderId = orderResult[0].id;
    const orderDate = new Date(orderResult[0].created_at);
    console.log(`✅ Order created with ID: ${orderId}`);

    // Insert order items
    console.log(`📝 Inserting ${items.length} order items...`);
    for (const item of items) {
      await sql`
        INSERT INTO order_items (order_id, product_name, product_image, quantity, price)
        VALUES (${orderId}, ${item.name}, ${item.image || null}, ${item.quantity}, ${item.price})
      `;
    }
    console.log(`✅ All order items inserted`);

    // Generate invoice HTML
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 50;
    const tax = subtotal * 0.15;
    const total = subtotal + shipping + tax;

    const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .invoice-header { background: #212529; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .invoice-header h1 { margin: 0; font-size: 2.5em; }
        .invoice-header p { margin: 5px 0; }
        .invoice-details { background: #f8f9fa; padding: 20px; border-left: 5px solid #ffc800; margin: 20px 0; }
        .invoice-details-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .invoice-details strong { color: #212529; }
        .section-title { background: #ffc800; color: #212529; padding: 10px 20px; font-weight: bold; margin: 20px 0 10px 0; }
        .info-box { background: white; border: 1px solid #dee2e6; padding: 15px; margin: 10px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #343a40; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #dee2e6; }
        tr:hover { background: #f8f9fa; }
        .text-right { text-align: right; }
        .totals { margin-top: 20px; float: right; width: 300px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
        .totals-row.total { background: #212529; color: white; padding: 12px; margin-top: 10px; font-size: 1.2em; font-weight: bold; }
        .footer { text-align: center; margin-top: 50px; padding: 20px; background: #f8f9fa; color: #6c757d; }
        .thank-you { text-align: center; font-size: 1.5em; color: #28a745; margin: 30px 0; }
    </style>
</head>
<body>
    <div class="invoice-header">
        <h1>INVOICE</h1>
        <p>Raju IT - Premium Fashion Store</p>
        <p>📧 rajuit1396@gmail.com | 📱 +8801726466000</p>
    </div>
    
    <div class="invoice-details">
        <div class="invoice-details-row">
            <div><strong>Invoice Number:</strong> #INV-${orderId.toString().padStart(6, '0')}</div>
            <div><strong>Order Number:</strong> #ORD-${orderId.toString().padStart(6, '0')}</div>
        </div>
        <div class="invoice-details-row">
            <div><strong>Invoice Date:</strong> ${orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div><strong>Payment Method:</strong> ${paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'card' ? 'Credit/Debit Card' : 'Bank Transfer'}</div>
        </div>
    </div>
    
    <div class="section-title">CUSTOMER INFORMATION</div>
    <div class="info-box">
        <strong>${user.name}</strong><br>
        Email: ${user.email}<br>
        ${shippingAddress}
    </div>
    
    <div class="section-title">ORDER ITEMS</div>
    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th class="text-right">Price</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => {
              const price = parseFloat(item.price) || 0;
              const quantity = parseInt(item.quantity) || 0;
              return `
            <tr>
                <td>${item.name}</td>
                <td class="text-right">৳${price.toFixed(2)}</td>
                <td class="text-right">${quantity}</td>
                <td class="text-right">৳${(price * quantity).toFixed(2)}</td>
            </tr>
            `;
            }).join('')}
        </tbody>
    </table>
    
    <div style="clear: both;"></div>
    <div class="totals">
        <div class="totals-row">
            <span>Subtotal:</span>
            <span>৳${subtotal.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span>Shipping:</span>
            <span>৳${shipping.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span>Tax (15%):</span>
            <span>৳${tax.toFixed(2)}</span>
        </div>
        <div class="totals-row total">
            <span>TOTAL:</span>
            <span>৳${total.toFixed(2)}</span>
        </div>
    </div>
    
    <div style="clear: both;"></div>
    <div class="thank-you">Thank You for Your Order! 🎉</div>
    
    <div class="footer">
        <p><strong>Terms & Conditions:</strong></p>
        <p>Payment is due within 7 days. Please include invoice number with your payment.<br>
        For questions about this invoice, contact us at rajuit1396@gmail.com or +8801726466000</p>
        <p style="margin-top: 20px;">© 2025 Raju IT. All rights reserved.</p>
    </div>
</body>
</html>
    `;

    // Generate PDF and upload to ImageKit (async, non-blocking)
    let invoicePdfUrl = null;
    let pdfError = null;
    
    // Start PDF generation in background
    (async () => {
      try {
        console.log(`🚀 Starting background invoice generation for order #${orderId}...`);
        const pdfUrl = await generateAndUploadInvoice(invoiceHtml, orderId);
        console.log(`✅ Invoice PDF uploaded successfully: ${pdfUrl}`);
        
        // Update order with PDF URL
        const updateResult = await sql`
          UPDATE orders 
          SET invoice_pdf_url = ${pdfUrl}
          WHERE id = ${orderId}
          RETURNING id
        `;
        
        if (updateResult && updateResult.length > 0) {
          console.log(`✅ Order #${orderId} updated with PDF URL`);
        } else {
          console.warn(`⚠️ Order #${orderId} update returned no rows`);
        }
      } catch (error) {
        console.error(`❌ Background PDF generation failed for order #${orderId}:`, error.message);
      }
    })();

    // Send invoice email to customer (non-blocking, in background)
    let emailSent = false;
    let emailError = null;
    
    // Send email in background to not block response via Brevo
    (async () => {
      try {
        console.log(`📧 Attempting to send invoice to ${user.email} via Brevo...`);
        
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #212529;">Order Confirmed! 🎉</h2>
              <p>Thank you for your order at Raju IT!</p>
              <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #ffc800; margin: 20px 0;">
                <p><strong>Order Number:</strong> #${orderId.toString().padStart(6, '0')}</p>
                <p><strong>Total Amount:</strong> ৳${totalAmount}</p>
              </div>
              <p>You can view and download your invoice from your dashboard.</p>
              <a href="https://rajuit.online/dashboard" style="display: inline-block; background: #ffc800; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">View My Orders</a>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, contact us at rajuit1396@gmail.com</p>
            </div>
          `;
        
        await sendBrevoEmail({
          to: user.email,
          subject: `Order Confirmation #${orderId.toString().padStart(6, '0')} - Raju IT`,
          htmlContent: emailHtml
        });
        
        console.log(`✅ Invoice email sent successfully to ${user.email} via Brevo`);
        
        // Send invoice copy to admin
        const adminEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #212529;">New Order Received! 🎉</h2>
              <p><strong>A new order has been placed on Raju IT.</strong></p>
              <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #ffc800; margin: 20px 0;">
                <p><strong>Order Number:</strong> #${orderId.toString().padStart(6, '0')}</p>
                <p><strong>Customer:</strong> ${user.name} (${user.email})</p>
                <p><strong>Total Amount:</strong> ৳${totalAmount}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'card' ? 'Credit/Debit Card' : 'Bank Transfer'}</p>
              </div>
              <p><strong>Shipping Address:</strong></p>
              <p style="white-space: pre-line;">${shippingAddress}</p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">Login to dashboard to view full order details.</p>
            </div>
          `;
        
        await sendBrevoEmail({
          to: 'rajuit1396@gmail.com',
          subject: `New Order #${orderId.toString().padStart(6, '0')} - ${user.name}`,
          htmlContent: adminEmailHtml
        });
        
        console.log(`✅ Admin notification email sent to rajuit1396@gmail.com`);
        
      } catch (error) {
        console.error(`❌ Background email sending failed for order #${orderId}:`, error.message);
      }
    })();

    console.log(`✅ Order #${orderId} created successfully, returning response to client`);
    
    res.json({ 
      success: true, 
      message: "Order created successfully", 
      orderId,
      invoiceHtml,
      invoicePdfUrl: null, // PDF will be generated in background
      emailSent: true, // Email is being sent in background
      emailNote: "Order confirmation email is being sent to your email address",
      pdfNote: "Invoice PDF is being generated and will be available shortly in your dashboard"
    });
  } catch (err) {
    console.error("❌ Create order error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get invoice for a specific order
app.get("/get-invoice/:orderId", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const orderId = req.params.orderId;

    console.log(`📄 Fetching invoice for order #${orderId}, user: ${userId}`);

    if (!userId) {
      console.log("❌ User not authenticated");
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get order details - select specific columns to avoid issues
    const orderResult = await sql`
      SELECT 
        o.id,
        o.user_id,
        o.total_amount,
        o.status,
        o.shipping_address,
        o.created_at,
        u.name,
        u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ${orderId} AND o.user_id = ${userId}
    `;

    console.log(`Order query completed, found ${orderResult.length} orders`);

    if (!orderResult || orderResult.length === 0) {
      console.log(`❌ Order #${orderId} not found for user ${userId}`);
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult[0];
    console.log(`✅ Order found: #${order.id}, total: ${order.total_amount}`);

    // Get order items
    const itemsResult = await sql`
      SELECT product_name as name, product_image as image, quantity, price
      FROM order_items
      WHERE order_id = ${orderId}
    `;

    console.log(`Found ${itemsResult.length} items for order #${orderId}`);

    const items = itemsResult || [];
    const orderDate = new Date(order.created_at);
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const shipping = 50;
    const tax = subtotal * 0.15;
    const total = parseFloat(order.total_amount);

    // Generate invoice HTML
    const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .invoice-header { background: #212529; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .invoice-header h1 { margin: 0; font-size: 2.5em; }
        .invoice-header p { margin: 5px 0; }
        .invoice-details { background: #f8f9fa; padding: 20px; border-left: 5px solid #ffc800; margin: 20px 0; }
        .invoice-details-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .invoice-details strong { color: #212529; }
        .section-title { background: #ffc800; color: #212529; padding: 10px 20px; font-weight: bold; margin: 20px 0 10px 0; }
        .info-box { background: white; border: 1px solid #dee2e6; padding: 15px; margin: 10px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #343a40; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #dee2e6; }
        tr:hover { background: #f8f9fa; }
        .text-right { text-align: right; }
        .totals { margin-top: 20px; float: right; width: 300px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
        .totals-row.total { background: #212529; color: white; padding: 12px; margin-top: 10px; font-size: 1.2em; font-weight: bold; }
        .footer { text-align: center; margin-top: 50px; padding: 20px; background: #f8f9fa; color: #6c757d; }
        .thank-you { text-align: center; font-size: 1.5em; color: #28a745; margin: 30px 0; }
    </style>
</head>
<body>
    <div class="invoice-header">
        <h1>INVOICE</h1>
        <p>Raju IT - Premium Fashion Store</p>
        <p>📧 rajuit1396@gmail.com | 📱 +8801726466000</p>
    </div>
    
    <div class="invoice-details">
        <div class="invoice-details-row">
            <div><strong>Invoice Number:</strong> #INV-${orderId.toString().padStart(6, '0')}</div>
            <div><strong>Order Number:</strong> #ORD-${orderId.toString().padStart(6, '0')}</div>
        </div>
        <div class="invoice-details-row">
            <div><strong>Invoice Date:</strong> ${orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div><strong>Status:</strong> ${order.status}</div>
        </div>
    </div>
    
    <div class="section-title">CUSTOMER INFORMATION</div>
    <div class="info-box">
        <strong>${order.name}</strong><br>
        Email: ${order.email}<br>
        ${order.shipping_address}
    </div>
    
    <div class="section-title">ORDER ITEMS</div>
    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th class="text-right">Price</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => {
              const price = parseFloat(item.price) || 0;
              const quantity = parseInt(item.quantity) || 0;
              return `
            <tr>
                <td>${item.name}</td>
                <td class="text-right">৳${price.toFixed(2)}</td>
                <td class="text-right">${quantity}</td>
                <td class="text-right">৳${(price * quantity).toFixed(2)}</td>
            </tr>
            `;
            }).join('')}
        </tbody>
    </table>
    
    <div style="clear: both;"></div>
    <div class="totals">
        <div class="totals-row">
            <span>Subtotal:</span>
            <span>৳${subtotal.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span>Shipping:</span>
            <span>৳${shipping.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span>Tax (15%):</span>
            <span>৳${tax.toFixed(2)}</span>
        </div>
        <div class="totals-row total">
            <span>TOTAL:</span>
            <span>৳${total.toFixed(2)}</span>
        </div>
    </div>
    
    <div style="clear: both;"></div>
    <div class="thank-you">Thank You for Your Order! 🎉</div>
    
    <div class="footer">
        <p><strong>Terms & Conditions:</strong></p>
        <p>Payment is due within 7 days. Please include invoice number with your payment.<br>
        For questions about this invoice, contact us at rajuit1396@gmail.com or +8801726466000</p>
        <p style="margin-top: 20px;">© 2025 Raju IT. All rights reserved.</p>
    </div>
</body>
</html>
    `;

    console.log(`✅ Returning invoice for order #${orderId}`);
    res.json({ 
      success: true, 
      invoice: invoiceHtml,
      invoiceHtml: invoiceHtml,
      orderId
    });
  } catch (err) {
    console.error("❌ Get invoice error:", err);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      message: "Server error", 
      error: err.message,
      stack: err.stack,
      orderId: req.params.orderId
    });
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

// Middleware to remove .html extension and handle clean URLs
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        // Redirect URLs with .html to clean URLs, preserving query parameters
        const cleanPath = req.path.slice(0, -5);
        const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        return res.redirect(301, cleanPath + queryString);
    }
    next();
});

app.get("/", (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle clean URLs - serve .html files without extension
app.use((req, res, next) => {
    if (!req.path.includes('.') && req.path !== '/') {
        const htmlPath = path.join(__dirname, req.path + '.html');
        if (require('fs').existsSync(htmlPath)) {
            return res.sendFile(htmlPath);
        }
    }
    next();
});

// ✅ STATIC FILES LAST (so routes execute first)
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'project')));

// POST route for contact form - OPTIMIZED
app.post("/send", async (req, res) => {
    const { name, email, phone, message } = req.body;

    console.log("📧 Contact form submission:", { name, email, phone });

    const emailHtml = `
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
    `;

    try {
        console.log("📤 Sending contact form email via Brevo...");
        
        await sendBrevoEmail({
            to: process.env.BREVO_SENDER_EMAIL || "rajuit1396@gmail.com",
            subject: "New Contact Form Message from Raju IT Website",
            htmlContent: emailHtml,
            replyTo: email
        });
        
        console.log("✅ Contact form email sent successfully via Brevo!");
        res.json({ success: true, message: "Message sent successfully!" });

    } catch (error) {
        console.error("❌ Contact form email error:", error.message);
        console.error("Full error:", error);
        res.status(500).json({ success: false, message: "Failed to send message.", error: error.message });
    }
});

// Check if tables exist and show structure
app.get("/check-tables", async (req, res) => {
  try {
    console.log("🔍 Checking database tables...");
    
    // Check if orders table exists
    const ordersTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'orders'
      ) as exists
    `;
    
    const ordersExists = ordersTableCheck[0].exists;
    console.log(`Orders table exists: ${ordersExists}`);
    
    let ordersColumns = null;
    if (ordersExists) {
      ordersColumns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'orders'
        ORDER BY ordinal_position
      `;
    }
    
    // Check if order_items table exists
    const orderItemsTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'order_items'
      ) as exists
    `;
    
    const orderItemsExists = orderItemsTableCheck[0].exists;
    console.log(`Order_items table exists: ${orderItemsExists}`);
    
    let orderItemsColumns = null;
    if (orderItemsExists) {
      orderItemsColumns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_items'
        ORDER BY ordinal_position
      `;
    }
    
    // Count records
    let ordersCount = 0;
    let orderItemsCount = 0;
    
    if (ordersExists) {
      const countResult = await sql`SELECT COUNT(*) as count FROM orders`;
      ordersCount = parseInt(countResult[0].count);
    }
    
    if (orderItemsExists) {
      const countResult = await sql`SELECT COUNT(*) as count FROM order_items`;
      orderItemsCount = parseInt(countResult[0].count);
    }
    
    res.json({
      success: true,
      tables: {
        orders: {
          exists: ordersExists,
          columns: ordersColumns,
          recordCount: ordersCount
        },
        order_items: {
          exists: orderItemsExists,
          columns: orderItemsColumns,
          recordCount: orderItemsCount
        }
      }
    });
    
  } catch (error) {
    console.error("❌ Check tables error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check tables",
      error: error.message
    });
  }
});

// Create tables if they don't exist
app.get("/create-tables", async (req, res) => {
  try {
    console.log("🔨 Creating tables...");
    
    // Create orders table
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        shipping_address TEXT,
        invoice_pdf_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("✅ Orders table created/verified");
    
    // Create order_items table
    await sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_image TEXT,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `;
    console.log("✅ Order_items table created/verified");
    
    res.json({
      success: true,
      message: "Tables created successfully"
    });
    
  } catch (error) {
    console.error("❌ Create tables error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create tables",
      error: error.message
    });
  }
});

// Migration endpoint to add invoice_pdf_url column
app.get("/migrate-invoice-column", async (req, res) => {
  try {
    console.log("🔄 Adding invoice_pdf_url column to orders table...");
    
    await sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT
    `;
    
    console.log("✅ Migration completed successfully");
    res.json({ 
      success: true, 
      message: "invoice_pdf_url column added to orders table" 
    });
  } catch (error) {
    console.error("❌ Migration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Migration failed", 
      error: error.message 
    });
  }
});

// Migration endpoint to add email verification columns to users table
app.get("/migrate-email-verification", async (req, res) => {
  try {
    console.log("🔄 Adding email verification columns to users table...");
    
    // Add is_verified column (default to false)
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE
    `;
    
    // Add verification_token column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_token TEXT
    `;
    
    // Add last_password_reset column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMP
    `;
    
    // Add last_reset_request_time column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_reset_request_time TIMESTAMP
    `;
    
    console.log("✅ Email verification and password reset migration completed successfully");
    res.json({ 
      success: true, 
      message: "Email verification and password reset columns added to users table" 
    });
  } catch (error) {
    console.error("❌ Migration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Migration failed", 
      error: error.message 
    });
  }
});

// Debug endpoint to check order details
app.get("/debug-order/:orderId", verifyToken, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user?.id;
    
    const orderResult = await sql`
      SELECT * FROM orders 
      WHERE id = ${orderId} AND user_id = ${userId}
    `;
    
    const itemsResult = await sql`
      SELECT * FROM order_items 
      WHERE order_id = ${orderId}
    `;
    
    res.json({
      success: true,
      order: orderResult[0] || null,
      items: itemsResult,
      hasPdfUrl: !!(orderResult[0]?.invoice_pdf_url)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug endpoint to check all orders for current user
app.get("/debug-all-orders", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    console.log(`🔍 Debug: Checking all orders for user ${userId}`);
    
    const allOrders = await sql`
      SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    
    const allItems = await sql`
      SELECT * FROM order_items ORDER BY created_at DESC LIMIT 20
    `;
    
    const orderCount = await sql`SELECT COUNT(*) as count FROM orders WHERE user_id = ${userId}`;
    
    res.json({
      success: true,
      userId: userId,
      orderCount: parseInt(orderCount[0].count),
      orders: allOrders,
      recentItems: allItems
    });
  } catch (error) {
    console.error('Debug orders error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test endpoint to verify ImageKit and Puppeteer setup
app.get("/test-invoice", async (req, res) => {
  try {
    console.log("🧪 Testing invoice generation...");
    console.log("Puppeteer executable:", puppeteer.executablePath());
    console.log("ImageKit endpoint:", process.env.IMAGEKIT_URL_ENDPOINT);
    
    const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #212529; }
        .info { background: #f8f9fa; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Test Invoice</h1>
    <div class="info">
        <p><strong>Test Order #12345</strong></p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <p>This is a test invoice to verify PDF generation and ImageKit upload.</p>
    </div>
</body>
</html>
    `;
    
    const pdfUrl = await generateAndUploadInvoice(testHtml, 'TEST-' + Date.now());
    
    res.json({ 
      success: true, 
      message: "Test invoice generated successfully!", 
      pdfUrl 
    });
  } catch (error) {
    console.error("❌ Test invoice error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate test invoice", 
      error: error.message,
      stack: error.stack
    });
  }
});

// ============= ADMIN ROUTES =============

// Get dashboard stats
app.get("/admin/stats", verifyAdmin, async (req, res) => {
  try {
    const [totalOrdersResult, pendingOrdersResult, totalUsersResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM orders`,
      sql`SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`,
      sql`SELECT COUNT(*) as count FROM users`
    ]);

    res.json({
      totalOrders: parseInt(totalOrdersResult[0]?.count || 0),
      pendingOrders: parseInt(pendingOrdersResult[0]?.count || 0),
      totalProducts: 12, // Hardcoded for now, will be dynamic with products table
      totalUsers: parseInt(totalUsersResult[0]?.count || 0)
    });
  } catch (error) {
    console.error("❌ Error fetching admin stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all orders for admin
app.get("/admin/orders", verifyAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    let query;
    if (status && status !== 'all') {
      query = sql`
        SELECT o.*, u.name as user_name, u.email as user_email 
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.status = ${status}
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT o.*, u.name as user_name, u.email as user_email 
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const orders = await query;
    res.json(orders);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single order details for admin
app.get("/admin/orders/:id", verifyAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const orderResult = await sql`
      SELECT o.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ${orderId}
    `;

    if (!orderResult || orderResult.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult[0];

    // Get order items
    const items = await sql`
      SELECT * FROM order_items WHERE order_id = ${orderId}
    `;

    order.items = items;

    res.json(order);
  } catch (error) {
    console.error("❌ Error fetching order details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update order status
app.put("/admin/orders/:id", verifyAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status, shipping_address, total_amount } = req.body;

    // Get order details before update
    const orderResult = await sql`
      SELECT o.*, u.email as user_email, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ${orderId}
    `;

    if (!orderResult || orderResult.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const oldOrder = orderResult[0];

    // Check if there's anything to update
    if (status === undefined && shipping_address === undefined && total_amount === undefined) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Perform update with explicit fields
    await sql`
      UPDATE orders 
      SET 
        status = ${status !== undefined ? status : oldOrder.status},
        shipping_address = ${shipping_address !== undefined ? shipping_address : oldOrder.shipping_address},
        total_amount = ${total_amount !== undefined ? total_amount : oldOrder.total_amount}
      WHERE id = ${orderId}
    `;

    // Send email notification if status changed
    if (status && status !== oldOrder.status) {
      try {
        const statusMessages = {
          'pending': 'Your order is pending confirmation.',
          'processing': 'Your order is now being processed.',
          'shipped': 'Your order has been shipped!',
          'delivered': 'Your order has been delivered!',
          'cancelled': 'Your order has been cancelled.'
        };

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #ffc800; margin-bottom: 20px;">Order Status Update</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${oldOrder.user_name},</p>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Your order <strong>#${orderId}</strong> status has been updated.
              </p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;">Order Status:</p>
                <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #333; text-transform: uppercase;">${status}</p>
              </div>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                ${statusMessages[status] || 'Your order status has been updated.'}
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://rajuit.online/dashboard.html" 
                   style="background: #ffc800; color: #000; padding: 15px 40px; text-decoration: none; 
                          border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                  View Order Details
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 12px; color: #999; text-align: center;">
                Thank you for shopping with Raju IT!
              </p>
            </div>
          </div>
        `;

        await sendBrevoEmail({
          to: oldOrder.user_email,
          subject: `Order #${orderId} Status Update - ${status}`,
          htmlContent: emailHtml
        });

        console.log(`✅ Order status update email sent to ${oldOrder.user_email}`);
      } catch (emailError) {
        console.error("❌ Error sending status update email:", emailError);
        // Don't fail the request if email fails
      }
    }

    // Get updated order
    const updatedOrder = await sql`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ${orderId}
    `;

    res.json({
      success: true,
      message: "Order updated successfully",
      order: updatedOrder[0]
    });
  } catch (error) {
    console.error("❌ Error updating order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete order
app.delete("/admin/orders/:id", verifyAdmin, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // Delete order items first (cascade should handle this, but being explicit)
    await sql`DELETE FROM order_items WHERE order_id = ${orderId}`;

    // Delete order
    await sql`DELETE FROM orders WHERE id = ${orderId}`;

    res.json({
      success: true,
      message: "Order deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============= PRODUCT MANAGEMENT ROUTES =============
// Public API: Get all active products
app.get("/api/products", async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    
    let query;
    if (category && subcategory) {
      query = sql`
        SELECT * FROM products 
        WHERE is_active = true AND category = ${category} AND subcategory = ${subcategory}
        ORDER BY created_at DESC
      `;
    } else if (category) {
      query = sql`
        SELECT * FROM products 
        WHERE is_active = true AND category = ${category}
        ORDER BY created_at DESC
      `;
    } else {
      query = sql`
        SELECT * FROM products 
        WHERE is_active = true
        ORDER BY created_at DESC
      `;
    }
    
    const products = await query;
    res.json(products);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all products for admin
app.get("/admin/products", verifyAdmin, async (req, res) => {
  try {
    const products = await sql`
      SELECT * FROM products ORDER BY created_at DESC
    `;
    res.json(products);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single product
app.get("/admin/products/:id", verifyAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const products = await sql`
      SELECT * FROM products WHERE id = ${productId}
    `;
    
    if (!products || products.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    res.json(products[0]);
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new product
app.post("/admin/products", verifyAdmin, async (req, res) => {
  try {
    const { name, description, price, category, subcategory, image_url, stock_quantity, instagram_video_url } = req.body;
    
    console.log('Creating product with data:', { name, price, category, instagram_video_url });
    
    if (!name || !price || !category) {
      return res.status(400).json({ message: "Name, price, and category are required" });
    }
    
    const result = await sql`
      INSERT INTO products (name, description, price, category, subcategory, image_url, stock_quantity, instagram_video_url, is_active)
      VALUES (${name}, ${description || ''}, ${price}, ${category}, ${subcategory || ''}, ${image_url || ''}, ${stock_quantity || 0}, ${instagram_video_url || null}, true)
      RETURNING *
    `;
    
    res.json({
      success: true,
      message: "Product created successfully",
      product: result[0]
    });
  } catch (error) {
    console.error("❌ Error creating product:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update product
app.put("/admin/products/:id", verifyAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { name, description, price, category, subcategory, image_url, stock_quantity, is_active, instagram_video_url } = req.body;
    
    console.log('Updating product:', productId, 'with instagram_video_url:', instagram_video_url);
    
    // Check if product exists
    const existingProduct = await sql`SELECT * FROM products WHERE id = ${productId}`;
    if (!existingProduct || existingProduct.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Update product directly with all fields
    const result = await sql`
      UPDATE products 
      SET 
        name = ${name || existingProduct[0].name},
        description = ${description !== undefined ? description : existingProduct[0].description},
        price = ${price !== undefined ? price : existingProduct[0].price},
        category = ${category || existingProduct[0].category},
        subcategory = ${subcategory !== undefined ? subcategory : existingProduct[0].subcategory},
        image_url = ${image_url !== undefined ? image_url : existingProduct[0].image_url},
        stock_quantity = ${stock_quantity !== undefined ? stock_quantity : existingProduct[0].stock_quantity},
        is_active = ${is_active !== undefined ? is_active : existingProduct[0].is_active},
        instagram_video_url = ${instagram_video_url !== undefined ? (instagram_video_url || null) : existingProduct[0].instagram_video_url},
        updated_at = NOW()
      WHERE id = ${productId}
      RETURNING *
    `;
    
    res.json({
      success: true,
      message: "Product updated successfully",
      product: result[0]
    });
  } catch (error) {
    console.error("❌ Error updating product:", error);
    console.error("Error details:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete product
app.delete("/admin/products/:id", verifyAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    await sql`DELETE FROM products WHERE id = ${productId}`;
    
    res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get ImageKit authentication parameters (for frontend uploads)
app.get("/admin/imagekit-auth", verifyAdmin, async (req, res) => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    res.json(authenticationParameters);
  } catch (error) {
    console.error("❌ Error getting ImageKit auth:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============= USER MANAGEMENT ROUTES =============

// Set user as admin (for initial setup)
app.get("/admin/make-admin", async (req, res) => {
  try {
    const email = "rajuit1396@gmail.com";
    
    const result = await sql`
      UPDATE users 
      SET is_admin = true 
      WHERE email = ${email}
      RETURNING id, name, email, is_admin
    `;
    
    if (result && result.length > 0) {
      res.json({
        success: true,
        message: `User ${email} has been set as admin`,
        user: result[0]
      });
    } else {
      res.status(404).json({
        success: false,
        message: `User with email ${email} not found. Please register first.`
      });
    }
  } catch (error) {
    console.error("❌ Error setting admin:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users for admin
app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    console.log("📊 Fetching users list...");
    
    // Get all users
    const users = await sql`
      SELECT 
        id,
        name,
        email,
        phone,
        address,
        is_verified,
        is_admin
      FROM users
      ORDER BY id DESC
    `;
    
    console.log(`✅ Found ${users.length} users`);
    
    // Get order counts for each user (with error handling)
    let orderCounts = [];
    try {
      orderCounts = await sql`
        SELECT user_id, COUNT(*) as total_orders
        FROM orders
        GROUP BY user_id
      `;
      console.log(`✅ Found order counts for ${orderCounts.length} users`);
    } catch (orderError) {
      console.warn("⚠️ Could not fetch order counts:", orderError.message);
      // Continue without order counts
    }
    
    // Create a map of user_id to order count
    const orderCountMap = {};
    orderCounts.forEach(row => {
      orderCountMap[row.user_id] = parseInt(row.total_orders) || 0;
    });
    
    // Add order count to each user
    const usersWithOrders = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      is_verified: user.is_verified,
      is_admin: user.is_admin,
      total_orders: orderCountMap[user.id] || 0
    }));
    
    console.log("✅ Sending users data to client");
    res.json(usersWithOrders);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: error.toString()
    });
  }
});

// Get user statistics (MUST be before /:id route)
app.get("/admin/users/stats/summary", verifyAdmin, async (req, res) => {
  try {
    console.log("📊 Fetching user statistics...");
    
    const stats = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
      FROM users
    `;
    
    // Add default values for date-based stats (since created_at doesn't exist)
    const statsWithDefaults = {
      ...stats[0],
      new_users_30d: 0,
      new_users_7d: 0
    };
    
    console.log("✅ Stats fetched successfully:", statsWithDefaults);
    res.json(statsWithDefaults);
  } catch (error) {
    console.error("❌ Error fetching user statistics:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// Get user details with order history
app.get("/admin/users/:id", verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const userResult = await sql`
      SELECT id, name, email, phone, address, is_verified, is_admin
      FROM users 
      WHERE id = ${userId}
    `;
    
    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = userResult[0];
    
    // Get user's orders
    const orders = await sql`
      SELECT * FROM orders 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    
    user.orders = orders;
    
    res.json(user);
  } catch (error) {
    console.error("❌ Error fetching user details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user details
app.put("/admin/users/:id", verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, phone, address, is_verified, is_admin } = req.body;
    
    // Check if user exists
    const userCheck = await sql`
      SELECT id, is_admin FROM users WHERE id = ${userId}
    `;
    
    if (!userCheck || userCheck.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Prevent removing admin status from yourself
    const requestingUserId = req.user.id;
    if (userId === requestingUserId && userCheck[0].is_admin && !is_admin) {
      return res.status(403).json({ message: "Cannot remove your own admin status" });
    }
    
    // Check if email is already taken by another user
    if (email && email !== '') {
      const emailCheck = await sql`
        SELECT id FROM users WHERE email = ${email} AND id != ${userId}
      `;
      if (emailCheck && emailCheck.length > 0) {
        return res.status(409).json({ message: "Email already in use by another user" });
      }
    }
    
    // Build update query
    const updates = [];
    const params = { id: userId };
    
    if (name !== undefined && name !== '') {
      updates.push(`name = '${name.replace(/'/g, "''")}'`);
    }
    if (email !== undefined && email !== '') {
      updates.push(`email = '${email.replace(/'/g, "''")}'`);
    }
    if (phone !== undefined) {
      updates.push(`phone = '${phone ? phone.replace(/'/g, "''") : null}'`);
    }
    if (address !== undefined) {
      updates.push(`address = '${address ? address.replace(/'/g, "''") : null}'`);
    }
    if (is_verified !== undefined) {
      updates.push(`is_verified = ${is_verified === true || is_verified === 'true'}`);
    }
    if (is_admin !== undefined) {
      updates.push(`is_admin = ${is_admin === true || is_admin === 'true'}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ${userId} RETURNING id, name, email, phone, address, is_verified, is_admin, created_at`;
    const result = await sql.query(updateQuery);
    
    console.log(`✅ User ${userId} updated successfully`);
    res.json({ message: "User updated successfully", user: result.rows[0] });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete user
app.delete("/admin/users/:id", verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check if user exists
    const userCheck = await sql`
      SELECT id, is_admin, name, email FROM users WHERE id = ${userId}
    `;
    
    if (!userCheck || userCheck.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = userCheck[0];
    
    // Prevent deleting yourself
    const requestingUserId = req.user.id;
    if (userId === requestingUserId) {
      return res.status(403).json({ message: "Cannot delete your own account" });
    }
    
    // Optional: Prevent deleting admin users (uncomment if needed)
    // if (user.is_admin) {
    //   return res.status(403).json({ message: "Cannot delete admin users" });
    // }
    
    // Check if user has orders
    const ordersCheck = await sql`
      SELECT COUNT(*) as count FROM orders WHERE user_id = ${userId}
    `;
    const orderCount = parseInt(ordersCheck[0].count);
    
    // Delete user (orders will remain but user_id will be null or cascade delete based on your schema)
    await sql`DELETE FROM users WHERE id = ${userId}`;
    
    console.log(`✅ User ${userId} (${user.email}) deleted successfully. Had ${orderCount} orders.`);
    res.json({ 
      message: "User deleted successfully", 
      deletedUser: { id: userId, name: user.name, email: user.email },
      ordersCount: orderCount
    });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
    console.log(`✅ ImageKit configured: ${process.env.IMAGEKIT_URL_ENDPOINT}`);
});
