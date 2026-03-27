import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    villaId: { type: Number, required: true },
    villaName: { type: String, required: true },
    guestName: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    address: { type: String },
    idProofUrl: { type: String },
    checkIn: { type: String, required: true },
    checkOut: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    status: { type: String, default: 'Confirmed' },
    createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
