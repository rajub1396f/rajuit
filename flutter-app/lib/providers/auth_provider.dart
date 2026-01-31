import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  UserModel? _user;
  String? _token;
  bool _isLoading = false;
  String? _error;
  bool _isLoggedIn = false;

  // Getters
  UserModel? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _isLoggedIn;

  AuthProvider() {
    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    try {
      _token = await StorageService.getToken();
      if (_token != null && _token!.isNotEmpty) {
        _isLoggedIn = true;
        // Load user info from storage
        final userId = await StorageService.getUserId();
        final email = await StorageService.getUserEmail();
        final name = await StorageService.getUserName();
        final phone = await StorageService.getUserPhone();
        final isVerified = await StorageService.isUserVerified();

        if (userId != null && email != null && name != null) {
          _user = UserModel(
            id: userId,
            name: name,
            email: email,
            phone: phone ?? '',
            isVerified: isVerified,
          );
        }
      }
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await _apiService.login(email, password);

      if (response.success && response.token != null && response.user != null) {
        _token = response.token;
        _user = response.user;
        _isLoggedIn = true;

        // Save to secure storage
        await StorageService.saveToken(response.token!);
        await StorageService.saveUserInfo(
          userId: response.user!.id,
          email: response.user!.email,
          name: response.user!.name,
          phone: response.user!.phone,
          isVerified: response.user!.isVerified,
        );

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response.message;
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(
    String name,
    String email,
    String password,
    String phone,
  ) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await _apiService.register(name, email, password, phone);

      if (response.success) {
        _error = null;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response.message;
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyEmail(String code) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await _apiService.verifyEmail(code);

      if (response.success) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response.message;
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> forgotPassword(String email) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await _apiService.forgotPassword(email);

      if (response['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Failed to send reset email';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      _isLoading = true;
      notifyListeners();

      await StorageService.clearAll();
      _token = null;
      _user = null;
      _isLoggedIn = false;
      _error = null;

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<void> updateUser(UserModel updatedUser) async {
    try {
      _user = updatedUser;
      
      // Update storage
      await StorageService.saveUserInfo(
        userId: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        isVerified: updatedUser.isVerified,
      );
      
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }
}
