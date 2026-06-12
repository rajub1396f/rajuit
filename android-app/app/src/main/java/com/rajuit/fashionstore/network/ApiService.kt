package com.rajuit.fashionstore.network

import com.rajuit.fashionstore.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ==================== AUTHENTICATION ====================
    @POST("/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("/verify-email")
    suspend fun verifyEmail(
        @Body request: Map<String, String>
    ): Response<AuthResponse>

    @POST("/forgot-password")
    suspend fun forgotPassword(
        @Body request: Map<String, String>
    ): Response<ApiResponse<Any>>

    @POST("/reset-password")
    suspend fun resetPassword(
        @Body request: Map<String, String>
    ): Response<ApiResponse<Any>>

    // ==================== PRODUCTS ====================
    @GET("/get-products")
    suspend fun getProducts(): Response<ProductsResponse>

    @GET("/product/{id}")
    suspend fun getProduct(@Path("id") productId: Int): Response<ApiResponse<Product>>

    @GET("/products/{category}")
    suspend fun getProductsByCategory(
        @Path("category") category: String
    ): Response<ProductsResponse>

    // ==================== ORDERS ====================
    @POST("/create-order")
    suspend fun createOrder(
        @Body request: CreateOrderRequest
    ): Response<CreateOrderResponse>

    @GET("/get-orders")
    suspend fun getOrders(): Response<OrdersResponse>

    @GET("/get-invoice/{orderId}")
    suspend fun getInvoice(@Path("orderId") orderId: Int): Response<ApiResponse<String>>

    @PUT("/orders/{orderId}")
    suspend fun updateOrder(
        @Path("orderId") orderId: Int,
        @Body request: Map<String, Any>
    ): Response<ApiResponse<Order>>

    // ==================== USER PROFILE ====================
    @GET("/user/profile")
    suspend fun getUserProfile(): Response<ApiResponse<User>>

    @PUT("/user/profile")
    suspend fun updateUserProfile(
        @Body request: Map<String, String>
    ): Response<ApiResponse<User>>

    @POST("/user/change-password")
    suspend fun changePassword(
        @Body request: Map<String, String>
    ): Response<ApiResponse<Any>>

    // ==================== DASHBOARD (Admin) ====================
    @GET("/admin/orders")
    suspend fun getAdminOrders(): Response<OrdersResponse>

    @GET("/admin/orders/{orderId}")
    suspend fun getAdminOrder(@Path("orderId") orderId: Int): Response<ApiResponse<Order>>

    @PUT("/admin/orders/{orderId}")
    suspend fun updateAdminOrder(
        @Path("orderId") orderId: Int,
        @Body request: Map<String, Any>
    ): Response<ApiResponse<Order>>

}
