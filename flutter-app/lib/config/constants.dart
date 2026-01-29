class Constants {
  // API Configuration
  static const String baseUrl = 'https://rajuit.online';

  // App Metadata
  static const String appName = 'Raju IT Fashion Store';
  static const String appVersion = '1.0.0';

  // Default Values
  static const double shippingCost = 50.0;
  static const double taxPercentage = 0.15;

  // Categories
  static const List<String> categories = ['male', 'female', 'baby', 'home'];
  static const Map<String, String> categoryLabels = {
    'male': 'Men Fashion',
    'female': 'Women Fashion',
    'baby': 'Baby Clothes',
    'home': 'Home Accessories',
  };

  // Subcategories
  static const Map<String, List<String>> subcategories = {
    'male': ['clothing', 'accessories', 'shoes'],
    'female': ['clothing', 'accessories', 'shoes'],
    'baby': ['clothing', 'toys', 'gear'],
    'home': ['decor', 'furniture', 'textiles'],
  };

  static const Map<String, String> subcategoryLabels = {
    'clothing': 'Clothing',
    'accessories': 'Accessories',
    'shoes': 'Shoes',
    'toys': 'Toys',
    'gear': 'Gear',
    'decor': 'Decor',
    'furniture': 'Furniture',
    'textiles': 'Textiles',
  };

  // Order Status
  static const Map<String, String> orderStatusLabels = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
  };

  // Payment Methods
  static const Map<String, String> paymentMethods = {
    'cod': 'Cash on Delivery',
    'card': 'Credit/Debit Card',
    'bank': 'Bank Transfer',
  };

  // UI Constants
  static const double defaultPadding = 16.0;
  static const double defaultRadius = 12.0;
  static const double defaultElevation = 4.0;

  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Validation
  static const String emailPattern =
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
  static const String phonePattern = r'^[0-9]{10,}$';
  static const int minPasswordLength = 6;
}
