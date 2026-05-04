const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// 1. IMPORT LOGGER
const { insertExamLog } = require('../utils/logger');

const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await db.query('SELECT * FROM users_staff WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Username tidak ditemukan!' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Password salah!' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.status(200).json({
            success: true,
            message: 'Login berhasil!',
            token: token,
            data: { id: user.id, nama: user.nama_lengkap, role: user.role }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada mesin server' });
    }
};

const loginSiswa = async (req, res) => {
    try {
        const { nis, no_peserta, token_masuk, device_id } = req.body;

        const [tokenRows] = await db.query('SELECT token_masuk FROM system_tokens WHERE id = 1');
        if (tokenRows.length === 0 || tokenRows[0].token_masuk !== token_masuk) {
            return res.status(401).json({ success: false, message: 'Token Masuk tidak valid atau sudah kadaluarsa!' });
        }

        const querySiswa = `
            SELECT us.*, c.nama_kelas 
            FROM users_siswa us
            LEFT JOIN classes c ON us.class_id = c.id
            WHERE us.nis = ? AND us.no_peserta = ?
        `;
        
        const [siswaRows] = await db.query(querySiswa, [nis, no_peserta]);
        
        if (siswaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'NIS atau No. Peserta salah!' });
        }

        const siswa = siswaRows[0];

        if (siswa.is_locked === 1) {
            return res.status(403).json({ success: false, message: 'Akun terkunci karena pelanggaran! Lapor ke Pengawas.' });
        }

        if (siswa.is_login === 1 && siswa.device_id !== device_id) {
            return res.status(403).json({ success: false, message: 'Akun sedang digunakan di perangkat lain!' });
        }

        await db.query('UPDATE users_siswa SET is_login = 1, device_id = ? WHERE id = ?', [device_id, siswa.id]);

        const token = jwt.sign(
            { id: siswa.id, role: 'siswa', class_id: siswa.class_id },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        // LOGGER: Catat aktivitas Login berhasil
        await insertExamLog(siswa.id, null, 'APP_LOGIN', 'Berhasil login ke aplikasi');

        res.status(200).json({
            success: true,
            message: 'Berhasil masuk ruang ujian!',
            token: token,
            data: { 
                id: siswa.id, 
                nama: siswa.nama, 
                class_id: siswa.class_id,
                nis: siswa.nis,              
                nisn: siswa.nisn,            
                no_peserta: siswa.no_peserta,
                nama_kelas: siswa.nama_kelas || `Kelas ID: ${siswa.class_id}` 
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
};

// 2. FUNGSI LOGOUT (Mereset is_login dan mencatat logger)
const logoutProses = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        // Hanya proses log & reset device untuk siswa
        if (role === 'siswa') {
            await insertExamLog(userId, null, 'APP_LOGOUT', 'Keluar (logout) dari aplikasi');
            await db.query('UPDATE users_siswa SET is_login = 0, device_id = NULL WHERE id = ?', [userId]);
        }

        res.status(200).json({ success: true, message: 'Logout berhasil, sesi dihapus dari server.' });
    } catch (error) {
        console.error('Error saat logout:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat logout server.' });
    }
};

module.exports = { loginAdmin, loginSiswa, logoutProses };