package com.rajuit.fashionstore.utils

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object TokenManager {
    private const val PREF_NAME = "token_prefs"
    private const val TOKEN_KEY = "jwt_token"
    private const val USER_KEY = "user_id"
    private const val EMAIL_KEY = "user_email"
    private const val NAME_KEY = "user_name"

    private fun getEncryptedSharedPreferences(context: Context): EncryptedSharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        return EncryptedSharedPreferences.create(
            context,
            PREF_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        ) as EncryptedSharedPreferences
    }

    fun saveToken(context: Context, token: String) {
        getEncryptedSharedPreferences(context).edit().apply {
            putString(TOKEN_KEY, token)
            apply()
        }
    }

    fun getToken(context: Context): String? {
        return getEncryptedSharedPreferences(context).getString(TOKEN_KEY, null)
    }

    fun saveUserInfo(context: Context, userId: Int, email: String, name: String) {
        getEncryptedSharedPreferences(context).edit().apply {
            putInt(USER_KEY, userId)
            putString(EMAIL_KEY, email)
            putString(NAME_KEY, name)
            apply()
        }
    }

    fun getUserId(context: Context): Int {
        return getEncryptedSharedPreferences(context).getInt(USER_KEY, -1)
    }

    fun getUserEmail(context: Context): String? {
        return getEncryptedSharedPreferences(context).getString(EMAIL_KEY, null)
    }

    fun getUserName(context: Context): String? {
        return getEncryptedSharedPreferences(context).getString(NAME_KEY, null)
    }

    fun isLoggedIn(context: Context): Boolean {
        return !getToken(context).isNullOrEmpty()
    }

    fun logout(context: Context) {
        getEncryptedSharedPreferences(context).edit().apply {
            clear()
            apply()
        }
    }
}
