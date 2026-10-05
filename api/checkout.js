const { catalog } = require("../lib/orders");

function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

module.exports = async function checkout(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return sendError(res, 405, "Method not allowed.");
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const siteUrl = process.env.SITE_URL;
    if (!secretKey || !siteUrl) {
        console.error("Checkout configuration is missing PAYSTACK_SECRET_KEY or SITE_URL.");
        return sendError(res, 503, "Secure checkout is not configured yet. Please contact the store.");
    }

    let body = req.body;
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch {
            return sendError(res, 400, "Invalid checkout request.");
        }
    }

    const items = body && body.items;
    const customer = body && body.customer;
    const delivery = body && body.delivery;
    if (!Array.isArray(items) || items.length === 0 || items.length > 20 ||
        !customer || typeof customer !== "object" ||
        !delivery || typeof delivery !== "object") {
        return sendError(res, 400, "Your cart or customer details are invalid.");
    }

    const name = typeof customer.name === "string" ? customer.name.trim() : "";
    const email = typeof customer.email === "string" ? customer.email.trim() : "";
    const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
    if (name.length < 2 || name.length > 100 ||
        email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        phone.length > 30 || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) {
        return sendError(res, 400, "Enter a valid name, email address, and phone number.");
    }

    const deliveryMethod = delivery.method;
    const region = typeof delivery.region === "string" ? delivery.region.trim() : "";
    const town = typeof delivery.town === "string" ? delivery.town.trim() : "";
    const address = typeof delivery.address === "string" ? delivery.address.trim() : "";
    const pickupPoint = typeof delivery.pickupPoint === "string" ? delivery.pickupPoint.trim() : "";
    const landmark = typeof delivery.landmark === "string" ? delivery.landmark.trim() : "";
    const instructions = typeof delivery.instructions === "string" ? delivery.instructions.trim() : "";
    if ((deliveryMethod !== "delivery" && deliveryMethod !== "pickup") ||
        region.length < 2 || region.length > 80 ||
        town.length < 2 || town.length > 80 ||
        (deliveryMethod === "delivery" && (address.length < 5 || address.length > 250)) ||
        (deliveryMethod === "pickup" && (pickupPoint.length < 3 || pickupPoint.length > 160)) ||
        landmark.length > 150 || instructions.length > 500) {
        return sendError(res, 400, "Enter a valid delivery method, region, town, and delivery address or pickup point.");
    }

    let amount = 0;
    const orderItems = [];
    const quantities = new Map();
    for (const item of items) {
        if (!item || !Number.isInteger(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 || !catalog.has(item.id)) {
            return sendError(res, 400, "Your cart contains an invalid product or quantity.");
        }
        quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
    }
    if (quantities.size > 20 || [...quantities.values()].some(quantity => quantity > 20)) {
        return sendError(res, 400, "Your cart contains too many items.");
    }

    for (const [id, quantity] of quantities) {
        const product = catalog.get(id);
        amount += product.price * quantity;
        orderItems.push({ id, quantity });
    }
    if (!Number.isSafeInteger(amount) || amount < 100) {
        return sendError(res, 400, "The order total is invalid.");
    }

    let parsedSiteUrl;
    try {
        parsedSiteUrl = new URL(siteUrl);
    } catch {
        console.error("SITE_URL is not a valid URL.");
        return sendError(res, 503, "Secure checkout is not configured yet. Please contact the store.");
    }
    if (parsedSiteUrl.protocol !== "https:" && parsedSiteUrl.hostname !== "localhost") {
        console.error("SITE_URL must use HTTPS.");
        return sendError(res, 503, "Secure checkout requires an HTTPS site URL.");
    }

    try {
        const response = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${secretKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                amount,
                currency: "GHS",
                callback_url: new URL("/payment-complete.html", parsedSiteUrl).toString(),
                metadata: {
                    customer_name: name,
                    customer_phone: phone,
                    delivery_method: deliveryMethod,
                    delivery_region: region,
                    delivery_town: town,
                    delivery_address: deliveryMethod === "delivery" ? address : "",
                    pickup_point: deliveryMethod === "pickup" ? pickupPoint : "",
                    delivery_landmark: landmark,
                    delivery_instructions: instructions,
                    order_items: orderItems
                }
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.status !== true ||
            typeof result.data?.authorization_url !== "string" ||
            typeof result.data?.reference !== "string") {
            console.error("Paystack could not initialize checkout:", response.status, result);
            return sendError(res, 502, "Paystack could not start checkout. Please try again.");
        }
        return res.status(200).json({
            authorizationUrl: result.data.authorization_url,
            reference: result.data.reference
        });
    } catch (error) {
        console.error("Paystack checkout request failed:", error);
        return sendError(res, 502, "Payment service is temporarily unavailable. Please try again.");
    }
};
