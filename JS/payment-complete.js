const title = document.querySelector("#payment-result-title");
const message = document.querySelector("#payment-result-message");
const icon = document.querySelector("#payment-result-icon");
const deliveryDetails = document.querySelector("#payment-delivery");
const reference = new URLSearchParams(window.location.search).get("reference") ||
    new URLSearchParams(window.location.search).get("trxref");

async function confirmPayment() {
    if (!reference) {
        title.textContent = "Payment not confirmed";
        message.textContent = "We couldn't find a Paystack payment reference. If you completed payment, contact us before trying again.";
        icon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
        icon.classList.add("is-error");
        return;
    }

    document.querySelector("#payment-reference").textContent = `Reference: ${reference}`;
    try {
        const response = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference })
        });
        const result = await response.json();
        if (!response.ok || result.status !== "success") {
            throw new Error(result.error || "The payment could not be confirmed.");
        }

        title.textContent = "Payment successful!";
        message.textContent = result.emailSent
            ? `We confirmed your payment of GH₵${(result.amount / 100).toFixed(2)}. Your order details have been sent to the store.`
            : "Your payment is confirmed, but we couldn't send the order notification automatically. Please contact the store and share your payment reference.";
        if (result.delivery) {
            const method = result.delivery.method === "delivery" ? "Home delivery" : "Pickup";
            const details = [
                `${method} - ${result.delivery.town}, ${result.delivery.region}`,
                result.delivery.destination,
                result.delivery.landmark && result.delivery.landmark !== "Not provided"
                    ? `Nearby landmark: ${result.delivery.landmark}`
                    : ""
            ].filter(Boolean);
            deliveryDetails.textContent = `Delivery details: ${details.join(" · ")}`;
            deliveryDetails.hidden = false;
        }
        icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        icon.classList.add("is-success");
        try {
            localStorage.removeItem("buy-now-cart");
        } catch (error) {
            console.error("Could not clear the saved cart after payment:", error);
        }
    } catch (error) {
        title.textContent = "Payment not confirmed";
        message.textContent = error instanceof Error
            ? error.message
            : "We couldn't verify the payment. Contact the store before trying again.";
        icon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
        icon.classList.add("is-error");
    }
}

confirmPayment();
