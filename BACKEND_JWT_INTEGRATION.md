# Backend JWT Integration Guide

This guide explains how to implement the JWT token refresh endpoint required by the Flutter app.

## Required Backend Changes

### 1. Install JWT Package (if not already installed)

```bash
npm install jsonwebtoken
```

### 2. Create Refresh Token Endpoint

Add this endpoint to your `server_backend.js`:

```javascript
// ==================== REFRESH TOKEN ENDPOINT ====================

app.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    if (!token && !refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    // Use provided refresh token or fall back to auth header
    const tokenToVerify = refreshToken || token;

    // Verify the refresh token
    jwt.verify(tokenToVerify, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid refresh token',
          error: err.message 
        });
      }

      // Generate new JWT token
      const newToken = jwt.sign(
        { 
          id: decoded.id, 
          email: decoded.email,
          name: decoded.name,
          phone: decoded.phone 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' } // Token expires in 1 hour
      );

      res.json({
        success: true,
        token: newToken,
        expiresIn: 3600, // 1 hour in seconds
        message: 'Token refreshed successfully'
      });
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during token refresh' 
    });
  }
});
```

### 3. Verify JWT Middleware

Add this middleware to verify tokens on protected routes:

```javascript
// ==================== JWT VERIFICATION MIDDLEWARE ====================

function verifyJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'No authorization token' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Return 401 so Flutter app can attempt refresh
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token',
        error: err.message 
      });
    }

    req.userId = decoded.id;
    req.user = decoded;
    next();
  });
}
```

### 4. Apply Middleware to Protected Routes

```javascript
// Before protected endpoints, add verifyJWT middleware:

// Get invoices
app.get('/invoices/sync', verifyJWT, async (req, res) => {
  try {
    const userId = req.userId;
    
    const invoices = await sql`
      SELECT * FROM invoices 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    res.json({
      success: true,
      invoices: invoices,
      message: 'Invoices fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching invoices' 
    });
  }
});

// Get single invoice
app.get('/get-invoice/:orderId', verifyJWT, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.userId;

    const order = await sql`
      SELECT * FROM orders 
      WHERE id = ${orderId} AND user_id = ${userId}
    `;

    if (order.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Generate invoice or get from storage
    const invoice = generateInvoiceForOrder(order[0]);

    res.json({
      success: true,
      invoice: invoice,
      message: 'Invoice fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching invoice' 
    });
  }
});

// Verify invoice authenticity
app.post('/verify-invoice/:orderId', verifyJWT, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.userId;

    const order = await sql`
      SELECT * FROM orders 
      WHERE id = ${orderId} AND user_id = ${userId}
    `;

    const verified = order.length > 0;

    res.json({
      success: true,
      verified: verified,
      message: verified ? 'Invoice verified' : 'Invoice not found'
    });
  } catch (error) {
    console.error('Error verifying invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error verifying invoice',
      verified: false 
    });
  }
});

// Get all user orders with JWT
app.get('/get-orders', verifyJWT, async (req, res) => {
  try {
    const userId = req.userId;

    const orders = await sql`
      SELECT * FROM orders 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    res.json({
      success: true,
      orders: orders,
      message: 'Orders fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching orders' 
    });
  }
});
```

### 5. Update Login Endpoint

Ensure your login endpoint returns both access token and expiry:

```javascript
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate user and password...
    const user = await sql`SELECT * FROM users WHERE email = ${email}`;

    if (user.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const validPassword = await bcrypt.compare(password, user[0].password);
    
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        phone: user[0].phone
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // 1 hour expiry
    );

    // Generate refresh token (longer expiry)
    const refreshToken = jwt.sign(
      { id: user[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // 7 days for refresh
    );

    res.json({
      success: true,
      token: token,
      refreshToken: refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        phone: user[0].phone,
        isVerified: user[0].is_verified
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});
```

### 6. Environment Configuration

Ensure these are set in your `.env` file:

```
JWT_SECRET=SuperSecretKey123!@#
NODE_ENV=production
```

The JWT_SECRET should be:
- At least 32 characters
- Complex with numbers, symbols, letters
- Same as configured on Render

## Testing the Endpoints

### Test 1: Login and Get Token

```bash
curl -X POST https://rajuit.online/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {...}
}
```

### Test 2: Use Token to Get Orders

```bash
curl -X GET https://rajuit.online/get-orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response:
{
  "success": true,
  "orders": [...]
}
```

### Test 3: Refresh Token

```bash
curl -X POST https://rajuit.online/refresh-token \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

### Test 4: Get Invoice with JWT

```bash
curl -X GET https://rajuit.online/get-invoice/123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response:
{
  "success": true,
  "invoice": {...}
}
```

## Deployment Steps

1. **Update server_backend.js** with above endpoints
2. **Set JWT_SECRET** on Render environment variables
3. **Test locally first:**
   ```bash
   node server_backend.js
   # Test endpoints with curl
   ```
4. **Deploy to Render:**
   ```bash
   git add .
   git commit -m "Add JWT refresh and secure invoice endpoints"
   git push
   ```
5. **Verify on production:**
   - Test login endpoint
   - Test token refresh
   - Test invoice endpoints
   - Check Render logs for errors

## Troubleshooting

### Issue: "JWT malformed"

**Solution:**
- Ensure JWT_SECRET is set on Render
- Check token format in Authorization header
- Verify token hasn't been truncated

### Issue: "Unexpected token" errors

**Solution:**
- Verify JWT_SECRET matches between login and refresh
- Check that tokens are properly stringified
- Ensure no extra spaces in token

### Issue: 401 on every request

**Solution:**
- Check JWT_SECRET is configured correctly
- Verify token expiry is appropriate (not too short)
- Check server logs for JWT verification errors

## Security Best Practices

1. **Use HTTPS** - Always transmit tokens over HTTPS
2. **Rotate secrets** - Regularly update JWT_SECRET
3. **Short expiry** - Keep token expiry short (15-60 minutes)
4. **Refresh tokens** - Use longer expiry for refresh tokens (7-30 days)
5. **Log attempts** - Monitor failed token verifications
6. **Rate limiting** - Limit refresh token requests

---

**Last Updated:** January 31, 2026
