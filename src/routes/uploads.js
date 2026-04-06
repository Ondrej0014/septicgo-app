const express = require("express");
const multer = require("multer");
const s3 = require("../config/storage");
const db = require("../config/db");
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post("/:bookingId/photos", upload.array("photos", 10), async (req, res) => {
  const { bookingId } = req.params;
  const { type } = req.body;
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: "Zadne soubory" });
  try {
    const urls = [];
    for (const file of files) {
      const key = "bookings/" + bookingId + "/" + Date.now() + "-" + file.originalname;
      await s3.putObject({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read"
      }).promise();
      const url = process.env.S3_ENDPOINT + "/" + process.env.S3_BUCKET + "/" + key;
      urls.push(url);
      await db.query("INSERT INTO photos (booking_id,url,type) VALUES ($1,$2,$3)", [bookingId, url, type||null]);
    }
    res.json({ urls });
  } catch (err) { console.error(err); res.status(500).json({ error: "Upload error" }); }
});

router.get("/:bookingId/photos", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM photos WHERE booking_id=$1 ORDER BY created_at", [req.params.bookingId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

module.exports = router;
