const express = require("express");
const stripe = require("../config/stripe");
const db = require("../config/db");
const { sendPaymentLink, sendPaymentConfirmed } = require("../services/emailService");
const router = express.Router();

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { booking_id } = req.body;
    const result = await db.query("SELECT * FROM bookings WHERE id=$1", [booking_id]);
    const booking = result.rows[0];
    if (booking === undefined) return res.status(404).json({ error: "Booking nenalezen" });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "czk",
          product_data: { name: "Vyvoz jimky", description: booking.address },
          unit_amount: Math.round(Number(booking.price_czk) * 100)
        },
        quantity: 1
      }],
      success_url: process.env.FRONTEND_URL + "/?payment=success&booking_id=" + booking.id,
      cancel_url: process.env.FRONTEND_URL + "/?payment=cancel",
      metadata: { booking_id: booking.id.toString() }
    });
    await db.query("UPDATE bookings SET status=$1 WHERE id=$2", ["awaiting_payment", booking_id]);
    await sendPaymentLink(booking.customer_email, session.url);
    res.json({ url: session.url });
  } catch (err) { console.error(err); res.status(500).json({ error: "Stripe error" }); }
});

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(400).send("Webhook Error: " + err.message);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata.booking_id;
    try {
      const result = await db.query("UPDATE bookings SET status=$1 WHERE id=$2 RETURNING *", ["paid", bookingId]);
      const booking = result.rows[0];
      await db.query(
        "INSERT INTO invoices (booking_id, amount_czk, stripe_payment_intent) VALUES ($1,$2,$3)",
        [bookingId, booking.price_czk, session.payment_intent]
      );
      await sendPaymentConfirmed(booking.customer_email, booking);
    } catch (err) { console.error(err); }
  }
  res.json({ received: true });
});

module.exports = router;
