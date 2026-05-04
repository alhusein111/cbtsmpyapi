const db = require('../config/db');
const jwt = require('jsonwebtoken');

const loginSiswa = async (req, res) => {
    // 1. Tangkap device_id dari request body
    const { nis, no_peserta, token_masuk, device_id } = req.body;

    // 2. Validasi input wajib (Sekarang device_id juga wajib)
    if (!nis || !no_peserta || !token_masuk || !device_id) {
        return res.status(400).json({ success: false, message: 'NIS, No. Peserta, Token Masuk, dan Device ID wajib diisi!' });
    }

    const connection = await db.getConnection();

    try {
        // CEK TOKEN MASUK GLOBAL
        const [tokenData] = await connection.query('SELECT token_masuk FROM system_tokens WHERE id = 1');
        const validToken = tokenData[0]?.token_masuk;

        if (token_masuk.toUpperCase() !== validToken.toUpperCase()) {
            return res.status(401).json({ success: false, message: 'Token Masuk tidak valid atau sudah kedaluwarsa!' });
        }

        // CEK IDENTITAS SISWA DI TABEL users_siswa
        const [siswaData] = await connection.query(
            'SELECT id, nis, no_peserta, nama, class_id, is_locked, is_login, device_id FROM users_siswa WHERE nis = ? AND no_peserta = ?',
            [nis, no_peserta]
        );

        if (siswaData.length === 0) {
            return res.status(404).json({ success: false, message: 'NIS atau No. Peserta tidak ditemukan.' });
        }

        const siswa = siswaData[0];

        // CEK APAKAH AKUN TERKUNCI
        if (siswa.is_locked === 1) {
            return res.status(403).json({ success: false, message: 'Akun Anda TERKUNCI karena indikasi pelanggaran. Silakan lapor ke Pengawas!' });
        }

        // ==========================================
        // LOGIC BARU: ANTI-DOUBLE LOGIN + DEVICE ID
        // ==========================================
        if (siswa.is_login === 1) {
            // Jika statusnya lagi login, cek apakah device_id-nya beda?
            // (Kita pakai optional chaining `?` dan string cast buat jaga-jaga kalau datanya null)
            if (siswa.device_id && String(siswa.device_id) !== String(device_id)) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Akun Anda sedang login di perangkat lain! Silakan logout dulu.' 
                });
            }
            // Kalau device_id SAMA, biarkan lanjut (kasus relogin karena HP restart/force close)
        }

        // UPDATE STATUS LOGIN SISWA & SIMPAN DEVICE ID-NYA
        await connection.query(
            'UPDATE users_siswa SET is_login = 1, device_id = ? WHERE id = ?', 
            [device_id, siswa.id]
        );

        // GENERATE JWT TOKEN
        const token = jwt.sign(
            { id: siswa.id, role: 'siswa', class_id: siswa.class_id },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({
            success: true,
            message: 'Login berhasil!',
            token,
            data: { id: siswa.id, nama: siswa.nama, nis: siswa.nis, class_id: siswa.class_id }
        });

    } catch (error) {
        console.error('❌ Error Login Siswa:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    } finally {
        connection.release();
    }
};

// ... kode loginSiswa di atas ...

const logoutSiswa = async (req, res) => {
    // Karena API ini butuh Token JWT, kita bisa ambil ID siswa yang sedang login dari req.user
    const siswaId = req.user.id;

    try {
        // Reset is_login jadi 0 dan kosongkan kembali device_id-nya
        await db.query(
            'UPDATE users_siswa SET is_login = 0, device_id = NULL WHERE id = ?',
            [siswaId]
        );

        res.json({ success: true, message: 'Berhasil Logout! Anda bisa login kembali dari perangkat mana saja.' });
    } catch (error) {
        console.error('❌ Error Logout Siswa:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat logout.' });
    }
};

// Jangan lupa export fungsi barunya!
module.exports = { loginSiswa, logoutSiswa };