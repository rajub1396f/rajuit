class ProductModel {
  final int id;
  final String name;
  final String description;
  final double price;
  final String? image;
  final List<String> imageUrls;
  final String category;
  final String subcategory;
  final String type;
  final List<String> sizes;
  final int stock;
  final double rating;
  final int reviews;
  final String? createdAt;
  final String? instagramVideoUrl;

  ProductModel({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    this.image,
    this.imageUrls = const [],
    required this.category,
    this.subcategory = '',
    this.type = '',
    this.sizes = const [],
    this.stock = 0,
    this.rating = 0.0,
    this.reviews = 0,
    this.createdAt,
    this.instagramVideoUrl,
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

    List<String> parseStringList(dynamic value) {
      if (value == null) return [];
      if (value is List) {
        return value
            .map((item) => item?.toString().trim() ?? '')
            .where((item) => item.isNotEmpty)
            .toList();
      }
      if (value is String && value.trim().isNotEmpty) {
        final trimmed = value.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          final inner = trimmed.substring(1, trimmed.length - 1);
          return inner
              .split(',')
              .map((item) => item.replaceAll('"', '').trim())
              .where((item) => item.isNotEmpty)
              .toList();
        }
        return trimmed
            .split(RegExp(r'[\n,]+'))
            .map((item) => item.trim())
            .where((item) => item.isNotEmpty)
            .toList();
      }
      return [];
    }

    final images = parseStringList(json['image_urls']);
    final primaryImage = json['image_url'] ?? json['image'];
    if (primaryImage != null && primaryImage.toString().trim().isNotEmpty) {
      images.insert(0, primaryImage.toString().trim());
    }

    return ProductModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: parsePrice(json['price']),
      image: images.isNotEmpty ? images.first : null,
      imageUrls: images.toSet().toList(),
      category: json['category'] ?? '',
      subcategory: json['subcategory'] ?? '',
      type: json['type'] ?? '',
      sizes: parseStringList(json['sizes']),
      stock: json['stock_quantity'] ?? json['stock'] ?? 0,
      rating: parseRating(json['rating']),
      reviews: json['reviews'] ?? 0,
      createdAt: json['created_at'],
      instagramVideoUrl: json['instagram_video_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'image': image,
      'image_urls': imageUrls,
      'category': category,
      'subcategory': subcategory,
      'type': type,
      'sizes': sizes,
      'stock': stock,
      'rating': rating,
      'reviews': reviews,
      'created_at': createdAt,
      'instagram_video_url': instagramVideoUrl,
    };
  }

  ProductModel copyWith({
    int? id,
    String? name,
    String? description,
    double? price,
    String? image,
    List<String>? imageUrls,
    String? category,
    String? subcategory,
    String? type,
    List<String>? sizes,
    int? stock,
    double? rating,
    int? reviews,
    String? createdAt,
    String? instagramVideoUrl,
  }) {
    return ProductModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      image: image ?? this.image,
      imageUrls: imageUrls ?? this.imageUrls,
      category: category ?? this.category,
      subcategory: subcategory ?? this.subcategory,
      type: type ?? this.type,
      sizes: sizes ?? this.sizes,
      stock: stock ?? this.stock,
      rating: rating ?? this.rating,
      reviews: reviews ?? this.reviews,
      createdAt: createdAt ?? this.createdAt,
      instagramVideoUrl: instagramVideoUrl ?? this.instagramVideoUrl,
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
