const express = require('express');
const router = express.Router();

// 1. Import Controller (Sudah ditambah Master Tahun Pelajaran & Pengumuman)
const { 
    getClasses, createClass, updateClass, deleteClass,
    getSubjects, createSubject, updateSubject, deleteSubject,
    getAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear,
    getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, 
    getExtracurriculars, createExtracurricular, updateExtracurricular, deleteExtracurricular,
    getTeachers, assignHomeroomTeacher, getExamTypes, createExamType, updateExamType, deleteExamType

} = require('../controllers/masterController');

// 2. Import Middleware Auth
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// ==========================================
// --- Endpoint Kelas ---
// ==========================================
router.get('/classes', verifyToken, getClasses);
router.post('/classes', verifyToken, checkRole('admin'), createClass);
router.put('/classes/:id', verifyToken, checkRole('admin'), updateClass);
router.delete('/classes/:id', verifyToken, checkRole('admin'), deleteClass);

// ==========================================
// --- Endpoint Mapel ---
// ==========================================
router.get('/subjects', verifyToken, getSubjects);
router.post('/subjects', verifyToken, checkRole('admin'), createSubject);
router.put('/subjects/:id', verifyToken, checkRole('admin'), updateSubject);
router.delete('/subjects/:id', verifyToken, checkRole('admin'), deleteSubject);

// ==========================================
// --- Endpoint Tahun Pelajaran ---
// ==========================================
router.get('/academic-years', verifyToken, getAcademicYears);
router.post('/academic-years', verifyToken, checkRole('admin'), createAcademicYear);
router.put('/academic-years/:id', verifyToken, checkRole('admin'), updateAcademicYear);
router.delete('/academic-years/:id', verifyToken, checkRole('admin'), deleteAcademicYear);


// ==========================================
// --- Endpoint Jenis Ujian ---
// ==========================================
router.get('/exam-types', verifyToken, getExamTypes);
router.post('/exam-types', verifyToken, checkRole('admin'), createExamType);
router.put('/exam-types/:id', verifyToken, checkRole('admin'), updateExamType);
router.delete('/exam-types/:id', verifyToken, checkRole('admin'), deleteExamType);

// ==========================================
// --- Endpoint Pengumuman ---
// ==========================================
router.get('/announcements', verifyToken, getAnnouncements);
router.post('/announcements', verifyToken, checkRole('admin'), createAnnouncement);
router.put('/announcements/:id', verifyToken, checkRole('admin'), updateAnnouncement);
router.delete('/announcements/:id', verifyToken, checkRole('admin'), deleteAnnouncement);


// ==========================================
// --- Endpoint Ekstrakurikuler ---
// ==========================================
// Wali Kelas/Guru boleh melihat (GET), tapi hanya Admin yang bisa tambah/edit/hapus (POST, PUT, DELETE)
router.get('/extracurriculars', verifyToken, getExtracurriculars);
router.post('/extracurriculars', verifyToken, checkRole('admin'), createExtracurricular);
router.put('/extracurriculars/:id', verifyToken, checkRole('admin'), updateExtracurricular);
router.delete('/extracurriculars/:id', verifyToken, checkRole('admin'), deleteExtracurricular);

// ==========================================
// --- Endpoint Guru & Penugasan Wali Kelas ---
// ==========================================
// Hanya Admin yang bisa melihat daftar guru dan menugaskan wali kelas
router.get('/teachers', verifyToken, checkRole('admin'), getTeachers);
router.post('/assign-homeroom', verifyToken, checkRole('admin'), assignHomeroomTeacher);

module.exports = router;
