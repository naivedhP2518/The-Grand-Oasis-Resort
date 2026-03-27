import mongoose from 'mongoose';
import dns from 'dns';

// Fix for SRV resolution errors on restricted networks (e.g. college/office wifi)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI is not defined in .env file");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log("\n" + "=".repeat(40));
        console.log("🍃 MongoDB Connected Successfully!");
        console.log("=".repeat(40) + "\n");
    } catch (error) {
        console.error("\n" + "=".repeat(40));
        console.error("❌ MongoDB Connection Error!");
        console.error("Error Message:", error.message);
        
        if (error.message.includes("querySrv ECONNREFUSED")) {
            console.error("\n💡 TIP: This usually means your IP address is not whitelisted in MongoDB Atlas.");
            console.error("   Go to MongoDB Atlas -> Network Access -> Add IP Address -> Add Current IP Address.");
        }
        
        console.error("=".repeat(40) + "\n");
        process.exit(1);
    }
};

export default connectDB;
