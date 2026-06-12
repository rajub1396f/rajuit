import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

class StorageService {
  static const _secureStorage = FlutterSecureStorage();

  // Keys
  static const _tokenKey = 'jwt_token';
  static const _tokenExpiryKey = 'jwt_token_expiry';
  static const _refreshTokenKey = 'jwt_refresh_token';
  static const _userIdKey = 'user_id';
  static const _userEmailKey = 'user_email';
  static const _userNameKey = 'user_name';
  static const _userPhoneKey = 'user_phone';
  static const _userAddressKey = 'user_address';
  static const _shippingAddressFieldsKey = 'shipping_address_fields';
  static const _isVerifiedKey = 'user_is_verified';
  static const _invoiceSyncKey = 'invoice_sync_data';
  static const _lastInvoiceSyncKey = 'last_invoice_sync';
  static const _pushNotificationsKey = 'notification_push_enabled';
  static const _emailNotificationsKey = 'notification_email_enabled';
  static const _orderUpdatesKey = 'notification_order_updates_enabled';
  static const _marketingCommunicationsKey =
      'notification_marketing_communications_enabled';
  static const _appLockEnabledKey = 'app_lock_enabled';

  // Token Management
  static Future<void> saveToken(String token, {int? expiryInSeconds}) async {
    await _secureStorage.write(key: _tokenKey, value: token);

    // Save token expiry if provided
    if (expiryInSeconds != null) {
      final expiryTime = DateTime.now().add(Duration(seconds: expiryInSeconds));
      await _secureStorage.write(
          key: _tokenExpiryKey, value: expiryTime.toIso8601String());
    }
  }

  static Future<String?> getToken() async {
    final token = await _secureStorage.read(key: _tokenKey);

    // Check if token is expired
    if (token != null && await isTokenExpired()) {
      await deleteToken();
      return null;
    }

    return token;
  }

  static Future<bool> isTokenExpired() async {
    final expiryStr = await _secureStorage.read(key: _tokenExpiryKey);
    if (expiryStr == null) return false;

    try {
      final expiry = DateTime.parse(expiryStr);
      return DateTime.now().isAfter(expiry);
    } catch (e) {
      return false;
    }
  }

  static Future<bool> isTokenValid() async {
    final token = await _secureStorage.read(key: _tokenKey);
    return token != null && token.isNotEmpty && !await isTokenExpired();
  }

  static Future<void> deleteToken() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _tokenExpiryKey);
  }

  // Refresh Token Management
  static Future<void> saveRefreshToken(String token) async {
    await _secureStorage.write(key: _refreshTokenKey, value: token);
  }

  static Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  static Future<void> deleteRefreshToken() async {
    await _secureStorage.delete(key: _refreshTokenKey);
  }

  // User Info Management
  static Future<void> saveUserInfo({
    required int userId,
    required String email,
    required String name,
    required String phone,
    String? address,
    required bool isVerified,
  }) async {
    await Future.wait([
      _secureStorage.write(key: _userIdKey, value: userId.toString()),
      _secureStorage.write(key: _userEmailKey, value: email),
      _secureStorage.write(key: _userNameKey, value: name),
      _secureStorage.write(key: _userPhoneKey, value: phone),
      _secureStorage.write(key: _userAddressKey, value: address ?? ''),
      _secureStorage.write(
        key: _isVerifiedKey,
        value: isVerified.toString(),
      ),
    ]);
  }

  static Future<int?> getUserId() async {
    final userId = await _secureStorage.read(key: _userIdKey);
    return userId != null ? int.tryParse(userId) : null;
  }

  static Future<String?> getUserEmail() async {
    return await _secureStorage.read(key: _userEmailKey);
  }

  static Future<String?> getUserName() async {
    return await _secureStorage.read(key: _userNameKey);
  }

  static Future<String?> getUserPhone() async {
    return await _secureStorage.read(key: _userPhoneKey);
  }

  static Future<String?> getUserAddress() async {
    return await _secureStorage.read(key: _userAddressKey);
  }

  static Future<void> saveUserAddress(String address) async {
    await _secureStorage.write(key: _userAddressKey, value: address);
  }

  static Future<bool> isUserVerified() async {
    final verified = await _secureStorage.read(key: _isVerifiedKey);
    return verified?.toLowerCase() == 'true';
  }

  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  static Future<void> clearAll() async {
    await _secureStorage.deleteAll();
  }

  // Shipping Address Management
  static Future<void> saveShippingAddressFields(
    Map<String, String> fields,
  ) async {
    await _secureStorage.write(
      key: _shippingAddressFieldsKey,
      value: jsonEncode(fields),
    );
  }

  static Future<Map<String, String>> getShippingAddressFields() async {
    final data = await _secureStorage.read(key: _shippingAddressFieldsKey);
    if (data == null || data.isEmpty) return {};

    try {
      final decoded = jsonDecode(data);
      if (decoded is! Map<String, dynamic>) return {};

      return decoded.map(
        (key, value) => MapEntry(key, value?.toString() ?? ''),
      );
    } catch (e) {
      return {};
    }
  }

  // ==================== INVOICE SYNC (SECURE) ====================

  /// Save invoice data with JWT token for secure sync
  static Future<void> saveInvoiceSync({
    required int orderId,
    required String invoiceData,
    required String jwtToken,
  }) async {
    final syncData = {
      'orderId': orderId,
      'invoiceData': invoiceData,
      'jwtToken': jwtToken,
      'timestamp': DateTime.now().toIso8601String(),
    };
    await _secureStorage.write(
      key: '${_invoiceSyncKey}_$orderId',
      value: jsonEncode(syncData),
    );
    await _secureStorage.write(
      key: _lastInvoiceSyncKey,
      value: DateTime.now().toIso8601String(),
    );
  }

  /// Get cached invoice data
  static Future<Map<String, dynamic>?> getInvoiceSync(int orderId) async {
    final data = await _secureStorage.read(key: '${_invoiceSyncKey}_$orderId');
    if (data != null) {
      try {
        return jsonDecode(data) as Map<String, dynamic>;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /// Delete invoice sync for specific order
  static Future<void> deleteInvoiceSync(int orderId) async {
    await _secureStorage.delete(key: '${_invoiceSyncKey}_$orderId');
  }

  /// Get last invoice sync time
  static Future<DateTime?> getLastInvoiceSyncTime() async {
    final timeStr = await _secureStorage.read(key: _lastInvoiceSyncKey);
    if (timeStr != null) {
      try {
        return DateTime.parse(timeStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /// Check if invoice needs refresh (older than 24 hours)
  static Future<bool> invoiceNeedsRefresh(int orderId) async {
    final lastSync = await getLastInvoiceSyncTime();
    if (lastSync == null) return true;

    final now = DateTime.now();
    final difference = now.difference(lastSync);
    return difference.inHours >= 24;
  }

  // Notification Preferences
  static Future<Map<String, bool>> getNotificationPreferences() async {
    return {
      'push': await _readBool(_pushNotificationsKey, defaultValue: true),
      'email': await _readBool(_emailNotificationsKey, defaultValue: false),
      'orderUpdates': await _readBool(_orderUpdatesKey, defaultValue: true),
      'marketing': await _readBool(
        _marketingCommunicationsKey,
        defaultValue: false,
      ),
    };
  }

  static Future<void> saveNotificationPreference({
    required String key,
    required bool value,
  }) async {
    final storageKey = switch (key) {
      'push' => _pushNotificationsKey,
      'email' => _emailNotificationsKey,
      'orderUpdates' => _orderUpdatesKey,
      'marketing' => _marketingCommunicationsKey,
      _ => throw ArgumentError('Unknown notification preference: $key'),
    };

    await _secureStorage.write(key: storageKey, value: value.toString());
  }

  static Future<bool> getAppLockEnabled() async {
    return _readBool(_appLockEnabledKey, defaultValue: true);
  }

  static Future<void> saveAppLockEnabled(bool isEnabled) async {
    await _secureStorage.write(
      key: _appLockEnabledKey,
      value: isEnabled.toString(),
    );
  }

  static Future<bool> _readBool(
    String key, {
    required bool defaultValue,
  }) async {
    final value = await _secureStorage.read(key: key);
    if (value == null) return defaultValue;
    return value.toLowerCase() == 'true';
  }

  // Additional helpers
  static Future<Map<String, String?>> getAllUserInfo() async {
    return {
      'userId': await getUserId().then((id) => id?.toString()),
      'email': await getUserEmail(),
      'name': await getUserName(),
      'phone': await getUserPhone(),
      'address': await getUserAddress(),
    };
  }
}
