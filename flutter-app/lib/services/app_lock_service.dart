import 'package:local_auth/local_auth.dart';

class AppLockService {
  static final LocalAuthentication _auth = LocalAuthentication();

  static Future<bool> isDeviceLockAvailable() async {
    try {
      return await _auth.isDeviceSupported();
    } on Exception {
      return false;
    }
  }

  static Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Unlock R-Fashion',
        biometricOnly: false,
        persistAcrossBackgrounding: true,
      );
    } on Exception {
      return false;
    }
  }
}
