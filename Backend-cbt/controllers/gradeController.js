const db = require('../config/db'); // Sesuaikan path database Mas Brow

// ==========================================
// 🎓 GET DATA SISWA & NILAI (UNTUK GURU)
// ==========================================
const getStudentGrades = async (req, res) => {
    // Parameter yang dikirim dari frontend saat guru memilih kelas & mapel
    const { class_id, subject_id, academic_year_id } = req.query;

    try {
        // Query Super Canggih (Updated dengan tabel users_siswa):
        // 1. Ambil semua siswa di kelas tersebut (users_siswa)
        // 2. Tarik nilai raport yang sudah pernah diketik guru (student_grades)
        // 3. Tarik LIVE nilai asli dari ujian CBT (student_exams & exams)
        const query = `
            SELECT 
                s.id AS siswa_id, 
                s.nis,
                s.no_peserta,
                s.nama AS nama_siswa, 
                
                -- Mencari nilai ujian CBT asli siswa ini (Subquery)
                (SELECT MAX(se.nilai_akhir) 
                 FROM student_exams se 
                 JOIN exams e ON se.exam_id = e.id 
                 WHERE se.siswa_id = s.id 
                   AND e.subject_id = ? 
                   AND e.academic_year_id = ?
                   AND se.status = 'Selesai'
                ) AS nilai_cbt_asli,

                -- Kolom dari tabel nilai raport manual
                g.nilai_raport,
                g.deskripsi_pengetahuan

            FROM users_siswa s
            LEFT JOIN student_grades g 
                ON s.id = g.siswa_id 
                AND g.subject_id = ? 
                AND g.academic_year_id = ?
            WHERE s.class_id = ?
            ORDER BY s.nama ASC
        `;
        
        // Parameter: 
        // 1 & 2 untuk subquery CBT, 
        // 3 & 4 untuk join student_grades, 
        // 5 untuk where users_siswa
        const [rows] = await db.query(query, [
            subject_id, academic_year_id, // Parameter subquery CBT
            subject_id, academic_year_id, // Parameter join student_grades
            class_id                      // Parameter where users_siswa
        ]);

        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 💾 SIMPAN NILAI MASSAL (BULK UPSERT)
// ==========================================
const saveStudentGrades = async (req, res) => {
    // req.body.grades berupa array of objects dari frontend
    const { subject_id, class_id, academic_year_id, grades } = req.body;

    try {
        // Siapkan data untuk bulk insert
        const values = grades.map(grade => [
            grade.siswa_id,
            subject_id,
            class_id,
            academic_year_id,
            grade.nilai_cbt_asli || null, // Diambil dari frontend yang menampilkan nilai CBT
            grade.nilai_raport || null,   // Input manual Guru
            grade.deskripsi_pengetahuan || ''
        ]);

        // Gunakan ON DUPLICATE KEY UPDATE: 
        // Jika data nilai siswa belum ada, INSERT. Jika sudah ada, UPDATE nilainya.
        const query = `
            INSERT INTO student_grades 
            (siswa_id, subject_id, class_id, academic_year_id, nilai_psas, nilai_raport, deskripsi_pengetahuan)
            VALUES ?
            ON DUPLICATE KEY UPDATE
            nilai_psas = VALUES(nilai_psas),
            nilai_raport = VALUES(nilai_raport),
            deskripsi_pengetahuan = VALUES(deskripsi_pengetahuan)
        `;

        await db.query(query, [values]);

        res.json({ success: true, message: 'Nilai satu kelas berhasil disimpan!' });
    } catch (error) {
        console.error('Error Save Grades:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai: ' + error.message });
    }
};

module.exports = {
    getStudentGrades,
    saveStudentGrades
};