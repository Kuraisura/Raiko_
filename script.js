document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("#navbar");

  if (menuButton && nav) {
    const backdrop = document.createElement("button");
    backdrop.className = "menu-backdrop";
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Close navigation");
    backdrop.hidden = true;
    document.body.append(backdrop);

    const closeButton = document.createElement("button");
    closeButton.className = "panel-close menu-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close navigation");
    closeButton.innerHTML = '<i class="far fa-times" aria-hidden="true"></i>';
    nav.prepend(closeButton);

    const setMenu = (isOpen) => {
      nav.classList.toggle("is-open", isOpen);
      backdrop.hidden = !isOpen;
      document.body.classList.toggle("menu-open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) closeButton.focus();
    };
    menuButton.addEventListener("click", () => setMenu(true));
    closeButton.addEventListener("click", () => setMenu(false));
    backdrop.addEventListener("click", () => setMenu(false));
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") setMenu(false); });
  }

  const filterForm = document.querySelector("[data-filter-form]");
  const productCards = [...document.querySelectorAll("[data-product]")];
  const resultCount = document.querySelector("[data-result-count]");
  const emptyProducts = document.querySelector("[data-empty-products]");
  const filters = document.querySelector(".filters");
  const filterToggle = document.querySelector("[data-filter-toggle]");
  const filterClose = document.querySelector("[data-filter-close]");
  const filterBackdrop = document.querySelector("[data-filter-backdrop]");

  const setFilters = (isOpen) => {
    if (!filters) return;
    filters.classList.toggle("is-open", isOpen);
    if (filterBackdrop) filterBackdrop.hidden = !isOpen;
    document.body.classList.toggle("filters-open", isOpen);
    filterToggle?.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) filterClose?.focus();
  };
  filterToggle?.setAttribute("aria-expanded", "false");
  filterToggle?.addEventListener("click", () => setFilters(true));
  filterClose?.addEventListener("click", () => setFilters(false));
  filterBackdrop?.addEventListener("click", () => setFilters(false));

  function filterProducts() {
    if (!filterForm) return;
    const category = filterForm.querySelector("[name='category']:checked")?.value || "all";
    const maxPrice = Number(filterForm.querySelector("[name='price']:checked")?.value || Infinity);
    const sizes = [...filterForm.querySelectorAll("[name='size']:checked")].map((input) => input.value);
    let shown = 0;

    productCards.forEach((card) => {
      const categories = card.dataset.category.split(" ");
      const cardSizes = card.dataset.sizes.split(" ");
      const visible = (category === "all" || categories.includes(category)) &&
        Number(card.dataset.price) <= maxPrice &&
        (sizes.length === 0 || sizes.some((size) => cardSizes.includes(size)));
      card.hidden = !visible;
      if (visible) shown += 1;
    });

    if (resultCount) resultCount.textContent = `${shown} piece${shown === 1 ? "" : "s"}`;
    if (emptyProducts) emptyProducts.hidden = shown !== 0;
  }

  filterForm?.addEventListener("change", filterProducts);
  filterForm?.addEventListener("reset", () => setTimeout(filterProducts));

  const formatPeso = (value) => new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP", maximumFractionDigits: 0
  }).format(value);

  const cartKey = "raiko-cart-v2";
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(cartKey)) || []; }
    catch { return []; }
  };
  const saveCart = (cart) => localStorage.setItem(cartKey, JSON.stringify(cart));
  const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
  const inappropriateTerms = new Set(["fuck", "fucking", "shit", "bitch", "bastard", "asshole", "whore", "slut"]);
  const hasInappropriateContent = (value) => String(value).toLowerCase().normalize("NFKD").replace(/[013457]/g, (character) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t" })[character]).split(/[^a-z]+/).some((word) => inappropriateTerms.has(word));

  const productIds = [
    "lovesick-girls", "consume", "eren-yeager", "anya-aesthetic", "sung-jin-woo", "kiss-me", "makima", "gojo-satoru",
    "sukuna", "night-market", "midnight-spirit", "soft-signal", "monochrome-city", "after-hours", "red-thread", "blue-type"
  ];

  function updateCartBadge() {
    const count = readCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.hidden = count === 0;
    });
  }

  productCards.forEach((card, index) => {
    card.dataset.id = productIds[index] || `raiko-piece-${index + 1}`;
    card.dataset.stock = "0";
    if (!card.querySelector(".stock-tag")) {
      const tag = document.createElement("span");
      tag.className = "stock-tag";
      tag.textContent = "Out of stock";
      card.querySelector(".product-card__body")?.prepend(tag);
    }
    const addButton = card.querySelector("[data-add-cart]");
    if (addButton) {
      addButton.disabled = true;
      addButton.setAttribute("aria-disabled", "true");
      addButton.setAttribute("aria-label", `${card.querySelector("h3")?.textContent || "Item"} is out of stock`);
    }
  });

  function renderCart() {
    const body = document.querySelector("[data-cart-body]");
    if (!body) return;
    const cart = readCart();
    body.innerHTML = cart.map((item, index) => `
      <tr data-cart-row data-index="${index}">
        <td class="cart-image-cell"><img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}"></td>
        <td data-label="Product"><div class="cart-product"><div><strong>${escapeHTML(item.name)}</strong><small>Size ${escapeHTML(item.size)}</small><span class="stock-tag">Out of stock</span></div></div></td>
        <td data-label="Price">${formatPeso(item.price)}</td>
        <td data-label="Quantity"><div class="quantity"><button type="button" data-cart-action="decrease" aria-label="Decrease quantity">−</button><input value="${item.quantity}" inputmode="numeric" aria-label="Quantity" readonly><button type="button" data-cart-action="increase" aria-label="Increase quantity">+</button></div></td>
        <td data-label="Subtotal"><strong>${formatPeso(item.price * item.quantity)}</strong></td>
        <td class="cart-remove-cell"><button class="remove-button" type="button" data-cart-action="remove" aria-label="Remove ${escapeHTML(item.name)}"><i class="far fa-trash-alt"></i></button></td>
      </tr>`).join("");

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.querySelectorAll("[data-cart-total]").forEach((node) => node.textContent = formatPeso(total));
    document.querySelector("[data-empty-cart]").hidden = cart.length !== 0;
    document.querySelector("[data-cart-content]").hidden = cart.length === 0;
    document.querySelector("[data-cart-summary]").hidden = cart.length === 0;
    updateCartBadge();
  }

  document.querySelector("[data-cart-body]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-action]");
    if (!button) return;
    const index = Number(button.closest("[data-cart-row]").dataset.index);
    const cart = readCart();
    if (button.dataset.cartAction === "increase") cart[index].quantity += 1;
    if (button.dataset.cartAction === "decrease") cart[index].quantity = Math.max(1, cart[index].quantity - 1);
    if (button.dataset.cartAction === "remove") cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  });

  document.querySelectorAll("[data-add-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = button.closest("[data-product]");
      const detail = button.closest(".product-detail__copy");
      const name = product?.querySelector("h3")?.textContent.trim() || detail?.querySelector("h1")?.textContent.trim();
      const price = Number(product?.dataset.price || detail?.querySelector(".product-detail__price")?.textContent.replace(/[^0-9.]/g, ""));
      const image = product?.querySelector("img")?.getAttribute("src") || document.querySelector(".product-detail__image")?.getAttribute("src");
      const size = detail?.querySelector("select")?.value || product?.dataset.sizes?.split(" ")[0] || "M";
      const quantity = Number(detail?.querySelector("input[type='number']")?.value || 1);
      const cart = readCart();
      const existing = cart.find((item) => item.name === name && item.size === size);
      if (existing) existing.quantity += quantity;
      else cart.push({ id: product?.dataset.id || detail?.closest("[data-id]")?.dataset.id || "lovesick-girls", name, price, image, size, quantity });
      saveCart(cart);
      updateCartBadge();

      const originalContent = button.innerHTML;
      const originalLabel = button.getAttribute("aria-label");
      button.classList.add("is-added");
      button.setAttribute("aria-label", "Added to cart");
      button.innerHTML = button.classList.contains("cart-button")
        ? '<i class="fas fa-check" aria-hidden="true"></i>'
        : '<i class="fas fa-check" aria-hidden="true"></i> Added to bag';
      setTimeout(() => {
        button.classList.remove("is-added");
        button.innerHTML = originalContent;
        if (originalLabel) button.setAttribute("aria-label", originalLabel);
      }, 1200);
    });
  });

  const contactForm = document.querySelector("[data-contact-form]");
  const contactEmailPattern = /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*@[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+$/;
  const contactValidators = {
    name: (value) => !value ? "Enter your name." : value.length < 2 ? "Name must contain at least two characters." : !/^[\p{L}\s]+$/u.test(value) ? "Use letters and spaces only." : "",
    email: (value) => !value ? "Enter your email address." : !contactEmailPattern.test(value) ? "Enter a valid email such as name@example.com." : "",
    subject: (value) => !value ? "Enter a subject." : value.length < 3 ? "Subject must contain at least three characters." : !/^[\p{L}\p{N}\s]+$/u.test(value) ? "Use letters, numbers, and spaces only." : "",
    message: (value) => !value ? "Enter your message." : value.length < 10 ? "Message must contain at least ten characters." : hasInappropriateContent(value) ? "Please remove inappropriate language." : ""
  };

  function validateContactField(field) {
    const validator = contactValidators[field.name];
    if (!validator) return true;
    const message = validator(field.value.trim());
    let error = field.closest(".form-field")?.querySelector(".field-error");
    if (!error) {
      error = document.createElement("small");
      error.className = "field-error";
      error.id = `${field.id}-error`;
      field.closest(".form-field")?.append(error);
      field.setAttribute("aria-describedby", error.id);
    }
    error.textContent = message;
    field.setAttribute("aria-invalid", String(Boolean(message)));
    return !message;
  }

  contactForm?.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("blur", () => validateContactField(field));
    field.addEventListener("input", () => { if (field.getAttribute("aria-invalid")) validateContactField(field); });
  });

  contactForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const feedback = contactForm.querySelector("[data-form-feedback]");
    const button = contactForm.querySelector("button[type='submit']");
    const fields = [...contactForm.querySelectorAll("input, textarea")];
    if (!fields.map(validateContactField).every(Boolean)) {
      fields.find((field) => field.getAttribute("aria-invalid") === "true")?.focus();
      feedback.textContent = "Check the highlighted fields and try again.";
      feedback.classList.add("is-visible");
      return;
    }
    const message = contactForm.querySelector("[name='message']")?.value || "";
    if (hasInappropriateContent(message)) {
      feedback.textContent = "Please remove inappropriate language before sending your message.";
      feedback.classList.add("is-visible");
      return;
    }
    button.disabled = true;
    button.textContent = "Sending...";
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(contactForm)))
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("Raiko contact request failed", {
          status: response.status,
          code: result.code || "UNKNOWN_ERROR",
          diagnosticId: result.diagnosticId || null,
          message: result.error || "Message could not be sent."
        });
        throw new Error(result.error || "Message could not be sent.");
      }
      console.info("Raiko contact request completed", { status: response.status });
      feedback.textContent = "Thanks for reaching out. We will reply within one business day.";
      contactForm.reset();
      contactForm.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
      contactForm.querySelectorAll(".field-error").forEach((error) => error.remove());
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      feedback.classList.add("is-visible");
      button.disabled = false;
      button.textContent = "Send message";
    }
  });

  document.querySelectorAll("[data-letters-only]").forEach((input) => {
    input.addEventListener("input", () => { input.value = input.value.replace(/[^\p{L}\s]/gu, "").replace(/\s{2,}/g, " "); });
  });
  document.querySelectorAll("[data-plain-text]").forEach((input) => {
    input.addEventListener("input", () => { input.value = input.value.replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s{2,}/g, " "); });
  });
  document.querySelectorAll("[data-email-safe]").forEach((input) => {
    input.addEventListener("input", () => {
      const cleaned = input.value.replace(/[^A-Za-z0-9.@]/g, "");
      const at = cleaned.indexOf("@");
      input.value = at < 0 ? cleaned : `${cleaned.slice(0, at + 1)}${cleaned.slice(at + 1).replace(/@/g, "")}`;
    });
  });

  const checkoutItems = document.querySelector("[data-checkout-items]");
  if (checkoutItems) {
    const cart = readCart();
    checkoutItems.innerHTML = cart.length ? cart.map((item) => `
      <article class="checkout-item"><img src="${escapeHTML(item.image)}" alt=""><div><strong>${escapeHTML(item.name)}</strong><small>Size ${escapeHTML(item.size)} · Qty ${item.quantity}</small></div><b>${formatPeso(item.price * item.quantity)}</b></article>`).join("")
      : '<div class="empty-state"><h3>Your bag is empty.</h3><a class="text-link" href="shop.html">Browse the collection</a></div>';
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.querySelectorAll("[data-cart-total]").forEach((node) => node.textContent = formatPeso(total));
  }

  const checkoutForm = document.querySelector("[data-checkout-form]");
  checkoutForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = checkoutForm.querySelector("button[type='submit']");
    const feedback = checkoutForm.querySelector("[data-form-feedback]");
    const cart = readCart();
    if (!cart.length) { feedback.textContent = "Your shopping bag is empty."; feedback.classList.add("is-visible"); return; }
    button.disabled = true;
    button.textContent = "Placing order...";
    try {
      const details = Object.fromEntries(new FormData(checkoutForm));
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...details, items: cart.map(({ id, size, quantity }) => ({ id, size, quantity })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order could not be placed.");
      saveCart([]);
      updateCartBadge();
      checkoutForm.reset();
      feedback.textContent = `Order received. Reference ${result.orderId}.`;
    } catch (error) { feedback.textContent = error.message; }
    finally { feedback.classList.add("is-visible"); button.disabled = false; button.textContent = "Place order"; }
  });

  if (!("matchMedia" in window) || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const revealTargets = document.querySelectorAll("main > section, .product-card, .blog-card, .detail-item");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealTargets.forEach((target, index) => { target.classList.add("motion-reveal"); target.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`); observer.observe(target); });
  }

  document.querySelector(".newsletter-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    button.textContent = "Joining...";
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: event.currentTarget.querySelector("input[type='email']").value })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to subscribe.");
      button.textContent = "You’re on the list";
      event.currentTarget.reset();
    } catch (error) {
      button.textContent = "Try again";
      button.title = error.message;
      button.disabled = false;
    }
  });

  renderCart();
  updateCartBadge();
});
