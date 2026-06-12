import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart';

class GoogleSignInService {
  static final GoogleSignInService _instance = GoogleSignInService._internal();
  late GoogleSignIn _googleSignIn;

  factory GoogleSignInService() {
    return _instance;
  }

  GoogleSignInService._internal() {
    _initializeGoogleSignIn();
  }

  void _initializeGoogleSignIn() {
    _googleSignIn = GoogleSignIn(
      scopes: [
        'email',
        'profile',
      ],
      // Use the web client ID for all platforms to avoid google-services.json dependency
      clientId: '1027670106522-cvfn6td1finicio4bv1kk73vip6si300.apps.googleusercontent.com',
    );
    
    if (kDebugMode) {
      print('[GoogleAuth] Initialized GoogleSignIn with web client ID');
      print('[GoogleAuth] This bypasses google-services.json requirements');
    }
  }

  /// Sign in with Google
  Future<GoogleSignInAccount?> signIn() async {
    try {
      if (kDebugMode) {
        print('[GoogleAuth] Attempting Google Sign In...');
      }

      GoogleSignInAccount? result;
      
      if (kIsWeb) {
        // For web, try different approaches
        try {
          // First try silent sign in
          result = await _googleSignIn.signInSilently(suppressErrors: true);
          if (kDebugMode) {
            print('[GoogleAuth] Silent sign in result: ${result?.email ?? 'null'}');
          }
        } catch (e) {
          if (kDebugMode) {
            print('[GoogleAuth] Silent sign in failed: $e');
          }
        }
        
        // If silent sign in fails, try regular sign in
        if (result == null) {
          try {
            result = await _googleSignIn.signIn();
            if (kDebugMode) {
              print('[GoogleAuth] Regular sign in result: ${result?.email ?? 'null'}');
            }
          } catch (e) {
            if (kDebugMode) {
              print('[GoogleAuth] Regular sign in failed: $e');
            }
            
            // Handle specific web errors
            if (e.toString().contains('popup_closed')) {
              if (kDebugMode) {
                print('[GoogleAuth] Popup was closed by user');
              }
              return null; // User cancelled
            }
            
            if (e.toString().contains('unknown_reason') || 
                e.toString().contains('NetworkError')) {
              if (kDebugMode) {
                print('[GoogleAuth] Network or FedCM error - this may be a configuration issue');
              }
              throw Exception('Google Sign-In configuration error. Please check client ID setup.');
            }
            
            rethrow;
          }
        }
      } else {
        // For mobile platforms, use regular sign in
        result = await _googleSignIn.signIn();
      }

      if (result != null) {
        if (kDebugMode) {
          print('[GoogleAuth] Sign in successful: ${result.email}');
        }
        return result;
      } else {
        if (kDebugMode) {
          print('[GoogleAuth] Sign in cancelled by user or returned null');
        }
        return null;
      }
    } catch (error) {
      if (kDebugMode) {
        print('[GoogleAuth] Sign in error: $error');
      }
      
      // Handle specific web errors gracefully
      if (kIsWeb) {
        if (error.toString().contains('popup_closed')) {
          return null; // User cancelled, not an error
        }
        if (error.toString().contains('unknown_reason')) {
          throw Exception('Google Sign-In setup issue. Check if localhost is added to authorized origins.');
        }
      }
      
      throw Exception('Google Sign In failed: $error');
    }
  }

  /// Get authentication details for the signed-in account
  Future<GoogleSignInAuthentication?> getAuthentication() async {
    try {
      final GoogleSignInAccount? account = _googleSignIn.currentUser;
      if (account != null) {
        return await account.authentication;
      }
      return null;
    } catch (error) {
      if (kDebugMode) {
        print('[GoogleAuth] Get authentication error: $error');
      }
      throw Exception('Failed to get Google authentication: $error');
    }
  }

  /// Sign out from Google
  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      if (kDebugMode) {
        print('[GoogleAuth] Google sign out successful');
      }
    } catch (error) {
      if (kDebugMode) {
        print('[GoogleAuth] Sign out error: $error');
      }
      throw Exception('Google Sign Out failed: $error');
    }
  }

  /// Check if user is currently signed in to Google
  bool get isSignedIn => _googleSignIn.currentUser != null;

  /// Get current signed-in user
  GoogleSignInAccount? get currentUser => _googleSignIn.currentUser;

  /// Disconnect Google account (revoke access)
  Future<void> disconnect() async {
    try {
      await _googleSignIn.disconnect();
      if (kDebugMode) {
        print('[GoogleAuth] Google account disconnected');
      }
    } catch (error) {
      if (kDebugMode) {
        print('[GoogleAuth] Disconnect error: $error');
      }
      throw Exception('Google disconnect failed: $error');
    }
  }
}