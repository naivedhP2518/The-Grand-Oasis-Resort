import mongoose from 'mongoose';

const villaSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    category: { type: String, required: true }, // "1 BHK", "2 BHK", "3 BHK"
    number: { type: String, required: true }, // "V-101", etc.
    type: { type: String, required: true }, // "Garden Villa", etc.
    price: { type: Number, required: true },
    status: { type: String, enum: ["Available", "Booked"], default: "Available" },
    row: { type: String, required: true },
    col: { type: Number, required: true }
});

const Villa = mongoose.model('Villa', villaSchema);
export default Villa;
