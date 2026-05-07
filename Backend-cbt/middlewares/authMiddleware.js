const jwt = require('jsonwebtoken');
const db = require('../config/db'); 

// 1. Satpam Pengecek Karcis (Validasi JWT)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(403).json({ success: false, message: 'Akses ditolak! Token tidak ditemukan.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ success: false, message: 'Sesi habis atau token tidak valid!' });
        
        req.user = decoded; 
        next(); 
    });
};

// 2. Satpam Pengecek ID Card Dinamis (Validasi Role)
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Dilarang masuk! Anda tidak memiliki izin untuk area ini.' });
        }
        next(); 
    };
};

// 3. TAMBAHAN: Satpam Pengecek Status Login Siswa di Database
const checkSiswaActive = async (req, res, next) => {
    // Hanya berlaku untuk siswa
    if (req.user && req.user.role === 'siswa') {
        try {
            const [rows] = await db.query('SELECT is_login FROM users_siswa WHERE id = ?', [req.user.id]);
            
            // Jika data tidak ada ATAU is_login sudah 0 (di-reset admin)
            if (rows.length === 0 || rows[0].is_login === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Sesi login telah di-reset oleh Admin. Silakan login kembali.',
                    forceLogout: true // Tanda khusus untuk frontend
                });
            }
        } catch (error) {
            console.error('Error checking is_login:', error);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
        }
    }
    next(); // Lolos! is_login masih 1
};

module.exports = { verifyToken, checkRole, checkSiswaActive };