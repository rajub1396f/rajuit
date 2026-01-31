import 'package:flutter/material.dart';
import '../models/order_model.dart';
import '../services/api_service.dart';

extension FirstWhereOrNull<T> on Iterable<T> {
  T? firstWhereOrNull(bool Function(T) test) {
    for (var element in this) {
      if (test(element)) return element;
    }
    return null;
  }
}

class OrderProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<OrderModel> _orders = [];
  OrderModel? _selectedOrder;
  bool _isLoading = false;
  String? _error;
  bool _isCreating = false;

  // Getters
  List<OrderModel> get orders => _orders;
  OrderModel? get selectedOrder => _selectedOrder;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isCreating => _isCreating;

  Future<void> fetchOrders({bool isAutoRefresh = false}) async {
    try {
      if (!isAutoRefresh) {
        _isLoading = true;
        _error = null;
      }
      notifyListeners();

      _orders = await _apiService.getOrders();

      if (!isAutoRefresh) {
        _isLoading = false;
      }
      notifyListeners();
    } catch (e) {
      if (!isAutoRefresh) {
        _error = e.toString();
        _isLoading = false;
      }
      notifyListeners();
    }
  }

  Future<bool> createOrder(CreateOrderRequest request) async {
    try {
      _isCreating = true;
      _error = null;
      notifyListeners();

      final response = await _apiService.createOrder(request);

      if (response.success) {
        // Add the new order to the list if available
        if (response.order != null) {
          _orders.insert(0, response.order!);
        }

        _isCreating = false;
        notifyListeners();
        return true;
      } else {
        _error = response.message;
        _isCreating = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isCreating = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> selectOrder(int orderId) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _selectedOrder = _orders.firstWhere(
        (order) => order.id == orderId,
        orElse: () => OrderModel(
          id: orderId,
          userId: 0,
          totalAmount: 0,
          status: '',
          shippingAddress: '',
          createdAt: '',
        ),
      );

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> getInvoicePdfUrl(int orderId) async {
    try {
      final invoiceData = await _apiService.getInvoice(orderId);
      return invoiceData;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<bool> updateOrderStatus(
    int orderId,
    String newStatus,
  ) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final updatedOrder = await _apiService.updateOrder(
        orderId,
        {'status': newStatus},
      );

      final index = _orders.indexWhere((order) => order.id == orderId);
      if (index >= 0) {
        _orders[index] = updatedOrder;
      }

      _selectedOrder = updatedOrder;

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  List<OrderModel> getOrdersByStatus(String status) {
    return _orders.where((order) => order.status == status).toList();
  }

  int getPendingOrderCount() {
    return _orders.where((order) => order.status == 'pending').length;
  }

  double getTotalSpent() {
    return _orders.fold(0, (sum, order) => sum + order.totalAmount);
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<String?> regenerateInvoice(int orderId) async {
    try {
      // Request regeneration from backend (now waits for completion)
      final result = await _apiService.regenerateInvoice(orderId);
      print('[OrderProvider] Regeneration result: $result');
      
      // If backend returns the invoice URL directly, use it
      if (result['invoiceUrl'] != null && result['invoiceUrl'].toString().isNotEmpty) {
        final invoiceUrl = result['invoiceUrl'].toString();
        print('[OrderProvider] ✅ Got invoice URL from backend: $invoiceUrl');
        
        // Refresh orders to update local state
        await fetchOrders(isAutoRefresh: true);
        
        return invoiceUrl;
      }
      
      // Fallback: Poll for the updated invoice URL if backend didn't return it
      print('[OrderProvider] Backend did not return URL, starting polling...');
      final previousInvoiceUrl =
          _orders.firstWhereOrNull((o) => o.id == orderId)?.invoicePdfUrl;

      const pollingAttempts = 10; // Reduced since backend now waits
      const delay = Duration(seconds: 2);

      print('[OrderProvider] Starting to poll for invoice URL (${pollingAttempts * 2}s max)');

      for (int attempt = 0; attempt < pollingAttempts; attempt++) {
        await Future.delayed(delay);

        print('[OrderProvider] Polling attempt ${attempt + 1}/$pollingAttempts');
        await fetchOrders(isAutoRefresh: true);

        final order = _orders.firstWhereOrNull((o) => o.id == orderId);
        final currentUrl = order?.invoicePdfUrl;

        print('[OrderProvider] Current invoice URL: $currentUrl');

        // Check if we got a new URL different from the previous one
        if (currentUrl?.isNotEmpty == true && currentUrl != previousInvoiceUrl) {
          print('[OrderProvider] ✅ New invoice URL detected: $currentUrl');
          return currentUrl;
        }

        // If there was no previous URL and now we have one, return it
        if (currentUrl?.isNotEmpty == true && previousInvoiceUrl == null) {
          print('[OrderProvider] ✅ Invoice URL now available: $currentUrl');
          return currentUrl;
        }
      }

      // If polling timed out but we have the old URL, return it as fallback
      if (previousInvoiceUrl?.isNotEmpty == true) {
        print('[OrderProvider] ⚠️ Timeout - returning previous URL: $previousInvoiceUrl');
        return previousInvoiceUrl;
      }

      print('[OrderProvider] ❌ Invoice generation timeout');
      throw Exception('Invoice generation timeout after ${pollingAttempts * 2} seconds');
    } catch (e) {
      print('[OrderProvider] Regeneration request failed: $e');
      rethrow;
    }
  }
}
