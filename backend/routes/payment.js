import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Booking from "../models/Booking.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import { reconcileVillas } from "./hotel.js";
import { broadcastAvailability, broadcastNotification } from "../socket.js";

const router = express.Router();

// Initialize Razorpay SDK using keys defined in .env
// Uses fallback to prevent crash if keys are missing
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_OasisResortKey",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "OasisResortSecretCodeKey"
});

// Authentication middleware
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });
    try {
        const decoded = jwt.verify(token, "your_secret");
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ message: "Invalid authorization token" });
    }
};

// Route: Create payment order (Full or Advance 25%)
router.post("/payments/order", authenticate, async (req, res) => {
    const { bookingId, paymentType } = req.body; // paymentType: 'Full' or 'Advance'

    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Calculate amount (Razorpay works in paise: 1 INR = 100 paise)
        let rateAmount = booking.totalPrice;
        if (paymentType === "Advance") {
            rateAmount = Math.round(booking.totalPrice * 0.25); // 25% booking deposit
        }

        const options = {
            amount: rateAmount * 100, // paise
            currency: "INR",
            receipt: `receipt_order_${bookingId}_${Date.now()}`
        };

        let order;
        const isMockMode = !process.env.RAZORPAY_KEY_ID || 
                           process.env.RAZORPAY_KEY_ID === "rzp_test_OasisResortKey" ||
                           process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_OasisResortKey");

        if (isMockMode) {
            console.log("🎮 [PAYMENT] Sandbox/Mock Mode: Generating simulated Razorpay Order");
            order = {
                id: `order_mock_${Math.random().toString(36).substring(2, 15)}`,
                amount: options.amount,
                currency: options.currency
            };
        } else {
            try {
                order = await razorpay.orders.create(options);
            } catch (rzpErr) {
                console.warn("⚠️ [PAYMENT] Razorpay API failed. Falling back to sandbox mock order:", rzpErr.message);
                order = {
                    id: `order_mock_${Math.random().toString(36).substring(2, 15)}`,
                    amount: options.amount,
                    currency: options.currency
                };
            }
        }

        // Store transaction in 'Created' state
        const transaction = new Transaction({
            bookingId: booking._id,
            razorpayOrderId: order.id,
            amount: rateAmount,
            paymentType: paymentType || "Full",
            status: "Created"
        });
        await transaction.save();

        res.json({
            message: "Razorpay order initialized successfully",
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_OasisResortKey"
        });
    } catch (error) {
        console.error("❌ Razorpay order creation error:", error);
        res.status(500).json({ message: "Failed to initialize payment gateway order" });
    }
});

// Route: Verify payment signature
router.post("/payments/verify", authenticate, async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    try {
        // Find corresponding transaction log
        const transaction = await Transaction.findOne({ razorpayOrderId });
        if (!transaction) return res.status(404).json({ message: "Transaction record not found" });

        // Cryptographic Signature verification (bypass for mock order sandbox)
        const isMockMode = razorpayOrderId && razorpayOrderId.startsWith("order_mock_");
        
        if (!isMockMode) {
            const text = `${razorpayOrderId}|${razorpayPaymentId}`;
            const generatedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "OasisResortSecretCodeKey")
                .update(text)
                .digest("hex");

            if (generatedSignature !== razorpaySignature) {
                transaction.status = "Failed";
                await transaction.save();
                return res.status(400).json({ message: "Payment signature validation failed. Threat detected." });
            }
        }

        // Signature is valid. Update Transaction
        transaction.razorpayPaymentId = razorpayPaymentId;
        transaction.razorpaySignature = razorpaySignature;
        transaction.status = "Captured";
        await transaction.save();

        // Update booking status
        const booking = await Booking.findById(transaction.bookingId);
        if (booking) {
            booking.status = "Confirmed";
            await booking.save();

            // Create admin notification
            const notification = new Notification({
                message: `Payment successful for ${booking.villaName} by ${booking.guestName} (${transaction.paymentType} payment: ₹${transaction.amount}).`,
                type: "refund", // Uses 'refund' or relevant log type
                read: false
            });
            await notification.save();

            // Reconcile and broadcast WS availability
            await reconcileVillas();
            broadcastNotification(notification);
        }

        res.json({
            message: "Payment verified and booking confirmed successfully",
            status: "success",
            transactionId: transaction._id
        });
    } catch (error) {
        console.error("❌ Payment verification error:", error);
        res.status(500).json({ message: "Verification processing failed" });
    }
});

import { generateInvoiceHTML } from "../utils/invoice-generator.js";

// Route: Get / Print Invoice
router.get("/payments/invoice/:transactionId", async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.transactionId);
        if (!transaction) return res.status(404).send("Transaction not found");

        const booking = await Booking.findById(transaction.bookingId);
        if (!booking) return res.status(404).send("Booking details not found");

        const invoiceHTML = generateInvoiceHTML(booking, transaction);
        res.setHeader("Content-Type", "text/html");
        res.send(invoiceHTML);
    } catch (error) {
        console.error("❌ Invoice printing error:", error);
        res.status(500).send("Error generating invoice.");
    }
});

export default router;
