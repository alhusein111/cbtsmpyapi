const express = require('express');
const router = express.Router();
const { getDashboardSiswa } = require('../controllers/studentDashboardController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Endpoint Dashboard Siswa (Dipanggil di frontend dengan: /api/student/dashboard)
router.get('/dashboard', verifyToken, checkRole('siswa'), getDashboardSiswa);

// Endpoint Jadwal Ujian (Dipanggil di frontend dengan: /api/student/exams)
// PERBAIKAN: Tambahkan checkRole('siswa') di sini juga agar sama-sama aman
router.get('/exams', verifyToken, checkRole('siswa'), getDashboardSiswa);

module.exports = router;