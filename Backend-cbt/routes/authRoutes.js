const express = require('express');
const router = express.Router();

// Import controller autentikasi yang benar sesuai nama fungsinya
const { loginAdmin, loginSiswa, logoutProses } = require('../controllers/authController');
// Route Logout (bisa untuk semua role, nanti di controller yang bedakan prosesnya)
const { verifyToken } = require('../middlewares/authMiddleware');

// --- RUTE API LOGIN ---

// Route Login untuk Admin / Guru
router.post('/admin', loginAdmin);

// Route Login khusus Siswa
router.post('/siswa', loginSiswa);

// Route Logout (gunakan middleware verifyToken untuk pastikan dia sudah login)
router.post('/logout', verifyToken, logoutProses);

module.exports = router;