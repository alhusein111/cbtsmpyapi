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

    try {
        // 1. Cari ID siswa berdasarkan ujian yang terkunci
        const [examRows] = await db.query('SELECT siswa_id FROM student_exams WHERE id = ?', [student_exam_id]);
        
        if (examRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data ujian tidak ditemukan.' });
        }

        const siswaId = examRows[0].siswa_id;

        // 2. Buka Kunci & Paksa Logout (Agar siswa bisa Login ulang)
        await db.query(
            'UPDATE users_siswa SET is_locked = 0, is_login = 0, device_id = NULL WHERE id = ?', 
            [siswaId]
        );

        // 3. Reset Status Ujian jadi 'Login' (Standby)
        await db.query(
            `UPDATE student_exams 
             SET status = 'Login' 
             WHERE id = ?`, 
            [student_exam_id]
        );

        // 4. Trigger Socket ke Frontend
        const io = req.app.get('io');
        if (io) {
            // Beritahu device siswa yang terkunci untuk force logout/refresh
            io.emit(`force_logout:${siswaId}`); 
            // Update UI Admin
            io.emit('peserta:update', { id: siswaId, status: 'Belum Login' });
            io.emit('stats:refresh');
        }

        res.json({ 
            success: true, 
            message: 'Status ujian berhasil di-reset. Kunci dibuka, siswa silahkan login kembali.' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
    getDashboardAdmin 
};