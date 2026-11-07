const recipient = "zynix011@gmail.com";

export async function sendContactMessage(req, res) {
  const { name, email, message } = req.body ?? {};
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim() : "";
  const cleanMessage = typeof message === "string" ? message.trim() : "";

  if (!cleanName || cleanName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254 || cleanMessage.length < 10 || cleanMessage.length > 5000) {
    return res.status(400).json({ message: "Enter a valid name, email, and message (10-5000 characters)." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return res.status(503).json({ message: "Contact email is not configured yet. Please email zynix011@gmail.com directly." });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: cleanEmail,
        subject: "New ez-learningAI contact message",
        text: `From: ${cleanName} <${cleanEmail}>\n\n${cleanMessage}`,
      }),
    });

    if (!response.ok) {
      console.error("Contact email provider returned an error:", response.status);
      return res.status(502).json({ message: "The message could not be delivered. Please try again later." });
    }
    return res.status(200).json({ message: "Message sent successfully." });
  } catch (error) {
    console.error("Contact email delivery failed:", error);
    return res.status(502).json({ message: "The message could not be delivered. Please try again later." });
  }
}
