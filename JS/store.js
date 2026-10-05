const products = [
    { id: 1, name: "Red Printed T-shirt", category: "apparel", price: 49, image: "product-1.jpg", description: "A bold red print, soft lightweight fabric, and an easy everyday fit." },
    { id: 2, name: "Performance Running Shoes", category: "footwear", price: 89, image: "product-2.jpg", description: "Breathable mesh, cushioned support, and reliable traction for daily movement." },
    { id: 3, name: "Men's Grey Utility Joggers", category: "apparel", price: 59, image: "product-3.jpg", description: "Relaxed, soft joggers with practical pockets and an easy tapered fit." },
    { id: 4, name: "Men's Navy Polo Shirt", category: "apparel", price: 55, image: "product-4.jpg", description: "A comfortable short-sleeve polo for casual days and smart-casual plans." },
    { id: 5, name: "Black Graphic T-shirt", category: "apparel", price: 34, image: "product-5.jpg", description: "A versatile black tee with a standout graphic and comfortable everyday feel." },
    { id: 6, name: "Light Gray High-Top Sneakers", category: "footwear", price: 74, image: "product-6.jpg", description: "Lightweight high-tops with a breathable finish and a cushioned sole." },
    { id: 7, name: "Everyday Crew Socks - 3 Pack", category: "accessories", price: 18, image: "product-7.jpg", description: "Three everyday pairs in versatile colors, designed for comfortable wear." },
    { id: 8, name: "Black Stainless-Steel Watch", category: "accessories", price: 89, image: "product-8.jpg", description: "A clean, minimalist dial and matching black metal bracelet." },
    { id: 9, name: "Black Leather-Strap Watch", category: "accessories", price: 64, image: "product-9.jpg", description: "A sporty dark dial and textured strap with a bright accent." },
    { id: 10, name: "Black and Red Athletic Sneakers", category: "footwear", price: 69, image: "product-10.jpg", description: "Breathable athletic shoes with bold red accents and a sturdy sole." },
    { id: 11, name: "Black Men's Jogger Pants", category: "apparel", price: 49, image: "product-11.jpg", description: "Soft everyday joggers with an elastic waist and tapered cuffs." },
    { id: 12, name: "Gray Knit Slip-On Sneakers", category: "footwear", price: 56, image: "product-12.jpg", description: "Easy-on knit sneakers with flexible support and a lightweight sole." },
    { id: 13, name: "Everyday Red Cotton Tee", category: "apparel", price: 39, image: "product-1.jpg", description: "A comfortable cotton staple with a bright red finish for casual outfits." },
    { id: 14, name: "Relaxed Fit Gray Track Pants", category: "apparel", price: 52, image: "product-3.jpg", description: "An easy-moving relaxed fit for lounging, errands, or a light workout." },
    { id: 15, name: "Classic Navy Everyday Polo", category: "apparel", price: 48, image: "product-4.jpg", description: "A versatile collared shirt that works for weekends and casual outings." },
    { id: 16, name: "City Graphic Black Tee", category: "apparel", price: 36, image: "product-5.jpg", description: "A laid-back graphic tee that pairs easily with jeans or joggers." },
    { id: 17, name: "Breathable Road Running Shoes", category: "footwear", price: 82, image: "product-2.jpg", description: "A lightweight running option with breathable uppers and cushioned steps." },
    { id: 18, name: "Street Style High-Top Shoes", category: "footwear", price: 78, image: "product-6.jpg", description: "A modern high-top silhouette with a soft lining for daily wear." },
    { id: 19, name: "Red Accent Training Sneakers", category: "footwear", price: 72, image: "product-10.jpg", description: "Supportive trainers with a bold color detail and durable outsole." },
    { id: 20, name: "Lightweight Knit Walkers", category: "footwear", price: 59, image: "product-12.jpg", description: "Flexible slip-ons for comfortable walks and busy days on your feet." },
    { id: 21, name: "Classic Black Dial Watch", category: "accessories", price: 79, image: "product-8.jpg", description: "A simple black watch face and polished bracelet for everyday outfits." },
    { id: 22, name: "Sport Dial Leather Watch", category: "accessories", price: 61, image: "product-9.jpg", description: "A sporty watch design with a comfortable textured strap." },
    { id: 23, name: "Daily Comfort Socks - 3 Pack", category: "accessories", price: 16, image: "product-7.jpg", description: "A handy three-pair set for comfortable everyday rotation." },
    { id: 24, name: "Minimal Black Bracelet Watch", category: "accessories", price: 92, image: "product-8.jpg", description: "A streamlined black finish that suits both casual and work looks." }
];

const cartStorageKey = "buy-now-cart";
const productById = new Map(products.map(product => [product.id, product]));
const productGrid = document.querySelector("#store-products");
const cartItemsElement = document.querySelector("#cart-items");
const cartStatus = document.querySelector("#cart-status");
const checkoutForm = document.querySelector("#checkout-form");
const payButton = document.querySelector("#pay-button");
const paymentMessage = document.querySelector("#payment-message");
const searchInput = document.querySelector("#product-search");
const deliveryAddressField = document.querySelector(".delivery-address-field");
const pickupPointField = document.querySelector(".pickup-point-field");
const deliveryAddress = document.querySelector("#delivery-address");
const pickupPoint = document.querySelector("#pickup-point");
const requestedCategory = new URLSearchParams(window.location.search).get("category");
let activeCategory = ["apparel", "footwear", "accessories"].includes(requestedCategory)
    ? requestedCategory
    : "all";
let cart = [];
const addFeedbackTimers = new WeakMap();

function formatPrice(amount) {
    return `GH₵${amount.toFixed(2)}`;
}

function saveCart() {
    try {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
        cartStatus.textContent = "Your cart is available for this visit, but could not be saved on this device.";
    }
}

function loadCart() {
    try {
        const savedCart = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
        if (!Array.isArray(savedCart)) {
            throw new TypeError("Saved cart must be a list.");
        }
        return savedCart
            .filter(item => item && productById.has(item.id) && Number.isInteger(item.quantity) && item.quantity > 0)
            .map(item => ({ id: item.id, quantity: item.quantity }));
    } catch {
        cartStatus.textContent = "We couldn't read the saved cart, so we started a new one.";
        return [];
    }
}

function renderProducts() {
    const query = searchInput.value.trim().toLowerCase();
    const visibleProducts = products.filter(product => {
        const matchesCategory = activeCategory === "all" || product.category === activeCategory;
        const matchesSearch = `${product.name} ${product.description}`.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
    });

    document.querySelector("#store-result-count").textContent =
        `${visibleProducts.length} ${visibleProducts.length === 1 ? "product" : "products"}`;
    document.querySelector("#store-no-results").hidden = visibleProducts.length > 0;
    productGrid.innerHTML = visibleProducts.map(product => `
        <article class="store-product-card" data-category="${product.category}">
            <img src="IMAGES/${product.image}" alt="${product.name}">
            <div class="store-product-info">
                <p class="store-product-category">${product.category}</p>
                <h3>${product.name}</h3>
                <p class="store-product-description">${product.description}</p>
                <div class="store-product-purchase">
                    <strong>${formatPrice(product.price)}</strong>
                    <button class="add-to-cart" type="button" data-add="${product.id}" aria-label="Add ${product.name} to cart">
                        <i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Add to cart
                    </button>
                </div>
            </div>
        </article>
    `).join("");
}

function updateCart() {
    const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + productById.get(item.id).price * item.quantity, 0);
    document.querySelectorAll("[data-cart-count]").forEach(element => {
        element.textContent = itemCount;
    });
    document.querySelector(".floating-cart").setAttribute(
        "aria-label",
        `View cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
    );

    document.querySelector("#cart-empty").hidden = cart.length > 0;
    cartItemsElement.innerHTML = cart.map(item => {
        const product = productById.get(item.id);
        return `
            <article class="cart-item">
                <img src="IMAGES/${product.image}" alt="">
                <div class="cart-item-details">
                    <h3>${product.name}</h3>
                    <p>${formatPrice(product.price)} each</p>
                    <div class="cart-item-actions">
                        <button type="button" data-quantity="${product.id}" data-change="-1" aria-label="Decrease ${product.name} quantity">−</button>
                        <span aria-label="Quantity">${item.quantity}</span>
                        <button type="button" data-quantity="${product.id}" data-change="1" aria-label="Increase ${product.name} quantity">+</button>
                        <button class="cart-remove" type="button" data-remove="${product.id}" aria-label="Remove ${product.name} from cart">Remove</button>
                    </div>
                </div>
                <strong>${formatPrice(product.price * item.quantity)}</strong>
            </article>
        `;
    }).join("");
    document.querySelector("#cart-subtotal").textContent = formatPrice(subtotal);
    payButton.disabled = itemCount === 0;

    saveCart();
}

function updateDeliveryFields() {
    const method = checkoutForm.querySelector('input[name="delivery-method"]:checked').value;
    const isPickup = method === "pickup";
    deliveryAddressField.hidden = isPickup;
    deliveryAddress.disabled = isPickup;
    deliveryAddress.required = !isPickup;
    pickupPointField.hidden = !isPickup;
    pickupPoint.disabled = !isPickup;
    pickupPoint.required = isPickup;
}

checkoutForm.addEventListener("change", event => {
    if (event.target.matches('input[name="delivery-method"]')) {
        updateDeliveryFields();
    }
});

checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (cart.length === 0 || !checkoutForm.reportValidity()) return;

    payButton.disabled = true;
    paymentMessage.classList.remove("is-error");
    paymentMessage.textContent = "Connecting securely to Paystack...";

    try {
        const response = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
                customer: {
                    name: document.querySelector("#customer-name").value.trim(),
                    email: document.querySelector("#customer-email").value.trim(),
                    phone: document.querySelector("#customer-phone").value.trim()
                },
                delivery: {
                    method: checkoutForm.querySelector('input[name="delivery-method"]:checked').value,
                    region: document.querySelector("#delivery-region").value.trim(),
                    town: document.querySelector("#delivery-town").value.trim(),
                    address: deliveryAddress.value.trim(),
                    pickupPoint: pickupPoint.value.trim(),
                    landmark: document.querySelector("#delivery-landmark").value.trim(),
                    instructions: document.querySelector("#delivery-instructions").value.trim()
                }
            })
        });
        const result = await response.json();
        if (!response.ok || typeof result.authorizationUrl !== "string") {
            throw new Error(result.error || "We couldn't start your payment. Please try again.");
        }
        window.location.assign(result.authorizationUrl);
    } catch (error) {
        paymentMessage.classList.add("is-error");
        paymentMessage.textContent = error instanceof Error
            ? error.message
            : "We couldn't start your payment. Please try again.";
        payButton.disabled = false;
    }
});

updateDeliveryFields();
document.querySelector(".category-filters").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    activeCategory = button.dataset.category;
    document.querySelectorAll(".category-filter").forEach(filter => {
        const selected = filter === button;
        filter.classList.toggle("is-active", selected);
        filter.setAttribute("aria-pressed", String(selected));
    });
    renderProducts();
});

searchInput.addEventListener("input", renderProducts);

productGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-add]");
    if (!button) return;

    const id = Number(button.dataset.add);
    const product = productById.get(id);
    const item = cart.find(cartItem => cartItem.id === id);
    if (item) {
        item.quantity += 1;
    } else {
        cart.push({ id, quantity: 1 });
    }
    cartStatus.textContent = `${product.name} added to your cart.`;
    button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Added!';
    button.classList.add("is-added");
    button.setAttribute("aria-label", `${product.name} added to cart`);
    window.clearTimeout(addFeedbackTimers.get(button));
    addFeedbackTimers.set(button, window.setTimeout(() => {
        if (!button.isConnected) return;
        button.innerHTML = '<i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Add to cart';
        button.classList.remove("is-added");
        button.setAttribute("aria-label", `Add ${product.name} to cart`);
    }, 1200));
    updateCart();
});

cartItemsElement.addEventListener("click", event => {
    const removeButton = event.target.closest("[data-remove]");
    if (removeButton) {
        const id = Number(removeButton.dataset.remove);
        cart = cart.filter(item => item.id !== id);
        cartStatus.textContent = `${productById.get(id).name} removed from your cart.`;
        updateCart();
        return;
    }

    const quantityButton = event.target.closest("[data-quantity]");
    if (!quantityButton) return;
    const id = Number(quantityButton.dataset.quantity);
    const item = cart.find(cartItem => cartItem.id === id);
    if (!item) return;

    item.quantity += Number(quantityButton.dataset.change);
    if (item.quantity < 1) {
        cart = cart.filter(cartItem => cartItem.id !== id);
    }
    cartStatus.textContent = "Cart quantity updated.";
    updateCart();
});

cart = loadCart();
document.querySelectorAll(".category-filter").forEach(button => {
    const selected = button.dataset.category === activeCategory;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
});
renderProducts();
updateCart();
