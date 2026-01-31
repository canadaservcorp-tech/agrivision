package com.example.myfirstapp

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Patterns
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import org.json.JSONObject

class MainActivity : AppCompatActivity(R.layout.activity_main) {
    private val networkExecutor = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val fullNameInput = findViewById<EditText>(R.id.fullNameInput)
        val emailInput = findViewById<EditText>(R.id.emailInput)
        val phoneInput = findViewById<EditText>(R.id.phoneInput)
        val serviceInput = findViewById<EditText>(R.id.serviceInput)
        val businessNameInput = findViewById<EditText>(R.id.businessNameInput)
        val passwordInput = findViewById<EditText>(R.id.passwordInput)
        val confirmPasswordInput = findViewById<EditText>(R.id.confirmPasswordInput)
        val termsCheckbox = findViewById<CheckBox>(R.id.termsCheckbox)
        val registerButton = findViewById<Button>(R.id.registerButton)
        val privacyButton = findViewById<Button>(R.id.privacyButton)
        val termsButton = findViewById<Button>(R.id.termsButton)
        val contactButton = findViewById<Button>(R.id.contactButton)
        val aboutButton = findViewById<Button>(R.id.aboutButton)

        privacyButton.setOnClickListener {
            openUrl(getString(R.string.privacy_policy_url))
        }

        termsButton.setOnClickListener {
            openUrl(getString(R.string.terms_of_service_url))
        }

        contactButton.setOnClickListener {
            openUrl(getString(R.string.contact_url))
        }

        aboutButton.setOnClickListener {
            openUrl(getString(R.string.about_url))
        }

        registerButton.setOnClickListener {
            listOf(
                fullNameInput,
                emailInput,
                phoneInput,
                serviceInput,
                businessNameInput,
                passwordInput,
                confirmPasswordInput,
            ).forEach { it.error = null }

            val fullName = fullNameInput.text?.toString()?.trim().orEmpty()
            val email = emailInput.text?.toString()?.trim().orEmpty()
            val phone = phoneInput.text?.toString()?.trim().orEmpty()
            val service = serviceInput.text?.toString()?.trim().orEmpty()
            val business = businessNameInput.text?.toString()?.trim().orEmpty()
            val password = passwordInput.text?.toString().orEmpty()
            val confirmPassword = confirmPasswordInput.text?.toString().orEmpty()

            var hasError = false

            if (fullName.isEmpty()) {
                fullNameInput.error = getString(R.string.full_name_required)
                hasError = true
            }

            if (email.isEmpty()) {
                emailInput.error = getString(R.string.email_required)
                hasError = true
            } else if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                emailInput.error = getString(R.string.registration_invalid_email)
                hasError = true
            }

            if (phone.isEmpty()) {
                phoneInput.error = getString(R.string.phone_required)
                hasError = true
            } else if (!Patterns.PHONE.matcher(phone).matches()) {
                phoneInput.error = getString(R.string.registration_invalid_phone)
                hasError = true
            }

            if (service.isEmpty()) {
                serviceInput.error = getString(R.string.service_required)
                hasError = true
            }

            if (business.isEmpty()) {
                businessNameInput.error = getString(R.string.business_required)
                hasError = true
            }

            if (password.isEmpty()) {
                passwordInput.error = getString(R.string.password_required)
                hasError = true
            } else if (password.length < 8) {
                passwordInput.error = getString(R.string.registration_password_short)
                hasError = true
            } else if (!isPasswordValid(password)) {
                passwordInput.error = getString(R.string.registration_password_requirements)
                hasError = true
            }

            if (confirmPassword.isEmpty()) {
                confirmPasswordInput.error = getString(R.string.confirm_password_required)
                hasError = true
            } else if (password != confirmPassword) {
                confirmPasswordInput.error = getString(R.string.registration_password_mismatch)
                hasError = true
            }

            if (!termsCheckbox.isChecked) {
                Toast.makeText(this, R.string.registration_missing_terms, Toast.LENGTH_SHORT).show()
                hasError = true
            }

            if (hasError) {
                if (termsCheckbox.isChecked) {
                    Toast.makeText(this, R.string.registration_error_generic, Toast.LENGTH_SHORT).show()
                }
                return@setOnClickListener
            }

            submitRegistration(
                fullName = fullName,
                email = email,
                phone = phone,
                service = service,
                businessName = business,
                password = password,
                registerButton = registerButton,
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        networkExecutor.shutdown()
    }

    private fun openUrl(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        if (intent.resolveActivity(packageManager) != null) {
            startActivity(intent)
        } else {
            Toast.makeText(this, R.string.link_open_error, Toast.LENGTH_SHORT).show()
        }
    }

    private fun isPasswordValid(password: String): Boolean {
        val hasUppercase = password.any { it.isUpperCase() }
        val hasLowercase = password.any { it.isLowerCase() }
        val hasNumber = password.any { it.isDigit() }
        return hasUppercase && hasLowercase && hasNumber
    }

    private fun submitRegistration(
        fullName: String,
        email: String,
        phone: String,
        service: String,
        businessName: String,
        password: String,
        registerButton: Button,
    ) {
        setRegisterButtonLoading(registerButton, true)
        val endpoint = getString(R.string.registration_endpoint)
        val payload = JSONObject().apply {
            put("name", fullName)
            put("email", email)
            put("phone", phone)
            put("service", service)
            put("businessName", businessName)
            put("password", password)
            put("role", "provider")
        }

        networkExecutor.execute {
            val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }

            try {
                connection.outputStream.use { outputStream ->
                    outputStream.write(payload.toString().toByteArray(Charsets.UTF_8))
                }

                val responseCode = connection.responseCode
                val responseBody = if (responseCode in 200..299) {
                    connection.inputStream
                } else {
                    connection.errorStream
                }
                val rawBody = responseBody?.bufferedReader()?.use { it.readText() }.orEmpty()
                val responseJson = if (rawBody.isNotBlank()) JSONObject(rawBody) else JSONObject()
                val success = responseJson.optBoolean("success", false)
                val token = responseJson.optString("token", "")
                val serverError = when {
                    responseJson.has("error") -> responseJson.optString("error")
                    responseJson.has("message") -> responseJson.optString("message")
                    else -> ""
                }

                runOnUiThread {
                    setRegisterButtonLoading(registerButton, false)
                    if (success) {
                        saveAuthToken(token)
                        Toast.makeText(this, R.string.registration_success, Toast.LENGTH_LONG).show()
                    } else {
                        val message = if (serverError.isNotBlank()) {
                            serverError
                        } else {
                            getString(R.string.registration_unexpected_error)
                        }
                        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                    }
                }
            } catch (error: Exception) {
                runOnUiThread {
                    setRegisterButtonLoading(registerButton, false)
                    Toast.makeText(this, R.string.registration_connection_error, Toast.LENGTH_LONG).show()
                }
            } finally {
                connection.disconnect()
            }
        }
    }

    private fun setRegisterButtonLoading(registerButton: Button, isLoading: Boolean) {
        registerButton.isEnabled = !isLoading
        registerButton.text = if (isLoading) {
            getString(R.string.registration_in_progress)
        } else {
            getString(R.string.register_button)
        }
    }

    private fun saveAuthToken(token: String) {
        if (token.isBlank()) {
            return
        }
        val prefs = getSharedPreferences("auth", MODE_PRIVATE)
        prefs.edit().putString("token", token).apply()
    }
}
