// /api/send-quote.js — School Site quote requests → hello@saysee.io via Resend
//
// Replaces the nodemailer/Namecheap SMTP version.
// No npm dependency: uses the Resend REST API through built-in fetch (Node 18+).
//
// Required Vercel environment variable:
//   RESEND_API_KEY   (Resend → API Keys → Sending access, restricted to saysee.io)
//
// Notes:
//  - The recipient is hardcoded. The `to` field the browser sends is ignored on
//    purpose: trusting it would let anyone use this endpoint to send mail from
//    your verified domain to any address they like.
//  - FROM must be an address on the domain verified in Resend. The mailbox does
//    not need to exist. Replies go to the requester via reply_to.

const TO_ADDRESS   = "hello@saysee.io";
const FROM_ADDRESS = "SaySee Website <noreply@saysee.io>";

// Escape user input before putting it in HTML so a quote or angle bracket
// in someone's message can't break or inject markup in the email.
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip CR/LF so nothing can be smuggled into a header value.
function clean(s, max = 500) {
  return String(s == null ? "" : s).replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("send-quote: RESEND_API_KEY is not set");
    return res.status(500).json({ error: "Email service not configured" });
  }

  // Vercel parses JSON bodies automatically, but be tolerant of a raw string.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const name    = clean(body.name, 120);
  const email   = clean(body.email, 200);
  const org     = clean(body.org, 200);
  const phone   = clean(body.phone, 60);
  const size    = clean(body.size, 120);
  const message = String(body.message == null ? "" : body.message).trim().slice(0, 4000);

  if (!name || !email || !org) {
    return res.status(400).json({ error: "Name, email, and school/organization are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const subject = `School Site inquiry — ${org}`;

  const text = [
    "New School Site quote request from saysee.io",
    "",
    `Name:          ${name}`,
    `Email:         ${email}`,
    `Organization:  ${org}`,
    `Phone:         ${phone || "—"}`,
    `Classrooms:    ${size || "—"}`,
    "",
    "Message:",
    message || "(none)",
    "",
    `Received: ${new Date().toISOString()}`,
  ].join("\n");

  const row = (label, value) =>
    `<tr>
       <td style="padding:8px 14px 8px 0;font:700 13px/1.4 Nunito,Arial,sans-serif;color:#5B6474;white-space:nowrap;vertical-align:top">${label}</td>
       <td style="padding:8px 0;font:600 14px/1.5 Nunito,Arial,sans-serif;color:#1F2937">${value}</td>
     </tr>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F7FC">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#2265AD;padding:18px 24px">
      <div style="font:600 20px/1.2 Fredoka,Arial,sans-serif;color:#5AAB2A">SaySee</div>
      <div style="font:700 12px/1.4 Nunito,Arial,sans-serif;color:rgba(255,255,255,.85);letter-spacing:1px;text-transform:uppercase;margin-top:4px">School Site inquiry</div>
    </td></tr>
    <tr><td style="padding:20px 24px 8px">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        ${row("Name", esc(name))}
        ${row("Email", `<a href="mailto:${esc(email)}" style="color:#1B65B8">${esc(email)}</a>`)}
        ${row("Organization", esc(org))}
        ${row("Phone", esc(phone) || "&mdash;")}
        ${row("Classrooms", esc(size) || "&mdash;")}
      </table>
    </td></tr>
    <tr><td style="padding:4px 24px 22px">
      <div style="font:700 12px/1.4 Nunito,Arial,sans-serif;color:#5B6474;letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px">Message</div>
      <div style="font:600 14px/1.6 Nunito,Arial,sans-serif;color:#1F2937;white-space:pre-wrap">${esc(message) || "(none)"}</div>
      <div style="margin-top:18px;font:600 11px/1.4 Nunito,Arial,sans-serif;color:#9AA6B6">Sent from the quote form at saysee.io &middot; reply directly to reach the requester.</div>
    </td></tr>
  </table>
</body></html>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [TO_ADDRESS],
        reply_to: email,      // hitting Reply answers the school, not yourself
        subject,
        text,
        html,
      }),
    });

    if (!r.ok) {
      // Log the reason server-side; don't leak provider detail to the browser.
      const detail = await r.text().catch(() => "");
      console.error("send-quote: Resend responded", r.status, detail);
      return res.status(502).json({ error: "Could not send the request right now." });
    }

    const data = await r.json().catch(() => ({}));
    return res.status(200).json({ ok: true, id: data.id || null });
  } catch (err) {
    console.error("send-quote: request failed", err);
    return res.status(502).json({ error: "Could not send the request right now." });
  }
}
