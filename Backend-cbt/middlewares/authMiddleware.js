const jwt = require('jsonwebtoken');

// 1. Satpam Pengecek Karcis (Validasi JWT)
const verifyToken = (req, res, next) => {
    // Ambil token dari header request frontend
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    if (!token) return res.status(403).json({ success: false, message: 'Akses ditolak! Token tidak ditemukan.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ success: false, message: 'Sesi habis atau token tidak valid!' });
        
        req.user = decoded; // Simpan data user (id, role, class_id) ke dalam request
        next(); // Loloskan ke rute tujuan
    });
};

// 2. Satpam Pengecek ID Card Dinamis (Validasi Role)
// Ini menggantikan isAdminOrGuru dan isSiswa agar lebih fleksibel
const checkRole = (...roles) => {
    return (req, res, next) => {
        // Cek apakah data user ada dan role-nya termasuk yang diizinkan di parameter
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Dilarang masuk! Anda tidak memiliki izin untuk area ini.' });
        }
        next(); // Jika role cocok (misal: admin/guru), loloskan!
    };
};

module.exports = { verifyToken, checkRole };