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

// Test connection
(async () => {
  try {
    await sql`SELECT 1`;
    console.log("✅ Connected to Neon DB!");
  } catch (err) {
    console.error("❌ Neon DB connection error:", err);
  }
})();

// Function to generate PDF and upload to ImageKit
async function generateAndUploadInvoice(htmlContent, orderId) {
  let browser;
  try {
    console.log(`📄 Generating PDF for order #${orderId}...`);
    
    // Launch puppeteer browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF as buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    await browser.close();
    console.log(`✅ PDF generated successfully`);
    
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
    if (browser) await browser.close();
    console.error('❌ Error generating/uploading invoice:', error);
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
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get orders with items
    const orders = await sql`
      SELECT 
        o.id, 
        o.total_amount, 
        o.status, 
        o.shipping_address, 
        o.created_at,
        json_agg(
          json_build_object(
            'name', oi.product_name,
            'image', oi.product_image,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ${userId}
      GROUP BY o.id, o.total_amount, o.status, o.shipping_address, o.created_at
      ORDER BY o.created_at DESC
    `;

    res.json({ orders });
  } catch (err) {
    console.error("❌ Get orders error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});



// Create Order (for future purchase functionality)
app.post("/create-order", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    // Get user details
    const userResult = await sql`SELECT name, email FROM users WHERE id = ${userId}`;
    const user = userResult[0];

    // Create order
    const orderResult = await sql`
      INSERT INTO orders (user_id, total_amount, status, shipping_address)
      VALUES (${userId}, ${totalAmount}, 'pending', ${shippingAddress})
      RETURNING id, created_at
    `;

    const orderId = orderResult[0].id;
    const orderDate = new Date(orderResult[0].created_at);

    // Insert order items
    for (const item of items) {
      await sql`
        INSERT INTO order_items (order_id, product_name, product_image, quantity, price)
        VALUES (${orderId}, ${item.name}, ${item.image || null}, ${item.quantity}, ${item.price})
      `;
    }

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

    // Generate PDF and upload to Cloudinary
    let invoicePdfUrl = null;
    let pdfError = null;
    
    try {
      invoicePdfUrl = await generateAndUploadInvoice(invoiceHtml, orderId);
      console.log(`✅ Invoice PDF uploaded: ${invoicePdfUrl}`);
    } catch (error) {
      console.error("❌ Error generating/uploading PDF:", error);
      pdfError = error.message;
    }

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

    res.json({ 
      success: true, 
      message: "Order created successfully", 
      orderId,
      invoiceHtml,
      invoicePdfUrl,
      emailSent,
      emailError: emailSent ? null : `Email could not be sent: ${emailError}. You can download your invoice from the order confirmation page.`,
      pdfError: invoicePdfUrl ? null : `PDF could not be generated: ${pdfError}`
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

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get order details
    const orderResult = await sql`
      SELECT o.*, u.name, u.email 
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ${orderId} AND o.user_id = ${userId}
    `;

    if (!orderResult || orderResult.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult[0];

    // Get order items
    const itemsResult = await sql`
      SELECT product_name as name, product_image as image, quantity, price
      FROM order_items
      WHERE order_id = ${orderId}
    `;

    const items = itemsResult;
    const orderDate = new Date(order.created_at);
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
        // Redirect URLs with .html to clean URLs
        const cleanPath = req.path.slice(0, -5);
        return res.redirect(301, cleanPath);
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

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});