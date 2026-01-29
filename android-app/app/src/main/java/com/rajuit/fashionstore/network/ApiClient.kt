package com.rajuit.fashionstore.network

import android.content.Context
import com.google.gson.GsonBuilder
import com.rajuit.fashionstore.BuildConfig
import com.rajuit.fashionstore.utils.TokenManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private const val BASE_URL = "https://rajuit.online/"
    private var retrofit: Retrofit? = null
    private var apiService: ApiService? = null

    fun getInstance(context: Context): ApiService {
        if (apiService == null) {
            retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(createOkHttpClient(context))
                .addConverterFactory(GsonConverterFactory.create(GsonBuilder().create()))
                .build()

            apiService = retrofit!!.create(ApiService::class.java)
        }
        return apiService!!
    }

    private fun createOkHttpClient(context: Context): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor { chain ->
                val original = chain.request()
                val token = TokenManager.getToken(context)

                val requestBuilder = original.newBuilder()
                    .header("Content-Type", "application/json")

                // Add JWT token to Authorization header if available
                if (!token.isNullOrEmpty()) {
                    requestBuilder.header("Authorization", "Bearer $token")
                }

                val request = requestBuilder.build()
                chain.proceed(request)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    fun resetClient() {
        retrofit = null
        apiService = null
    }
}
