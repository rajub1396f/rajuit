# Flutter App - Backend Integration Checklist

## Before Launching App

### 1. Backend Server Verification

- [ ] Server is running on `https://rajuit.online`
- [ ] HTTPS certificate is valid
- [ ] CORS is properly configured for Flutter app
- [ ] Database is accessible and populated
- [ ] All API endpoints are responding

### 2. Required API Endpoints

#### Authentication
- [ ] `POST /register` - Working and returns user data
- [ ] `POST /login` - Returns JWT token
- [ ] `POST /verify-email` - Email verification works
- [ ] `POST /forgot-password` - Password reset sends email

#### Products
- [ ] `GET /get-products` - Returns all products with images
- [ ] `GET /product/:id` - Returns individual product details
- [ ] `GET /products/:category` - Category filtering works (male/female)

#### Orders
- [ ] `POST /create-order` - Creates order and generates invoice
- [ ] `GET /get-orders` - Returns user's orders
- [ ] `GET /get-invoice/:orderId` - Returns invoice URL
- [ ] Orders appear in admin dashboard after creation

#### User Profile
- [ ] `GET /user/profile` - Returns user information
- [ ] `PUT /user/profile` - Updates user info

### 3. Database Tables

Verify all tables exist with correct structure:

```sql
-- Check tables
SHOW TABLES;

-- Verify users table
DESCRIBE users;
-- Required columns: id, name, email, phone, password, is_verified, created_at

-- Verify products table
DESCRIBE products;
-- Required columns: id, name, description, price, image, category, stock, rating, reviews, created_at

-- Verify orders table
DESCRIBE orders;
-- Required columns: id, user_id, total_amount, status, shipping_address, invoice_pdf_url, created_at

-- Verify order_items table
DESCRIBE order_items;
-- Required columns: id, order_id, product_name, product_image, quantity, price
```

- [ ] users table exists with all columns
- [ ] products table has test data
- [ ] orders table exists and empty
- [ ] order_items table exists and empty
- [ ] Foreign keys properly configured

### 4. Sample Test Data

Create test data for development:

```sql
-- Test User
INSERT INTO users (name, email, phone, password, is_verified) 
VALUES ('Test User', 'test@example.com', '01712345678', 'hashed_password', true);

-- Test Products
INSERT INTO products (name, description, price, image, category, stock, rating)
VALUES 
('Test Product 1', 'Description', 1500, 'image_url', 'male', 10, 4.5),
('Test Product 2', 'Description', 2000, 'image_url', 'female', 15, 4.0);
```

- [ ] At least 10 test products
- [ ] Mix of male and female categories
- [ ] Valid product images or image URLs
- [ ] Stock quantities set correctly

### 5. Environment Configuration

In your Node.js server (.env file):

```
POSTGRES_URL=your_database_url
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

- [ ] Database URL is correct
- [ ] JWT secret is strong
- [ ] All environment variables set
- [ ] No sensitive data in code

### 6. Email Configuration

Verify email system for:
- [ ] User registration confirmation emails send
- [ ] Password reset emails send
- [ ] Order confirmation emails send
- [ ] Email format is professional
- [ ] From email address is correct

### 7. Image/File Hosting

- [ ] Product images load correctly
- [ ] Generated invoices store properly
- [ ] Image URLs are accessible
- [ ] File paths are correct

### 8. Security Setup

- [ ] HTTPS enabled on all endpoints
- [ ] CORS allows app domain (if applicable)
- [ ] Rate limiting configured (optional)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection enabled

### 9. Error Handling

Test error responses:

```bash
# Test 400 Bad Request
curl -X POST https://rajuit.online/login \
  -H "Content-Type: application/json" \
  -d '{"email":"","password":""}'

# Test 401 Unauthorized
curl -X GET https://rajuit.online/get-orders \
  -H "Authorization: Bearer invalid_token"

# Test 404 Not Found
curl https://rajuit.online/product/99999

# Test 500 Server Error
# (Check server logs)
```

- [ ] 400 returns meaningful error message
- [ ] 401 returns auth error
- [ ] 404 returns not found
- [ ] 500 returns server error

### 10. Performance Testing

- [ ] Product list loads in < 2 seconds
- [ ] Search response time < 1 second
- [ ] Order creation < 3 seconds
- [ ] Database queries optimized
- [ ] No N+1 query problems

### 11. Testing with Flutter App

In Flutter app (lib/config/constants.dart):

```dart
static const String baseUrl = 'https://rajuit.online';
```

- [ ] Backend URL configured correctly
- [ ] Can run `flutter run` without build errors
- [ ] Can register new user via app
- [ ] Can login via app
- [ ] Can browse products via app
- [ ] Can add items to cart
- [ ] Can create order from app
- [ ] New order appears in database

### 12. Verify Order Flow

1. **From App Side:**
   ```dart
   // User fills checkout
   // Taps "Place Order"
   // App sends POST /create-order
   ```

2. **Backend Processing:**
   ```javascript
   // Receives order data
   // Validates user token
   // Creates order in database
   // Inserts order items
   // Generates PDF invoice
   // Sends confirmation email
   // Returns order confirmation
   ```

3. **From Admin Dashboard:**
   - [ ] Order appears in `/admin/orders`
   - [ ] Order has all customer details
   - [ ] Order items are listed
   - [ ] Invoice PDF is generated
   - [ ] Order status is "pending"

4. **From App:**
   - [ ] Order appears in "Orders" screen
   - [ ] Shows correct total amount
   - [ ] Shows correct items
   - [ ] Shows shipping address
   - [ ] Can tap to see details

- [ ] Complete flow works end-to-end

### 13. Multiple Orders Testing

Create multiple orders to verify:

- [ ] Each order has unique ID
- [ ] Order history shows all orders
- [ ] Orders are sorted by date
- [ ] No orders are missing
- [ ] Quantities are tracked correctly

### 14. Payment Method Verification

Test each payment method:

- [ ] COD (Cash on Delivery) - creates order with "cod" status
- [ ] Card - creates order with "card" status
- [ ] Bank Transfer - creates order with "bank" status

In database:
```sql
SELECT * FROM orders;
-- Should show different statuses for payment methods
```

- [ ] All payment methods recorded correctly

### 15. Admin Dashboard Integration

Verify admin can:

- [ ] See all orders from all users
- [ ] See order details
- [ ] Update order status
- [ ] View customer information
- [ ] Download invoices
- [ ] Export orders (if implemented)

- [ ] Admin dashboard syncs with app orders
- [ ] Order updates are visible in real-time

### 16. Logging & Monitoring

Set up logging to track:

```javascript
// In server.js
console.log(`📋 New order created: #${orderId} by user ${userId}`);
console.log(`💰 Order total: ৳${totalAmount}`);
console.log(`📧 Invoice generated and stored`);
```

- [ ] Server logs order creation
- [ ] Error logs capture failures
- [ ] Logs are easily searchable
- [ ] No sensitive data in logs

### 17. Backup & Recovery

- [ ] Database backups scheduled daily
- [ ] Backups are tested for recovery
- [ ] Invoice files backed up
- [ ] Recovery procedure documented

### 18. Documentation

- [ ] API endpoints documented with request/response examples
- [ ] Database schema documented
- [ ] Deployment procedures written
- [ ] Troubleshooting guide created

### 19. Go-Live Checklist

Before announcing app:

- [ ] All endpoints tested
- [ ] Database optimized
- [ ] Backups working
- [ ] Monitoring enabled
- [ ] Support contacts updated
- [ ] Release notes prepared
- [ ] Marketing materials ready

### 20. Post-Launch Monitoring

After app launch:

- [ ] Monitor server logs for errors
- [ ] Track API response times
- [ ] Monitor database performance
- [ ] Gather user feedback
- [ ] Plan version 1.1 updates
- [ ] Fix critical bugs immediately

## Quick Validation Script

```bash
#!/bin/bash

# Test all endpoints
echo "Testing endpoints..."

# Test register
curl -X POST https://rajuit.online/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"pass123","phone":"01712345678"}'

echo "\n---\n"

# Test login
curl -X POST https://rajuit.online/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'

echo "\n---\n"

# Test get products
curl https://rajuit.online/get-products

echo "\n---\n"

echo "Endpoint validation complete!"
```

## Success Indicators

✅ All API endpoints return 200/201 responses
✅ JWT tokens are properly issued and validated
✅ Orders created from app appear in database
✅ Orders appear in admin dashboard
✅ No console errors in server logs
✅ Database queries are fast
✅ Images load without delays
✅ Email notifications send
✅ Invoices generate correctly
✅ User can complete order in under 2 minutes

## Red Flags

🚨 API returns 500 errors - Check server logs
🚨 Products not loading - Check database connection
🚨 Orders not saving - Check INSERT permissions
🚨 Emails not sending - Check SMTP configuration
🚨 Images showing as broken - Check image URLs
🚨 Slow response times - Optimize queries
🚨 Token validation fails - Check JWT_SECRET

## Support Contacts

- Backend Developer: [Your Contact]
- Database Admin: [Your Contact]
- DevOps: [Your Contact]
- Monitoring: [Monitoring Tool URL]

---

**Status**: Pre-Launch
**Last Updated**: January 30, 2024
**Next Review**: Before App Store Submission
