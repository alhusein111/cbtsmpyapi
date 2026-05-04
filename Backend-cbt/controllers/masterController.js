const db = require('../config/db');

// --- CRUD KELAS ---
const getClasses = async (req, res) => {
    try {
        // 1. Tangkap ID Tahun Ajaran Aktif yang dikirim dari Frontend
        const { academic_year_id } = req.query;

        // 2. Modifikasi Query
        const query = `
            SELECT 
                c.id, 
                c.nama_kelas, 
                c.tingkat,
                (SELECT us.nama_lengkap 
                 FROM homeroom_teachers ht 
                 JOIN users_staff us ON ht.teacher_id = us.id 
                 WHERE ht.class_id = c.id AND ht.academic_year_id = ? 
                 LIMIT 1) AS wali_kelas,
                (SELECT COUNT(id) 
                 FROM users_siswa s 
                 WHERE s.class_id = c.id) AS jumlah_siswa
            FROM classes c
            ORDER BY c.tingkat ASC, c.nama_kelas ASC
        `;
        
        // 3. Masukkan academic_year_id ke dalam array parameter (tanda '?')
        const [data] = await db.query(query, [academic_year_id]);
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createClass = async (req, res) => {
    try {
        const { nama_kelas, tingkat } = req.body;
        await db.query('INSERT INTO classes (nama_kelas, tingkat) VALUES (?, ?)', [nama_kelas, tingkat]);
        res.json({ success: true, message: 'Kelas berhasil ditambah!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteClass = async (req, res) => {
    try {
        await db.query('DELETE FROM classes WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Kelas berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- CRUD MAPEL ---
const getSubjects = async (req, res) => {
    try {
        const [data] = await db.query('SELECT * FROM subjects');
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createSubject = async (req, res) => {
    try {
        const { nama_mapel } = req.body;
        await db.query('INSERT INTO subjects (nama_mapel) VALUES (?)', [nama_mapel]);
        res.json({ success: true, message: 'Mapel berhasil ditambah!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteSubject = async (req, res) => {
    try {
        await db.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Mapel berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- UPDATE KELAS ---
const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_kelas, tingkat } = req.body;
        
        await db.query('UPDATE classes SET nama_kelas = ?, tingkat = ? WHERE id = ?', [nama_kelas, tingkat, id]);
        res.json({ success: true, message: 'Data kelas berhasil diperbarui!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- UPDATE MAPEL ---
const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_mapel } = req.body;
        
        await db.query('UPDATE subjects SET nama_mapel = ? WHERE id = ?', [nama_mapel, id]);
        res.json({ success: true, message: 'Mata pelajaran berhasil diperbarui!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ==========================================
// 🎓 CRUD ACADEMIC YEARS (Tahun Pelajaran)
// ==========================================

const getAcademicYears = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM academic_years ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createAcademicYear = async (req, res) => {
    const { tahun_pelajaran, semester, is_active } = req.body;
    try {
        // Jika yang baru ini diset Aktif (1), matikan dulu semua yang lain
        if (is_active === 1 || is_active === true) {
            await db.query('UPDATE academic_years SET is_active = 0');
        }

        const [result] = await db.query(
            'INSERT INTO academic_years (tahun_pelajaran, semester, is_active) VALUES (?, ?, ?)',
            [tahun_pelajaran, semester, is_active ? 1 : 0]
        );
        res.json({ success: true, message: 'Tahun pelajaran berhasil ditambahkan!', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateAcademicYear = async (req, res) => {
    const { id } = req.params;
    const { tahun_pelajaran, semester, is_active } = req.body;
    try {
        // Jika di-update menjadi Aktif (1), matikan dulu semua yang lain
        if (is_active === 1 || is_active === true) {
            await db.query('UPDATE academic_years SET is_active = 0 WHERE id != ?', [id]);
        }

        await db.query(
            'UPDATE academic_years SET tahun_pelajaran = ?, semester = ?, is_active = ? WHERE id = ?',
            [tahun_pelajaran, semester, is_active ? 1 : 0, id]
        );
        res.json({ success: true, message: 'Tahun pelajaran berhasil diupdate!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteAcademicYear = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM academic_years WHERE id = ?', [id]);
        res.json({ success: true, message: 'Tahun pelajaran berhasil dihapus!' });
    } catch (error) {
        // Biasanya error kalau data ini masih nyangkut/dipakai di tabel ujian
        res.status(500).json({ success: false, message: 'Gagal dihapus. Data mungkin sedang digunakan.' });
    }
};


// ==========================================
// 📝 CRUD EXAM TYPES (Jenis/Tipe Ujian)
// ==========================================

const getExamTypes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM exam_types ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createExamType = async (req, res) => {
    // DISESUAIKAN: kode_ujian dan nama_ujian
    const { kode_ujian, nama_ujian } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO exam_types (kode_ujian, nama_ujian) VALUES (?, ?)',
            [kode_ujian, nama_ujian]
        );
        res.json({ success: true, message: 'Jenis ujian berhasil ditambahkan!', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateExamType = async (req, res) => {
    const { id } = req.params;
    const { kode_ujian, nama_ujian } = req.body;
    try {
        await db.query(
            'UPDATE exam_types SET kode_ujian = ?, nama_ujian = ? WHERE id = ?',
            [kode_ujian, nama_ujian, id]
        );
        res.json({ success: true, message: 'Jenis ujian berhasil diupdate!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteExamType = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM exam_types WHERE id = ?', [id]);
        res.json({ success: true, message: 'Jenis ujian berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal dihapus. Data tipe ujian mungkin sedang digunakan pada jadwal ujian.' });
    }
};


// ==========================================
// 📢 CRUD ANNOUNCEMENTS (Pengumuman)
// ==========================================

const getAnnouncements = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.*, ay.tahun_pelajaran, ay.semester 
            FROM announcements a
            LEFT JOIN academic_years ay ON a.academic_year_id = ay.id
            ORDER BY a.id DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createAnnouncement = async (req, res) => {
    const { tipe, judul, isi, target_class_id, academic_year_id } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO announcements (tipe, judul, isi, target_class_id, academic_year_id) VALUES (?, ?, ?, ?, ?)',
            [tipe, judul, isi, target_class_id || null, academic_year_id]
        );
        res.json({ success: true, message: 'Pengumuman berhasil disebarkan!', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { tipe, judul, isi, target_class_id, academic_year_id } = req.body;
    try {
        await db.query(
            'UPDATE announcements SET tipe = ?, judul = ?, isi = ?, target_class_id = ?, academic_year_id = ? WHERE id = ?',
            [tipe, judul, isi, target_class_id || null, academic_year_id, id]
        );
        res.json({ success: true, message: 'Pengumuman berhasil diupdate!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM announcements WHERE id = ?', [id]);
        res.json({ success: true, message: 'Pengumuman ditarik/dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 🏆 CRUD EKSTRAKURIKULER
// ==========================================

const getExtracurriculars = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM extracurriculars ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createExtracurricular = async (req, res) => {
    const { nama_ekskul, pembina } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO extracurriculars (nama_ekskul, pembina) VALUES (?, ?)',
            [nama_ekskul, pembina || null]
        );
        res.json({ success: true, message: 'Ekstrakurikuler berhasil ditambahkan!', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateExtracurricular = async (req, res) => {
    const { id } = req.params;
    const { nama_ekskul, pembina } = req.body;
    try {
        await db.query(
            'UPDATE extracurriculars SET nama_ekskul = ?, pembina = ? WHERE id = ?',
            [nama_ekskul, pembina || null, id]
        );
        res.json({ success: true, message: 'Ekstrakurikuler berhasil diupdate!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteExtracurricular = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM extracurriculars WHERE id = ?', [id]);
        res.json({ success: true, message: 'Ekstrakurikuler berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// --- FITUR WALI KELAS ---

// 1. Ambil daftar guru untuk dropdown
const getTeachers = async (req, res) => {
    try {
        // Ambil staff yang jabatannya Guru atau sesuai role di sistem Mas Brow
        const [data] = await db.query("SELECT id, nama_lengkap FROM users_staff ORDER BY nama_lengkap ASC");
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Simpan atau Update Wali Kelas
// 2. Simpan atau Update Wali Kelas
const assignHomeroomTeacher = async (req, res) => {
    // TAMBAHAN: Tangkap academic_year_id dari req.body
    const { class_id, teacher_id, academic_year_id } = req.body; 

    try {
        // Cek jika academic_year_id kosong dari frontend
        if (!academic_year_id) {
            return res.status(400).json({ success: false, message: "Tahun Ajaran Aktif tidak ditemukan, pastikan sudah di-setting!" });
        }

        // Cek apakah kelas ini di TAHUN AJARAN INI sudah punya wali kelas
        const [existing] = await db.query(
            "SELECT id FROM homeroom_teachers WHERE class_id = ? AND academic_year_id = ?", 
            [class_id, academic_year_id]
        );

        if (existing.length > 0) {
            // Jika sudah ada, UPDATE teacher_id nya saja
            await db.query(
                "UPDATE homeroom_teachers SET teacher_id = ? WHERE class_id = ? AND academic_year_id = ?", 
                [teacher_id, class_id, academic_year_id]
            );
        } else {
            // Jika belum ada, INSERT baru lengkap dengan academic_year_id
            await db.query(
                "INSERT INTO homeroom_teachers (class_id, teacher_id, academic_year_id) VALUES (?, ?, ?)", 
                [class_id, teacher_id, academic_year_id]
            );
        }

        res.json({ success: true, message: "Wali kelas berhasil ditugaskan!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getClasses, createClass, deleteClass,
    getSubjects, createSubject, deleteSubject, updateClass, updateSubject,
    getAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear,
    getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, 
    getExtracurriculars, createExtracurricular, updateExtracurricular, deleteExtracurricular,
    getTeachers, assignHomeroomTeacher, getExamTypes, createExamType, updateExamType, deleteExamType
};