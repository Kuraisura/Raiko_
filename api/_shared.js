const { randomUUID } = require("node:crypto");

const emailPattern = /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*@[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+$/;
const namePattern = /^[\p{L}\s]+$/u;
const subjectPattern = /^[\p{L}\p{N}\s]+$/u;
const productIdPattern = /^[a-z0-9-]{2,60}$/;
const inappropriateTerms = new Set(["fuck", "fucking", "shit", "bitch", "bastard", "asshole", "whore", "slut"]);

function hasInappropriateContent(value) {
  return String(value).toLowerCase().normalize("NFKD")
    .replace(/[013457]/g, (character) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t" })[character])
    .split(/[^a-z]+/).some((word) => inappropriateTerms.has(word));
}

function requirePost(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return false;
  }
  return true;
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON;
  if (!url || !anon) {
    const error = new Error("Supabase environment variables are missing");
    error.publicCode = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }
  return { url: url.replace(/\/$/, ""), anon };
}

async function supabase(path, options = {}) {
  const { url, anon } = supabaseConfig();
  const result = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (!result.ok) {
    const error = new Error(await result.text() || "Supabase request failed");
    error.publicCode = result.status === 404 ? "SUPABASE_SCHEMA_MISSING" : "SUPABASE_REQUEST_REJECTED";
    throw error;
  }
  return result;
}

async function insertInto(table, payload) {
  await supabase(table, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
}

async function sendContactNotification({ name, email, subject, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RESEND_TO_EMAIL || process.env.RESEND_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL || "Raiko Website <onboarding@resend.dev>";
  if (!apiKey || !to) {
    const error = new Error("Resend API key or recipient is missing");
    error.publicCode = "RESEND_NOT_CONFIGURED";
    throw error;
  }
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Raiko contact: ${subject}`,
      text: `New Raiko contact message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`
    })
  });
  if (!result.ok) {
    const error = new Error(await result.text() || "Resend request failed");
    error.publicCode = result.status === 403 ? "RESEND_SENDER_REJECTED" : "RESEND_REQUEST_REJECTED";
    throw error;
  }
  return result.json();
}

function handleError(error, response, route) {
  const diagnosticId = randomUUID().slice(0, 8);
  console.error(`[${diagnosticId}] ${route}:`, error.message);
  const messages = {
    SUPABASE_NOT_CONFIGURED: [503, "The contact service is not configured."],
    SUPABASE_SCHEMA_MISSING: [503, "The required database table has not been created yet."],
    SUPABASE_REQUEST_REJECTED: [502, "Supabase rejected the request."],
    RESEND_NOT_CONFIGURED: [503, "Email notifications are not configured."],
    RESEND_SENDER_REJECTED: [502, "Resend rejected the sender address. Verify the sending domain or use your Resend account email while testing."],
    RESEND_REQUEST_REJECTED: [502, "Resend could not send the notification."]
  };
  const [status, message] = messages[error.publicCode] || [500, "Unable to complete the request."];
  response.status(status).json({ error: message, code: error.publicCode || "INTERNAL_ERROR", diagnosticId });
}

module.exports = { emailPattern, namePattern, subjectPattern, productIdPattern, hasInappropriateContent, requirePost, supabase, insertInto, sendContactNotification, handleError };
