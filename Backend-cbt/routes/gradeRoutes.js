const express = require('express');
const router = express.Router();
const { getStudentGrades, saveStudentGrades } = require('../controllers/gradeController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware'); // Sesuaikan path middleware

// Endpoint untuk mengambil list siswa beserta nilainya
router.get('/subject-grades', verifyToken, getStudentGrades);

// Endpoint untuk menyimpan nilai (Guru Mapel & Admin boleh akses)
router.post('/subject-grades', verifyToken, checkRole('guru', 'admin'), saveStudentGrades);

module.exports = router;