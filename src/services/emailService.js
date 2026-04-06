const transporter = require("../config/mailer");
require("dotenv").config();

async function sendMail({ to, subject, html }) {
  await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
}

async function sendBookingReceived(email, booking) {
  await sendMail({
    to: email,
    subject: "SepticGo - prijali jsme vasi poptavku",
    html: "<p>Dobry den,</p><p>Prijali jsme vasi poptavku na adrese <strong>" + booking.address + "</strong>.</p><p>Brzy overime dostupnost partnera.</p>"
  });
}

async function notifyPartnersNewBooking(partners, booking) {
  if (partners.length === 0) return;
  await sendMail({
    to: partners.map(p => p.email).join(","),
    subject: "SepticGo - nova poptavka ve vasem regionu",
    html: "<p>Nova poptavka.</p><p>Adresa: " + booking.address + "</p><p>Jimka: " + (booking.tank_size_liters || "neuvedeno") + " l</p>"
  });
}

async function sendPaymentLink(email, url) {
  await sendMail({
    to: email,
    subject: "SepticGo - platba za vyvoz",
    html: "<p>Termin potvrzen. Plaťte zde: <a href='" + url + "'>" + url + "</a></p>"
  });
}

async function sendPaymentConfirmed(email, booking) {
  await sendMail({
    to: email,
    subject: "SepticGo - platba prijata",
    html: "<p>Platba prijata.</p><p>Termin: " + (booking.preferred_date || "dohodou") + "</p><p>Adresa: " + booking.address + "</p>"
  });
}

async function sendJobDone(email, booking) {
  await sendMail({
    to: email,
    subject: "SepticGo - vyvoz dokoncen",
    html: "<p>Vyvoz na adrese " + booking.address + " byl dokoncen.</p>"
  });
}

module.exports = { sendBookingReceived, notifyPartnersNewBooking, sendPaymentLink, sendPaymentConfirmed, sendJobDone };
