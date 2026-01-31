package com.example.myfirstapp

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.math.BigDecimal
import java.math.RoundingMode

class PaymentConfirmationActivity : AppCompatActivity(R.layout.activity_payment_confirmation) {
    companion object {
        private const val EXTRA_PAYMENT_ID = "extra_payment_id"
        private const val EXTRA_BOOKING_ID = "extra_booking_id"
        private const val EXTRA_AMOUNT_CENTS = "extra_amount_cents"

        fun newIntent(
            context: Context,
            paymentId: String,
            bookingId: String,
            amountCents: Long,
        ): Intent {
            return Intent(context, PaymentConfirmationActivity::class.java).apply {
                putExtra(EXTRA_PAYMENT_ID, paymentId)
                putExtra(EXTRA_BOOKING_ID, bookingId)
                putExtra(EXTRA_AMOUNT_CENTS, amountCents)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val paymentId = intent.getStringExtra(EXTRA_PAYMENT_ID).orEmpty()
        val bookingId = intent.getStringExtra(EXTRA_BOOKING_ID).orEmpty()
        val amountCents = intent.getLongExtra(EXTRA_AMOUNT_CENTS, 0L)

        val paymentIdView = findViewById<TextView>(R.id.paymentConfirmationId)
        val bookingIdView = findViewById<TextView>(R.id.paymentConfirmationBooking)
        val amountView = findViewById<TextView>(R.id.paymentConfirmationAmount)
        val doneButton = findViewById<Button>(R.id.confirmationDoneButton)

        if (paymentId.isBlank()) {
            paymentIdView.visibility = View.GONE
        } else {
            paymentIdView.text = getString(R.string.payment_confirmation_payment_id, paymentId)
        }

        if (bookingId.isBlank()) {
            bookingIdView.visibility = View.GONE
        } else {
            bookingIdView.text = getString(R.string.payment_confirmation_booking_id, bookingId)
        }

        if (amountCents <= 0L) {
            amountView.visibility = View.GONE
        } else {
            amountView.text = getString(R.string.payment_confirmation_amount, formatAmount(amountCents))
        }

        doneButton.setOnClickListener {
            finish()
        }
    }

    private fun formatAmount(amountCents: Long): String {
        val amount = BigDecimal(amountCents).divide(BigDecimal("100"))
            .setScale(2, RoundingMode.HALF_UP)
        return "CAD ${amount.toPlainString()}"
    }
}
