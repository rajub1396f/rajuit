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

  Future<void> regenerateInvoice(int orderId) async {
    try {
      _error = null;
      notifyListeners();

      await _apiService.regenerateInvoice(orderId);

      // Poll for invoice URL to be generated (up to 30 seconds)
      // Invoice generation process: puppeteer launch + PDF generation + ImageKit upload
      for (int attempt = 0; attempt < 6; attempt++) {
        // Wait before checking (5 seconds per attempt)
        await Future.delayed(Duration(seconds: 5));

        // Fetch orders to check if invoice URL is now available
        await fetchOrders();

        // Check if invoice URL exists for this order
        final order = _orders.firstWhereOrNull((o) => o.id == orderId);
        if (order != null &&
            order.invoicePdfUrl != null &&
            order.invoicePdfUrl!.isNotEmpty) {
          // Invoice is ready!
          return;
        }
      }

      // If we get here, invoice wasn't generated in time
      _error = 'Invoice generation timeout after 30 seconds';
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }
}
