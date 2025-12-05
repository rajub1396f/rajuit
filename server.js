const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
require("dotenv").config();
const nodemailer = require("nodemailer");
const puppeteer = require('puppeteer');
const ImageKit = require('imagekit');

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

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// ✅ Create Gmail transporter
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER || "rajuit1396@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD || "otldvhcmpxmlqgyn"
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify Gmail transporter
if (true) {
    transporter.verify((error, success) => {
        if (error) {
            console.error("❌ Gmail transporter error:", error.message);
        } else {
            console.log("✅ Gmail transporter ready!");
        }
    });
}

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
    
  } catch (err) {
    console.error("❌ Database initialization error:", err);
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

app.get("/dashboard", (req, res) => {
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
    console.log(`📦 Items count: ${items?.length}, Total: SAR ${totalAmount}`);

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
        <p>📧 rajuit1396@gmail.com | 📱 +966539082027</p>
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
            ${items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td class="text-right">SAR ${item.price.toFixed(2)}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">SAR ${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div style="clear: both;"></div>
    <div class="totals">
        <div class="totals-row">
            <span>Subtotal:</span>
            <span>SAR ${subtotal.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span>Shipping:</span>
            <span>SAR ${shipping.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span>Tax (15%):</span>
            <span>SAR ${tax.toFixed(2)}</span>
        </div>
        <div class="totals-row total">
            <span>TOTAL:</span>
            <span>SAR ${total.toFixed(2)}</span>
        </div>
    </div>
    
    <div style="clear: both;"></div>
    <div class="thank-you">Thank You for Your Order! 🎉</div>
    
    <div class="footer">
        <p><strong>Terms & Conditions:</strong></p>
        <p>Payment is due within 7 days. Please include invoice number with your payment.<br>
        For questions about this invoice, contact us at rajuit1396@gmail.com or +966539082027</p>
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

    // Send invoice email to customer
    let emailSent = false;
    let emailError = null;
    
    try {
      console.log(`📧 Attempting to send invoice to ${user.email}...`);
      console.log(`📤 Using SMTP: ${process.env.GMAIL_USER || "rajuit1396@gmail.com"}`);
      
      const mailOptions = {
        from: `"Raju IT" <${process.env.GMAIL_USER || "rajuit1396@gmail.com"}>`,
        to: user.email,
        subject: `Order Confirmation & Invoice #${orderId.toString().padStart(6, '0')} - Raju IT`,
        html: invoicePdfUrl ? 
          `${invoiceHtml}<br><br><div style="text-align: center; margin: 30px 0;"><a href="${invoicePdfUrl}" style="background: #ffc800; color: #212529; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">📥 Download Invoice PDF</a></div>` 
          : invoiceHtml,
        text: `Your order #${orderId} has been placed successfully. Thank you for shopping with Raju IT!${invoicePdfUrl ? `\n\nDownload your invoice: ${invoicePdfUrl}` : ''}`
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Invoice email sent successfully to ${user.email}`);
      console.log(`📨 Message ID: ${info.messageId}`);
      emailSent = true;
    } catch (error) {
      console.error("❌ Error sending invoice email:", error);
      console.error("❌ Error details:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response
      });
      emailError = error.message;
    }

    console.log(`✅ Order #${orderId} created successfully, returning response to client`);
    
    res.json({ 
      success: true, 
      message: "Order created successfully", 
      orderId,
      invoiceHtml,
      invoicePdfUrl: null, // PDF will be generated in background
      emailSent,
      emailError: emailSent ? null : (emailError ? `Email could not be sent: ${emailError}. You can download your invoice from the order confirmation page.` : null),
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
        <p>📧 rajuit1396@gmail.com | 📱 +966539082027</p>
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
            ${items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td class="text-right">SAR ${item.price.toFixed(2)}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">SAR ${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div style="clear: both;"></div>
    <div class="totals">
        <div class="totals-row">
            <span>Subtotal:</span>
            <span>SAR ${subtotal.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span>Shipping:</span>
            <span>SAR ${shipping.toFixed(2)}</span>
        </div>
        <div class="totals-row">
            <span>Tax (15%):</span>
            <span>SAR ${tax.toFixed(2)}</span>
        </div>
        <div class="totals-row total">
            <span>TOTAL:</span>
            <span>SAR ${total.toFixed(2)}</span>
        </div>
    </div>
    
    <div style="clear: both;"></div>
    <div class="thank-you">Thank You for Your Order! 🎉</div>
    
    <div class="footer">
        <p><strong>Terms & Conditions:</strong></p>
        <p>Payment is due within 7 days. Please include invoice number with your payment.<br>
        For questions about this invoice, contact us at rajuit1396@gmail.com or +966539082027</p>
        <p style="margin-top: 20px;">© 2025 Raju IT. All rights reserved.</p>
    </div>
</body>
</html>
    `;

    res.json({ 
      success: true, 
      invoiceHtml,
      orderId
    });
  } catch (err) {
    console.error("❌ Get invoice error:", err);
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
    res.sendFile(path.join(__dirname, 'home.html'));
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
        console.log("📤 Sending email via Gmail...");
        
        const mailOptions = {
            from: process.env.GMAIL_USER || "rajuit1396@gmail.com",
            to: process.env.GMAIL_USER || "rajuit1396@gmail.com",
            subject: "New Contact Form Message from Raju IT Website",
            html: emailHtml,
            replyTo: email
        };
        
        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully via Gmail!");
        
        res.json({ success: true, message: "Message sent successfully!" });

    } catch (error) {
        console.error("❌ Email sending error:", error.message);
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

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
    console.log(`✅ ImageKit configured: ${process.env.IMAGEKIT_URL_ENDPOINT}`);
});