package com.example.myfirstapp

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent

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

    private var checkoutUrl: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val checkoutUrlExtra = intent.getStringExtra(EXTRA_CHECKOUT_URL).orEmpty()
        if (checkoutUrlExtra.isBlank()) {
            Toast.makeText(this, R.string.payment_link_missing, Toast.LENGTH_LONG).show()
            finish()
            return
        }

        checkoutUrl = checkoutUrlExtra
        val openButton = findViewById<Button>(R.id.checkoutOpenButton)
        val doneButton = findViewById<Button>(R.id.checkoutDoneButton)

        openButton.setOnClickListener {
            openCheckout()
        }

        doneButton.setOnClickListener {
            finishWithResult()
        }

        openCheckout()
    }

    override fun onBackPressed() {
        finishWithResult()
    }

    private fun openCheckout() {
        val uri = Uri.parse(checkoutUrl)
        val customTabsIntent = CustomTabsIntent.Builder().build()
        try {
            customTabsIntent.launchUrl(this, uri)
        } catch (error: Exception) {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
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
