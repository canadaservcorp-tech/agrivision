package com.example.myfirstapp

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.math.BigDecimal
import java.math.RoundingMode
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import org.json.JSONObject

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

    private val networkExecutor = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private val pollIntervalMs = 3000L
    private val maxPollAttempts = 10
    private var pollAttempts = 0
    private var isPolling = false
    private var paymentId: String = ""
    private lateinit var statusText: TextView
    private lateinit var statusSpinner: ProgressBar
    private lateinit var checkStatusButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val paymentId = intent.getStringExtra(EXTRA_PAYMENT_ID).orEmpty()
        val bookingId = intent.getStringExtra(EXTRA_BOOKING_ID).orEmpty()
        val amountCents = intent.getLongExtra(EXTRA_AMOUNT_CENTS, 0L)
        this.paymentId = paymentId

        val paymentIdView = findViewById<TextView>(R.id.paymentConfirmationId)
        val bookingIdView = findViewById<TextView>(R.id.paymentConfirmationBooking)
        val amountView = findViewById<TextView>(R.id.paymentConfirmationAmount)
        val doneButton = findViewById<Button>(R.id.confirmationDoneButton)
        statusText = findViewById(R.id.paymentStatusText)
        statusSpinner = findViewById(R.id.paymentStatusSpinner)
        checkStatusButton = findViewById(R.id.checkStatusButton)

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

        checkStatusButton.setOnClickListener {
            triggerManualStatusCheck()
        }

        doneButton.setOnClickListener {
            finish()
        }

        if (paymentId.isBlank()) {
            statusText.setText(R.string.payment_status_no_id)
            statusSpinner.visibility = View.GONE
            checkStatusButton.visibility = View.GONE
        } else {
            startPolling()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopPolling()
        handler.removeCallbacksAndMessages(null)
        networkExecutor.shutdown()
    }

    private fun startPolling() {
        if (isPolling) {
            return
        }
        isPolling = true
        pollAttempts = 0
        statusSpinner.visibility = View.VISIBLE
        statusText.setText(R.string.payment_status_checking)
        checkStatusButton.visibility = View.GONE
        pollPaymentStatus(isManual = false)
    }

    private fun stopPolling() {
        isPolling = false
        handler.removeCallbacksAndMessages(null)
    }

    private fun triggerManualStatusCheck() {
        statusSpinner.visibility = View.VISIBLE
        statusText.setText(R.string.payment_status_checking)
        checkStatusButton.visibility = View.GONE
        pollPaymentStatus(isManual = true)
    }

    private fun pollPaymentStatus(isManual: Boolean) {
        if (paymentId.isBlank()) {
            return
        }

        if (!isManual && !isPolling) {
            return
        }

        if (!isManual) {
            pollAttempts += 1
        }

        networkExecutor.execute {
            val result = fetchPaymentStatus(paymentId)
            runOnUiThread {
                handleStatusResult(result, isManual)
            }
        }
    }

    private fun handleStatusResult(result: StatusResult, isManual: Boolean) {
        val normalizedStatus = result.status?.lowercase().orEmpty()
        when (normalizedStatus) {
            "completed" -> {
                statusSpinner.visibility = View.GONE
                statusText.setText(R.string.payment_status_completed)
                checkStatusButton.visibility = View.GONE
                stopPolling()
                return
            }
            "failed" -> {
                statusSpinner.visibility = View.GONE
                statusText.setText(R.string.payment_status_failed)
                checkStatusButton.visibility = View.GONE
                stopPolling()
                return
            }
        }

        val attemptsExceeded = pollAttempts >= maxPollAttempts
        if (isManual || attemptsExceeded) {
            statusSpinner.visibility = View.GONE
            statusText.setText(
                if (result.error != null) {
                    R.string.payment_status_error
                } else {
                    R.string.payment_status_pending
                },
            )
            checkStatusButton.visibility = View.VISIBLE
            stopPolling()
            return
        }

        statusSpinner.visibility = View.VISIBLE
        statusText.setText(R.string.payment_status_checking)
        handler.postDelayed({ pollPaymentStatus(isManual = false) }, pollIntervalMs)
    }

    private fun fetchPaymentStatus(paymentId: String): StatusResult {
        val endpoint = getString(R.string.payment_status_endpoint, Uri.encode(paymentId))
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 15000
            readTimeout = 15000
        }

        return try {
            val responseCode = connection.responseCode
            val responseBody = if (responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }
            val rawBody = responseBody?.bufferedReader()?.use { it.readText() }.orEmpty()
            val responseJson = if (rawBody.isNotBlank()) JSONObject(rawBody) else JSONObject()
            val status = responseJson.optString(
                "status",
                responseJson.optString("paymentStatus", responseJson.optString("state", "")),
            ).trim()
            val error = if (responseCode in 200..299) {
                null
            } else {
                responseJson.optString("error").ifBlank { null }
            }
            StatusResult(status = status.ifBlank { null }, error = error)
        } catch (error: Exception) {
            StatusResult(status = null, error = error.message)
        } finally {
            connection.disconnect()
        }
    }

    private fun formatAmount(amountCents: Long): String {
        val amount = BigDecimal(amountCents).divide(BigDecimal("100"))
            .setScale(2, RoundingMode.HALF_UP)
        return "CAD ${amount.toPlainString()}"
    }

    private data class StatusResult(
        val status: String?,
        val error: String?,
    )
}
