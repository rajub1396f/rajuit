import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class WhatsAppService {
  static const String phoneNumber = '8801726466000';
  static const String supportMessage =
      'Hi! I need help with my order or have a question about your products. Can you please assist me?';

  static Future<void> openSupportChat(BuildContext context) async {
    final encodedMessage = Uri.encodeQueryComponent(supportMessage);
    final appUri = Uri.parse(
      'whatsapp://send?phone=$phoneNumber&text=$encodedMessage',
    );
    final webUri = Uri.parse(
      'https://wa.me/$phoneNumber?text=$encodedMessage',
    );

    final launched = await _tryLaunch(appUri) || await _tryLaunch(webUri);

    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Could not open WhatsApp. Please check if WhatsApp is installed.',
          ),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  static Future<bool> _tryLaunch(Uri uri) async {
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }
}
