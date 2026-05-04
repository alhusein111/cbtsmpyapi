// file: routes/nilaiRoutes.js
const express = require('express');
const router = express.Router();
const { simpanNilaiGuru } = require('../controllers/nilaiController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Endpoint untuk Guru menyimpan nilai (Hanya bisa diakses guru/admin)
router.post('/simpan', verifyToken, checkRole('admin', 'guru'), simpanNilaiGuru);

module.exports = router;