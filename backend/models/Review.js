import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    villaId: { type: Number, required: true }, // Refers to the numeric id of the Villa
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    verifiedStay: { type: Boolean, default: false },
    approved: { type: Boolean, default: true }, // Admin moderation toggle
    createdAt: { type: Date, default: Date.now }
});

// Index to find reviews for a villa quickly
reviewSchema.index({ villaId: 1, approved: 1 });

export default mongoose.model("Review", reviewSchema);
