import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, sparse: true, index: true },
    phone: { type: String, unique: true, sparse: true, index: true },
    username: { type: String, unique: true, sparse: true, index: true },
    password: { type: String }, // For management
    googleId: { type: String, unique: true, sparse: true, index: true },
    bookings: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Booking' 
    }],
    firstLogin: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    role: { type: String, enum: ['customer', 'management', 'admin'], default: 'customer' }
});

const User = mongoose.model('User', userSchema);
export default User;
