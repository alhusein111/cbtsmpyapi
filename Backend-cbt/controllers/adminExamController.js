const { getDashboardStats } = require('../utils/statsHelper');
const db = require('../config/db');

// --- API PENAMPIL TOKEN (Task 3) ---
const getCurrentTokens = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT token_masuk, token_keluar, last_updated FROM system_tokens WHERE id = 1');
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Token belum digenerate.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- FITUR RESET / RESUME: Implementasi Buka Kunci ---
const resetSiswaUjian = async (req, res) => {
    const { student_exam_id } = req.body; 

    // ✅ VALIDASI: Pastikan ID terkirim
    if (!student_exam_id) {
        return res.status(400).json({ success: false, message: 'ID Ujian tidak ditemukan di request.' });
    }

    try {
        // 1. Cari ID siswa BERIKUT NAMA berdasarkan ujian yang terkunci
        const [examRows] = await db.query(`
            SELECT se.siswa_id, u.nama 
            FROM student_exams se 
            JOIN users_siswa u ON se.siswa_id = u.id 
            WHERE se.id = ?`, 
        [student_exam_id]);
        
        if (examRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data ujian tidak ditemukan.' });
        }

        const siswaId = examRows[0].siswa_id;
        const namaSiswa = examRows[0].nama; // ✅ DAPATKAN NAMA

        // 2. Buka Kunci & Paksa Logout
        await db.query(
            'UPDATE users_siswa SET is_locked = 0, is_login = 0, device_id = NULL WHERE id = ?', 
            [siswaId]
        );

        // 3. Reset Status Ujian jadi 'Login'
        await db.query(
            `UPDATE student_exams SET status = 'Login' WHERE id = ?`, 
            [student_exam_id]
        );

        // ✅ TAMBAHAN: Catat ke tabel exam_logs menggunakan NAMA
        const logText = `Admin membuka kunci ujian (Reset Sesi) untuk [${namaSiswa}]`;
        await db.query(
            `INSERT INTO exam_logs (siswa_id, event, detail, created_at) VALUES (?, 'ADMIN_ACTION', ?, NOW())`,
            [siswaId, logText]
        );

        // 4. Trigger Socket ke Frontend
        const io = req.app.get('io');
        if (io) {
            io.emit(`force_logout:${siswaId}`); 
            io.emit('peserta:update', { id: siswaId, status: 'Login' }); 
            io.emit('stats:refresh');

            // ✅ Kirim log nama ini ke Command Center
            io.to('staff_room').emit('staff:log_new', {
                type: 'ADMIN_ACTION',
                text: logText,
                siswa_id: siswaId,
                time: new Date()
            });
        }

        res.json({ 
            success: true, 
            message: 'Status ujian berhasil di-reset. Kunci dibuka, siswa silahkan login kembali.' 
        });
        
    } catch (error) {
        // ✅ PERBAIKAN: Console log agar mudah di-debug jika terjadi error di server
        console.error('❌ Error di resetSiswaUjian:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat membuka kunci.' });
    }
};

const resetLoginDevice = async (req, res) => {
    try {
        const { id } = req.body; // Ini adalah siswa_id

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID Siswa diperlukan.' });
        }

        // Kosongkan device_id, set is_login = 0, is_locked = 0
        const [result] = await db.query(
            'UPDATE users_siswa SET device_id = NULL, is_login = 0, is_locked = 0 WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
        }

        // (Opsional) Emit socket biar siswa langsung ter-logout dari device lamanya
        const io = req.app.get('io');
        if (io) {
            io.emit(`force_logout:${id}`);
        }

        res.json({ success: true, message: 'Device berhasil di-reset. Siswa bisa login di perangkat baru.' });
    } catch (error) {
        console.error('❌ Error Reset Device:', error);
        res.status(500).json({ success: false, message: 'Server error saat reset device.' });
    }
};


// --- API DASHBOARD ADMIN ---
const getDashboardAdmin = async (req, res) => {
    try {
        // ✅ 1. Panggil Helper Statistik
        const dashboardData = await getDashboardStats(db);

        // ✅ 2. Query tambahan khusus halaman ini (Grafik Batang Nilai)
        const [barData] = await db.query(`
            SELECT m.nama_mapel AS mapel, ROUND(IFNULL(AVG(se.nilai_akhir), 0), 2) AS nilai
            FROM student_exams se
            JOIN exams e ON se.exam_id = e.id
            JOIN subjects m ON e.subject_id = m.id
            WHERE se.status = 'Selesai'
            GROUP BY m.id
        `);

        res.json({
            success: true,
            stats: dashboardData.stats,
            grafik_ujian: dashboardData.grafik_ujian,
            grafik_nilai: barData.length > 0 ? barData : []
        });

    } catch (error) {
        console.error('❌ Error Get Dashboard Admin:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memuat dashboard admin.' });
    }
};

module.exports = { 
    getCurrentTokens, 
    resetSiswaUjian, 
    getDashboardAdmin,
    resetLoginDevice
};