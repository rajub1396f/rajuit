import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../services/api_service.dart';

class ProductProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<ProductModel> _products = [];
  List<ProductModel> _filteredProducts = [];
  ProductModel? _selectedProduct;
  bool _isLoading = false;
  String? _error;
  String _selectedCategory = 'all';

  // Getters
  List<ProductModel> get products => _filteredProducts.isEmpty ? _products : _filteredProducts;
  List<ProductModel> get allProducts => _products;
  ProductModel? get selectedProduct => _selectedProduct;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get selectedCategory => _selectedCategory;

  Future<void> fetchProducts() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _products = await _apiService.getProducts();
      _filteredProducts = List.from(_products);

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchProductsByCategory(String category) async {
    try {
      _isLoading = true;
      _error = null;
      _selectedCategory = category;
      notifyListeners();

      if (category == 'all') {
        _filteredProducts = List.from(_products);
      } else {
        // Filter from already loaded products instead of making new API call
        _filteredProducts =
            _products.where((p) => p.category == category).toList();
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchProductsBySubcategory(
      String category, String subcategory) async {
    try {
      _isLoading = true;
      _error = null;
      _selectedCategory = category;
      notifyListeners();

      // Filter products by category and subcategory
      _filteredProducts = _products
          .where((p) => p.category == category)
          .toList();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchProduct(int productId) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _selectedProduct = await _apiService.getProduct(productId);

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void searchProducts(String query) {
    if (query.isEmpty) {
      // If search is cleared, show products from current category
      if (_selectedCategory == 'all') {
        _filteredProducts = List.from(_products);
      } else {
        _filteredProducts = _products
            .where((p) => p.category == _selectedCategory)
            .toList();
      }
    } else {
      // Filter by search query and current category
      _filteredProducts = _products
          .where((product) {
            final matchesSearch = product.name.toLowerCase().contains(query.toLowerCase()) ||
                product.description.toLowerCase().contains(query.toLowerCase());
            final matchesCategory = _selectedCategory == 'all' || 
                product.category == _selectedCategory;
            return matchesSearch && matchesCategory;
          })
          .toList();
    }
    notifyListeners();
  }

  void filterByPrice(double minPrice, double maxPrice) {
    _filteredProducts = _products
        .where((product) =>
            product.price >= minPrice && product.price <= maxPrice)
        .toList();
    notifyListeners();
  }

  void sortByPrice({bool ascending = true}) {
    _filteredProducts.sort((a, b) {
      if (ascending) {
        return a.price.compareTo(b.price);
      } else {
        return b.price.compareTo(a.price);
      }
    });
    notifyListeners();
  }

  void sortByRating({bool ascending = false}) {
    _filteredProducts.sort((a, b) {
      if (ascending) {
        return a.rating.compareTo(b.rating);
      } else {
        return b.rating.compareTo(a.rating);
      }
    });
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void resetFilters() {
    _filteredProducts = List.from(_products);
    _selectedCategory = 'all';
    notifyListeners();
  }
}
