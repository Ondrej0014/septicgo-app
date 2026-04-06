const express = require("express");
const db = require("../config/db");
const { sendBookingReceived, notifyPartnersNewBooking, sendJobDone } = require("../services/emailService");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, address, tank_size_liters, frequency_months, region, preferred_date } = req.body;
    if (customer_email === undefined || address === undefined || region === undefined) {
      return res.status(400).json({ error: "Chybi povinna pole: email, adresa, region" });
    }
    const price_czk = 1500;
    const result = await db.query(
      "INSERT INTO bookings (customer_name,customer_email,customer_phone,address,tank_size_liters,frequency_months,region,preferred_date,status,price_czk) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
      [customer_name||null, customer_email, customer_phone||null, address, tank_size_liters||null, frequency_months||null, region, preferred_date||null, "pending_partner", price_czk]
    );
    const booking = result.rows[0];
    const partners = (await db.query("SELECT * FROM partners WHERE region=$1 AND is_active=TRUE", [region])).rows;
    await sendBookingReceived(customer_email, booking);
    await notifyPartnersNewBooking(partners, booking);
    res.status(201).json(booking);
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

router.get("/history", async (req, res) => {
  try {
    const { email } = req.query;
    if (email === undefined) return res.status(400).json({ error: "Chybi email" });
    const result = await db.query("SELECT * FROM bookings WHERE customer_email=$1 ORDER BY created_at DESC", [email]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.get("/", async (req, res) => {
  try {
    const { status, region } = req.query;
    let where = "WHERE 1=1";
    const params = [];
    if (status) { params.push(status); where += " AND status=$" + params.length; }
    if (region) { params.push(region); where += " AND region=$" + params.length; }
    const result = await db.query("SELECT * FROM bookings " + where + " ORDER BY created_at DESC", params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM bookings WHERE id=$1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Nenalezeno" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.query(
      "UPDATE bookings SET status=COALESCE($1,status), updated_at=NOW() WHERE id=$2 RETURNING *",
      [status||null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Nenalezeno" });
    if (status === "done") await sendJobDone(result.rows[0].customer_email, result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

module.exports = router;
