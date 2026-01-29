import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/constants.dart';
import '../models/user_model.dart';
import '../models/product_model.dart';
import '../models/order_model.dart';
import '../services/storage_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  late Dio _dio;

  factory ApiService() {
    return _instance;
  }

  ApiService._internal() {
    _initializeDio();
  }

  void _initializeDio() {
    _dio = Dio(
      BaseOptions(
        baseUrl: Constants.baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Add interceptor for token
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await StorageService.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) {
          if (kDebugMode) {
            print('API Error: ${error.message}');
            print('Error Response: ${error.response?.data}');
          }
          return handler.next(error);
        },
      ),
    );

    if (kDebugMode) {
      _dio.interceptors.add(
        LogInterceptor(
          responseBody: true,
          requestBody: true,
          requestHeader: true,
        ),
      );
    }
  }

  // ==================== AUTHENTICATION ====================

  Future<AuthResponse> login(String email, String password) async {
    try {
      final response = await _dio.post(
        '/login',
        data: LoginRequest(email: email, password: password).toJson(),
      );

      if (response.statusCode == 200) {
        return AuthResponse.fromJson(response.data);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<AuthResponse> register(
    String name,
    String email,
    String password,
    String phone,
  ) async {
    try {
      final response = await _dio.post(
        '/register',
        data: RegisterRequest(
          name: name,
          email: email,
          password: password,
          phone: phone,
        ).toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return AuthResponse.fromJson(response.data);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<AuthResponse> verifyEmail(String code) async {
    try {
      final response = await _dio.post(
        '/verify-email',
        data: {'code': code},
      );

      if (response.statusCode == 200) {
        return AuthResponse.fromJson(response.data);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await _dio.post(
        '/forgot-password',
        data: {'email': email},
      );

      if (response.statusCode == 200) {
        return response.data;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== PRODUCTS ====================

  Future<List<ProductModel>> getProducts() async {
    try {
      final response = await _dio.get('/api/products');

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((p) => ProductModel.fromJson(p)).toList();
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<ProductModel> getProduct(int productId) async {
    try {
      final response = await _dio.get('/api/products?id=$productId');

      if (response.statusCode == 200) {
        return ProductModel.fromJson(response.data['data']);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<ProductModel>> getProductsByCategory(String category) async {
    try {
      final response = await _dio.get('/api/products?category=$category');

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((p) => ProductModel.fromJson(p)).toList();
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== ORDERS ====================

  Future<CreateOrderResponse> createOrder(CreateOrderRequest request) async {
    try {
      final response = await _dio.post(
        '/create-order',
        data: request.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return CreateOrderResponse.fromJson(response.data);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<OrderModel>> getOrders() async {
    try {
      final response = await _dio.get('/get-orders');

      if (response.statusCode == 200) {
        final ordersResponse = OrdersResponse.fromJson(response.data);
        return ordersResponse.orders;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<String> getInvoice(int orderId) async {
    try {
      final response = await _dio.get('/get-invoice/$orderId');

      if (response.statusCode == 200) {
        return response.data['data'] ?? '';
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<OrderModel> updateOrder(int orderId, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/orders/$orderId', data: data);

      if (response.statusCode == 200) {
        return OrderModel.fromJson(response.data['data']);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== USER PROFILE ====================

  Future<UserModel> getUserProfile() async {
    try {
      final response = await _dio.get('/user/profile');

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data['data']);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<UserModel> updateUserProfile(Map<String, String> data) async {
    try {
      final response = await _dio.put('/user/profile', data: data);

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data['data']);
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ==================== ERROR HANDLING ====================

  Future<void> regenerateInvoice(int orderId) async {
    try {
      final response = await _dio.get('/regenerate-invoice/$orderId');

      if (response.statusCode != 200) {
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
          type: DioExceptionType.badResponse,
        );
      }
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  dynamic _handleError(DioException error) {
    String message = 'An error occurred';

    if (error.response != null) {
      message = error.response?.data['message'] ?? error.message ?? 'Server error';
    } else if (error.type == DioExceptionType.connectionTimeout) {
      message = 'Connection timeout. Please check your internet.';
    } else if (error.type == DioExceptionType.receiveTimeout) {
      message = 'Request timeout. Please try again.';
    } else if (error.type == DioExceptionType.unknown) {
      message = 'Network error. Please check your connection.';
    }

    return Exception(message);
  }
}
