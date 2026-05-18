import express from "express";
import jwt from "jsonwebtoken";
import Villa from "../models/Villa.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Auth middleware for bookings
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, "your_secret");
        
        // Lookup User in database by email, phone, or username to fetch standard fields
        const user = await User.findOne({
            $or: [
                { email: decoded.identifier },
                { phone: decoded.identifier },
                { username: decoded.identifier }
            ]
        });

        if (user) {
            req.user = {
                ...decoded,
                email: user.email || user.username || decoded.identifier,
                phone: user.phone,
                role: user.role
            };
        } else {
            req.user = {
                ...decoded,
                email: decoded.identifier
            };
        }
        
        next();
    } catch (err) {
        console.error("Auth middleware error in hotel.js:", err);
        res.status(401).json({ message: "Invalid token" });
    }
};

// Admin middleware
const isAdmin = (req, res, next) => {
    // Check for Master Password header first
    const masterPassword = req.headers["x-admin-password"];
    if (masterPassword === "nfpatel" || masterPassword === "nfpatel") return next();

    // Fallback to JWT role-based check
    authenticate(req, res, () => {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required!" });
        next();
    });
};

// Helper to reconcile villa statuses based on expired bookings
export const reconcileVillas = async () => {
    try {
        const todayStr = new Date().toLocaleDateString('en-CA'); // Reliable YYYY-MM-DD
        
        // 1. Find all Confirmed bookings that have expired (checkOut < todayStr)
        const expiredBookings = await Booking.find({ 
            status: "Confirmed", 
            checkOut: { $lt: todayStr } 
        });

        if (expiredBookings.length > 0) {
            const expiredVillaIds = expiredBookings.map(b => b.villaId);
            const expiredBookingIds = expiredBookings.map(b => b._id);

            console.log(`♻️ [RECONCILE] Found ${expiredBookings.length} expired bookings for villas: ${expiredVillaIds.join(", ")}`);

            // Mark bookings as completed in bulk
            await Booking.updateMany(
                { _id: { $in: expiredBookingIds } },
                { $set: { status: "Completed" } }
            );
        }

        // 2. Sync all villas with active "Confirmed" bookings to "Booked"
        const confirmedBookings = await Booking.find({ status: "Confirmed" });
        const confirmedVillaIds = confirmedBookings.map(b => b.villaId);

        if (confirmedVillaIds.length > 0) {
            await Villa.updateMany(
                { id: { $in: confirmedVillaIds } },
                { $set: { status: "Booked" } }
            );
        }

        // 3. Sync all other villas to "Available"
        await Villa.updateMany(
            { id: { $nin: confirmedVillaIds } },
            { $set: { status: "Available" } }
        );

        console.log(`♻️ [RECONCILE] Villa status reconciliation complete. Active confirmed villas: ${confirmedVillaIds.join(", ")}`);
    } catch (err) {
        console.error("Reconcile error:", err);
    }
};

// Health Check / Ping Route
router.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// GET all villas from DB
router.get("/villas", async (req, res) => {
    try {
        const villas = await Villa.find().sort({ id: 1 });
        res.json(villas);
    } catch (error) {
        console.error("Fetch villas error:", error);
        res.status(500).json({ message: "Error fetching villas" });
    }
});

// GET real-time availability
router.get("/villas/availability", async (req, res) => {
    try {
        const { checkIn, checkOut, guests } = req.query;
        if (!checkIn || !checkOut || !guests) {
            return res.status(400).json({ message: "checkIn, checkOut, and guests are required" });
        }

        const requiredCapacity = parseInt(guests, 10);

        // Find villas with enough capacity
        const villas = await Villa.find({ maxCapacity: { $gte: requiredCapacity } }).lean();
        const villaIds = villas.map(v => v.id);

        // Find overlapping bookings (both Confirmed and Pending Approval)
        const overlappingBookings = await Booking.find({
            status: { $in: ["Confirmed", "Pending Approval"] },
            villaId: { $in: villaIds },
            $and: [
                { checkIn: { $lt: checkOut } },
                { checkOut: { $gt: checkIn } }
            ]
        });

        const bookedVillaIds = overlappingBookings.map(b => b.villaId);
        
        // Filter out booked villas
        const availableVillas = villas.filter(v => !bookedVillaIds.includes(v.id));

        res.json(availableVillas);
    } catch (error) {
        console.error("Availability check error:", error);
        res.status(500).json({ message: "Error checking availability" });
    }
});

// Create a new booking in DB
router.post("/bookings", authenticate, async (req, res) => {
    const { villaId, villaName, guestName, guests, phone, address, idProofUrl, checkIn, checkOut, totalPrice } = req.body;
    console.log(`\n🏨 [BOOKING] Attempting to create booking for user: ${req.user.email}`);
    
    try {
        const villa = await Villa.findOne({ id: villaId });
        if (!villa) return res.status(404).json({ message: "Villa not found" });

        // Overlap Check (both Confirmed and Pending Approval)
        const overlappingBooking = await Booking.findOne({
            status: { $in: ["Confirmed", "Pending Approval"] },
            villaId: villaId,
            $and: [
                { checkIn: { $lt: checkOut } },
                { checkOut: { $gt: checkIn } }
            ]
        });

        if (overlappingBooking) {
            return res.status(400).json({ message: "This residence is already reserved for the selected dates!" });
        }

        const booking = new Booking({
            villaId,
            villaName: villaName || villa.type,
            guestName: guestName || "Guest",
            guests: guests || 1,
            email: req.user.email,
            phone: phone || "N/A",
            address: address || "N/A",
            idProofUrl: idProofUrl || "N/A",
            checkIn: checkIn || new Date().toLocaleDateString('en-CA'),
            checkOut: checkOut || new Date().toLocaleDateString('en-CA'),
            totalPrice: totalPrice || villa.price,
            status: "Pending Approval"
        });

        await booking.save();

        // Create a notification for the admin panel
        const notification = new Notification({
            message: `New booking request for ${villaName || villa.type} by ${guestName || "Guest"} ($${totalPrice || villa.price}).`,
            type: "booking_request",
            read: false
        });
        await notification.save();

        // --- NEW: Link booking to User Schema ---
        await User.findOneAndUpdate(
            { email: req.user.email },
            { $push: { bookings: booking._id } },
            { upsert: true } // Ensure user exists if somehow they aren't in DB yet
        );

        res.status(201).json({ message: "Booking created successfully, pending admin approval.", booking });
    } catch (error) {
        console.error("Booking error:", error);
        res.status(500).json({ message: "Error creating booking" });
    }
});

// Simulate payment gateway
router.post("/bookings/:id/pay", authenticate, async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, email: req.user.email });
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const { paymentMethod, amount } = req.body;
        console.log(`💳 [PAYMENT] Simulating payment for booking ${booking._id}. Amount: $${amount}, Method: ${paymentMethod}`);
        
        // Simulate a delay for payment processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        // You could update status here if needed, but it's already 'Confirmed'
        // For demonstration, we just return a simulated transaction ID
        const transactionId = "TXN" + Date.now() + Math.floor(Math.random() * 1000);

        res.json({
            message: "Payment successful",
            transactionId,
            bookingId: booking._id,
            status: "Paid"
        });
    } catch (error) {
        console.error("Payment error:", error);
        res.status(500).json({ message: "Error processing payment" });
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

        // Create a notification for the admin panel
        const notification = new Notification({
            message: `Booking for ${booking.villaName} was cancelled by ${booking.guestName}.`,
            type: "cancellation",
            read: false
        });
        await notification.save();

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

// Admin Route: Get Analytics
router.get("/admin/analytics", isAdmin, async (req, res) => {
    try {
        // 1. Calculate 6-month historical revenue
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0,0,0,0);

        const revenueTimelineData = await Booking.aggregate([
            {
                $match: {
                    status: { $in: ["Confirmed", "Completed"] },
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    revenue: { $sum: "$totalPrice" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const revenueTimeline = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthIndex = d.getMonth();
            const year = d.getFullYear();
            const label = `${monthNames[monthIndex]} ${year}`;
            
            const match = revenueTimelineData.find(r => r._id.month === (monthIndex + 1) && r._id.year === year);
            const amount = match ? Math.round(match.revenue) : 0;
            
            revenueTimeline.push({ label, amount });
        }

        // 2. Count distribution of booking statuses
        const statusDistributionData = await Booking.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);
        const statuses = ["Confirmed", "Pending Approval", "Completed", "Cancelled"];
        const statusDistribution = statuses.map(status => {
            const match = statusDistributionData.find(s => s._id === status);
            return { status, count: match ? match.count : 0 };
        });

        // 3. Count of booking requests by category
        const categoryStats = await Booking.aggregate([
            {
                $lookup: {
                    from: "villas",
                    localField: "villaId",
                    foreignField: "id",
                    as: "villaDetails"
                }
            },
            { $unwind: "$villaDetails" },
            {
                $group: {
                    _id: "$villaDetails.category",
                    count: { $sum: 1 }
                }
            }
        ]);
        const categories = ["1 BHK", "2 BHK", "3 BHK"];
        const categoryPopularity = categories.map(cat => {
            const match = categoryStats.find(c => c._id === cat);
            return { category: cat, count: match ? match.count : 0 };
        });

        res.json({
            revenueTimeline,
            statusDistribution,
            categoryPopularity
        });
    } catch (error) {
        console.error("Fetch analytics error:", error);
        res.status(500).json({ message: "Error fetching analytics statistics" });
    }
});

// Admin Route: Get Notifications
router.get("/admin/notifications", isAdmin, async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notifications" });
    }
});

// Admin Route: Mark a Notification as Read
router.put("/admin/notifications/:id/read", isAdmin, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
        if (!notification) return res.status(404).json({ message: "Notification not found" });
        res.json({ message: "Notification marked as read", notification });
    } catch (error) {
        res.status(500).json({ message: "Error marking notification as read" });
    }
});

// Admin Route: Mark All Notifications as Read
router.put("/admin/notifications/mark-all-read", isAdmin, async (req, res) => {
    try {
        await Notification.updateMany({ read: false }, { read: true });
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Error marking all notifications as read" });
    }
});

export default router;
