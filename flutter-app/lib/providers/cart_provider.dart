import 'package:flutter/material.dart';
import 'package:get_storage/get_storage.dart';
import '../models/order_model.dart';

class CartProvider extends ChangeNotifier {
  final _box = GetStorage();
  static const String _cartKey = 'cart_items';

  List<CartItem> _items = [];

  CartProvider() {
    _loadCart();
  }

  // Getters
  List<CartItem> get items => _items;

  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);

  double get totalPrice =>
      _items.fold(0, (sum, item) => sum + item.getSubtotal());

  double get subtotal => totalPrice;

  double get shippingCost => totalPrice > 5000 ? 0 : 50;

  double get tax => subtotal * 0.15;

  double get grandTotal => subtotal + shippingCost + tax;

  bool get isEmpty => _items.isEmpty;

  // Load cart from storage
  void _loadCart() {
    try {
      final cartData = _box.read<List>(_cartKey);
      if (cartData != null) {
        _items = cartData
            .map((item) => CartItem.fromJson(Map<String, dynamic>.from(item)))
            .toList();
      }
    } catch (e) {
      _items = [];
    }
    notifyListeners();
  }

  // Save cart to storage
  void _saveCart() {
    _box.write(_cartKey, _items.map((item) => item.toJson()).toList());
    notifyListeners();
  }

  // Add item to cart
  void addItem(CartItem item) {
    final existingIndex = _items.indexWhere((i) => i.id == item.id);

    if (existingIndex >= 0) {
      _items[existingIndex].quantity += item.quantity;
    } else {
      _items.add(item);
    }

    _saveCart();
  }

  // Remove item from cart
  void removeItem(int itemId) {
    _items.removeWhere((item) => item.id == itemId);
    _saveCart();
  }

  // Update item quantity
  void updateQuantity(int itemId, int quantity) {
    final index = _items.indexWhere((item) => item.id == itemId);

    if (index >= 0) {
      if (quantity <= 0) {
        removeItem(itemId);
      } else {
        _items[index].quantity = quantity;
        _saveCart();
      }
    }
  }

  // Increment quantity
  void incrementQuantity(int itemId) {
    final index = _items.indexWhere((item) => item.id == itemId);
    if (index >= 0) {
      _items[index].quantity++;
      _saveCart();
    }
  }

  // Decrement quantity
  void decrementQuantity(int itemId) {
    final index = _items.indexWhere((item) => item.id == itemId);
    if (index >= 0) {
      if (_items[index].quantity > 1) {
        _items[index].quantity--;
      } else {
        removeItem(itemId);
      }
      _saveCart();
    }
  }

  // Clear entire cart
  void clearCart() {
    _items.clear();
    _box.remove(_cartKey);
    notifyListeners();
  }

  // Get cart items as order items
  List<OrderItemRequest> getOrderItems() {
    return _items
        .map((item) => OrderItemRequest(
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
            ))
        .toList();
  }

  // Check if item exists in cart
  bool hasItem(int itemId) {
    return _items.any((item) => item.id == itemId);
  }

  // Get item quantity in cart
  int getItemQuantity(int itemId) {
    final item = _items.firstWhere(
      (item) => item.id == itemId,
      orElse: () => CartItem(id: itemId, name: '', price: 0),
    );
    return item.quantity;
  }
}
