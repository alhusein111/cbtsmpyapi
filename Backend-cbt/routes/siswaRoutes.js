const express = require('express');
const router = express.Router();
const multer = require('multer');

// Setup multer untuk membaca file di memory (tanpa disimpan ke disk)
const upload = multer({ storage: multer.memoryStorage() });

// Import Controller (tambah upgradeClass)
const { 
    getSiswa, createSiswa, updateSiswa, deleteSiswa, importSiswaExcel, upgradeClass 
} = require('../controllers/siswaController');

// Import Middleware Keamanan
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Rute Kenaikan/Pindah Kelas Massal (Posisikan SEBELUM rute /:id)
router.put('/upgrade-class', verifyToken, checkRole('admin'), upgradeClass);

// Rute CRUD Siswa (Hanya Admin yang boleh mengelola data siswa)
router.get('/', verifyToken, checkRole('admin', 'guru'), getSiswa);
router.post('/', verifyToken, checkRole('admin'), createSiswa);
router.put('/:id', verifyToken, checkRole('admin'), updateSiswa);
router.delete('/:id', verifyToken, checkRole('admin'), deleteSiswa);

// Rute Import Excel (Menggunakan upload.single dengan nama field 'file')
router.post('/import', verifyToken, checkRole('admin'), upload.single('file'), importSiswaExcel);

module.exports = router;