import 'package:flutter/foundation.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../services/google_signin_service.dart';
import '../config/constants.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final GoogleSignInService _googleSignInService = GoogleSignInService();

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
        final address = await StorageService.getUserAddress();
        final isVerified = await StorageService.isUserVerified();

        if (userId != null && email != null && name != null) {
          _user = UserModel(
            id: userId,
            name: name,
            email: email,
            phone: phone ?? '',
            address: address,
            isVerified: isVerified,
          );
        }
        
        if (kDebugMode) {
          print('[AuthProvider] Initialized with user: ${_user?.email}');
          print('[AuthProvider] Token exists: ${_token!.substring(0, 20)}...');
        }
      }
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      if (kDebugMode) {
        print('[AuthProvider] Initialization error: $e');
      }
      notifyListeners();
    }
  }

  /// Validate if the current token is still valid
  Future<bool> _validateToken() async {
    try {
      // Make a lightweight request to check token validity
      // You can replace this with any authenticated endpoint
      await _apiService.getProducts();
      return true;
    } catch (e) {
      if (kDebugMode) {
        print('[AuthProvider] Token validation failed: $e');
      }
      return false;
    }
  }

  /// Clear authentication state
  Future<void> _clearAuthState() async {
    await StorageService.clearAll();
    _token = null;
    _user = null;
    _isLoggedIn = false;
    _error = null;
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
          address: response.user!.address,
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
    String confirmPassword,
    String phone,
    String? address,
  ) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await _apiService.register(
          name, email, password, confirmPassword, phone, address);

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

  Future<bool> signInWithGoogle() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      // Sign in with Google
      final googleAccount = await _googleSignInService.signIn();
      
      if (googleAccount == null) {
        // User cancelled the sign-in (popup closed)
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Get authentication details
      final googleAuth = await _googleSignInService.getAuthentication();
      
      if (googleAuth == null || googleAuth.idToken == null) {
        _error = 'Failed to get Google authentication details';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      if (kDebugMode) {
        print('[AuthProvider] Sending Google auth to backend: ${Constants.baseUrl}/auth/google');
        print('[AuthProvider] User email: ${googleAccount.email}');
      }

      // Send Google auth details to backend
      final response = await _apiService.googleAuth(
        googleAuth.idToken!,
        googleAccount.email,
        googleAccount.displayName ?? '',
      );

      if (response.success && response.token != null && response.user != null) {
        _token = response.token;
        _user = response.user;
        _isLoggedIn = true;

        if (kDebugMode) {
          print('[AuthProvider] Google auth successful - saving token: ${response.token!.substring(0, 20)}...');
          print('[AuthProvider] User: ${response.user!.email}');
        }

        // Save to secure storage
        await StorageService.saveToken(response.token!);
        await StorageService.saveUserInfo(
          userId: response.user!.id,
          email: response.user!.email,
          name: response.user!.name,
          phone: response.user!.phone,
          address: response.user!.address,
          isVerified: response.user!.isVerified,
        );

        // Verify token was saved correctly
        final savedToken = await StorageService.getToken();
        if (kDebugMode) {
          print('[AuthProvider] Token verification after save: ${savedToken != null ? "✅ Success" : "❌ Failed"}');
          if (savedToken != null) {
            print('[AuthProvider] Saved token starts with: ${savedToken.substring(0, 20)}...');
          }
        }

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response.message ?? 'Backend authentication failed';
        if (kDebugMode) {
          print('[AuthProvider] Backend response error: ${response.message}');
        }
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      if (kDebugMode) {
        print('[AuthProvider] Google sign in error: $e');
      }
      
      // Don't show error for user cancellation
      if (e.toString().contains('popup_closed') || 
          e.toString().contains('cancelled') ||
          e.toString().contains('User cancelled')) {
        _isLoading = false;
        notifyListeners();
        return false;
      }
      
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

      // Perform full logout
      await fullLogout();

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

  /// Handle token expiry by clearing state and forcing re-authentication
  Future<void> handleTokenExpiry() async {
    if (kDebugMode) {
      print('[AuthProvider] Token expired - attempting graceful recovery');
    }
    
    try {
      // Only clear token, keep user info for potential re-authentication
      _token = null;
      _isLoggedIn = false;
      
      // Don't immediately sign out from Google or clear all user data
      // This allows for graceful re-authentication if needed
      
      notifyListeners();
    } catch (e) {
      if (kDebugMode) {
        print('[AuthProvider] Error during token expiry handling: $e');
      }
    }
  }

  /// Full logout - clear everything including Google session
  Future<void> fullLogout() async {
    if (kDebugMode) {
      print('[AuthProvider] Performing full logout');
    }
    
    try {
      // Sign out from Google if signed in
      if (_googleSignInService.isSignedIn) {
        await _googleSignInService.signOut();
      }

      // Clear all state
      await _clearAuthState();
      
      notifyListeners();
    } catch (e) {
      if (kDebugMode) {
        print('[AuthProvider] Error during full logout: $e');
      }
    }
  }

  /// Check if user needs to re-authenticate
  Future<bool> checkAuthStatus() async {
    if (kDebugMode) {
      print('[AuthProvider] Checking auth status...');
      print('[AuthProvider] Current isLoggedIn: $_isLoggedIn');
      print('[AuthProvider] Current user: ${_user?.email}');
      print('[AuthProvider] Current token exists: ${_token != null && _token!.isNotEmpty}');
    }

    if (_token == null || _token!.isEmpty) {
      if (kDebugMode) {
        print('[AuthProvider] ❌ No token available');
      }
      return false;
    }

    final isValid = await _validateToken();
    if (!isValid) {
      await handleTokenExpiry();
      return false;
    }

    return true;
  }

  /// Force re-authentication by clearing state
  Future<void> forceReAuthentication() async {
    if (kDebugMode) {
      print('[AuthProvider] Forcing re-authentication...');
    }
    await handleTokenExpiry();
  }
}
