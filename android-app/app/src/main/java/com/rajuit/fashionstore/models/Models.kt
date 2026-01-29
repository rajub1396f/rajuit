package com.rajuit.fashionstore.models

import com.google.gson.annotations.SerializedName
import java.io.Serializable

// User Models
data class User(
    val id: Int,
    val name: String,
    val email: String,
    val phone: String,
    val is_verified: Boolean,
    val created_at: String? = null,
    val role: String? = "user"
) : Serializable

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val phone: String
)

data class AuthResponse(
    val message: String,
    val token: String? = null,
    val user: User? = null,
    val success: Boolean
)

// Product Models
data class Product(
    val id: Int,
    val name: String,
    val description: String,
    val price: Double,
    val image: String? = null,
    val category: String,
    val stock: Int = 0,
    val rating: Float = 0f,
    val reviews: Int = 0,
    val created_at: String? = null
) : Serializable

data class ProductsResponse(
    val products: List<Product>,
    val success: Boolean
)

// Cart & Order Models
data class CartItem(
    val id: Int = 0,
    val name: String,
    val price: Double,
    val quantity: Int = 1,
    val image: String? = null,
    val productId: Int? = null
) : Serializable {
    fun getSubtotal(): Double = price * quantity
}

data class OrderItem(
    val id: Int? = null,
    val order_id: Int? = null,
    val product_name: String,
    val product_image: String? = null,
    val quantity: Int,
    val price: Double
) : Serializable

data class CreateOrderRequest(
    val items: List<OrderItemRequest>,
    val totalAmount: Double,
    val shippingAddress: String,
    val paymentMethod: String
)

data class OrderItemRequest(
    val name: String,
    val price: Double,
    val quantity: Int,
    val image: String? = null
)

data class Order(
    val id: Int,
    val user_id: Int,
    val total_amount: Double,
    val status: String,
    val shipping_address: String,
    val invoice_pdf_url: String? = null,
    val created_at: String,
    val items: List<OrderItem> = emptyList()
) : Serializable

data class OrdersResponse(
    val orders: List<Order>,
    val success: Boolean? = true
)

data class CreateOrderResponse(
    val message: String,
    val orderId: Int,
    val invoiceUrl: String? = null,
    val success: Boolean,
    val order: Order? = null
)

// API Response Models
data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T? = null
)

// Error Response
data class ErrorResponse(
    val message: String,
    val error: String? = null,
    val statusCode: Int? = null
)
