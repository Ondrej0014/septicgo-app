require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const bookingsRouter = require("./routes/bookings");
const paymentsRouter = require("./routes/payments");
const uploadsRouter = require("./routes/uploads");
const reportingRouter = require("./routes/reporting");

const app = express();

app.use(cors());

// Stripe webhook potrebuje raw body - pred body-parserem
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Staticke soubory
app.use(express.static(path.join(__dirname, "..", "public")));

// API routes
app.use("/api/bookings", bookingsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/reporting", reportingRouter);

// Podstranky
app.get("/partner", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "partner.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "admin.html")));

// Fallback
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "index.html")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("SepticGo bezi na http://localhost:" + port));
