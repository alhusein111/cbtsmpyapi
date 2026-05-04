const express = require('express');
const router = express.Router();

// 1. Import semua controller yang dibutuhkan
const { 
    tambahSoal, 
    importSoalExcel, 
    uploadGambarMassal, 
    getQuestionsBySubject,
    deleteQuestion, 
    updateSoal,
    getQuestionById,      // <--- TAMBAHAN BARU
    getQuestionsByExam    // <--- TAMBAHAN BARU
} = require('../controllers/questionController');

// 2. Import middleware auth
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// 3. Import semua konfigurasi upload
const { uploadSoal, uploadExcel, uploadBulkGambar } = require('../middlewares/uploadMiddleware'); 

// --- RUTE API SOAL ---

// Route 1: Tambah Manual + Upload Gambar
router.post('/tambah', verifyToken, checkRole('admin', 'guru'), uploadSoal.any(), tambahSoal);

// Route 2: Import Massal via Excel (Tambahkan /:examId supaya controller bisa baca ID-nya)
router.post('/import-excel/:examId', verifyToken, checkRole('admin', 'guru'), uploadExcel.single('file_excel'), importSoalExcel);

// Route 3: Upload Banyak Gambar Sekaligus
router.post('/upload-gambar-massal', verifyToken, checkRole('admin', 'guru'), uploadBulkGambar.array('gambar_massal', 50), uploadGambarMassal);

// Route 4: Ambil Soal Berdasarkan Mata Pelajaran
router.get('/mapel/:subject_id', verifyToken, checkRole('admin', 'guru'), getQuestionsBySubject);

// Route 5: Ambil Soal Berdasarkan Jadwal Ujian (Exam ID) -> Ini tadi lupa didaftarkan
router.get('/exam/:examId', verifyToken, checkRole('admin', 'guru'), getQuestionsByExam);

// Route 6: Ambil DETAIL 1 SOAL untuk fitur EDIT (INI SOLUSI ERROR 404 NYA)
router.get('/:id', verifyToken, checkRole('admin', 'guru'), getQuestionById);

// Route 7: Hapus Soal
router.delete('/:id', verifyToken, checkRole('admin', 'guru'), deleteQuestion); 

// Route 8: Update Soal
router.put('/:id', verifyToken, checkRole('admin', 'guru'), uploadSoal.any(), updateSoal);

module.exports = router;