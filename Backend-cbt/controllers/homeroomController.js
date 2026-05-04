const db = require('../config/db'); 

// ==========================================
// 🧑‍🏫 GET DATA KEWALIAN (ABSENSI & CATATAN)
// ==========================================
const getHomeroomData = async (req, res) => {
    // Wali kelas memilih kelasnya dan tahun ajaran
    const { class_id, academic_year_id } = req.query;

    try {
        // Tarik data siswa beserta data absensi & catatan jika sudah pernah diinput
        const query = `
            SELECT 
                s.id AS siswa_id, 
                s.nis, 
                s.nama AS nama_siswa,
                h.sakit,
                h.izin,
                h.alpa,
                h.catatan_wali_kelas
            FROM users_siswa s
            LEFT JOIN homeroom_records h 
                ON s.id = h.siswa_id 
                AND h.academic_year_id = ?
            WHERE s.class_id = ?
            ORDER BY s.nama ASC
        `;
        
        const [rows] = await db.query(query, [academic_year_id, class_id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 💾 SIMPAN DATA KEWALIAN (BULK UPSERT)
// ==========================================
const saveHomeroomData = async (req, res) => {
    const { class_id, academic_year_id, homeroom_data } = req.body;

    try {
        // homeroom_data adalah array of objects dari frontend
        const values = homeroom_data.map(data => [
            data.siswa_id,
            class_id,
            academic_year_id,
            data.sakit || 0,
            data.izin || 0,
            data.alpa || 0,
            data.catatan_wali_kelas || ''
        ]);

        const query = `
            INSERT INTO homeroom_records
            (siswa_id, class_id, academic_year_id, sakit, izin, alpa, catatan_wali_kelas)
            VALUES ?
            ON DUPLICATE KEY UPDATE
            sakit = VALUES(sakit),
            izin = VALUES(izin),
            alpa = VALUES(alpa),
            catatan_wali_kelas = VALUES(catatan_wali_kelas)
        `;

        await db.query(query, [values]);

        res.json({ success: true, message: 'Data absensi & catatan berhasil disimpan!' });
    } catch (error) {
        console.error('Error Save Homeroom Data:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan data kewalian: ' + error.message });
    }
};

// ==========================================
// 📊 GET DATA LEGER / DKN (UNTUK WALI KELAS)
// ==========================================
const getLegerData = async (req, res) => {
    const { class_id, academic_year_id } = req.query;

    try {
        // 1. Ambil daftar siswa di kelas tersebut dari users_siswa
        const [students] = await db.query(
            'SELECT id AS siswa_id, nis, nama AS nama_siswa FROM users_siswa WHERE class_id = ? ORDER BY nama ASC',
            [class_id]
        );

        // 2. Ambil SEMUA nilai raport dari SEMUA mapel untuk kelas ini
        // Catatan: Pastikan tabel mapel Mas Brow bernama 'subjects' dan kolom namanya 'nama_mapel'
        // Jika nama kolomnya cuma 'nama', silakan ganti sub.nama_mapel menjadi sub.nama
        const [grades] = await db.query(`
            SELECT g.siswa_id, g.nilai_raport, sub.nama_mapel
            FROM student_grades g
            JOIN subjects sub ON g.subject_id = sub.id
            WHERE g.class_id = ? AND g.academic_year_id = ?
        `, [class_id, academic_year_id]);

        // 3. Ambil data absensi dari tabel homeroom_records
        const [homeroom] = await db.query(
            'SELECT siswa_id, sakit, izin, alpa FROM homeroom_records WHERE class_id = ? AND academic_year_id = ?',
            [class_id, academic_year_id]
        );

        // 4. Racik Datanya (Gabungkan Siswa + Nilai + Absensi)
        const legerData = students.map(student => {
            // Cari nilai milik siswa ini
            const studentGrades = grades.filter(g => g.siswa_id === student.siswa_id);
            // Cari absensi milik siswa ini
            const absensi = homeroom.find(h => h.siswa_id === student.siswa_id) || { sakit: 0, izin: 0, alpa: 0 };

            let total_nilai = 0;
            let mapel_nilai = {}; // Objek untuk menyimpan { "PAI": 80, "Matematika": 85 }

            studentGrades.forEach(g => {
                mapel_nilai[g.nama_mapel] = g.nilai_raport || 0;
                total_nilai += Number(g.nilai_raport || 0);
            });

            // Hitung rata-rata
            const rata_rata = studentGrades.length > 0 ? (total_nilai / studentGrades.length).toFixed(2) : 0;

            return {
                ...student,
                nilai: mapel_nilai,
                total_nilai,
                rata_rata: Number(rata_rata),
                absensi
            };
        });

        // 5. Hitung Ranking otomatis berdasarkan Total Nilai
        legerData.sort((a, b) => b.total_nilai - a.total_nilai); // Urutkan dari nilai tertinggi
        legerData.forEach((item, index) => {
            item.ranking = index + 1; // Beri nomor ranking
        });

        // 6. Kembalikan urutan berdasarkan Abjad Nama agar rapi saat ditampilkan di tabel
        legerData.sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));

        res.json({ success: true, data: legerData });

    } catch (error) {
        console.error('Error Get Leger:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// ==========================================
// 🏀 GET MASTER DATA EKSTRAKURIKULER
// ==========================================
const getExtracurricularList = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, nama_ekskul, pembina FROM extracurriculars ORDER BY nama_ekskul ASC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 🏅 GET DATA EKSKUL SISWA (WALI KELAS)
// ==========================================
const getStudentExtracurriculars = async (req, res) => {
    const { class_id, academic_year_id } = req.query;

    try {
        const query = `
            SELECT 
                se.id AS student_ekskul_id,
                s.id AS siswa_id,
                s.nama AS nama_siswa,
                e.id AS extracurricular_id,
                e.nama_ekskul,
                se.predikat,
                se.keterangan
            FROM users_siswa s
            JOIN homeroom_records h ON s.id = h.siswa_id AND h.academic_year_id = ?
            JOIN student_extracurriculars se ON h.id = se.homeroom_record_id
            JOIN extracurriculars e ON se.extracurricular_id = e.id
            WHERE s.class_id = ?
            ORDER BY s.nama ASC, e.nama_ekskul ASC
        `;
        
        const [rows] = await db.query(query, [academic_year_id, class_id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 💾 SIMPAN DATA EKSKUL SISWA (BULK UPSERT)
// ==========================================
const saveStudentExtracurriculars = async (req, res) => {
    // ekskul_data berisi array object: [{ siswa_id, extracurricular_id, predikat, keterangan }]
    const { class_id, academic_year_id, ekskul_data } = req.body;

    try {
        if (!ekskul_data || ekskul_data.length === 0) {
            return res.json({ success: true, message: 'Tidak ada data ekskul yang disimpan.' });
        }

        // 1. Ambil/Pastikan homeroom_record_id untuk tiap siswa_id sudah ada
        const [homeroomRecords] = await db.query(
            'SELECT id, siswa_id FROM homeroom_records WHERE class_id = ? AND academic_year_id = ?',
            [class_id, academic_year_id]
        );

        // Buat mapping siswa_id -> homeroom_record_id agar mudah dicari
        const homeroomMap = {};
        homeroomRecords.forEach(record => {
            homeroomMap[record.siswa_id] = record.id;
        });

        // 2. Siapkan data untuk di-insert
        const values = [];
        for (const data of ekskul_data) {
            let hr_id = homeroomMap[data.siswa_id];

            // Jaga-jaga kalau Wali Kelas belum pernah save Absensi (jadi homeroom_record belum ada), 
            // kita buatkan record kosong agar punya homeroom_record_id.
            if (!hr_id) {
                const [insertHR] = await db.query(
                    'INSERT INTO homeroom_records (siswa_id, class_id, academic_year_id, sakit, izin, alpa) VALUES (?, ?, ?, 0, 0, 0)',
                    [data.siswa_id, class_id, academic_year_id]
                );
                hr_id = insertHR.insertId;
                homeroomMap[data.siswa_id] = hr_id; // Simpan di map biar gak insert 2 kali
            }

            values.push([
                hr_id,
                data.extracurricular_id,
                data.predikat || '',
                data.keterangan || ''
            ]);
        }

        // 3. Eksekusi Bulk Upsert ke student_extracurriculars
        const query = `
            INSERT INTO student_extracurriculars 
            (homeroom_record_id, extracurricular_id, predikat, keterangan)
            VALUES ?
            ON DUPLICATE KEY UPDATE
            predikat = VALUES(predikat),
            keterangan = VALUES(keterangan)
        `;

        await db.query(query, [values]);

        res.json({ success: true, message: 'Data Ekstrakurikuler berhasil disimpan!' });
    } catch (error) {
        console.error('Error Save Ekskul:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan ekskul: ' + error.message });
    }
};

module.exports = {
    getHomeroomData,
    saveHomeroomData,
    getLegerData,
    getExtracurricularList,          
    getStudentExtracurriculars,      
    saveStudentExtracurriculars      
};