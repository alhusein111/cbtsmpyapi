// file: controllers/nilaiController.js
const db = require('../config/db');
const { generateDeskripsiKurmer } = require('../utils/generateDeskripsi'); // Panggil Otaknya!

const simpanNilaiGuru = async (req, res) => {
    // Data yang dikirim dari Frontend saat guru klik tombol "Simpan Nilai"
    const { siswa_id, subject_id, class_id, academic_year_id, nilai_raport, array_tp } = req.body;

    try {
        // 1. Cari tahu KKM untuk kelas siswa ini terlebih dahulu
        const [classData] = await db.query('SELECT tingkat AS grade_level FROM classes WHERE id = ?', [class_id]);
        const grade_level = classData.length > 0 ? classData[0].grade_level : '7';

        const [kkmData] = await db.query(
            'SELECT kkm_value FROM kkm_settings WHERE grade_level = ? AND academic_year_id = ?',
            [grade_level, academic_year_id]
        );
        const kkm = kkmData.length > 0 ? kkmData[0].kkm_value : 70; // Tarik KKM dari database

        // 2. GENERATE DESKRIPSI OTOMATIS! ✨
        // Masukkan Nilai, Array TP dari Guru, dan KKM ke dalam "Otak" yang kita buat tadi
        const deskripsi_otomatis = generateDeskripsiKurmer(nilai_raport, array_tp, kkm);

        // 3. Simpan Nilai & Deskripsi ke Database
        const query = `
            INSERT INTO student_grades 
            (siswa_id, subject_id, class_id, academic_year_id, nilai_raport, deskripsi_pengetahuan)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            nilai_raport = VALUES(nilai_raport),
            deskripsi_pengetahuan = VALUES(deskripsi_pengetahuan)
        `;
        
        await db.query(query, [siswa_id, subject_id, class_id, academic_year_id, nilai_raport, deskripsi_otomatis]);

        res.json({ 
            success: true, 
            message: 'Nilai berhasil disimpan!',
            kkm_yang_dipakai: kkm,
            hasil_deskripsi: deskripsi_otomatis // Dikirim balik supaya Frontend bisa lihat hasil kalimatnya
        });

    } catch (error) {
        console.error('Error Simpan Nilai:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { simpanNilaiGuru };