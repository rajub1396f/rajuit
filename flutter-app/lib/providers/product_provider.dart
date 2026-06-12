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
  String _selectedSubcategory = 'all';
  String _selectedItemType = 'all';
  String _searchQuery = '';

  // Getters
  List<ProductModel> get products => _filteredProducts;
  List<ProductModel> get allProducts => _products;
  ProductModel? get selectedProduct => _selectedProduct;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get selectedCategory => _selectedCategory;
  String get selectedSubcategory => _selectedSubcategory;
  String get selectedItemType => _selectedItemType;

  List<String> get visibleItemTypes {
    final itemTypes = _products
        .where((product) {
          final matchesCategory = _selectedCategory == 'all' ||
              product.category == _selectedCategory;
          final matchesSubcategory = _selectedSubcategory == 'all' ||
              product.subcategory == _selectedSubcategory;
          return matchesCategory &&
              matchesSubcategory &&
              product.type.isNotEmpty;
        })
        .map((product) => product.type)
        .toSet()
        .toList();

    itemTypes.sort((a, b) => _formatLabel(a).compareTo(_formatLabel(b)));
    return itemTypes;
  }

  Future<void> fetchProducts() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _products = await _apiService.getProducts();
      _applyFilters();

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
        _selectedSubcategory = 'all';
        _selectedItemType = 'all';
      } else {
        _selectedSubcategory = 'all';
        _selectedItemType = 'all';
      }

      _applyFilters();

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
      _selectedSubcategory = subcategory;
      _selectedItemType = 'all';
      notifyListeners();

      _applyFilters();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchProductsByItemType(String category, String itemType) async {
    try {
      _isLoading = true;
      _error = null;
      _selectedCategory = category;
      _selectedItemType = itemType;
      notifyListeners();

      _applyFilters();

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
    _searchQuery = query;
    _applyFilters();
    notifyListeners();
  }

  void filterByPrice(double minPrice, double maxPrice) {
    _filteredProducts = _products
        .where(
            (product) => product.price >= minPrice && product.price <= maxPrice)
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
    _selectedCategory = 'all';
    _selectedSubcategory = 'all';
    _selectedItemType = 'all';
    _searchQuery = '';
    _applyFilters();
    notifyListeners();
  }

  void _applyFilters() {
    final normalizedQuery = _searchQuery.trim().toLowerCase();

    _filteredProducts = _products.where((product) {
      final matchesCategory =
          _selectedCategory == 'all' || product.category == _selectedCategory;
      final matchesSubcategory = _selectedSubcategory == 'all' ||
          product.subcategory == _selectedSubcategory;
      final matchesItem =
          _selectedItemType == 'all' || product.type == _selectedItemType;
      final matchesSearch = normalizedQuery.isEmpty ||
          product.name.toLowerCase().contains(normalizedQuery) ||
          product.description.toLowerCase().contains(normalizedQuery) ||
          product.subcategory.toLowerCase().contains(normalizedQuery) ||
          product.type.toLowerCase().contains(normalizedQuery);

      return matchesCategory &&
          matchesSubcategory &&
          matchesItem &&
          matchesSearch;
    }).toList();
  }

  String _formatLabel(String value) {
    return value
        .replaceAll(RegExp(r'[-_]+'), ' ')
        .split(' ')
        .where((word) => word.isNotEmpty)
        .map((word) => word[0].toUpperCase() + word.substring(1).toLowerCase())
        .join(' ');
  }
}
