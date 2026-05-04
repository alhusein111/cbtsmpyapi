const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const { 
    getKkmSettings, 
    saveKkmSetting, 
    updateKkmSetting,
    deleteKkmSetting,
    getHomeroomTeachers, 
    saveHomeroomTeacher,
    getGlobalSettings,       // 👈 Tambahan baru
    saveGlobalSettings,       // 👈 Tambahan baru
    getReportDates, 
    saveReportDate, 
    updateReportDate, 
    deleteReportDate
} = require('../controllers/settingsController');

const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// ==========================================
// ⚙️ KONFIGURASI MULTER UNTUK UPLOAD LOGO
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Pastikan folder ini ADA di backend mas brow! 
        // Kalau belum, buat folder public/uploads/logos di root folder backend.
        cb(null, 'public/uploads/logos/'); 
    },
    filename: function (req, file, cb) {
        cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ==========================================
// 🏫 ROUTE PENGATURAN GLOBAL (SEKOLAH & KEPSEK)
// ==========================================
// HAPUS verifyToken di sini 👇 (biar bisa diakses publik/halaman login)
router.get('/', getGlobalSettings); 

// Yang POST tetap pakai verifyToken & admin
router.post('/', verifyToken, checkRole('admin'), upload.single('logo_sekolah'), saveGlobalSettings);

// ==========================================
// 📊 ROUTE MASTER KKM
// ==========================================
router.get('/kkm', verifyToken, getKkmSettings);
router.post('/kkm', verifyToken, checkRole('admin'), saveKkmSetting);
router.put('/kkm/:id', verifyToken, checkRole('admin'), updateKkmSetting);
router.delete('/kkm/:id', verifyToken, checkRole('admin'), deleteKkmSetting);

// ==========================================
// 🧑‍🏫 ROUTE MASTER WALI KELAS
// ==========================================
router.get('/wali-kelas', verifyToken, getHomeroomTeachers);
router.post('/wali-kelas', verifyToken, checkRole('admin'), saveHomeroomTeacher);

// ==========================================
// 📅 ROUTE PENGATURAN TANGGAL CETAK RAPOR
// ==========================================
router.get('/raport-dates', verifyToken, getReportDates);
router.post('/raport-dates', verifyToken, checkRole('admin'), saveReportDate);
router.put('/raport-dates/:id', verifyToken, checkRole('admin'), updateReportDate);
router.delete('/raport-dates/:id', verifyToken, checkRole('admin'), deleteReportDate);

module.exports = router;