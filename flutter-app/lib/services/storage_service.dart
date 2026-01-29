import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  static const _secureStorage = FlutterSecureStorage();

  // Keys
  static const _tokenKey = 'jwt_token';
  static const _userIdKey = 'user_id';
  static const _userEmailKey = 'user_email';
  static const _userNameKey = 'user_name';
  static const _userPhoneKey = 'user_phone';
  static const _isVerifiedKey = 'user_is_verified';

  // Token Management
  static Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  static Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  static Future<void> deleteToken() async {
    await _secureStorage.delete(key: _tokenKey);
  }

  // User Info Management
  static Future<void> saveUserInfo({
    required int userId,
    required String email,
    required String name,
    required String phone,
    required bool isVerified,
  }) async {
    await Future.wait([
      _secureStorage.write(key: _userIdKey, value: userId.toString()),
      _secureStorage.write(key: _userEmailKey, value: email),
      _secureStorage.write(key: _userNameKey, value: name),
      _secureStorage.write(key: _userPhoneKey, value: phone),
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

  // Additional helpers
  static Future<Map<String, String?>> getAllUserInfo() async {
    return {
      'userId': await getUserId().then((id) => id?.toString()),
      'email': await getUserEmail(),
      'name': await getUserName(),
      'phone': await getUserPhone(),
    };
  }
}
