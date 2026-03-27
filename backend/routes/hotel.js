import express from "express";
import jwt from "jsonwebtoken";
import Villa from "../models/Villa.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";

const router = express.Router();

// Auth middleware for bookings
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, "your_secret");
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
};

// Admin middleware
const isAdmin = (req, res, next) => {
    // Check for Master Password header first
    const masterPassword = req.headers["x-admin-password"];
    if (masterPassword === "GOD") return next();

    // Fallback to JWT role-based check
    authenticate(req, res, () => {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required!" });
        next();
    });
};

// Helper to reconcile villa statuses based on expired bookings
const reconcileVillas = async () => {
    try {
        // Use a robust local-date string comparison (YYYY-MM-DD)
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA'); // Reliable YYYY-MM-DD
        
        // Find all Booked villas
        const bookedVillas = await Villa.find({ status: "Booked" });
        
        for (const villa of bookedVillas) {
            // Find the most recent active booking for this villa
            const activeBooking = await Booking.findOne({ 
                villaId: villa.id, 
                status: "Confirmed" 
            }).sort({ createdAt: -1 });

            if (activeBooking) {
                // If checkout is strictly before today, release it
                if (activeBooking.checkOut < todayStr) {
                    console.log(`♻️ [RECONCILE] Releasing Villa ${villa.number} (Booking expired: ${activeBooking.checkOut} | Today: ${todayStr})`);
                    
                    // Mark booking as completed
                    activeBooking.status = "Completed";
                    await activeBooking.save();

                    // Mark villa as available
                    villa.status = "Available";
                    await villa.save();
                } else {
                    console.log(`✅ [RECONCILE] Villa ${villa.number} remains Booked (Expires on: ${activeBooking.checkOut})`);
                }
            } else {
                console.log(`⚠️ [RECONCILE] Villa ${villa.number} is 'Booked' in DB but no active 'Confirmed' booking found. Auto-releasing.`);
                
                // Mark villa as available if no booking exists
                villa.status = "Available";
                await villa.save();
            }
        }
    } catch (err) {
        console.error("Reconcile error:", err);
    }
};

// GET all villas from DB
router.get("/villas", async (req, res) => {
    try {
        await reconcileVillas(); // Ensure statuses are fresh
        const villas = await Villa.find().sort({ id: 1 });
        res.json(villas);
    } catch (error) {
        console.error("Fetch villas error:", error);
        res.status(500).json({ message: "Error fetching villas" });
    }
});

// Create a new booking in DB
router.post("/bookings", authenticate, async (req, res) => {
    const { villaId, villaName, guestName, phone, address, idProofUrl, checkIn, checkOut, totalPrice } = req.body;
    console.log(`\n🏨 [BOOKING] Attempting to create booking for user: ${req.user.email}`);
    
    try {
        const villa = await Villa.findOne({ id: villaId });
        if (!villa) return res.status(404).json({ message: "Villa not found" });
        if (villa.status === "Booked") return res.status(400).json({ message: "This residence is already reserved!" });

        const booking = new Booking({
            villaId,
            villaName: villaName || villa.type,
            guestName: guestName || "Guest",
            email: req.user.email,
            phone: phone || "N/A",
            address: address || "N/A",
            idProofUrl: idProofUrl || "N/A",
            checkIn: checkIn || new Date().toLocaleDateString('en-CA'),
            checkOut: checkOut || new Date().toLocaleDateString('en-CA'),
            totalPrice: totalPrice || villa.price,
            status: "Confirmed"
        });

        await booking.save();

        // Mark villa as booked
        villa.status = "Booked";
        await villa.save();

        // --- NEW: Link booking to User Schema ---
        await User.findOneAndUpdate(
            { email: req.user.email },
            { $push: { bookings: booking._id } },
            { upsert: true } // Ensure user exists if somehow they aren't in DB yet
        );

        res.status(201).json({ message: "Booking created successfully", booking });
    } catch (error) {
        console.error("Booking error:", error);
        res.status(500).json({ message: "Error creating booking" });
    }
});

// GET user's bookings from DB
router.get("/my-bookings", authenticate, async (req, res) => {
    console.time("fetch_bookings");
    try {
        console.log(`\n📁 [FETCH] Retrieving bookings for: ${req.user.email}`);
        const userBookings = await Booking.find({ email: req.user.email }).sort({ createdAt: -1 });
        console.timeEnd("fetch_bookings");
        res.json(userBookings);
    } catch (error) {
        console.timeEnd("fetch_bookings");
        console.error("Fetch my-bookings error:", error);
        res.status(500).json({ message: "Error fetching user's bookings" });
    }
});

// Cancel a booking
router.put("/bookings/:id/cancel", authenticate, async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, email: req.user.email });
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        if (booking.status === "Cancelled") return res.status(400).json({ message: "Booking is already cancelled" });

        booking.status = "Cancelled";
        await booking.save();

        // Mark villa back as available
        const villa = await Villa.findOne({ id: booking.villaId });
        if (villa) {
            villa.status = "Available";
            await villa.save();
        }

        res.json({ message: "Booking cancelled successfully", booking });
    } catch (error) {
        console.error("Cancel booking error:", error);
        res.status(500).json({ message: "Error cancelling booking" });
    }
});

// Admin Route: Get Global Stats
router.get("/admin/stats", isAdmin, async (req, res) => {
    try {
        const totalVillas = await Villa.countDocuments();
        const bookedVillas = await Villa.countDocuments({ status: "Booked" });
        const allBookings = await Booking.find();
        const revenue = allBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        
        res.json({
            totalVillas,
            bookedVillas,
            totalBookings: allBookings.length,
            revenue: Math.round(revenue)
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching admin stats" });
    }
});

// Admin Route: Get All Bookings (Global)
router.get("/admin/all-bookings", isAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching global bookings" });
    }
});

// Admin Route: Update any booking
router.put("/admin/bookings/:id", isAdmin, async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        
        // Trigger reconciliation to sync villa status if dates or villa changed
        await reconcileVillas();
        
        res.json({ message: "Booking updated successfully", booking });
    } catch (error) {
        res.status(500).json({ message: "Error updating booking" });
    }
});

// Admin Route: Delete any booking
router.delete("/admin/bookings/:id", isAdmin, async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        
        // IMPORTANT: Reconciliation will detect the booking is gone and release the villa
        await reconcileVillas();
        
        res.json({ message: "Booking deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting booking" });
    }
});

// Admin Route: Create/Update/Delete Villa
router.post("/villas", isAdmin, async (req, res) => {
    try {
        const villaData = req.body;
        // Generate a numeric ID if not provided
        if (!villaData.id) {
            const lastVilla = await Villa.findOne().sort({ id: -1 });
            villaData.id = lastVilla ? lastVilla.id + 1 : 101;
        }
        const villa = new Villa(villaData);
        await villa.save();
        res.status(201).json({ message: "Villa created successfully", villa });
    } catch (error) {
        res.status(500).json({ message: "Error creating villa" });
    }
});

router.put("/villas/:id", isAdmin, async (req, res) => {
    try {
        const villa = await Villa.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        if (!villa) return res.status(404).json({ message: "Villa not found" });
        res.json({ message: "Villa updated successfully", villa });
    } catch (error) {
        res.status(500).json({ message: "Error updating villa" });
    }
});

router.delete("/villas/:id", isAdmin, async (req, res) => {
    try {
        const villa = await Villa.findOneAndDelete({ id: req.params.id });
        if (!villa) return res.status(404).json({ message: "Villa not found" });
        res.json({ message: "Villa deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting villa" });
    }
});

export default router;
