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

// --- FITUR RESET / RESUME (Task 2 - Tombol Darurat) ---
const resetSiswaUjian = async (req, res) => {
    const { student_exam_id } = req.body; 

    try {
        const [result] = await db.query(
            `UPDATE student_exams 
             SET status = 'Mengerjakan', 
                 waktu_selesai_pengerjaan = NULL, 
                 nilai_akhir = NULL, 
                 receipt_code = NULL 
             WHERE id = ?`, 
            [student_exam_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data ujian tidak ditemukan.' });
        }

        res.json({ 
            success: true, 
            message: 'Status ujian siswa berhasil di-reset. Siswa bisa melanjutkan kembali.' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// --- API DASHBOARD ADMIN / GURU (Disesuaikan dengan Frontend Baru) ---
const getDashboardAdmin = async (req, res) => {
    try {
        // 1. Ambil 4 Statistik Utama
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users_siswa) AS total_siswa,
                (SELECT COUNT(*) FROM student_exams WHERE status = 'Mengerjakan') AS ujian_aktif,
                (SELECT COUNT(*) FROM student_exams WHERE status = 'Selesai' AND DATE(waktu_selesai_pengerjaan) = CURDATE()) AS submit_hari_ini,
                (SELECT COUNT(*) FROM exam_logs WHERE event = 'VIOLATION_BLUR') AS pelanggaran_siswa
        `);

        // 2. Ambil Data Pie Chart (Exam Completion)
        const [pieData] = await db.query(`
            SELECT status, COUNT(*) AS value 
            FROM student_exams 
            GROUP BY status
        `);

        const formattedPie = [
            { name: 'Selesai', value: pieData.find(d => d.status === 'Selesai')?.value || 0 },
            { name: 'Proses', value: pieData.find(d => d.status === 'Mengerjakan')?.value || 0 },
            { name: 'Belum', value: pieData.find(d => !['Selesai', 'Mengerjakan'].includes(d.status))?.value || 0 }
        ];

        // 3. Ambil Data Bar Chart (Average Scores)
        // Pastikan tabel subjects, exams, dan student_exams sesuai dengan struktur DB Mas Brow
        const [barData] = await db.query(`
            SELECT m.nama_mapel AS mapel, ROUND(IFNULL(AVG(se.nilai_akhir), 0), 2) AS nilai
            FROM student_exams se
            JOIN exams e ON se.exam_id = e.id
            JOIN subjects m ON e.subject_id = m.id
            WHERE se.status = 'Selesai'
            GROUP BY m.id
        `);

        // 4. Kirim Data dengan format JSON yang diminta Frontend
        res.json({
            success: true,
            total_siswa: stats[0].total_siswa || 0,
            ujian_aktif: stats[0].ujian_aktif || 0,
            submit_hari_ini: stats[0].submit_hari_ini || 0,
            pelanggaran_siswa: stats[0].pelanggaran_siswa || 0,
            grafik_ujian: formattedPie,
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