const db = require('../config/db');

const hasilController = {
    // 1. AMBIL DAFTAR UJIAN (Untuk halaman DaftarHasilUjian.jsx)
    getDaftarUjian: async (req, res) => {
        try {
            const { role, id: userId } = req.user; // Diambil dari middleware auth
            
            let query = `
                SELECT 
                    e.id, e.judul, e.tanggal, e.durasi,
                    s.nama_mapel AS mapel,
                    u.nama AS guru,
                    (SELECT COUNT(*) FROM student_exams WHERE exam_id = e.id) AS total_peserta,
                    (SELECT COUNT(*) FROM student_exams WHERE exam_id = e.id AND status = 'Selesai') AS selesai
                FROM exams e
                JOIN subjects s ON e.subject_id = s.id
                LEFT JOIN users_staf u ON e.teacher_id = u.id
            `;

            const queryParams = [];

            // FILTER: Jika bukan admin, hanya tampilkan ujian milik guru ybs
            if (role !== 'admin') {
                query += ` WHERE e.teacher_id = ?`;
                queryParams.push(userId);
            }

            query += ` ORDER BY e.tanggal DESC`;

            const [rows] = await db.query(query, queryParams);
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // 2. DETAIL HASIL PER KELAS (Sudah mas brow buat, pindahkan ke sini agar rapi)
    getHasilKelas: async (req, res) => {
        const { exam_id } = req.params;
        const KKM = 75; 
        try {
            const [hasilRows] = await db.query(`
                SELECT 
                    s.nis, s.nama, se.id AS student_exam_id, se.nilai_akhir,
                    CASE WHEN se.nilai_akhir >= ? THEN 'LULUS' ELSE 'REMEDIAL' END AS status
                FROM student_exams se
                JOIN users_siswa s ON se.siswa_id = s.id
                WHERE se.exam_id = ? AND se.status = 'Selesai'
                ORDER BY se.nilai_akhir DESC
            `, [KKM, exam_id]);

            res.json({ success: true, data: hasilRows });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = hasilController;