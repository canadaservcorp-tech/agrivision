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

class MainActivity : AppCompatActivity(R.layout.activity_main) {

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

            Toast.makeText(this, R.string.registration_success, Toast.LENGTH_LONG).show()
        }
    }

    private fun openUrl(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        if (intent.resolveActivity(packageManager) != null) {
            startActivity(intent)
        } else {
            Toast.makeText(this, R.string.link_open_error, Toast.LENGTH_SHORT).show()
        }
    }
}
