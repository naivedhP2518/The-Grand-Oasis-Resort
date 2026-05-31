import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

const SYSTEM_PROMPT = `You are Antigravity, a professional luxury guest relation assistant for The Grand Oasis Resort.
Your purpose is exclusively to answer resort-focused requests, villa recommendations (1 BHK, 2 BHK, 3 BHK), reservation details, check-in / check-out FAQs, amenities (luxury infinity pool, premium wellness spa, fine-dining restaurants), and local sightseeing bookings.
Limit your responses strictly to resort services and luxury hospitality.
If the guest asks general, out-of-scope questions (e.g. coding, programming, arithmetic, unrelated science/history), you must politely and elegantly redirect them back to resort activities, bookings, and guest comfort. Keep your tone elite, warm, and highly professional.`;

// Local guest relations fallback database for simulation
const mockFAQDatabase = [
    { keys: ["hello", "hi", "hey", "greetings"], response: "Greetings from The Grand Oasis Resort! I am Antigravity, your personal guest concierge. How may I elevate your stay today?" },
    { keys: ["bhk", "1 bhk", "2 bhk", "3 bhk", "room", "villa", "suite", "stay"], response: "We offer three exquisite tiers of luxury accommodation: \n1. **1 BHK Studio Oasis**: Perfect for couples or solo travelers seeking quiet harmony (Starting at ₹5,000/night).\n2. **2 BHK Family Retreat**: Tailored for families seeking premium comfort and privacy (Starting at ₹8,000/night).\n3. **3 BHK Grand Azure Villa**: Our absolute masterpiece with a private infinity pool and panoramic views (Starting at ₹12,000/night).\n\nYou can select dates in our Villas tab to book directly!" },
    { keys: ["price", "cost", "rate", "tariff"], response: "Our luxury rates begin at ₹5,000/night for our 1 BHK Studio Oasis, up to ₹12,000/night for our signature 3 BHK Grand Azure Villa. Standard night rates are subject to a 15% VIP Experience and Service fee." },
    { keys: ["pool", "spa", "amenit", "spa", "food", "din", "wifi"], response: "Our guests enjoy complimentary access to our cliffside heated Infinity Pool, the award-winning Sanctuary Spa, ultra-high-speed Wi-Fi, and 24/7 Butler Services. Fine-dining is curated by Michelin-star chefs at our signature restaurant, The Golden Leaf." },
    { keys: ["check", "check-in", "checkin", "checkout", "time"], response: "Our check-in reception begins at 2:00 PM with an orientation and luxury welcome drink. Departure check-out is requested by 11:00 AM to allow preparation of the residence for incoming guests. Early arrivals and late departures may be pre-arranged with the guest relations desk." },
    { keys: ["contact", "phone", "call", "address", "map", "location"], response: "The Grand Oasis Resort is located at the Scenic Cliffside Coastline, Goa. You can reach our 24/7 priority concierge desk at **+91 93130 96998** or email us at concierge@grandoasisresort.com." },
    { keys: ["payment", "razorpay", "pay", "card", "advance", "deposit"], response: "We accept payments seamlessly via our Razorpay integration. Guests can select between a 100% Full Payment or a 25% Advance Deposit to hold the villa, paying the remaining balance at check-in." }
];

router.post("/chatbot", async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        console.log(`\n💬 [CHATBOT] Message received: "${message}"`);

        // Check if Gemini API key is available
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY" && !apiKey.startsWith("YOUR_")) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    systemInstruction: SYSTEM_PROMPT
                });

                // Format history for Gemini chat, filtering out any initial greeting to ensure it starts with a user turn
                let chatHistory = (history || []).map(h => ({
                    role: h.role === "user" ? "user" : "model",
                    parts: [{ text: h.text }]
                }));

                const firstUserIdx = chatHistory.findIndex(h => h.role === "user");
                if (firstUserIdx !== -1) {
                    chatHistory = chatHistory.slice(firstUserIdx);
                } else {
                    chatHistory = [];
                }

                const chat = model.startChat({
                    history: chatHistory
                });

                const result = await chat.sendMessage(message);
                const replyText = result.response.text();
                return res.json({ reply: replyText, source: "gemini" });
            } catch (geminiError) {
                console.warn("⚠️ [CHATBOT] Gemini execution failed, reverting to local mock database:", geminiError.message);
            }
        }

        // --- Mock Concierge Response Fallback ---
        const userMsgLower = message.toLowerCase();
        let matchedResponse = null;

        // Check if user is asking for out-of-scope topics
        const outOfScopeKeywords = [
            "javascript", "python", "code", "programming", "html", "css", "database",
            "write a function", "solve", "math", "calculator", "history of", "who is",
            "weather in", "stock", "news", "react", "angular", "node"
        ];

        const isOutOfScope = outOfScopeKeywords.some(keyword => userMsgLower.includes(keyword));

        if (isOutOfScope) {
            matchedResponse = "While I would love to assist you with all matters, my focus is strictly dedicated to ensuring your dream stay at The Grand Oasis Resort. May I offer you a recommendation for our luxury villas, or assist you with check-in schedules?";
        } else {
            // Find keyword matches in mock FAQ
            for (const item of mockFAQDatabase) {
                const match = item.keys.some(k => userMsgLower.includes(k));
                if (match) {
                    matchedResponse = item.response;
                    break;
                }
            }
        }

        if (!matchedResponse) {
            matchedResponse = "That sounds lovely! As your dedicated resort host, I want to make sure your stay is unforgettable. Could you tell me more about your travel dates, preferred villa size, or if you would like me to arrange spa treatments for you?";
        }

        // Simulate typing delay in client, return mock response instantly
        return res.json({ reply: matchedResponse, source: "mock-concierge" });

    } catch (error) {
        console.error("❌ Chatbot route error:", error);
        res.status(500).json({ message: "Failed to process chat query" });
    }
});

export default router;
