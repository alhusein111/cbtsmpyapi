const db = require('../config/db');

// ==========================================
// ⚙️ KKM SETTINGS (CRUD LENGKAP)
// ==========================================

// 1. READ: Ambil KKM berdasarkan Tahun Ajaran
const getKkmSettings = async (req, res) => {
    const { academic_year_id } = req.query;
    try {
        const [rows] = await db.query(
            'SELECT id, grade_level, kkm_value, academic_year_id FROM kkm_settings WHERE academic_year_id = ? ORDER BY grade_level ASC',
            [academic_year_id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. CREATE & BULK UPDATE (Upsert untuk nyimpan dari form sekaligus)
const saveKkmSetting = async (req, res) => {
    // Tangkap data satu per satu sesuai form modal kamu
    const { grade_level, kkm_value, academic_year_id } = req.body; 
    try {
        // Cek apakah data KKM untuk kelas dan tahun ajaran tersebut sudah ada
        const [existing] = await db.query(
            'SELECT id FROM kkm_settings WHERE grade_level = ? AND academic_year_id = ?', 
            [grade_level, academic_year_id]
        );

        if (existing.length > 0) {
            // Update jika sudah ada
            await db.query('UPDATE kkm_settings SET kkm_value = ? WHERE id = ?', [kkm_value, existing[0].id]);
        } else {
            // Insert jika belum ada
            await db.query('INSERT INTO kkm_settings (grade_level, kkm_value, academic_year_id) VALUES (?, ?, ?)', 
            [grade_level, kkm_value, academic_year_id]);
        }
        
        res.json({ success: true, message: 'Data KKM berhasil disimpan!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. UPDATE: Update KKM satuan (Opsional, jika UI kamu butuh edit per baris)
const updateKkmSetting = async (req, res) => {
    const { id } = req.params;
    const { grade_level, kkm_value, academic_year_id } = req.body;
    try {
        await db.query(
            'UPDATE kkm_settings SET grade_level = ?, kkm_value = ?, academic_year_id = ? WHERE id = ?',
            [grade_level, kkm_value, academic_year_id, id]
        );
        res.json({ success: true, message: 'Data KKM berhasil diperbarui!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. DELETE: Hapus KKM satuan
const deleteKkmSetting = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM kkm_settings WHERE id = ?', [id]);
        res.json({ success: true, message: 'Data KKM berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 📅 TANGGAL PEMBAGIAN RAPOR (CRUD)
// ==========================================

const getReportDates = async (req, res) => {
    const { academic_year_id } = req.query;
    try {
        const [rows] = await db.query(
            'SELECT * FROM report_distribution_dates WHERE academic_year_id = ? ORDER BY semester, tanggal_pembagian ASC',
            [academic_year_id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Di dalam settingsController.js

const saveReportDate = async (req, res) => {
    // HAPUS semester dari req.body, karena frontend tidak ngirim
    const { academic_year_id, tipe_ujian, tanggal_pembagian } = req.body;
    
    try {
        // 👇 TAMBAHAN: Kita cari tahu semester berapa berdasarkan academic_year_id
        const [yearData] = await db.query('SELECT semester FROM academic_years WHERE id = ?', [academic_year_id]);
        
        if (yearData.length === 0) {
            return res.status(404).json({ success: false, message: 'Tahun Ajaran tidak ditemukan' });
        }
        
        const semester = yearData[0].semester; // Dapet deh semesternya (1 atau 2)

        // Baru kita insert ke database
        await db.query(
            'INSERT INTO report_distribution_dates (academic_year_id, semester, tipe_ujian, tanggal_pembagian) VALUES (?, ?, ?, ?)',
            [academic_year_id, semester, tipe_ujian, tanggal_pembagian]
        );
        res.json({ success: true, message: 'Tanggal pembagian rapor berhasil ditambahkan!' });
    } catch (error) {
        console.error(error); // Biar gampang nge-track kalau ada error lagi
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateReportDate = async (req, res) => {
    const { id } = req.params;
    const { semester, tipe_ujian, tanggal_pembagian } = req.body;
    try {
        await db.query(
            'UPDATE report_distribution_dates SET semester = ?, tipe_ujian = ?, tanggal_pembagian = ? WHERE id = ?',
            [semester, tipe_ujian, tanggal_pembagian, id]
        );
        res.json({ success: true, message: 'Tanggal pembagian rapor diperbarui!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteReportDate = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM report_distribution_dates WHERE id = ?', [id]);
        res.json({ success: true, message: 'Tanggal pembagian rapor dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



// ==========================================
// 🧑‍🏫 GET & SAVE SETTING WALI KELAS
// ==========================================
const getHomeroomTeachers = async (req, res) => {
    const { academic_year_id } = req.query;
    try {
        let query = `
            SELECT ht.id, ht.class_id, c.nama_kelas, ht.teacher_id, t.nama AS nama_guru
            FROM homeroom_teachers ht
            JOIN classes c ON ht.class_id = c.id
            JOIN users_guru t ON ht.teacher_id = t.id
        `;
        let params = [];

        // Filter berdasarkan tahun ajaran aktif jika dikirim dari frontend
        if (academic_year_id) {
            query += ' WHERE ht.academic_year_id = ?';
            params.push(academic_year_id);
        }

        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const saveHomeroomTeacher = async (req, res) => {
    try {
        const { class_id, teacher_id, academic_year_id } = req.body;

        if (!academic_year_id) {
            return res.status(400).json({ success: false, message: 'Tahun Ajaran Aktif belum disetting!' });
        }

        // Cek apakah kelas ini di TAHUN AJARAN INI sudah punya wali kelas
        const [existing] = await db.query(
            'SELECT id FROM homeroom_teachers WHERE class_id = ? AND academic_year_id = ?',
            [class_id, academic_year_id]
        );

        if (existing.length > 0) {
            // Kalau sudah ada, UPDATE teacher_id nya saja
            await db.query(
                'UPDATE homeroom_teachers SET teacher_id = ? WHERE id = ?',
                [teacher_id, existing[0].id]
            );
        } else {
            // Kalau belum ada, INSERT baru
            await db.query(
                'INSERT INTO homeroom_teachers (class_id, teacher_id, academic_year_id) VALUES (?, ?, ?)',
                [class_id, teacher_id, academic_year_id]
            );
        }

        res.json({ success: true, message: 'Wali kelas berhasil disimpan!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 🏫 GET & SAVE PENGATURAN GLOBAL SEKOLAH
// ==========================================

const getGlobalSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });

        const [yearRows] = await db.query('SELECT id, tahun_pelajaran, semester FROM academic_years WHERE is_active = 1 LIMIT 1');
        
        const activeYearText = yearRows.length > 0 
            ? `${yearRows[0].tahun_pelajaran} (Semester ${yearRows[0].semester})` 
            : 'Belum ada tahun ajaran aktif';
            
        const activeYearId = yearRows.length > 0 ? yearRows[0].id : null;

        res.json({ 
            success: true, 
            data: settings, 
            activeYear: activeYearText,
            activeYearId: activeYearId 
        });
    } catch (error) {
        console.error("Error di getGlobalSettings:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const saveGlobalSettings = async (req, res) => {
    try {
        const { nama_sekolah, alamat_sekolah, kepala_sekolah_nama, kepala_sekolah_nip } = req.body;
        
        const updates = {
            nama_sekolah,
            alamat_sekolah,
            kepala_sekolah_nama,
            kepala_sekolah_nip
        };

        if (req.file) {
            updates.logo_sekolah = req.file.filename; 
        }

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                await db.query(
                    `INSERT INTO settings (setting_key, setting_value) 
                     VALUES (?, ?) 
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [key, value]
                );
            }
        }

        res.json({ success: true, message: 'Pengaturan Global berhasil disimpan!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getKkmSettings,
    saveKkmSetting,
    updateKkmSetting,
    deleteKkmSetting,
    getHomeroomTeachers,
    saveHomeroomTeacher,
    getGlobalSettings,
    saveGlobalSettings, 
    getReportDates, 
    saveReportDate, 
    updateReportDate, 
    deleteReportDate
};