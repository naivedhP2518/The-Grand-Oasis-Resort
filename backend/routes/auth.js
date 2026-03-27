import express from "express";
import AuthCode from "../models/AuthCode.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

import nodemailer from "nodemailer";

const router = express.Router();

// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function generateRandomCode() {
    return Math.floor(100000 + Math.random() * 900000);
}

router.post("/send-code", async (req, res) => {
    const { email } = req.body;
    console.log(`\n📩 [AUTH] Requesting OTP for: ${email}`);
    
    // Email validation regex (standard)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format. Please enter a valid email." });
    }

    const code = generateRandomCode();
    
    try {
        // Upsert the code for the email
        await AuthCode.findOneAndUpdate(
            { email },
            { code, createdAt: new Date() },
            { upsert: true, new: true }
        );

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

        // Always show in console for owner's convenience
        console.log("=".repeat(40));
        console.log(`🔥 [AUTH] Digital Vault OTP for ${email}: ${code}`);
        console.log("=".repeat(40) + "\n");

        res.json({ message: "Boutique Verification Code Sent" });
    } catch (error) {
        console.error("Send code error:", error);
        res.status(500).json({ message: "Error sending verification code" });
    }
});

router.post("/verify-code", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
    }

    try {
        const saved = await AuthCode.findOne({ email });
        
        if (!saved) {
            return res.status(400).json({ message: "No OTP found for this email" });
        }
        
        if (saved.code !== parseInt(code)) {
            return res.status(400).json({ message: "Invalid OTP" });
        }   

        // UPSERT USER: Find or Create the User document
        await User.findOneAndUpdate(
            { email },
            { $set: { lastActive: new Date() } },
            { upsert: true, new: true }
        );

        const token = jwt.sign(
            { email },
            process.env.JWT_SECRET || "your_secret",
            { expiresIn: "1h" }
        );

        await AuthCode.deleteOne({ email });

        res.json({
            message: "OTP verified successfully",
            token
        });
    } catch (error) {
        console.error("Verify code error:", error);
        res.status(500).json({ message: "Error verifying OTP" });
    }
});

export default router;
