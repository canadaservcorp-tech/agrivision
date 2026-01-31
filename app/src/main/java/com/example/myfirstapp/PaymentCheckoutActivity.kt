package com.example.myfirstapp

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class PaymentCheckoutActivity : AppCompatActivity(R.layout.activity_payment_checkout) {
    companion object {
        const val EXTRA_CHECKOUT_URL = "extra_checkout_url"
        const val EXTRA_PAYMENT_ID = "extra_payment_id"
        const val EXTRA_BOOKING_ID = "extra_booking_id"
        const val EXTRA_AMOUNT_CENTS = "extra_amount_cents"

        fun newIntent(
            context: Context,
            checkoutUrl: String,
            paymentId: String,
            bookingId: String,
            amountCents: Long,
        ): Intent {
            return Intent(context, PaymentCheckoutActivity::class.java).apply {
                putExtra(EXTRA_CHECKOUT_URL, checkoutUrl)
                putExtra(EXTRA_PAYMENT_ID, paymentId)
                putExtra(EXTRA_BOOKING_ID, bookingId)
                putExtra(EXTRA_AMOUNT_CENTS, amountCents)
            }
        }
    }

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val checkoutUrl = intent.getStringExtra(EXTRA_CHECKOUT_URL).orEmpty()
        if (checkoutUrl.isBlank()) {
            Toast.makeText(this, R.string.payment_link_missing, Toast.LENGTH_LONG).show()
            finish()
            return
        }

        webView = findViewById(R.id.checkoutWebView)
        val doneButton = findViewById<Button>(R.id.checkoutDoneButton)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.webViewClient = WebViewClient()
        webView.loadUrl(checkoutUrl)

        doneButton.setOnClickListener {
            finishWithResult()
        }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            finishWithResult()
        }
    }

    private fun finishWithResult() {
        val data = Intent().apply {
            putExtra(EXTRA_PAYMENT_ID, intent.getStringExtra(EXTRA_PAYMENT_ID).orEmpty())
            putExtra(EXTRA_BOOKING_ID, intent.getStringExtra(EXTRA_BOOKING_ID).orEmpty())
            putExtra(EXTRA_AMOUNT_CENTS, intent.getLongExtra(EXTRA_AMOUNT_CENTS, 0L))
        }
        setResult(RESULT_OK, data)
        finish()
    }
}
