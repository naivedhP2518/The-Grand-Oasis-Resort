import express from "express";
import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = express.Router();

// 1. Detect if Cloudinary environment variables are configured with real credentials
const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== "doasis_media" &&
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_KEY !== "123456789012345";

let storage;
let uploadMode = "LOCAL";

if (isCloudinaryConfigured) {
    console.log("☁️ [MEDIA] Cloudinary configuration detected. Setting up Cloudinary storage mode.");
    
    // Configure Cloudinary SDK
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Configure Cloudinary storage module
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: "grand_oasis_resort",
            allowed_formats: ["jpg", "jpeg", "png", "pdf"],
            transformation: [{ width: 1200, height: 800, crop: "limit", quality: "auto" }] // Compression before upload
        }
    });
    uploadMode = "CLOUDINARY";
} else {
    console.log("📂 [MEDIA] Cloudinary keys absent/stubbed. Falling back to local disk storage mode.");
    
    // Fallback: Configure Multer Local Disk storage
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'uploads/'); // Stores files inside 'uploads' directory
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
    uploadMode = "LOCAL";
}

const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error("Error: Images and PDFs Only!"));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
    fileFilter: fileFilter
});

// Endpoint: Single File Upload (e.g. ID Proofs)
router.post("/upload", upload.single("idProof"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Return path/URL depending on upload mode
        const fileUrl = uploadMode === "CLOUDINARY" ? req.file.path : `/uploads/${req.file.filename}`;
        
        console.log(`📂 [MEDIA] File uploaded successfully (${uploadMode} mode): ${fileUrl}`);

        res.status(200).json({ 
            message: "File uploaded successfully", 
            url: fileUrl,
            mode: uploadMode
        });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Error uploading file" });
    }
});

// Endpoint: Multiple File Upload (e.g. Villa Image Galleries)
router.post("/upload/multiple", upload.array("images", 5), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const fileUrls = req.files.map(file => {
            return uploadMode === "CLOUDINARY" ? file.path : `/uploads/${file.filename}`;
        });

        console.log(`📂 [MEDIA] Multiple files uploaded successfully (${uploadMode} mode):`, fileUrls);

        res.status(200).json({
            message: "Files uploaded successfully",
            urls: fileUrls,
            mode: uploadMode
        });
    } catch (error) {
        console.error("Multiple Upload Error:", error);
        res.status(500).json({ message: "Error uploading files" });
    }
});

export default router;
