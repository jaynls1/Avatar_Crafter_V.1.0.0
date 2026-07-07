import { Router } from "express";

const securityRouter = Router();

securityRouter.post("/security/email", async (req, res) => {
  const { subject, message } = req.body as { subject?: string; message?: string };

  if (!subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: "subject and message are required" });
    return;
  }

  const apiKey   = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;

  if (!apiKey) {
    res.status(503).json({ error: "RESEND_API_KEY not configured" });
    return;
  }
  if (!ownerEmail) {
    res.status(503).json({ error: "OWNER_EMAIL not configured" });
    return;
  }

  const timestamp = new Date().toLocaleString("en-US", {
    weekday: "short", year: "numeric", month: "short",
    day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0a0202;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0202;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f0303;border:1px solid rgba(220,38,38,0.35);border-radius:6px;overflow:hidden;">
        <!-- Red top bar -->
        <tr>
          <td style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:14px 28px;border-bottom:2px solid #dc2626;">
            <span style="color:#fca5a5;font-size:9px;letter-spacing:4px;font-weight:700;">NEXT SECURITY — CLASSIFIED TRANSMISSION</span>
          </td>
        </tr>
        <!-- Header -->
        <tr>
          <td style="padding:28px 28px 16px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
              <span style="font-size:26px;">🛡</span>
              <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">${subject}</span>
            </div>
            <div style="color:#6b7280;font-size:11px;margin-top:6px;">
              Transmitted by <strong style="color:#dc2626;">ROOK</strong> · Security & Protection Intelligence · ${timestamp}
            </div>
          </td>
        </tr>
        <!-- Divider -->
        <tr><td style="padding:0 28px;"><div style="height:1px;background:rgba(220,38,38,0.25);"></div></td></tr>
        <!-- Body -->
        <tr>
          <td style="padding:24px 28px;">
            <div style="background:#060000;border:1px solid rgba(220,38,38,0.18);border-radius:4px;padding:20px;color:#d1d5db;font-size:13px;line-height:1.8;white-space:pre-wrap;">${message}</div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px 28px;">
            <div style="border-top:1px solid rgba(220,38,38,0.2);padding-top:14px;color:#4b5563;font-size:10px;line-height:1.6;">
              Direct line from <strong style="color:#dc2626;">ROOK — NEXT Security Command</strong><br/>
              <strong style="color:#7f1d1d;">CONFIDENTIAL — OWNER EYES ONLY</strong><br/>
              This is an automated security transmission. Do not forward.
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Rook — NEXT Security <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `🔒 ${subject}`,
        html,
      }),
    });

    if (!sendRes.ok) {
      const detail = await sendRes.text();
      res.status(502).json({ error: "Email provider rejected the request", detail });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reach email provider" });
  }
});

export default securityRouter;
