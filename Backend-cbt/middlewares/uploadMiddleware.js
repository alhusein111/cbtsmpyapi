const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- FOLDER SETUP ---
// Pastikan folder tujuan tersedia
const uploadDirSoal = path.join(__dirname, '../public/uploads/soal');
if (!fs.existsSync(uploadDirSoal)) {
    fs.mkdirSync(uploadDirSoal, { recursive: true });
}

// ==========================================
// 1. UPLOAD SOAL & OPSI (MANUAL/SINGLE/MULTIPLE)
// ==========================================
const storageSoal = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirSoal); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Bisa untuk gambar_soal atau gambar_opsi, namanya akan tetap unik
        cb(null, 'soal-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

const imageFileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
        return cb(null, true);
    } else {
        cb(new Error('Hanya diperbolehkan mengunggah file gambar (JPEG, JPG, PNG, GIF, WEBP)!'));
    }
};

const uploadSoal = multer({ 
    storage: storageSoal,
    limits: { fileSize: 500 * 1024 }, 
    fileFilter: imageFileFilter
});

// ==========================================
// 2. UPLOAD EXCEL (IMPORT MASSAL)
// ==========================================
const storageExcel = multer.diskStorage({
    destination: function (req, file, cb) {
        const tempDir = path.join(__dirname, '../public/uploads/temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        cb(null, tempDir); 
    },
    filename: function (req, file, cb) {
        cb(null, 'import-' + Date.now() + path.extname(file.originalname));
    }
});

const uploadExcel = multer({ 
    storage: storageExcel,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
            cb(null, true);
        } else {
            cb(new Error('Hanya diperbolehkan mengunggah file Excel!'));
        }
    }
});

// ==========================================
// 3. UPLOAD BULK GAMBAR (FOLDER PER USER)
// ==========================================
const storageBulkGambar = multer.diskStorage({
    destination: function (req, file, cb) {
        const userId = req.user ? req.user.id : 'unknown'; 
        const userFolder = path.join(__dirname, `../public/uploads/soal/user_${userId}`);
        
        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }
        
        cb(null, userFolder);
    },
    filename: function (req, file, cb) {
        // Gunakan nama asli, ubah spasi menjadi underscore (_)
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, safeName);
    }
});

const uploadBulkGambar = multer({ 
    storage: storageBulkGambar,
    limits: { fileSize: 500 * 1024 },
    fileFilter: imageFileFilter // Pakai filter gambar yang sama dengan soal
});

module.exports = { uploadSoal, uploadExcel, uploadBulkGambar };