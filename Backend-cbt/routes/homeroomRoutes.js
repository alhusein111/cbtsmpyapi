const express = require('express');
const router = express.Router();
const { 
    getHomeroomData, 
    saveHomeroomData, 
    getLegerData,
    getExtracurricularList,          // <-- Import
    getStudentExtracurriculars,      // <-- Import
    saveStudentExtracurriculars      // <-- Import
} = require('../controllers/homeroomController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// ---------------------------------
// ROUTE KEWALIAN (ABSEN & CATATAN)
// ---------------------------------
router.get('/data', verifyToken, getHomeroomData);
router.post('/data', verifyToken, checkRole('wali_kelas', 'admin'), saveHomeroomData);

// ---------------------------------
// ROUTE LEGER / DKN
// ---------------------------------
router.get('/leger', verifyToken, checkRole('wali_kelas', 'admin'), getLegerData);

// ---------------------------------
// ROUTE EKSTRAKURIKULER
// ---------------------------------
// 1. Ambil list master Ekskul (Pramuka, PMR, dll) untuk dropdown di Frontend
router.get('/ekskul/list', verifyToken, getExtracurricularList);

// 2. Ambil data ekskul yang sudah diinput siswa
router.get('/ekskul/student', verifyToken, getStudentExtracurriculars);

// 3. Simpan data ekskul siswa
router.post('/ekskul/student', verifyToken, checkRole('wali_kelas', 'admin'), saveStudentExtracurriculars);

module.exports = router;