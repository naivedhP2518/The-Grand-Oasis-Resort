import express from "express";
import multer from "multer";
import path from "path";

const router = express.Router();

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Make sure this folder exists
    },
    filename: function (req, file, cb) {
        // Use a unique name: timestamp + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        // Accept only images and PDFs
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Error: Images and PDFs Only!"));
        }
    }
});

// Endpoint to upload ID Proof
router.post("/upload", upload.single("idProof"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Construct the public URL for the file
        // Note: We'll serve the 'uploads' folder statically in index.js
        const fileUrl = `/uploads/${req.file.filename}`;
        
        res.status(200).json({ 
            message: "File uploaded successfully", 
            url: fileUrl 
        });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Error uploading file" });
    }
});

export default router;
