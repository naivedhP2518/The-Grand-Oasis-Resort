import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./db.js";
import authRoutes from "./routes/auth.js";
import hotelRoutes from "./routes/hotel.js";
import uploadRoutes from "./routes/upload.js";
import paymentRoutes from "./routes/payment.js";
import chatbotRoutes from "./routes/chatbot.js";
import Villa from "./models/Villa.js";
import Booking from "./models/Booking.js";
import User from "./models/User.js";
import { villas as initialVillas } from "./data.js";
import { initSocket } from "./socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
connectDB();

// Seed Villas if empty
const seedVillas = async () => {
    try {
        const count = await Villa.countDocuments();
        if (count === 0) {
            await Villa.insertMany(initialVillas);
            console.log("🏙️ Villas seeded successfully!");
        }
    } catch (error) {
        console.error("❌ Seeding error:", error);
    }
};

// Sync and Seed Admin User permanently based on .env
const seedAdminUser = async () => {
    try {
        const configuredPassword = process.env.ADMIN_MASTER_PASSWORD || "GOD";
        
        // Find if any admin user exists by role or username
        let admin = await User.findOne({ role: "admin" });
        if (!admin) {
            admin = await User.findOne({ username: "admin" });
        }
        
        if (!admin) {
            // Create default admin user
            admin = new User({
                username: "admin",
                email: "admin@grandoasis.com",
                password: configuredPassword,
                role: "admin"
            });
            await admin.save();
            console.log("\n👑 [ADMIN_SEED] Created new default admin user successfully!");
            console.log("   Username: admin");
            console.log("   Email: admin@grandoasis.com");
            console.log("   Password has been synced from .env!");
        } else {
            // Update admin's password to match .env
            admin.password = configuredPassword;
            if (!admin.username) admin.username = "admin";
            if (!admin.email) admin.email = "admin@grandoasis.com";
            await admin.save();
            console.log("👑 [ADMIN_SEED] Admin credentials verified and synced permanently with .env!");
        }
    } catch (error) {
        console.error("❌ [ADMIN_SEED] Error during admin seeding/sync:", error);
    }
};

// Migrate legacy "Sold" status to "Booked"
const migrateVillaStatuses = async () => {
    try {
        // Robust update for any legacy 'Sold' or 'sold' strings
        const result = await Villa.updateMany(
            { status: { $regex: /^sold$/i } },
            { $set: { status: "Booked" } }
        );
        if (result.matchedCount > 0) {
            console.log(`🧹 [MIGRATION] Matched ${result.matchedCount} legacy 'Sold' villas. Updated ${result.modifiedCount} to 'Booked'.`);
        }
    } catch (error) {
        console.error("❌ Migration error:", error);
    }
};

// Global Reset: Clear all bookings and set all villas to Available
const resetSystem = async () => {
    try {
        await Booking.deleteMany({}); // Activated Booking.deleteMany({})
        await Villa.updateMany({}, { $set: { status: "Available" } });
        console.log("🧹 [SYSTEM_RESET] All bookings cleared and all villas set as Available.");
    } catch (error) {
        console.error("❌ Reset error:", error);
    }
};

const init = async () => {
    await seedVillas();
    await seedAdminUser();
    await migrateVillaStatuses();
    
    // Run reconciliation on startup
    const { reconcileVillas } = await import("./routes/hotel.js"); // Late import to avoid circular dep if any
    if (typeof reconcileVillas === "function") {
        await reconcileVillas();
    }

    // Set up background reconciliation every 1 hour to keep data fresh without slowing down users
    setInterval(async () => {
        console.log("⏱️ [BACKGROUND] Starting periodic villa reconciliation...");
        if (typeof reconcileVillas === "function") {
            await reconcileVillas();
        }
    }, 60 * 60 * 1000);
};
init();

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.get("/ping", (req, res) => {
    res.json({ message: "pong", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
    res.json({ message: "Welcome to The Grand Oasis" });
});

// Use modular routes
app.use("/api", authRoutes);
app.use("/api", hotelRoutes);
app.use("/api", uploadRoutes);
app.use("/api", paymentRoutes);
app.use("/api", chatbotRoutes);

// Backup routes without /api prefix for robustness
app.use("/", authRoutes);
app.use("/", hotelRoutes);
app.use("/", uploadRoutes);
app.use("/", paymentRoutes);
app.use("/", chatbotRoutes);

// Actually, looking at index.js lines 67, 71, 92, 97, 110, they were root-level.
// But the proxy.conf.json in frontend maps /api to localhost:3000.
// So if the frontend calls /api/rooms, and we use app.use("/api", hotelRoutes), it works.

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`${PORT} server running on http://localhost:${PORT}`);
});
initSocket(server);
