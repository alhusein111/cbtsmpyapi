const express = require('express');
const router = express.Router();
const { getDashboardSiswa } = require('../controllers/studentDashboardController');
const { verifyToken, checkRole, checkSiswaActive } = require('../middlewares/authMiddleware');

// Endpoint Khusus untuk Auto-Check Status dari Frontend
router.get('/check-status', verifyToken, checkRole('siswa'), checkSiswaActive, (req, res) => {
    // Jika lolos dari checkSiswaActive, berarti is_login masih 1
    res.json({ success: true, active: true });
});

// Endpoint Dashboard Siswa
// Tambahkan checkSiswaActive agar dashboard tidak bisa diakses kalau sudah di-reset
router.get('/dashboard', verifyToken, checkRole('siswa'), checkSiswaActive, getDashboardSiswa);

// Endpoint Jadwal Ujian
router.get('/exams', verifyToken, checkRole('siswa'), checkSiswaActive, getDashboardSiswa);

module.exports = router;