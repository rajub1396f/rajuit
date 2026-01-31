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
  bool _hasLoggedJwtRequest = false;

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

    // Add JWT token interceptor with automatic refresh
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await StorageService.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
            if (kDebugMode && !_hasLoggedJwtRequest) {
              _hasLoggedJwtRequest = true;
              print(
                  '[JWT] Token added to request: ${token.substring(0, 20)}...');
            }
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Handle 401 Unauthorized - token expired
          if (error.response?.statusCode == 401) {
            if (kDebugMode) {
              print('[JWT] Token expired (401), attempting refresh...');
            }
            // Attempt to refresh token
            final refreshed = await _refreshToken();
            if (refreshed) {
              // Retry original request with new token
              return handler.resolve(await _retry(error.requestOptions));
            }
          }

          if (kDebugMode) {
            print('[API Error] ${error.message}');
            print('[Error Response] ${error.response?.data}');
          }
          return handler.next(error);
        },
      ),
    );

    // LogInterceptor removed - using minimal JWT logs only
    // to reduce console spam
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
  Future<List<ProductModel>> getProducts({
    String? category,
    String? subcategory,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (category?.isNotEmpty == true) {
        queryParameters['category'] = category;
      }
      if (subcategory?.isNotEmpty == true) {
        queryParameters['subcategory'] = subcategory;
      }

      final response = await _dio.get(
        '/api/products',
        queryParameters: queryParameters.isEmpty ? null : queryParameters,
      );

      if (response.statusCode == 200) {
        final rawList = _extractProductList(response.data);
        return rawList
            .map((product) =>
                ProductModel.fromJson(product as Map<String, dynamic>))
            .toList();
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

  List<dynamic> _extractProductList(dynamic data) {
    if (data is List) return data;
    if (data is Map<String, dynamic>) {
      if (data['products'] is List) {
        return data['products'] as List<dynamic>;
      }
      if (data['data'] is List) {
        return data['data'] as List<dynamic>;
      }
      if (data['items'] is List) {
        return data['items'] as List<dynamic>;
      }
    }
    return [];
  }

  Future<ProductModel> getProduct(int productId) async {
    final products = await getProducts();
    final matchingProduct = products.firstWhere(
      (product) => product.id == productId,
      orElse: () =>
          throw Exception('Product with ID $productId not found.'),
    );
    return matchingProduct;
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
      final response = await _dio.post('/update-profile', data: data);

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data['user']);
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

  // ==================== SEND INVOICE EMAIL ====================

  Future<Map<String, dynamic>> sendInvoiceEmail(int orderId) async {
    try {
      if (kDebugMode) {
        print('[Invoice] Requesting to send invoice email for order $orderId');
      }
      
      final response = await _dio.post('/send-invoice-email/$orderId');

      if (response.statusCode == 200) {
        if (kDebugMode) {
          print('[Invoice] Email sent successfully: ${response.data}');
        }
        return response.data as Map<String, dynamic>;
      }
      throw DioException(
        requestOptions: response.requestOptions,
        response: response,
        type: DioExceptionType.badResponse,
      );
    } on DioException catch (e) {
      if (kDebugMode) {
        print('[Invoice] Send email failed: ${e.message}');
      }
      throw _handleError(e);
    }
  }

  // ==================== ERROR HANDLING ====================

  dynamic _handleError(DioException error) {
    String message = 'An error occurred';

    if (error.response != null) {
      message =
          error.response?.data['message'] ?? error.message ?? 'Server error';
    } else if (error.type == DioExceptionType.connectionTimeout) {
      message = 'Connection timeout. Please check your internet.';
    } else if (error.type == DioExceptionType.receiveTimeout) {
      message = 'Request timeout. Please try again.';
    } else if (error.type == DioExceptionType.unknown) {
      message = 'Network error. Please check your connection.';
    }

    return Exception(message);
  }

  // ==================== JWT TOKEN MANAGEMENT ====================

  /// Attempt to refresh JWT token
  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken == null) {
        if (kDebugMode) print('[JWT] No refresh token available');
        return false;
      }

      final response = await _dio.post(
        '/refresh-token',
        data: {'refreshToken': refreshToken},
        options: Options(
          headers: {'Authorization': 'Bearer $refreshToken'},
        ),
      );

      if (response.statusCode == 200 && response.data['token'] != null) {
        final newToken = response.data['token'];
        final expiry = response.data['expiresIn'] ?? 3600;

        await StorageService.saveToken(newToken, expiryInSeconds: expiry);
        if (kDebugMode) print('[JWT] Token refreshed successfully');
        return true;
      }
    } catch (e) {
      if (kDebugMode) print('[JWT] Token refresh failed: $e');
      // Clear tokens if refresh fails
      await StorageService.deleteToken();
      await StorageService.deleteRefreshToken();
    }
    return false;
  }

  /// Retry a failed request
  Future<Response<dynamic>> _retry(RequestOptions requestOptions) async {
    final options = Options(
      method: requestOptions.method,
      headers: requestOptions.headers,
    );
    return _dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }

  // ==================== SECURE INVOICE SYNC ====================

  /// Get and cache invoice with JWT authentication
  Future<String> getInvoiceSecure(int orderId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) throw Exception('Unauthorized: No valid token');

      // Check if we have cached invoice and if it needs refresh
      if (!await StorageService.invoiceNeedsRefresh(orderId)) {
        final cached = await StorageService.getInvoiceSync(orderId);
        if (cached != null && cached['invoiceData'] != null) {
          if (kDebugMode)
            print('[Invoice] Using cached invoice for order $orderId');
          return cached['invoiceData'] as String;
        }
      }

      // Fetch fresh invoice from server
      final response = await _dio.get(
        '/get-invoice/$orderId',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'X-Invoice-Request': 'secure',
          },
        ),
      );

      if (response.statusCode == 200) {
        final invoiceData = response.data['invoice'] ?? response.data;

        // Cache the invoice with JWT token
        await StorageService.saveInvoiceSync(
          orderId: orderId,
          invoiceData: invoiceData.toString(),
          jwtToken: token,
        );

        if (kDebugMode)
          print('[Invoice] Invoice fetched and cached for order $orderId');
        return invoiceData.toString();
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

  /// Verify invoice authenticity using JWT
  Future<bool> verifyInvoiceAuthority(int orderId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) return false;

      final response = await _dio.post(
        '/verify-invoice/$orderId',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      return response.statusCode == 200 && response.data['verified'] == true;
    } catch (e) {
      if (kDebugMode) print('[Invoice] Verification failed: $e');
      return false;
    }
  }

  /// Sync all invoices for user with JWT
  Future<List<Map<String, dynamic>>> syncAllInvoices() async {
    try {
      final token = await StorageService.getToken();
      if (token == null) throw Exception('Unauthorized: No valid token');

      final response = await _dio.get(
        '/invoices/sync',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200) {
        final invoices = response.data['invoices'] as List? ?? [];

        for (var invoice in invoices) {
          final orderId = invoice['orderId'] ?? invoice['order_id'];
          if (orderId != null) {
            await StorageService.saveInvoiceSync(
              orderId: orderId,
              invoiceData: invoice.toString(),
              jwtToken: token,
            );
          }
        }

        if (kDebugMode) print('[Invoice] Synced ${invoices.length} invoices');
        return invoices.cast<Map<String, dynamic>>();
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
}
