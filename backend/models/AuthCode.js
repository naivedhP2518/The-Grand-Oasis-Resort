import mongoose from 'mongoose';

const authCodeSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    code: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now, expires: 600 } // Code expires in 10 minutes
});

const AuthCode = mongoose.model('AuthCode', authCodeSchema);
export default AuthCode;
