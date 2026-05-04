const express = require('express');
const router = express.Router();
const multer = require('multer');

// Setup multer untuk membaca file di memory
const upload = multer({ storage: multer.memoryStorage() });

// Import Controller (sudah termasuk updateStaff dan importStaffExcel)
const { 
    getStaff, createStaff, updateStaff, deleteStaff, importStaffExcel 
} = require('../controllers/staffController');

// Import Middleware Keamanan
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Rute CRUD Staff (Hanya Admin yang boleh mengelola data staff)
router.get('/', verifyToken, checkRole('admin', 'guru'), getStaff);
router.put('/:id', verifyToken, checkRole('admin', 'guru'), updateStaff); // Rute Update Staff
router.post('/', verifyToken, checkRole('admin'), createStaff);
router.delete('/:id', verifyToken, checkRole('admin'), deleteStaff);

// Rute Import Excel (Menggunakan upload.single dengan nama field 'file')
router.post('/import', verifyToken, checkRole('admin'), upload.single('file'), importStaffExcel);

module.exports = router;