const { requirePost, insertInto, handleError } = require("./_shared");
const pattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

module.exports = async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    const email = String(request.body?.email || "").trim();
    if (email.length > 254 || !pattern.test(email)) return response.status(400).json({ error: "Enter a valid email address." });
    await insertInto("newsletter_subscribers", { email });
    response.status(201).json({ ok: true });
  } catch (error) { handleError(error, response, "/api/newsletter"); }
};
