const catalog = new Map([
    [1, { name: "Red Printed T-shirt", price: 4900 }],
    [2, { name: "Performance Running Shoes", price: 8900 }],
    [3, { name: "Men's Grey Utility Joggers", price: 5900 }],
    [4, { name: "Men's Navy Polo Shirt", price: 5500 }],
    [5, { name: "Black Graphic T-shirt", price: 3400 }],
    [6, { name: "Light Gray High-Top Sneakers", price: 7400 }],
    [7, { name: "Everyday Crew Socks - 3 Pack", price: 1800 }],
    [8, { name: "Black Stainless-Steel Watch", price: 8900 }],
    [9, { name: "Black Leather-Strap Watch", price: 6400 }],
    [10, { name: "Black and Red Athletic Sneakers", price: 6900 }],
    [11, { name: "Black Men's Jogger Pants", price: 4900 }],
    [12, { name: "Gray Knit Slip-On Sneakers", price: 5600 }],
    [13, { name: "Everyday Red Cotton Tee", price: 3900 }],
    [14, { name: "Relaxed Fit Gray Track Pants", price: 5200 }],
    [15, { name: "Classic Navy Everyday Polo", price: 4800 }],
    [16, { name: "City Graphic Black Tee", price: 3600 }],
    [17, { name: "Breathable Road Running Shoes", price: 8200 }],
    [18, { name: "Street Style High-Top Shoes", price: 7800 }],
    [19, { name: "Red Accent Training Sneakers", price: 7200 }],
    [20, { name: "Lightweight Knit Walkers", price: 5900 }],
    [21, { name: "Classic Black Dial Watch", price: 7900 }],
    [22, { name: "Sport Dial Leather Watch", price: 6100 }],
    [23, { name: "Daily Comfort Socks - 3 Pack", price: 1600 }],
    [24, { name: "Minimal Black Bracelet Watch", price: 9200 }]
]);

function getExpectedOrder(transaction) {
    const metadata = transaction.metadata;
    if (!metadata || !Array.isArray(metadata.order_items)) {
        throw new Error("The verified payment has no valid order details.");
    }

    const items = metadata.order_items;
    if (items.length === 0 || items.length > 20) {
        throw new Error("The verified payment has an invalid item count.");
    }

    let total = 0;
    const orderLines = items.map(item => {
        if (!item || !Number.isInteger(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
            throw new Error("The verified payment contains an invalid order item.");
        }
        const product = catalog.get(item.id);
        if (!product) {
            throw new Error("The verified payment contains an unknown product.");
        }
        const lineTotal = product.price * item.quantity;
        total += lineTotal;
        return `${item.quantity} x ${product.name} - GH₵${(lineTotal / 100).toFixed(2)}`;
    });

    if (transaction.status !== "success" || transaction.currency !== "GHS" || transaction.amount !== total) {
        throw new Error("Payment status, currency, or amount does not match this order.");
    }

    const email = transaction.customer && transaction.customer.email;
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("The verified payment has no valid customer email.");
    }

    const method = metadata.delivery_method;
    const region = metadata.delivery_region;
    const town = metadata.delivery_town;
    const address = metadata.delivery_address;
    const pickupPoint = metadata.pickup_point;
    const landmark = metadata.delivery_landmark;
    const instructions = metadata.delivery_instructions;
    if ((method !== "delivery" && method !== "pickup") ||
        typeof region !== "string" || region.length < 2 || region.length > 80 ||
        typeof town !== "string" || town.length < 2 || town.length > 80 ||
        (method === "delivery" && (typeof address !== "string" || address.length < 5 || address.length > 250)) ||
        (method === "pickup" && (typeof pickupPoint !== "string" || pickupPoint.length < 3 || pickupPoint.length > 160)) ||
        (landmark !== undefined && (typeof landmark !== "string" || landmark.length > 150)) ||
        (instructions !== undefined && (typeof instructions !== "string" || instructions.length > 500))) {
        throw new Error("The verified payment has invalid delivery details.");
    }

    return {
        reference: transaction.reference,
        email,
        name: typeof metadata.customer_name === "string" ? metadata.customer_name : "Not provided",
        phone: typeof metadata.customer_phone === "string" ? metadata.customer_phone : "Not provided",
        deliveryMethod: method,
        region,
        town,
        address: method === "delivery" ? address : "",
        pickupPoint: method === "pickup" ? pickupPoint : "",
        landmark: typeof landmark === "string" && landmark ? landmark : "Not provided",
        instructions: typeof instructions === "string" && instructions ? instructions : "None provided",
        orderLines,
        total
    };
}

async function emailConfirmedOrder(transaction) {
    const order = getExpectedOrder(transaction);
    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.ORDER_NOTIFICATION_EMAIL;
    const sender = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !recipient || !sender) {
        throw new Error("Email notifications are not configured on the server.");
    }

    const text = [
        "A payment has been confirmed for Buy Now.",
        "",
        `Paystack reference: ${order.reference}`,
        `Customer: ${order.name}`,
        `Customer email: ${order.email}`,
        `Customer phone: ${order.phone}`,
        "",
        "Fulfilment:",
        `Method: ${order.deliveryMethod === "delivery" ? "Home delivery" : "Pickup"}`,
        `Region: ${order.region}`,
        `City/town: ${order.town}`,
        order.deliveryMethod === "delivery"
            ? `Delivery address: ${order.address}`
            : `Preferred pickup point: ${order.pickupPoint}`,
        `Nearby landmark: ${order.landmark}`,
        `Instructions: ${order.instructions}`,
        "",
        "Items:",
        ...order.orderLines,
        "",
        `Paid total: GH₵${(order.total / 100).toFixed(2)}`,
        `Payment channel: ${transaction.channel || "Not provided"}`
    ].join("\n");

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `buy-now-order-${order.reference}`
        },
        body: JSON.stringify({
            from: sender,
            to: [recipient],
            subject: `Paid Buy Now order ${order.reference}`,
            text,
            reply_to: order.email
        })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error("Resend rejected the order notification:", response.status, result);
        throw new Error("Payment was confirmed, but the order email could not be sent.");
    }

    return order;
}

async function verifyPaystackTransaction(reference) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
        throw new Error("Paystack is not configured on the server.");
    }
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { "Authorization": `Bearer ${secretKey}` }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.status !== true || !result.data) {
        throw new Error("Paystack could not verify this transaction.");
    }
    return result.data;
}

module.exports = { catalog, emailConfirmedOrder, getExpectedOrder, verifyPaystackTransaction };
