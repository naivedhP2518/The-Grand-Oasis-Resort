import express from "express";
import AuthCode from "../models/AuthCode.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

import nodemailer from "nodemailer";

const router = express.Router();

// Configure Nodemailer Transporter — explicit SMTP to force IPv4
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false },
    family: 4
});

function generateRandomCode() {
    return Math.floor(100000 + Math.random() * 900000);
}

router.post("/send-code", async (req, res) => {
    const { email, phone } = req.body;
    const identifier = email || phone;
    console.log(`\n📩 [AUTH] Requesting OTP for: ${identifier}`);
    
    // Email validation regex (standard)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email && !phone) {
        return res.status(400).json({ message: "Email or Phone is required" });
    }

    if (email && !emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format. Please enter a valid email." });
    }

    const code = generateRandomCode();
    
    try {
        // Upsert the code for the identifier
        await AuthCode.findOneAndUpdate(
            { email: identifier },
            { code, createdAt: new Date() },
            { upsert: true, new: true }
        );

        if (email) {
            // Luxury Email Template
            const mailOptions = {
            from: `"${process.env.SENDER_NAME}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your Grand Oasis Verification Code",
            html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b; line-height: 1.6;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                    <div style="background-color: #0f172a; padding: 40px; text-align: center;">
                        <h1 style="color: #fbbf24; margin: 0; font-family: 'Times New Roman', serif; font-style: italic; font-size: 32px;">The Grand Oasis</h1>
                        <p style="color: #94a3b8; text-transform: uppercase; letter-spacing: 4px; font-size: 10px; margin-top: 8px;">Estates & Private Residences</p>
                    </div>
                    <div style="padding: 40px; text-align: center;">
                        <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Reservation Verification</h2>
                        <p style="color: #64748b; font-size: 14px; margin-bottom: 32px;">Welcome back to the Grand Oasis. To verify your identity and access your reservations, please use the following boutique access code:</p>
                        
                        <div style="background-color: #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
                            <span style="font-family: monospace; font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #0f172a;">${code}</span>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">This code will expire in 10 minutes</p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 The Grand Oasis Luxury Resort. All rights reserved.</p>
                    </div>
                </div>
            </div>
            `
        };

        // Attempt to send email
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("❌ [MAIL ERROR] Failed to send real email:", err.message);
                console.log(`⚠️ [FALLBACK] Check OTP in console: ${code}`);
            } else {
                console.log(`✅ [MAIL SUCCESS] OTP sent to: ${email}`);
            }
        });
        }

        // Always show in console for owner's convenience
        console.log("=".repeat(40));
        console.log(`🔥 [AUTH] Digital Vault OTP for ${identifier}: ${code}`);
        console.log("=".repeat(40) + "\n");

        res.json({ message: "Verification Code Sent" });
    } catch (error) {
        console.error("Send code error:", error);
        res.status(500).json({ message: "Error sending verification code" });
    }
});

router.post("/verify-code", async (req, res) => {
    const { email, phone, code, role } = req.body;
    const identifier = email || phone;
    if (!identifier || !code) {
        return res.status(400).json({ message: "Identifier and code are required" });
    }

    try {
        const saved = await AuthCode.findOne({ email: identifier });
        
        if (!saved) {
            return res.status(400).json({ message: "No OTP found for this user" });
        }
        
        if (saved.code !== parseInt(code)) {
            return res.status(400).json({ message: "Invalid OTP" });
        }   

        // UPSERT USER: Find or Create the User document
        const query = email ? { email } : { phone };
        const update = { lastActive: new Date(), role: role || 'customer' };
        
        if (email) update.email = email;
        if (phone) update.phone = phone;

        await User.findOneAndUpdate(
            query,
            { $set: update },
            { upsert: true, new: true }
        );

        const token = jwt.sign(
            { identifier: identifier },
            process.env.JWT_SECRET || "your_secret",
            { expiresIn: "1h" }
        );

        await AuthCode.deleteOne({ email: identifier });

        res.json({
            message: "OTP verified successfully",
            token
        });
    } catch (error) {
        console.error("Verify code error:", error);
        res.status(500).json({ message: "Error verifying OTP" });
    }
});

// Mock Google Login Route
router.post("/google-login", async (req, res) => {
    const { googleId, email, name, role } = req.body;
    
    if (!googleId || !email) {
        return res.status(400).json({ message: "Google ID and Email are required" });
    }

    try {
        const update = { 
            email, 
            googleId, 
            lastActive: new Date(),
            role: role || 'customer' 
        };

        const user = await User.findOneAndUpdate(
            { googleId },
            { $set: update },
            { upsert: true, new: true }
        );

        const token = jwt.sign(
            { identifier: email, googleId },
            process.env.JWT_SECRET || "your_secret",
            { expiresIn: "1h" }
        );

        res.json({
            message: "Google Login successful",
            token,
            user
        });
    } catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({ message: "Error during Google authentication" });
    }
});

// Management Login with Username/Password
router.post("/management-login", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: "Username and Password are required" });
    }

    try {
        const user = await User.findOne({ username, role: 'management' });
        
        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid Management Credentials" });
        }

        const token = jwt.sign(
            { identifier: username, role: 'management' },
            process.env.JWT_SECRET || "your_secret",
            { expiresIn: "8h" }
        );

        res.json({
            message: "Management login successful",
            token,
            user: { username: user.username, role: user.role }
        });
    } catch (error) {
        console.error("Management login error:", error);
        res.status(500).json({ message: "Error during management authentication" });
    }
});

// Customer Registration
router.post("/register", async (req, res) => {
    const { email, password, username, phone } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        // Check if user already exists
        const queryConditions = [];
        if (email) queryConditions.push({ email });
        if (phone) queryConditions.push({ phone });
        if (username) queryConditions.push({ username });

        const existingUser = await User.findOne({ 
            $or: queryConditions
        });

        if (existingUser) {
            return res.status(400).json({ message: "Account already exists with this email, phone, or username." });
        }

        const newUser = new User({
            email,
            password, // Store password for standard login
            username: username || email.split("@")[0],
            phone: phone || "",
            role: "customer"
        });

        await newUser.save();

        const token = jwt.sign(
            { identifier: email, role: "customer" },
            process.env.JWT_SECRET || "your_secret",
            { expiresIn: "1h" }
        );

        res.status(201).json({
            message: "Registration successful",
            token,
            user: {
                email: newUser.email,
                username: newUser.username,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Error during registration" });
    }
});

// Customer Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        // Find user by email, phone, or username
        const user = await User.findOne({
            $or: [
                { email },
                { phone: email },
                { username: email }
            ]
        });

        if (!user) {
            return res.status(401).json({ message: "Account does not exist. Please register first." });
        }

        // Verify password
        if (user.password !== password) {
            return res.status(401).json({ message: "Incorrect password. Please try again." });
        }

        const token = jwt.sign(
            { identifier: user.email || user.username, role: user.role },
            process.env.JWT_SECRET || "your_secret",
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Error during login" });
    }
});

// Admin only: Create Employee
router.post("/create-employee", async (req, res) => {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const newEmployee = new User({
            username,
            password,
            email,
            role: 'management'
        });

        await newEmployee.save();

        res.json({ message: "Employee account created successfully", employee: newEmployee });
    } catch (error) {
        console.error("Create employee error:", error);
        res.status(500).json({ message: "Error creating employee account" });
    }
});

// Admin only: List Employees
router.get("/employees", async (req, res) => {
    try {
        const employees = await User.find({ role: 'management' }).select('-password');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: "Error fetching employees" });
    }
});

// Admin only: Delete Employee
router.delete("/employees/:id", async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Employee access revoked successfully" });
    } catch (error) {
        console.error("Delete employee error:", error);
        res.status(500).json({ message: "Error revoking employee access" });
    }
});

// --- User Management Endpoints & Middleware ---
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret");
        
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
        console.error("Auth middleware error in auth.js:", err);
        res.status(401).json({ message: "Invalid token" });
    }
};

// Verify Admin Master Password
router.post("/admin/verify-password", (req, res) => {
    const { password } = req.body;
    const configuredMaster = process.env.ADMIN_MASTER_PASSWORD || "GOD";
    if (password === configuredMaster) {
        return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: "Invalid admin master password" });
});

const isAdmin = async (req, res, next) => {
    const masterPassword = req.headers["x-admin-password"];
    const configuredMaster = process.env.ADMIN_MASTER_PASSWORD || "GOD";
    if (masterPassword && masterPassword === configuredMaster) return next();

    authenticate(req, res, async () => {
        try {
            const user = await User.findOne({ email: req.user.identifier });
            if (user && user.role === "admin") return next();
            
            const userByUsername = await User.findOne({ username: req.user.identifier });
            if (userByUsername && userByUsername.role === "admin") return next();

            return res.status(403).json({ message: "Admin access required!" });
        } catch (err) {
            res.status(500).json({ message: "Internal server error during auth check" });
        }
    });
};

// GET all registered users (excluding password fields)
router.get("/admin/users", isAdmin, async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ firstLogin: -1 });
        res.json(users);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ message: "Error fetching users" });
    }
});

// Update user role
router.put("/admin/users/:id/role", isAdmin, async (req, res) => {
    const { role } = req.body;
    if (!['customer', 'management', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role specified" });
    }
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: `User role updated to ${role} successfully`, user });
    } catch (error) {
        console.error("Update role error:", error);
        res.status(500).json({ message: "Error updating user role" });
    }
});

// Delete user account
router.delete("/admin/users/:id", isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User account deleted successfully" });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: "Error deleting user account" });
    }
});

export default router;
