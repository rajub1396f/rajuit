package com.rajuit.fashionstore.utils

import android.content.Context
import com.google.gson.Gson
import com.rajuit.fashionstore.models.CartItem
import com.rajuit.fashionstore.models.Product

object CartManager {
    private const val PREF_NAME = "cart_prefs"
    private const val CART_KEY = "cart_items"
    private val gson = Gson()

    private fun getSharedPreferences(context: Context) =
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun addToCart(context: Context, product: Product, quantity: Int) {
        val cart = getCart(context).toMutableList()
        val existingItem = cart.find { it.id == product.id }

        if (existingItem != null) {
            cart[cart.indexOf(existingItem)] = existingItem.copy(
                quantity = existingItem.quantity + quantity
            )
        } else {
            cart.add(
                CartItem(
                    id = product.id,
                    name = product.name,
                    price = product.price,
                    quantity = quantity,
                    image = product.image,
                    productId = product.id
                )
            )
        }

        saveCart(context, cart)
    }

    fun removeFromCart(context: Context, productId: Int) {
        val cart = getCart(context).filter { it.id != productId }.toMutableList()
        saveCart(context, cart)
    }

    fun updateQuantity(context: Context, productId: Int, quantity: Int) {
        val cart = getCart(context).toMutableList()
        val item = cart.find { it.id == productId }

        if (item != null && quantity > 0) {
            cart[cart.indexOf(item)] = item.copy(quantity = quantity)
            saveCart(context, cart)
        } else if (item != null && quantity == 0) {
            removeFromCart(context, productId)
        }
    }

    fun getCart(context: Context): List<CartItem> {
        val prefs = getSharedPreferences(context)
        val cartJson = prefs.getString(CART_KEY, "[]") ?: "[]"

        return try {
            val array = gson.fromJson(cartJson, Array<CartItem>::class.java)
            array.toList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun clearCart(context: Context) {
        saveCart(context, emptyList())
    }

    fun getCartTotal(context: Context): Double {
        return getCart(context).sumOf { it.getSubtotal() }
    }

    fun getCartItemCount(context: Context): Int {
        return getCart(context).sumOf { it.quantity }
    }

    private fun saveCart(context: Context, cart: List<CartItem>) {
        val prefs = getSharedPreferences(context)
        val cartJson = gson.toJson(cart)
        prefs.edit().putString(CART_KEY, cartJson).apply()
    }
}
