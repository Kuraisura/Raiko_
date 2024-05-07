const { emailPattern, namePattern, subjectPattern, hasInappropriateContent, requirePost, insertInto, sendContactNotification, handleError } = require("./_shared");

module.exports = async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    const body = request.body || {};
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    if (name.length < 2 || name.length > 25 || !namePattern.test(name)) return response.status(400).json({ error: "Enter a name using 2 to 25 letters and spaces." });
    if (email.length > 40 || !emailPattern.test(email)) return response.status(400).json({ error: "Enter a valid email such as name@example.com." });
    if (subject.length < 3 || subject.length > 25 || !subjectPattern.test(subject)) return response.status(400).json({ error: "Enter a subject using 3 to 25 letters, numbers, and spaces." });
    if (message.length < 10 || message.length > 500) return response.status(400).json({ error: "Enter a message containing 10 to 500 characters." });
    if (hasInappropriateContent(message)) return response.status(400).json({ error: "Please remove inappropriate language before sending your message." });
    await insertInto("contact_messages", { name, email, subject, message, recipient_email: process.env.RESEND_EMAIL || null });
    const notification = await sendContactNotification({ name, email, subject, message });
    response.status(201).json({ ok: true, notificationId: notification.id });
  } catch (error) { handleError(error, response, "/api/contact"); }
};
