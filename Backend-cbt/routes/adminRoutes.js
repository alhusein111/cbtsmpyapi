const express = require('express');
const router = express.Router();

// ==========================================
// 1. IMPORT CONTROLLERS & DB
// ==========================================
const adminCtrl = require('../controllers/adminExamController');
const analysisCtrl = require('../controllers/analysisController');
const monitoringController = require('../controllers/monitoringController');
const db = require('../config/db'); // Dipindah ke atas agar terpusat

// ==========================================
// 2. IMPORT MIDDLEWARE (SATPAM)
// ==========================================
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// ==========================================
// 3. RUTE SEBELUM SATPAM GLOBAL
// ==========================================
// Endpoint untuk memproses dan mengambil hasil analisis butir soal
router.post('/exams/analysis', analysisCtrl.generateAnalysis);


// ==========================================
// 4. PASANG SATPAM GLOBAL DI SINI
// ==========================================
// verifyToken memastikan dia bawa JWT yang valid
// checkRole memastikan role-nya adalah 'admin' atau 'guru'
router.use(verifyToken, checkRole('admin', 'guru')); 

// ---------------------------------------------------------
// Semua rute di bawah ini sekarang AMAN dan HANYA BISA DIAKSES oleh Admin/Guru
// ---------------------------------------------------------

// ✅ [PERBAIKAN UTAMA] Endpoint untuk Dashboard Utama diubah memanggil getDashboardAdmin
router.get('/dashboard', adminCtrl.getDashboardAdmin);

// Endpoint untuk mereset ujian siswa (POST)
router.post('/exams/reset-siswa', adminCtrl.resetSiswaUjian);

// Endpoint untuk MONITORING (Hanya Admin, ditambah validasi khusus)
router.get('/monitoring/log/:exam_id/:siswa_id', checkRole('admin'), monitoringController.getSiswaLogs);

// Endpoint untuk mengambil token (Dipanggil oleh fetchInitialTokens di React)
router.get('/tokens', async (req, res) => {
    try {
        // Ambil token dari ID 1 (Sesuai dengan yang ada di tokenCron.js)
        const [rows] = await db.query('SELECT token_masuk, token_keluar FROM system_tokens WHERE id = 1');
        
        if (rows.length > 0) {
            res.json({
                token_masuk: rows[0].token_masuk,
                token_keluar: rows[0].token_keluar
            });
        } else {
            res.status(404).json({ message: 'Token belum di-generate oleh sistem' });
        }
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

// Export router
module.exports = router;