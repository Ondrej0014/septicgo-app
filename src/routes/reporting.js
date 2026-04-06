const express = require("express");
const db = require("../config/db");
const { stringify } = require("csv-stringify");
const router = express.Router();

router.get("/export", async (req, res) => {
  try {
    const { from, to, region, status } = req.query;
    const params = [];
    let where = "WHERE 1=1";
    if (from) { params.push(from); where += " AND b.created_at >= $" + params.length; }
    if (to) { params.push(to); where += " AND b.created_at <= $" + params.length; }
    if (region) { params.push(region); where += " AND b.region = $" + params.length; }
    if (status) { params.push(status); where += " AND b.status = $" + params.length; }
    const result = await db.query(
      "SELECT b.id, b.customer_name, b.customer_email, b.customer_phone, b.address, b.region, b.status, b.price_czk, b.preferred_date, b.created_at, i.amount_czk as invoice_amount, i.stripe_payment_intent FROM bookings b LEFT JOIN invoices i ON i.booking_id = b.id " + where + " ORDER BY b.created_at DESC",
      params
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=septicgo-report.csv");
    const cols = ["id","customer_name","customer_email","customer_phone","address","region","status","price_czk","preferred_date","created_at","invoice_amount","stripe_payment_intent"];
    const stringifier = stringify({ header: true, columns: cols });
    stringifier.pipe(res);
    result.rows.forEach(row => stringifier.write(row));
    stringifier.end();
  } catch (err) { console.error(err); res.status(500).json({ error: "Reporting error" }); }
});

router.get("/summary", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT COUNT(*) as total_bookings, COUNT(*) FILTER (WHERE status=\'paid\') as paid, COUNT(*) FILTER (WHERE status=\'done\') as done, COUNT(*) FILTER (WHERE status=\'pending_partner\') as pending, SUM(price_czk) FILTER (WHERE status IN (\'paid\',\'done\')) as total_revenue FROM bookings"
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

module.exports = router;
