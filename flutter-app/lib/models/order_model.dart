double _parsePrice(dynamic price) {
  if (price == null) return 0.0;
  if (price is double) return price;
  if (price is int) return price.toDouble();
  if (price is String) {
    try {
      return double.parse(price);
    } catch (e) {
      return 0.0;
    }
  }
  return 0.0;
}

class CartItem {
  final int id;
  final String name;
  final double price;
  int quantity;
  final String? image;
  final int? productId;

  CartItem({
    required this.id,
    required this.name,
    required this.price,
    this.quantity = 1,
    this.image,
    this.productId,
  });

  double getSubtotal() => price * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      price: _parsePrice(json['price']),
      quantity: json['quantity'] ?? 1,
      image: json['image'],
      productId: json['productId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'quantity': quantity,
      'image': image,
      'productId': productId,
    };
  }

  CartItem copyWith({
    int? id,
    String? name,
    double? price,
    int? quantity,
    String? image,
    int? productId,
  }) {
    return CartItem(
      id: id ?? this.id,
      name: name ?? this.name,
      price: price ?? this.price,
      quantity: quantity ?? this.quantity,
      image: image ?? this.image,
      productId: productId ?? this.productId,
    );
  }
}

class OrderItemModel {
  final int? id;
  final int? orderId;
  final String productName;
  final String? productImage;
  final int quantity;
  final double price;

  OrderItemModel({
    this.id,
    this.orderId,
    required this.productName,
    this.productImage,
    required this.quantity,
    required this.price,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id'],
      orderId: json['order_id'],
      productName: json['product_name'] ?? '',
      productImage: json['product_image'],
      quantity: json['quantity'] ?? 0,
      price: _parsePrice(json['price']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_id': orderId,
      'product_name': productName,
      'product_image': productImage,
      'quantity': quantity,
      'price': price,
    };
  }
}

class CreateOrderRequest {
  final List<OrderItemRequest> items;
  final double totalAmount;
  final String shippingAddress;
  final String paymentMethod;

  CreateOrderRequest({
    required this.items,
    required this.totalAmount,
    required this.shippingAddress,
    required this.paymentMethod,
  });

  Map<String, dynamic> toJson() {
    return {
      'items': items.map((i) => i.toJson()).toList(),
      'totalAmount': totalAmount,
      'shippingAddress': shippingAddress,
      'paymentMethod': paymentMethod,
    };
  }
}

class OrderItemRequest {
  final String name;
  final double price;
  final int quantity;
  final String? image;

  OrderItemRequest({
    required this.name,
    required this.price,
    required this.quantity,
    this.image,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'price': price,
      'quantity': quantity,
      'image': image,
    };
  }
}

class OrderModel {
  final int id;
  final int userId;
  final double totalAmount;
  final String status;
  final String shippingAddress;
  final String? invoicePdfUrl;
  final String createdAt;
  final List<OrderItemModel> items;

  OrderModel({
    required this.id,
    required this.userId,
    required this.totalAmount,
    required this.status,
    required this.shippingAddress,
    this.invoicePdfUrl,
    required this.createdAt,
    this.items = const [],
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final itemsList = (json['items'] as List<dynamic>?)
            ?.map((item) => OrderItemModel.fromJson(item as Map<String, dynamic>))
            .toList() ??
        [];

    return OrderModel(
      id: json['id'] ?? 0,
      userId: json['user_id'] ?? 0,
      totalAmount: _parsePrice(json['total_amount']),
      status: json['status'] ?? 'pending',
      shippingAddress: json['shipping_address'] ?? '',
      invoicePdfUrl: json['invoice_pdf_url'],
      createdAt: json['created_at'] ?? '',
      items: itemsList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'total_amount': totalAmount,
      'status': status,
      'shipping_address': shippingAddress,
      'invoice_pdf_url': invoicePdfUrl,
      'created_at': createdAt,
      'items': items.map((i) => i.toJson()).toList(),
    };
  }

  OrderModel copyWith({
    int? id,
    int? userId,
    double? totalAmount,
    String? status,
    String? shippingAddress,
    String? invoicePdfUrl,
    String? createdAt,
    List<OrderItemModel>? items,
  }) {
    return OrderModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      totalAmount: totalAmount ?? this.totalAmount,
      status: status ?? this.status,
      shippingAddress: shippingAddress ?? this.shippingAddress,
      invoicePdfUrl: invoicePdfUrl ?? this.invoicePdfUrl,
      createdAt: createdAt ?? this.createdAt,
      items: items ?? this.items,
    );
  }
}

class OrdersResponse {
  final bool success;
  final List<OrderModel> orders;

  OrdersResponse({
    required this.success,
    required this.orders,
  });

  factory OrdersResponse.fromJson(Map<String, dynamic> json) {
    final ordersList = (json['orders'] as List<dynamic>?)
            ?.map((o) => OrderModel.fromJson(o as Map<String, dynamic>))
            .toList() ??
        [];

    return OrdersResponse(
      success: json['success'] ?? true,
      orders: ordersList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'orders': orders.map((o) => o.toJson()).toList(),
    };
  }
}

class CreateOrderResponse {
  final bool success;
  final String message;
  final int? orderId;
  final String? invoiceUrl;
  final OrderModel? order;

  CreateOrderResponse({
    required this.success,
    required this.message,
    this.orderId,
    this.invoiceUrl,
    this.order,
  });

  factory CreateOrderResponse.fromJson(Map<String, dynamic> json) {
    return CreateOrderResponse(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
      orderId: json['orderId'],
      invoiceUrl: json['invoiceUrl'],
      order: json['order'] != null ? OrderModel.fromJson(json['order']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'message': message,
      'orderId': orderId,
      'invoiceUrl': invoiceUrl,
      'order': order?.toJson(),
    };
  }
}
