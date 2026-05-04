const express = require('express');
const router = express.Router();

const { 
    mulaiUjian, 
    getSoalByNomor, 
    saveJawaban, 
    getNavigasiSoal, 
    selesaiUjian,
    lockSesiUjian 
} = require('../controllers/studentExamController'); 

const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Endpoint untuk memulai ujian (Method: POST)
router.post('/start', verifyToken, checkRole('siswa'), mulaiUjian);

// Endpoint untuk mengambil data soal per nomor (Method: GET)
router.get('/:student_exam_id/soal/:nomor_urut', verifyToken, checkRole('siswa'), getSoalByNomor);

// Endpoint untuk menyimpan jawaban & status ragu-ragu otomatis (Method: PUT)
router.put('/save-answer', verifyToken, checkRole('siswa'), saveJawaban);

// Endpoint untuk Peta Navigasi Soal (Method: GET)
router.get('/:student_exam_id/navigasi', verifyToken, checkRole('siswa'), getNavigasiSoal);

// Endpoint untuk mengakhiri ujian & hitung nilai (Method: POST)
router.post('/finish', verifyToken, checkRole('siswa'), selesaiUjian);

//lock sesi ujian (Method: POST)
router.post('/lock-ujian', verifyToken, checkRole('siswa'), lockSesiUjian);

// Endpoint untuk mendapatkan waktu server (Method: GET)
router.get('/server-time', (req, res) => {
    res.json({
        success: true,
        // Kirim waktu server dalam format global (ISO) biar gampang diolah React
        serverTime: new Date().toISOString() 
    });
});

module.exports = router;