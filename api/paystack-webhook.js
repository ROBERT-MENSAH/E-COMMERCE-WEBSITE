const crypto = require("node:crypto");
const { emailConfirmedOrder, verifyPaystackTransaction } = require("../lib/orders");

module.exports = async function paystackWebhook(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).send("Method not allowed.");
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers["x-paystack-signature"];
    if (!secretKey || typeof signature !== "string") {
        return res.status(401).send("Invalid webhook signature.");
    }

    try {
        const chunks = [];
        let totalBytes = 0;
        for await (const chunk of req) {
            totalBytes += chunk.length;
            if (totalBytes > 1_000_000) {
                return res.status(413).send("Webhook payload too large.");
            }
            chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks);
        const expectedSignature = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
        const provided = Buffer.from(signature, "hex");
        const expected = Buffer.from(expectedSignature, "hex");
        if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
            return res.status(401).send("Invalid webhook signature.");
        }

        const event = JSON.parse(rawBody.toString("utf8"));
        if (event.event !== "charge.success" || !event.data || typeof event.data.reference !== "string") {
            return res.status(200).send("Event ignored.");
        }

        const transaction = await verifyPaystackTransaction(event.data.reference);
        if (transaction.reference !== event.data.reference) {
            return res.status(400).send("Transaction reference mismatch.");
        }
        await emailConfirmedOrder(transaction);
        return res.status(200).send("Order notification sent.");
    } catch (error) {
        console.error("Paystack webhook processing failed:", error);
        return res.status(500).send("Webhook processing failed.");
    }
};

module.exports.config = {
    api: {
        bodyParser: false
    }
};
