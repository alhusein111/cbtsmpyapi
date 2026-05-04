const db = require('../config/db');

const getDashboardSiswa = async (req, res) => {
    const siswaId = req.user.id;
    const connection = await db.getConnection();

    try {
        // 1. Ambil data class_id siswa
        const [siswaData] = await connection.query('SELECT class_id FROM users_siswa WHERE id = ?', [siswaId]);
        if (siswaData.length === 0) return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });

        const classId = siswaData[0].class_id;

        // 2. Ambil Tahun Ajaran Aktif
        const [tahunAjaranData] = await connection.query('SELECT id FROM academic_years WHERE is_active = 1 LIMIT 1');
        const activeAcademicYearId = tahunAjaranData.length > 0 ? tahunAjaranData[0].id : null;

        // 3. Query Sapu Jagat (Jadwal Ujian Aktif Hari Ini)
        const query = `
            SELECT 
                e.id, e.kelas_peserta, e.academic_year_id,
                s.nama_mapel, et.nama_ujian,
                e.tanggal_ujian, e.waktu_mulai, e.waktu_selesai, e.durasi, e.min_work_time,
                COALESCE(se.status, 'Belum Mulai') AS status_pengerjaan
            FROM exams e
            LEFT JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN exam_types et ON e.exam_type_id = et.id
            LEFT JOIN student_exams se ON e.id = se.exam_id AND se.siswa_id = ?
            WHERE e.is_active = 1 
              AND DATE(e.tanggal_ujian) = CURDATE()
            ORDER BY e.waktu_mulai ASC
        `;
        
        const [semuaUjianHariIni] = await connection.query(query, [siswaId]);

        // 4. Filter Manual
        const jadwalValid = semuaUjianHariIni.filter(ujian => {
            if (ujian.academic_year_id !== activeAcademicYearId) return false;
            try {
                let kelasPeserta = typeof ujian.kelas_peserta === 'string' ? JSON.parse(ujian.kelas_peserta) : ujian.kelas_peserta;
                const isKelasCocok = kelasPeserta.some(k => String(k) === String(classId));
                if (!isKelasCocok) return false;
            } catch (err) {
                return false;
            }
            return true;
        });

        // 5. TAMBAHAN BARU: Query Riwayat Ujian (Selesai & Terkunci)
        const queryRiwayat = `
            SELECT 
                se.id AS log_id,
                s.nama_mapel AS subject,
                et.nama_ujian AS type,
                se.waktu_selesai_pengerjaan AS date,
                se.status
            FROM student_exams se
            JOIN exams e ON se.exam_id = e.id
            LEFT JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN exam_types et ON e.exam_type_id = et.id
            WHERE se.siswa_id = ? AND se.status IN ('Selesai', 'Terkunci')
            ORDER BY se.waktu_selesai_pengerjaan DESC
            LIMIT 10
        `;
        const [riwayatUjian] = await connection.query(queryRiwayat, [siswaId]);

        // 6. Kirim respon gabungan (jadwal_aktif dan riwayat_ujian)
        res.json({
            success: true,
            message: 'Data dashboard berhasil dimuat.',
            data: {
                jadwal_aktif: jadwalValid,
                riwayat_ujian: riwayatUjian
            }
        });

    } catch (error) {
        console.error('❌ Error Get Dashboard:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    } finally {
        connection.release();
    }
};

module.exports = { getDashboardSiswa };