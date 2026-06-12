# Complete Flutter App Documentation

## 📱 App Overview

The Raju IT Fashion Store Flutter app is a comprehensive e-commerce mobile application that allows users to:
- Browse fashion products
- Manage a shopping cart
- Place orders
- Track order status
- View their profile and order history

The app syncs seamlessly with your Node.js backend and admin dashboard.

## 🎯 Key Features

### 1. User Authentication
**Login Screen**
- Email & password authentication
- "Forgot Password" link
- Register new account option
- JWT token-based session management
- Secure token storage with encryption

**Register Screen**
- Full name, email, phone, password
- Password confirmation validation
- Form validation
- Automatic redirect to login on success

### 2. Product Catalog
**Home Screen (Product Listing)**
- Display all products with images and prices
- Category filtering (Male/Female)
- Search functionality
- Add to cart with quantity
- Product cards with ratings

**Product Detail Screen**
- Full product information
- High-resolution image
- Detailed description
- Rating and reviews count
- Stock availability
- Quantity selector
- Add to cart button

### 3. Shopping Cart
**Cart Screen**
- List all added items
- Product image, name, price
- Increment/decrement quantity
- Remove items
- Real-time price calculation
- Cart total with tax & shipping
- Proceed to checkout button

**Checkout Screen**
- Order summary
- Shipping address input
- Phone number
- Payment method selection (COD, Card, Bank)
- Final order review
- Place order button

### 4. Order Management
**Orders Screen**
- List all user orders
- Order ID and status
- Order date
- Total amount
- Item count
- Status color coding
- Click to view details

**Order Details (Bottom Sheet)**
- Complete item list
- Unit prices and quantities
- Shipping address
- Total amount breakdown

### 5. User Profile
**Profile Screen**
- User information display
- Email verification status
- Account settings
- Change password
- Security settings
- About section
- Logout button

## 🔄 Complete User Journey

### Registration & Login Flow
```
App Launch
    ↓
Check if token exists
    ↓
Token exists? → YES → Load user profile → HOME SCREEN
                ↓
              NO → LOGIN SCREEN
                    ↓
                User enters credentials
                    ↓
                Backend validates
                    ↓
                Returns JWT token
                    ↓
                Token stored securely
                    ↓
                HOME SCREEN
```

### Shopping Flow
```
HOME SCREEN (Products)
    ↓
Select product (tap card)
    ↓
PRODUCT DETAIL SCREEN
    ↓
Adjust quantity
    ↓
Add to cart
    ↓
Navigation bar → Cart icon
    ↓
CART SCREEN
    ↓
Review items
    ↓
Proceed to checkout
    ↓
CHECKOUT SCREEN
    ↓
Fill delivery address
    ↓
Select payment method
    ↓
Place order
    ↓
Order confirmation
    ↓
Cart cleared
    ↓
Navigate to Orders
    ↓
Order visible in history
    ↓
Order synced to Admin Dashboard
```

## 📊 Data Models

### User Model
```dart
UserModel {
  int id,
  String name,
  String email,
  String phone,
  bool isVerified,
  String role,
  String createdAt
}
```

### Product Model
```dart
ProductModel {
  int id,
  String name,
  String description,
  double price,
  String image,
  String category,
  int stock,
  double rating,
  int reviews,
  String createdAt
}
```

### Order Model
```dart
OrderModel {
  int id,
  int userId,
  double totalAmount,
  String status,
  String shippingAddress,
  String invoicePdfUrl,
  String createdAt,
  List<OrderItemModel> items
}
```

### CartItem Model
```dart
CartItem {
  int id,
  String name,
  double price,
  int quantity,
  String image,
  int productId
}
```

## 🔌 API Integration

### Request/Response Flow

**Login Request**
```json
POST /login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login Response**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "01712345678",
    "is_verified": true
  }
}
```

**Create Order Request**
```json
POST /create-order
Authorization: Bearer <token>
{
  "items": [
    {
      "name": "Product Name",
      "price": 1500,
      "quantity": 2,
      "image": "url"
    }
  ],
  "totalAmount": 3565,
  "shippingAddress": "123 Main St, City",
  "paymentMethod": "cod"
}
```

**Create Order Response**
```json
{
  "success": true,
  "message": "Order created successfully",
  "orderId": 123,
  "invoiceUrl": "https://...",
  "order": {
    "id": 123,
    "user_id": 1,
    "total_amount": 3565,
    "status": "pending",
    "shipping_address": "123 Main St, City",
    "created_at": "2024-01-30T10:30:00",
    "items": [...]
  }
}
```

## 🗂️ File Organization

```
flutter-app/
├── lib/
│   ├── main.dart                    # App entry point
│   │
│   ├── config/
│   │   └── constants.dart           # App configuration
│   │
│   ├── models/
│   │   ├── user_model.dart
│   │   ├── product_model.dart
│   │   └── order_model.dart
│   │
│   ├── services/
│   │   ├── api_service.dart         # API communication
│   │   └── storage_service.dart     # Token & data storage
│   │
│   ├── providers/                   # State management
│   │   ├── auth_provider.dart
│   │   ├── product_provider.dart
│   │   ├── cart_provider.dart
│   │   └── order_provider.dart
│   │
│   └── screens/
│       ├── auth/
│       │   ├── login_screen.dart
│       │   └── register_screen.dart
│       ├── home/
│       │   └── home_screen.dart
│       ├── product/
│       │   └── product_detail_screen.dart
│       ├── cart/
│       │   ├── cart_screen.dart
│       │   └── checkout_screen.dart
│       ├── orders/
│       │   └── orders_screen.dart
│       └── profile/
│           └── profile_screen.dart
│
├── android/                         # Android native code
├── ios/                            # iOS native code
├── test/                           # Unit tests
│
├── pubspec.yaml                    # Dependencies
├── pubspec.lock                    # Lock file
├── README.md
├── SETUP_GUIDE.md
└── CHECKLIST.md
```

## 🛠️ State Management with Provider

### AuthProvider
Manages user authentication state:
```dart
// Properties
- User? user
- String? token
- bool isLoggedIn
- bool isLoading
- String? error

// Methods
- Future<bool> login(email, password)
- Future<bool> register(name, email, password, phone)
- Future<bool> verifyEmail(code)
- Future<bool> forgotPassword(email)
- Future<void> logout()
```

### ProductProvider
Manages product data:
```dart
// Properties
- List<ProductModel> products
- ProductModel? selectedProduct
- bool isLoading
- String selectedCategory

// Methods
- Future<void> fetchProducts()
- Future<void> fetchProductsByCategory(category)
- void searchProducts(query)
- void filterByPrice(min, max)
- void sortByPrice(ascending)
```

### CartProvider
Manages shopping cart:
```dart
// Properties
- List<CartItem> items
- int itemCount
- double totalPrice
- double grandTotal

// Methods
- void addItem(cartItem)
- void removeItem(itemId)
- void updateQuantity(itemId, quantity)
- void clearCart()
- List<OrderItemRequest> getOrderItems()
```

### OrderProvider
Manages orders:
```dart
// Properties
- List<OrderModel> orders
- OrderModel? selectedOrder
- bool isLoading
- bool isCreating

// Methods
- Future<void> fetchOrders()
- Future<bool> createOrder(request)
- Future<void> selectOrder(orderId)
- Future<bool> updateOrderStatus(orderId, status)
```

## 🔐 Security Implementation

1. **Token Management**
   - JWT tokens stored in secure storage
   - Automatic inclusion in API headers
   - Token validation on app launch

2. **Data Encryption**
   - flutter_secure_storage for sensitive data
   - Encrypted shared preferences
   - No passwords stored locally

3. **API Security**
   - HTTPS only communication
   - Authorization header on protected routes
   - Input validation on all forms

4. **User Privacy**
   - No sensitive data in logs
   - Secure logout clears all data
   - No analytics of personal information

## 📈 Performance Optimizations

1. **Image Caching**
   - Network images cached automatically
   - Reduced re-fetching

2. **List Optimization**
   - GridView with proper height calculation
   - LazyLoading for products

3. **State Management**
   - Provider pattern minimizes rebuilds
   - Consumer only rebuilds when needed

4. **Local Storage**
   - Cart persisted locally
   - User info cached
   - Reduced API calls

## 🚀 Deployment Steps

### Android
1. Update version in `pubspec.yaml`
2. Run `flutter build apk --release`
3. Sign APK
4. Upload to Google Play Store

### iOS
1. Update version in `pubspec.yaml`
2. Run `flutter build ios --release`
3. Archive with Xcode
4. Submit to App Store

## 🐛 Debugging

### Enable Debug Logging
```dart
// In ApiService, logging interceptor is enabled in debug mode
// View logs in: `flutter logs` or Android Studio logcat
```

### Common Issues

**Issue: "Failed to connect to backend"**
- Check `BASE_URL` in constants.dart
- Verify backend server is running
- Check network connectivity

**Issue: "Token invalid or expired"**
- Force logout: Restart app or use Settings
- Backend token may have expired
- Check token format in secure storage

**Issue: "Order not appearing in app"**
- Refresh orders: Pull down on Orders screen
- Check order creation response
- Verify backend database

## 📱 Screen Navigation

```
Login Screen
├─→ Register Screen (if new user)
└─→ Home Screen
   ├─→ Product Detail Screen
   │  └─→ Cart Screen
   │     └─→ Checkout Screen
   │        └─→ Order Confirmation
   ├─→ Cart Screen (from navbar)
   ├─→ Orders Screen (from navbar)
   └─→ Profile Screen (from navbar)
      └─→ Logout → Login Screen
```

## 💡 Tips & Best Practices

1. Always check if user is logged in before accessing protected screens
2. Clear error messages after dismissing dialogs
3. Show loading indicators during API calls
4. Validate all form inputs before submission
5. Handle network errors gracefully
6. Cache frequently accessed data
7. Test on both Android and iOS devices
8. Monitor backend logs when debugging

## 📞 Support

- **App Issues**: Check Flutter documentation and app logs
- **Backend Issues**: Review server.js logs
- **Sync Issues**: Verify JWT token is valid
- **Order Issues**: Check both app logs and server database

## Version History

- **v1.0.0** (Initial Release)
  - User authentication
  - Product browsing
  - Shopping cart
  - Order creation & tracking
  - User profile

## Future Enhancements

- [ ] Push notifications for order updates
- [ ] Payment gateway integration
- [ ] Wishlist functionality
- [ ] Product reviews & ratings from app
- [ ] Order tracking with map
- [ ] Multiple address management
- [ ] Referral program
- [ ] Firebase analytics
- [ ] In-app chat support
