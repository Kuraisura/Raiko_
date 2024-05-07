const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const rateBuckets = new Map();
const emailPattern = /^[A-Za-z0-9]+@[A-Za-z0-9]+$/;
const newsletterEmailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const namePattern = /^[\p{L}\s]+$/u;
const subjectPattern = /^[\p{L}\p{N}\s]+$/u;
const productIdPattern = /^[a-z0-9-]{2,60}$/;
const inappropriateTerms = new Set(["fuck", "fucking", "shit", "bitch", "bastard", "asshole", "whore", "slut"]);

function hasInappropriateContent(value) {
  return String(value).toLowerCase().normalize("NFKD")
    .replace(/[013457]/g, (character) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t" })[character])
    .split(/[^a-z]+/).some((word) => inappropriateTerms.has(word));
}

function loadLocalEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadLocalEnv();

const mime = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml"
};

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function applySecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://pro.fontawesome.com; font-src 'self' https://fonts.gstatic.com https://pro.fontawesome.com; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
}

function isRateLimited(request) {
  const key = request.socket.remoteAddress || "local";
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.started > 15 * 60 * 1000) { rateBuckets.set(key, { started: now, count: 1 }); return false; }
  bucket.count += 1;
  return bucket.count > 30;
}

async function readJSON(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 10000) throw new Error("Request is too large");
  }
  return JSON.parse(raw || "{}");
}

async function insertInto(table, payload) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON;
  if (!url || !anon) throw new Error("Supabase is not configured in .env.local");
  const result = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });
  if (!result.ok) throw new Error(await result.text() || "Supabase request failed");
}

async function selectProducts(ids) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON;
  if (!url || !anon) throw new Error("Supabase is not configured in .env.local");
  const filter = encodeURIComponent(`(${ids.join(",")})`);
  const result = await fetch(`${url.replace(/\/$/, "")}/rest/v1/products?select=id,name,price,stock&id=in.${filter}`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
  if (!result.ok) throw new Error("Product catalog could not be verified");
  return result.json();
}

async function handleAPI(request, response) {
  const body = await readJSON(request);
  if (request.url === "/api/contact") {
    const fields = ["name", "email", "subject", "message"];
    if (fields.some((field) => !String(body[field] || "").trim())) return json(response, 400, { error: "Complete every field." });
    const name = String(body.name).trim();
    const email = String(body.email).trim();
    const subject = String(body.subject).trim();
    const message = String(body.message).trim();
    if (name.length > 25 || !namePattern.test(name)) return json(response, 400, { error: "Use letters and spaces only for your name." });
    if (email.length > 40 || !emailPattern.test(email)) return json(response, 400, { error: "Use letters and numbers with exactly one @ in the email field." });
    if (subject.length > 25 || !subjectPattern.test(subject)) return json(response, 400, { error: "Use letters, numbers, and spaces only for the subject." });
    if (message.length > 500) return json(response, 400, { error: "Your message is too long." });
    if (hasInappropriateContent(message)) return json(response, 400, { error: "Please remove inappropriate language before sending your message." });
    await insertInto("contact_messages", {
      name, email, subject, message,
      recipient_email: process.env.RESEND_EMAIL || null
    });
    return json(response, 201, { ok: true });
  }
  if (request.url === "/api/newsletter") {
    const email = String(body.email || "").trim();
    if (!newsletterEmailPattern.test(email) || email.length > 254) return json(response, 400, { error: "Enter a valid email address." });
    await insertInto("newsletter_subscribers", { email });
    return json(response, 201, { ok: true });
  }
  if (request.url === "/api/checkout") {
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!name || name.length > 25 || !namePattern.test(name)) return json(response, 400, { error: "Enter a valid name using letters and spaces." });
    if (email.length > 40 || !emailPattern.test(email)) return json(response, 400, { error: "Use letters and numbers with exactly one @ in the email field." });
    if (!/^[-+()0-9\s]{7,20}$/.test(phone)) return json(response, 400, { error: "Enter a valid phone number." });
    if (!address || address.length > 300) return json(response, 400, { error: "Enter a valid delivery address." });
    if (!items.length || items.length > 30 || items.some((item) => !productIdPattern.test(String(item.id || "")) || !["S", "M", "L", "XL"].includes(item.size) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) return json(response, 400, { error: "Your shopping bag contains invalid items." });
    const uniqueIds = [...new Set(items.map((item) => item.id))];
    const products = await selectProducts(uniqueIds);
    const productMap = new Map(products.map((product) => [product.id, product]));
    if (uniqueIds.some((id) => !productMap.has(id))) return json(response, 400, { error: "A selected product no longer exists." });
    if (items.some((item) => Number(productMap.get(item.id).stock) < item.quantity)) return json(response, 409, { error: "One or more selected pieces are out of stock." });
    const total = items.reduce((sum, item) => sum + Number(productMap.get(item.id).price) * item.quantity, 0);
    const orderId = crypto.randomUUID();
    await insertInto("orders", { id: orderId, customer_name: name, email, phone, address, total });
    await insertInto("order_items", items.map((item) => ({ order_id: orderId, product_id: item.id, size: item.size, quantity: item.quantity, unit_price: Number(productMap.get(item.id).price) })));
    return json(response, 201, { ok: true, orderId });
  }
  return json(response, 404, { error: "Not found" });
}

const server = http.createServer(async (request, response) => {
  try {
    applySecurityHeaders(response);
    if (request.method === "POST" && request.url.startsWith("/api/")) {
      if (isRateLimited(request)) return json(response, 429, { error: "Too many requests. Please try again shortly." });
      if (!String(request.headers["content-type"] || "").startsWith("application/json")) return json(response, 415, { error: "JSON requests only." });
      return await handleAPI(request, response);
    }
    const requested = request.url === "/" ? "/index.html" : decodeURIComponent(request.url.split("?")[0]);
    if (requested.split("/").some((segment) => segment.startsWith("."))) return json(response, 404, { error: "Not found" });
    const filePath = path.resolve(root, `.${requested}`);
    if (!filePath.startsWith(`${path.resolve(root)}${path.sep}`)) return json(response, 403, { error: "Forbidden" });
    const data = await fs.promises.readFile(filePath);
    response.writeHead(200, { "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    response.end(data);
  } catch (error) {
    if (error.code === "ENOENT") return json(response, 404, { error: "Not found" });
    console.error(error.message);
    return json(response, 500, { error: "Unable to complete the request." });
  }
});

server.listen(port, () => console.log(`Raiko is running at http://127.0.0.1:${port}`));
