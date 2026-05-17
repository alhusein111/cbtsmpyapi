const express = require('express');
const router = express.Router();
const { loginSiswa, logoutSiswa } = require('../controllers/studentAuthController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Endpoint Login (Tanpa token, karena belum masuk)
router.post('/login', loginSiswa);

// Endpoint Logout (Harus bawa token JWT dan harus role 'siswa')
router.post('/logout', verifyToken, checkRole('siswa'), logoutSiswa);
router.post('/lock-akun', verifyToken, checkRole('siswa'), logoutSiswa);

module.exports = router;