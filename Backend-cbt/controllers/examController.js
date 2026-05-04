const db = require('../config/db');
const xlsx = require('xlsx'); // Wajib untuk fitur Export Excel

// [READ] Mengambil daftar ujian sesuai Role
const getExams = async (req, res) => {
    try {
        const userRole = req.user?.role || 'admin';
        const userId = req.user?.id || 0;     
        const { academic_year_id } = req.query; // 👇 Tangkap ID Tahun Ajaran dari Frontend

        let query = `
            SELECT 
                e.id, 
                e.subject_id, 
                e.academic_year_id,
                e.exam_type_id,
                e.guru_id,
                ay.tahun_pelajaran, 
                et.nama_ujian, 
                s.nama_mapel, 
                (SELECT GROUP_CONCAT(nama_kelas SEPARATOR ', ') 
                 FROM classes 
                 WHERE JSON_CONTAINS(e.kelas_peserta, CAST(classes.id AS CHAR))) AS nama_kelas,
                e.kelas_peserta,
                u.nama_lengkap AS nama_guru,
                e.tanggal_ujian, e.waktu_mulai, e.waktu_selesai, e.durasi, e.min_work_time, e.is_active
            FROM exams e
            JOIN academic_years ay ON e.academic_year_id = ay.id
            JOIN exam_types et ON e.exam_type_id = et.id
            JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN users_staff u ON e.guru_id = u.id
        `;
        
        let params = [];
        let whereClauses = [];

        // Filter berdasarkan Role
        if (userRole === 'guru') {
            whereClauses.push(`e.guru_id = ?`);
            params.push(userId);
        }

        // 👇 Filter berdasarkan Tahun Ajaran Aktif
        if (academic_year_id) {
            whereClauses.push(`e.academic_year_id = ?`);
            params.push(academic_year_id);
        }

        // Gabungkan WHERE clause jika ada filter
        if (whereClauses.length > 0) {
            query += ` WHERE ` + whereClauses.join(' AND ');
        }

        // Urutkan supaya jadwal terbaru ada di atas
        query += ` ORDER BY e.tanggal_ujian DESC, e.waktu_mulai ASC`;

        const [data] = await db.query(query, params);

        const formattedData = data.map(exam => ({
            ...exam,
            kelas_peserta: typeof exam.kelas_peserta === 'string' ? JSON.parse(exam.kelas_peserta) : exam.kelas_peserta
        }));

        res.json({ success: true, data: formattedData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 👇 TAMBAHAN BARU: [READ SINGLE] Mengambil satu ujian beserta info Mapel
const getExamById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT e.*, s.nama_mapel 
            FROM exams e
            LEFT JOIN subjects s ON e.subject_id = s.id
            WHERE e.id = ?
        `;
        const [exams] = await db.query(query, [id]);
        
        if (exams.length === 0) {
            return res.status(404).json({ success: false, message: 'Jadwal ujian tidak ditemukan' });
        }
        res.json({ success: true, data: exams[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [CREATE] Membuat Ujian Baru
const createExam = async (req, res) => {
    try {
        const { 
            academic_year_id, exam_type_id, subject_id, kelas_peserta, guru_id, 
            tanggal_ujian, waktu_mulai, waktu_selesai, durasi, min_work_time, is_active 
        } = req.body;

        const kelasPesertaJSON = JSON.stringify(kelas_peserta);

        const query = `
            INSERT INTO exams 
            (academic_year_id, exam_type_id, subject_id, kelas_peserta, guru_id, tanggal_ujian, waktu_mulai, waktu_selesai, durasi, min_work_time, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) -- Ganti angka 1 terakhir jadi tanda tanya (?)
        `; 

        const values = [
            academic_year_id, exam_type_id, subject_id, kelasPesertaJSON, guru_id, 
            tanggal_ujian, waktu_mulai, waktu_selesai, durasi, min_work_time, 
            is_active !== undefined ? is_active : 1 // Masukkan nilai is_active di sini
        ];

        await db.query(query, values);
        res.json({ success: true, message: 'Jadwal ujian berhasil dibuat!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [UPDATE] Edit Data Ujian
const updateExam = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            academic_year_id, exam_type_id, subject_id, kelas_peserta, guru_id, 
            tanggal_ujian, waktu_mulai, waktu_selesai, durasi, min_work_time, is_active 
        } = req.body;

        const kelasPesertaJSON = JSON.stringify(kelas_peserta);

        const query = `
            UPDATE exams 
            SET academic_year_id = ?, exam_type_id = ?, subject_id = ?, kelas_peserta = ?, 
                guru_id = ?, tanggal_ujian = ?, waktu_mulai = ?, waktu_selesai = ?, 
                durasi = ?, min_work_time = ?, is_active = ?
            WHERE id = ?
        `;

        const values = [
            academic_year_id, exam_type_id, subject_id, kelasPesertaJSON, guru_id, 
            tanggal_ujian, waktu_mulai, waktu_selesai, durasi, min_work_time, is_active, id
        ];

        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data ujian tidak ditemukan.' });
        }

        res.json({ success: true, message: 'Jadwal ujian berhasil diperbarui!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [DELETE] Hapus Ujian dan Soal Terafiliasi
const deleteExam = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        await connection.beginTransaction();

        const [checkData] = await connection.query('SELECT id FROM student_exams WHERE exam_id = ? LIMIT 1', [id]);
        if (checkData.length > 0) {
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'GAGAL: Ujian sudah dikerjakan siswa! Nonaktifkan saja.' 
            });
        }

        const [examData] = await connection.query('SELECT subject_id FROM exams WHERE id = ?', [id]);
        if (examData.length === 0) {
            throw new Error('Data ujian tidak ditemukan.');
        }
        const subjectId = examData[0].subject_id;

        await connection.query('DELETE FROM exams WHERE id = ?', [id]);
        await connection.query('DELETE FROM questions WHERE subject_id = ?', [subjectId]);

        await connection.commit();
        res.json({ success: true, message: 'Jadwal ujian beserta bank soal mapel berhasil dihapus!' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// [EXPORT] Download Nilai Ujian format Excel
const exportNilaiExcel = async (req, res) => {
    try {
        const { exam_id } = req.params;

        const query = `
            SELECT 
                s.nis AS 'NIS',
                s.no_peserta AS 'No Peserta',
                s.nama AS 'Nama Siswa',
                se.status AS 'Status',
                se.waktu_mulai AS 'Waktu Mulai',
                se.waktu_selesai AS 'Waktu Selesai',
                se.nilai AS 'Nilai Akhir'
            FROM student_exams se
            JOIN users_siswa s ON se.siswa_id = s.id
            WHERE se.exam_id = ?
            ORDER BY s.nama ASC
        `;

        const [data] = await db.query(query, [exam_id]);

        if (data.length === 0) {
            return res.status(404).json({ success: false, message: 'Belum ada data nilai untuk ujian ini.' });
        }

        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Nilai Ujian');

        const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="Nilai_Ujian_${exam_id}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal export excel: ' + error.message });
    }
};

// Jangan lupa getExamById diexport di sini
module.exports = { 
    getExams, 
    getExamById,
    createExam, 
    updateExam, 
    deleteExam, 
    exportNilaiExcel 
};