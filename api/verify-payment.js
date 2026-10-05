const { emailConfirmedOrder, getExpectedOrder, verifyPaystackTransaction } = require("../lib/orders");

module.exports = async function verifyPayment(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed." });
    }

    let body = req.body;
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch {
            return res.status(400).json({ error: "Invalid verification request." });
        }
    }
    const reference = body && body.reference;
    if (typeof reference !== "string" || !/^[A-Za-z0-9_-]{6,100}$/.test(reference)) {
        return res.status(400).json({ error: "A valid payment reference is required." });
    }

    try {
        const transaction = await verifyPaystackTransaction(reference);
        if (transaction.reference !== reference) {
            return res.status(400).json({ error: "Payment reference did not match the verified transaction." });
        }
        const order = getExpectedOrder(transaction);

        try {
            await emailConfirmedOrder(transaction);
            return res.status(200).json({
                status: "success",
                amount: order.total,
                currency: "GHS",
                emailSent: true
            });
        } catch (error) {
            console.error("Payment verified, but order notification failed:", reference, error);
            return res.status(200).json({
                status: "success",
                amount: order.total,
                currency: "GHS",
                emailSent: false,
                message: "Your payment is confirmed. The store notification email could not be sent automatically."
            });
        }
    } catch (error) {
        console.error("Paystack verification failed:", error);
        return res.status(400).json({
            status: "failed",
            error: "We couldn't confirm this payment. Contact the store before trying to pay again."
        });
    }
};
