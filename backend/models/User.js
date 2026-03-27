import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    bookings: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Booking' 
    }],
    firstLogin: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;
