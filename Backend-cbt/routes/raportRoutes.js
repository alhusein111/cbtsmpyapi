const express = require('express');
const router = express.Router();
const { getCetakRaport, cekKelengkapanNilai, getCetakRaportSekelas } = require('../controllers/raportController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Endpoint Cetak Raport (Bisa diakses Admin & Wali Kelas)
router.get('/cetak', verifyToken, checkRole('admin', 'wali_kelas'), getCetakRaport);
router.get('/cetak', verifyToken, checkRole('admin', 'wali_kelas'), cekKelengkapanNilai);
router.get('/cetak', verifyToken, checkRole('admin', 'wali_kelas'), getCetakRaportSekelas);

module.exports = router;