import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/constants.dart';
import '../providers/auth_provider.dart';
import '../services/app_lock_service.dart';
import '../services/storage_service.dart';

class AppLockGate extends StatefulWidget {
  final Widget child;

  const AppLockGate({
    super.key,
    required this.child,
  });

  @override
  State<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends State<AppLockGate> with WidgetsBindingObserver {
  bool _isUnlocked = false;
  bool _isAuthenticating = false;
  bool _lockEnabled = true;
  bool _deviceLockAvailable = true;
  bool _hasLoadedSettings = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadLockSettings();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _isUnlocked = false;
    }

    if (state == AppLifecycleState.resumed) {
      _loadLockSettings();
    }
  }

  Future<void> _loadLockSettings() async {
    final lockEnabled = await StorageService.getAppLockEnabled();
    final deviceLockAvailable = await AppLockService.isDeviceLockAvailable();

    if (!mounted) return;

    setState(() {
      _lockEnabled = lockEnabled;
      _deviceLockAvailable = deviceLockAvailable;
      _hasLoadedSettings = true;
    });

    _authenticateIfNeeded();
  }

  void _authenticateIfNeeded() {
    final authProvider = context.read<AuthProvider>();

    if (!authProvider.isLoggedIn ||
        !_hasLoadedSettings ||
        !_lockEnabled ||
        !_deviceLockAvailable ||
        _isUnlocked ||
        _isAuthenticating) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _authenticate();
      }
    });
  }

  Future<void> _authenticate() async {
    if (_isAuthenticating) return;

    setState(() {
      _isAuthenticating = true;
    });

    final isAuthenticated = await AppLockService.authenticate();

    if (!mounted) return;

    setState(() {
      _isUnlocked = isAuthenticated;
      _isAuthenticating = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        final isPreparingLock = authProvider.isLoggedIn && !_hasLoadedSettings;
        final shouldLock = authProvider.isLoggedIn &&
            _hasLoadedSettings &&
            _lockEnabled &&
            _deviceLockAvailable &&
            !_isUnlocked;

        if (shouldLock) {
          _authenticateIfNeeded();
        }

        return Stack(
          children: [
            widget.child,
            if (isPreparingLock || shouldLock) _buildLockScreen(context),
          ],
        );
      },
    );
  }

  Widget _buildLockScreen(BuildContext context) {
    return Material(
      color: const Color(0xFF212529),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFC800),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(
                  Icons.lock_outline,
                  size: 52,
                  color: Color(0xFF212529),
                ),
              ),
              const SizedBox(height: 28),
              const Text(
                Constants.appName,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                !_hasLoadedSettings
                    ? 'Preparing app lock'
                    : _isAuthenticating
                        ? 'Waiting for phone unlock'
                        : 'Unlock with your phone fingerprint, PIN, pattern, or password',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.78),
                  fontSize: 15,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isAuthenticating ? null : _authenticate,
                  icon: const Icon(Icons.fingerprint),
                  label: Text(_isAuthenticating ? 'Unlocking...' : 'Unlock'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
