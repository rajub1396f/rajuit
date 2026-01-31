class UserModel {
  final int id;
  final String name;
  final String email;
  final String phone;
  final String? address;
  final bool isVerified;
  final String? role;
  final String? createdAt;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.address,
    required this.isVerified,
    this.role = 'user',
    this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      address: json['address'],
      isVerified: json['isVerified'] ?? json['is_verified'] ?? false,
      role: json['role'] ?? 'user',
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'address': address,
      'is_verified': isVerified,
      'role': role,
      'created_at': createdAt,
    };
  }

  UserModel copyWith({
    int? id,
    String? name,
    String? email,
    String? phone,
    String? address,
    bool? isVerified,
    String? role,
    String? createdAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      isVerified: isVerified ?? this.isVerified,
      role: role ?? this.role,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class LoginRequest {
  final String email;
  final String password;

  LoginRequest({
    required this.email,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }
}

class RegisterRequest {
  final String name;
  final String email;
  final String password;
  final String confirmPassword;
  final String phone;
  final String? address;

  RegisterRequest({
    required this.name,
    required this.email,
    required this.password,
    required this.confirmPassword,
    required this.phone,
    this.address,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'password': password,
      'confirmpassword': confirmPassword,
      'phone': phone,
      'address': address,
    };
  }
}

class AuthResponse {
  final bool success;
  final String message;
  final String? token;
  final UserModel? user;

  AuthResponse({
    required this.success,
    required this.message,
    this.token,
    this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
      token: json['token'],
      user: json['user'] != null ? UserModel.fromJson(json['user']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'message': message,
      'token': token,
      'user': user?.toJson(),
    };
  }
}
