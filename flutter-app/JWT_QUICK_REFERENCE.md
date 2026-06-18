# JWT Token & Invoice Sync - Quick Reference

## 🎯 What's Implemented

✅ JWT token security with automatic refresh  
✅ Secure invoice caching (24-hour expiry)  
✅ Invoice verification endpoints  
✅ Batch invoice synchronization  
✅ Encrypted token storage  
✅ Automatic retry on token expiry  

## 📱 Current Status

- **Device:** Moto G24 running app
- **Backend:** rfashion.online (Render)
- **Status:** ✅ Running with JWT authentication
- **Logs:** `[JWT] Token added to request` ✓

## 🔐 JWT Flow

```
1. Login → Get JWT + Refresh Token
   ↓
2. Store in encrypted device storage
   ↓
3. Add to every API request: "Authorization: Bearer {JWT}"
   ↓
4. Server validates JWT
   ↓
5. If expires (401) → Refresh token automatically
   ↓
6. Get new JWT, retry request
   ↓
7. User sees no interruption
```

## 💾 Storage Methods

```dart
// Tokens
await StorageService.saveToken(token, expiryInSeconds: 3600);
String? token = await StorageService.getToken();
bool valid = await StorageService.isTokenValid();

// Refresh Token
await StorageService.saveRefreshToken(refreshToken);
String? refreshToken = await StorageService.getRefreshToken();

// Invoices
await StorageService.saveInvoiceSync(orderId, data, token);
Map? invoice = await StorageService.getInvoiceSync(orderId);
bool needsRefresh = await StorageService.invoiceNeedsRefresh(orderId);
```

## 📡 API Methods

```dart
// Get invoice securely
String invoice = await apiService.getInvoiceSecure(orderId);

// Verify invoice is authentic
bool verified = await apiService.verifyInvoiceAuthority(orderId);

// Sync all invoices
List<Map> invoices = await apiService.syncAllInvoices();
```

## 🛠️ Backend Endpoints Required

```
POST /login           ← Returns {token, refreshToken, expiresIn}
POST /refresh-token   ← Takes refreshToken, returns new {token}
GET /get-invoice/:id  ← Requires JWT Bearer token
POST /verify-invoice/:id ← Requires JWT Bearer token
GET /invoices/sync    ← Requires JWT Bearer token
```

## ⚙️ Token Refresh Logic

```javascript
// Automatic in ApiService interceptor:
if (response.status === 401) {
  // Token expired
  newToken = await _refreshToken()  // Get new JWT
  return await _retry(originalRequest)  // Retry request
}
```

## 📋 Invoice Cache

- **Storage:** Device encrypted storage
- **Duration:** 24 hours
- **Size:** Limited by device storage
- **Access:** Offline available
- **Format:** JSON with JWT verification data

## 🔍 Debug Logs

Look for these in terminal:
```
[JWT] Token added to request: eyJhbGc...
[JWT] Token expired (401), attempting refresh
[JWT] Token refreshed successfully
[Invoice] Using cached invoice for order 123
[Invoice] Invoice fetched and cached
```

## 🚀 Quick Test

```dart
// 1. Login
await authProvider.login("user@example.com", "password");

// 2. Check token
String? token = await StorageService.getToken();
print('Token: ${token?.substring(0, 20)}...');

// 3. Get secure invoice
String invoice = await apiService.getInvoiceSecure(1);
print('Invoice: $invoice');

// 4. Verify
bool verified = await apiService.verifyInvoiceAuthority(1);
print('Verified: $verified');
```

## ✅ Files Modified

- `lib/services/storage_service.dart` - Token & invoice storage
- `lib/services/api_service.dart` - JWT interceptor & endpoints

## ✅ Files Created

- `JWT_SECURITY_INVOICE_SYNC.md` - Full documentation
- `JWT_IMPLEMENTATION_SUMMARY.md` - This summary
- `BACKEND_JWT_INTEGRATION.md` - Backend setup guide

## 🎓 Learning Resources

1. **JWT Tokens:** https://jwt.io
2. **Flutter Dio:** https://pub.dev/packages/dio
3. **Secure Storage:** https://pub.dev/packages/flutter_secure_storage
4. **Express JWT:** https://express-jswt.github.io/

## ⚠️ Important Notes

1. **Token Expiry:** Set to 1 hour (3600 seconds)
2. **Refresh Token:** Set to 7 days for security
3. **Cache Expiry:** 24 hours for invoices
4. **HTTPS Required:** Always use HTTPS in production
5. **JWT_SECRET:** Keep consistent between client and server

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 errors | Check JWT_SECRET on backend |
| No token refresh | Verify `/refresh-token` endpoint |
| Cache not working | Check device storage permissions |
| Slow requests | Check network connectivity |
| Missing invoices | Verify user authorization |

## 📞 Support Files

- **JWT Docs:** `JWT_SECURITY_INVOICE_SYNC.md`
- **Backend Setup:** `BACKEND_JWT_INTEGRATION.md`
- **Deployment:** `RENDER_DEPLOYMENT_GUIDE.md`
- **Implementation:** `JWT_IMPLEMENTATION_SUMMARY.md`

## 🎯 Next Steps

1. ✅ Flutter app configured
2. ⏳ Backend endpoints implementation needed:
   - Add `/refresh-token` endpoint
   - Add JWT middleware to routes
   - Add invoice endpoints
3. ⏳ Test invoice sync
4. ⏳ Deploy to production

---

**Quick Reference v1.0**  
**Date:** January 31, 2026
