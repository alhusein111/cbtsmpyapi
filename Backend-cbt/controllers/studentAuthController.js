const db = require('../config/db');
const jwt = require('jsonwebtoken');

const loginSiswa = async (req, res) => {
    // 1. Tangkap device_id dari request body
    const { nis, no_peserta, token_masuk, device_id } = req.body;

    // 2. Validasi input wajib
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

        // ANTI-DOUBLE LOGIN + DEVICE ID
        if (siswa.is_login === 1) {
            if (siswa.device_id && String(siswa.device_id) !== String(device_id)) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Akun Anda sedang login di perangkat lain! Silakan logout dulu.' 
                });
            }
        }

        // UPDATE STATUS LOGIN SISWA & SIMPAN DEVICE ID-NYA
        await connection.query(
            'UPDATE users_siswa SET is_login = 1, device_id = ? WHERE id = ?', 
            [device_id, siswa.id]
        );

        // ✅ LOGIC BARU: CATAT LOG LOGIN DENGAN NAMA SISWA
        const logText = `[${siswa.nama}] Berhasil login ke portal`;
        await connection.query(
            'INSERT INTO exam_logs (siswa_id, event, detail, created_at) VALUES (?, ?, ?, NOW())',
            [siswa.id, 'LOGIN', logText]
        );

        // ✅ TRIGGER SOCKET KE PENGAWAS
        const io = req.app.get('io');
        if (io) {
            io.to('staff_room').emit('staff:log_new', {
                type: 'LOGIN',
                text: logText,
                siswa_id: siswa.id,
                time: new Date()
            });
            // Update UI peserta di dashboard admin (opsional untuk indikator online)
            io.to('staff_room').emit('staff:peserta_update', { id: siswa.id, is_login: 1 });
        }

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

const logoutSiswa = async (req, res) => {
    // Ambil ID siswa yang sedang login dari req.user (di-set oleh middleware auth)
    const siswaId = req.user.id;

    try {
        // ✅ 1. Ambil nama siswa untuk ditulis di log
        const [siswaData] = await db.query('SELECT nama FROM users_siswa WHERE id = ?', [siswaId]);
        const namaSiswa = siswaData.length > 0 ? siswaData[0].nama : 'Siswa Anonim';
        const logText = `[${namaSiswa}] Berhasil logout dari portal`;

        // ✅ 2. Reset is_login jadi 0 dan kosongkan kembali device_id-nya
        await db.query(
            'UPDATE users_siswa SET is_login = 0, device_id = NULL WHERE id = ?',
            [siswaId]
        );

        // ✅ 3. Simpan riwayat logout ke exam_logs
        await db.query(
            'INSERT INTO exam_logs (siswa_id, event, detail, created_at) VALUES (?, ?, ?, NOW())',
            [siswaId, 'LOGOUT', logText]
        );

        // ✅ 4. Trigger Socket ke Pengawas bahwa siswa ini sudah logout
        const io = req.app.get('io');
        if (io) {
            io.to('staff_room').emit('staff:log_new', {
                type: 'LOGOUT',
                text: logText,
                siswa_id: siswaId,
                time: new Date()
            });
            io.to('staff_room').emit('staff:peserta_update', { id: siswaId, is_login: 0 });
        }

        res.json({ success: true, message: 'Berhasil Logout! Anda bisa login kembali dari perangkat mana saja.' });
    } catch (error) {
        console.error('❌ Error Logout Siswa:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat logout.' });
    }
};

// FUNGSI: KUNCI AKUN GLOBAL (PELANGGARAN DI DASHBOARD)
const lockAkunSiswaGlobal = async (req, res) => {
    const siswaId = req.user.id;
    const connection = await db.getConnection();

    try {
        // 1. Kunci akun siswa di tabel users_siswa
        await connection.query('UPDATE users_siswa SET is_locked = 1 WHERE id = ?', [siswaId]);

        // 2. Ambil nama siswa buat log
        const [siswaTarget] = await connection.query('SELECT nama FROM users_siswa WHERE id = ?', [siswaId]);
        const namaSiswa = siswaTarget.length > 0 ? siswaTarget[0].nama : `Siswa`;

        // 3. Catat ke tabel exam_logs (Opsional, sesuaikan dengan struktur tabel mas brow)
        await connection.query(
            'INSERT INTO exam_logs (siswa_id, event, detail, created_at) VALUES (?, ?, ?, NOW())',
            [siswaId, 'VIOLATION_DASHBOARD', `Sistem mengunci akun karena ${namaSiswa} keluar gembok saat di Dashboard.`]
        );

        // 4. Kasih tau pengawas lewat Socket.io (Biar langsung merah di layar pengawas)
        const io = req.app.get('io');
        if (io) {
            io.to('staff_room').emit('staff:log_new', {
                type: 'VIOLATION',
                text: `Pelanggaran: Akun ${namaSiswa} dikunci karena keluar paksa di Dashboard!`,
                siswa_id: siswaId,
                time: new Date()
            });
        }

        res.json({ success: true, message: 'Akun berhasil dikunci karena pelanggaran.' });

    } catch (error) {
        console.error('❌ Error Kunci Akun Global:', error);
        res.status(500).json({ success: false, message: 'Gagal mengunci akun.' });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { loginSiswa, logoutSiswa, lockAkunSiswaGlobal };