class ProductModel {
  final int id;
  final String name;
  final String description;
  final double price;
  final String? image;
  final String category;
  final int stock;
  final double rating;
  final int reviews;
  final String? createdAt;

  ProductModel({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    this.image,
    required this.category,
    this.stock = 0,
    this.rating = 0.0,
    this.reviews = 0,
    this.createdAt,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    // Handle price - can be string or double
    double parsePrice(dynamic price) {
      if (price == null) return 0.0;
      if (price is double) return price;
      if (price is int) return price.toDouble();
      if (price is String) return double.parse(price);
      return 0.0;
    }

    // Handle rating - can be string or double
    double parseRating(dynamic rating) {
      if (rating == null) return 0.0;
      if (rating is double) return rating;
      if (rating is int) return rating.toDouble();
      if (rating is String) return double.parse(rating);
      return 0.0;
    }

    return ProductModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: parsePrice(json['price']),
      image: json['image_url'] ?? json['image'],
      category: json['category'] ?? '',
      stock: json['stock_quantity'] ?? json['stock'] ?? 0,
      rating: parseRating(json['rating']),
      reviews: json['reviews'] ?? 0,
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'image': image,
      'category': category,
      'stock': stock,
      'rating': rating,
      'reviews': reviews,
      'created_at': createdAt,
    };
  }

  ProductModel copyWith({
    int? id,
    String? name,
    String? description,
    double? price,
    String? image,
    String? category,
    int? stock,
    double? rating,
    int? reviews,
    String? createdAt,
  }) {
    return ProductModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      image: image ?? this.image,
      category: category ?? this.category,
      stock: stock ?? this.stock,
      rating: rating ?? this.rating,
      reviews: reviews ?? this.reviews,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class ProductsResponse {
  final bool success;
  final List<ProductModel> products;

  ProductsResponse({
    required this.success,
    required this.products,
  });

  factory ProductsResponse.fromJson(Map<String, dynamic> json) {
    final productsList = (json['products'] as List<dynamic>?)
            ?.map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
            .toList() ??
        [];

    return ProductsResponse(
      success: json['success'] ?? false,
      products: productsList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'products': products.map((p) => p.toJson()).toList(),
    };
  }
}
