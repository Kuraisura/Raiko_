const { randomUUID } = require("node:crypto");
const { emailPattern, namePattern, productIdPattern, requirePost, supabase, insertInto, handleError } = require("./_shared");

module.exports = async function handler(request, response) {
  if (!requirePost(request, response)) return;
  try {
    const body = request.body || {};
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!name || name.length > 25 || !namePattern.test(name)) return response.status(400).json({ error: "Enter a valid name using letters and spaces." });
    if (email.length > 40 || !emailPattern.test(email)) return response.status(400).json({ error: "Enter a valid email such as name@example.com." });
    if (!/^[-+()0-9\s]{7,20}$/.test(phone)) return response.status(400).json({ error: "Enter a valid phone number." });
    if (!address || address.length > 300) return response.status(400).json({ error: "Enter a valid delivery address." });
    if (!items.length || items.length > 30 || items.some((item) => !productIdPattern.test(String(item.id || "")) || !["S", "M", "L", "XL"].includes(item.size) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) return response.status(400).json({ error: "Your shopping bag contains invalid items." });
    const ids = [...new Set(items.map((item) => item.id))];
    const result = await supabase(`products?select=id,name,price,stock&id=in.${encodeURIComponent(`(${ids.join(",")})`)}`);
    const products = await result.json();
    const productMap = new Map(products.map((product) => [product.id, product]));
    if (ids.some((id) => !productMap.has(id))) return response.status(400).json({ error: "A selected product no longer exists." });
    if (items.some((item) => Number(productMap.get(item.id).stock) < item.quantity)) return response.status(409).json({ error: "One or more selected pieces are out of stock." });
    const total = items.reduce((sum, item) => sum + Number(productMap.get(item.id).price) * item.quantity, 0);
    const orderId = randomUUID();
    await insertInto("orders", { id: orderId, customer_name: name, email, phone, address, total });
    await insertInto("order_items", items.map((item) => ({ order_id: orderId, product_id: item.id, size: item.size, quantity: item.quantity, unit_price: Number(productMap.get(item.id).price) })));
    response.status(201).json({ ok: true, orderId });
  } catch (error) { handleError(error, response, "/api/checkout"); }
};
