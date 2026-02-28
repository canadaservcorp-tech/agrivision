/**
 * POST /api/webhook — Stripe webhook handler
 * Forwards to backend but can also handle client-side events
 */

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  // Forward to backend
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": sig || "",
      },
      body,
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Webhook forwarding failed" }), { status: 500 });
  }
}
