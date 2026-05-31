import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true }, // Amount in INR
    currency: { type: String, default: "INR" },
    paymentType: { type: String, enum: ["Full", "Advance"], default: "Full" },
    status: { type: String, enum: ["Created", "Captured", "Failed", "Refunded"], default: "Created" },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Transaction", transactionSchema);
