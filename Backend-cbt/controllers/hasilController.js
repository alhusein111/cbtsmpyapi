const db = require('../config/db');

const hasilController = {
    // 1. AMBIL DAFTAR UJIAN
    getDaftarUjian: async (req, res) => {
        try {
            const role = req.user?.role || 'admin'; 
            const userId = req.user?.id || req.user?.userId;
            
            let query = `
                SELECT 
                    e.id, 
                    CONCAT('Ujian ', s.nama_mapel) AS judul,
                    e.tanggal_ujian AS tanggal, 
                    e.durasi,
                    e.kelas_peserta, 
                    et.nama_ujian AS tipe_ujian,
                    ay.id AS academic_year_id,                                           -- ID tahun ajaran untuk value filter
                    CONCAT(ay.tahun_pelajaran, ' - ', ay.semester) AS tahun_ajaran,      -- Label tahun ajaran digabung (contoh: 2025/2026 - Ganjil)
                    s.nama_mapel AS mapel,
                    u.nama_lengkap AS guru, 
                    (SELECT COUNT(*) FROM student_exams WHERE exam_id = e.id) AS total_peserta,
                    (SELECT COUNT(*) FROM student_exams WHERE exam_id = e.id AND status = 'Selesai') AS selesai
                FROM exams e
                JOIN subjects s ON e.subject_id = s.id
                LEFT JOIN users_staff u ON e.guru_id = u.id 
                LEFT JOIN exam_types et ON e.exam_type_id = et.id
                LEFT JOIN academic_years ay ON e.academic_year_id = ay.id                -- Tambahan JOIN ke tabel academic_years
            `;

            const queryParams = [];

            // FILTER: Jika bukan admin, hanya tampilkan ujian milik guru ybs
            if (role !== 'admin' && userId) {
                query += ` WHERE e.guru_id = ?`; 
                queryParams.push(userId);
            }

            query += ` ORDER BY e.tanggal_ujian DESC`; 

            const [rows] = await db.query(query, queryParams);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('🔴 ERROR DB di getDaftarUjian:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil daftar ujian. Cek terminal backend!' });
        }
    },

    // 2. DETAIL HASIL PER KELAS
    getHasilKelas: async (req, res) => {
        const { exam_id } = req.params;

        try {
            // ROMBAK TOTAL: Kita gabungkan query KKM dan Mapel langsung ke dalam satu query utama
            // persis seperti yang dilakukan di getDetailSiswaUjian agar akurat!
            const [hasilRows] = await db.query(`
                SELECT 
                    s.nis,
                    s.id AS siswa_id,
                    s.nama,
                    c.nama_kelas AS kelas,
                    se.id AS student_exam_id,
                    se.nilai_akhir,
                    sub.nama_mapel AS mapel,
                    c.tingkat AS grade_level,
                    COALESCE(ks.kkm_value, 75) AS kkm,
                    (SELECT COUNT(*) FROM student_answers sa WHERE sa.student_exam_id = se.id AND sa.is_correct = 1) AS jumlah_benar,
                    (SELECT COUNT(*) FROM student_answers sa WHERE sa.student_exam_id = se.id AND (sa.is_correct = 0 OR sa.is_correct IS NULL)) AS jumlah_salah,
                    CASE 
                        WHEN se.nilai_akhir >= COALESCE(ks.kkm_value, 75) THEN 'LULUS'
                        ELSE 'REMEDIAL'
                    END AS status
                FROM student_exams se
                JOIN exams ex ON se.exam_id = ex.id
                LEFT JOIN subjects sub ON ex.subject_id = sub.id
                JOIN users_siswa s ON se.siswa_id = s.id
                LEFT JOIN classes c ON s.class_id = c.id
                LEFT JOIN kkm_settings ks ON ks.grade_level = c.tingkat AND ks.academic_year_id = ex.academic_year_id
                WHERE se.exam_id = ? AND se.status = 'Selesai'
                ORDER BY se.nilai_akhir DESC
            `, [exam_id]);

            // Jika belum ada siswa yang selesai ujian
            if (hasilRows.length === 0) {
                return res.json({ 
                    success: true, 
                    data: { statistik: { kkm_digunakan: 75, mapel: '-', rata_rata: 0, lulus: 0, remedial: 0, total_siswa: 0 }, siswa: [] } 
                });
            }

            // Ambil KKM dan Mapel dari baris pertama sebagai representasi laporan
            const KKM = hasilRows[0].kkm;
            const mapel = hasilRows[0].mapel;

            // Kalkulasi Statistik untuk Summary
            const totalSiswa = hasilRows.length;
            const lulusCount = hasilRows.filter(h => h.status === 'LULUS').length;
            const remedialCount = totalSiswa - lulusCount;
            
            let rataRata = 0;
            const totalNilai = hasilRows.reduce((sum, current) => sum + (Number(current.nilai_akhir) || 0), 0);
            rataRata = (totalNilai / totalSiswa).toFixed(2);

            // Tambahkan Ranking Otomatis
            const hasilWithRank = hasilRows.map((item, index) => ({
                ...item,
                kelas: item.kelas || '-',
                rank: index + 1
            }));

            res.json({ 
                success: true, 
                data: {
                    statistik: {
                        kkm_digunakan: KKM,
                        mapel: mapel,
                        kelas_terdeteksi: hasilRows[0].grade_level,
                        total_siswa: totalSiswa,
                        rata_rata: rataRata,
                        lulus: lulusCount,
                        remedial: remedialCount,
                        persentase_lulus: totalSiswa > 0 ? Math.round((lulusCount / totalSiswa) * 100) : 0
                    },
                    siswa: hasilWithRank
                } 
            });

        } catch (error) {
            console.error('🔴 ERROR DETAIL di getHasilKelas:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil data hasil ujian', error: error.message });
        }
    },

    // 🚀 3. DETAIL JAWABAN SISWA (Sudah masuk ke dalam objek hasilController, dipisah pakai koma)
    getDetailSiswaUjian: async (req, res) => {
        const { student_exam_id } = req.params;

        try {
            // 1. Ambil data siswa dan kelasnya
            const [siswaRows] = await db.query(`
                SELECT 
                    s.nis,
                    s.nama,
                    c.nama_kelas,
                    c.tingkat
                FROM student_exams se
                JOIN users_siswa s ON se.siswa_id = s.id
                LEFT JOIN classes c ON s.class_id = c.id
                WHERE se.id = ?
            `, [student_exam_id]);

            if (siswaRows.length === 0) {
                return res.status(404).json({ success: false, message: 'Data detail siswa tidak ditemukan' });
            }

            // 2. Ambil data ringkasan ujian (Nilai akhir, KKM, Jumlah Benar/Salah)
            const [ujianRows] = await db.query(`
                SELECT 
                    sub.nama_mapel AS title,
                    sub.nama_mapel AS mapel,
                    se.nilai_akhir,
                    ks.kkm_value AS kkm,
                    (SELECT COUNT(*) FROM student_answers sa WHERE sa.student_exam_id = se.id AND sa.is_correct = 1) AS jumlah_benar,
                    (SELECT COUNT(*) FROM student_answers sa WHERE sa.student_exam_id = se.id AND (sa.is_correct = 0 OR sa.is_correct IS NULL)) AS jumlah_salah
                FROM student_exams se
                JOIN exams ex ON se.exam_id = ex.id
                LEFT JOIN subjects sub ON ex.subject_id = sub.id 
                JOIN users_siswa s ON se.siswa_id = s.id
                LEFT JOIN classes c ON s.class_id = c.id
                LEFT JOIN kkm_settings ks ON ks.grade_level = c.tingkat AND ks.academic_year_id = ex.academic_year_id
                WHERE se.id = ?
            `, [student_exam_id]);
            
            // Berikan nilai default 75 jika KKM di database tidak ditemukan/null
            if (ujianRows[0] && !ujianRows[0].kkm) {
                ujianRows[0].kkm = 75;
            }

            // 3. Ambil lembar jawaban siswa (untuk kotak-kotak nomor soal)
            const [jawabanRows] = await db.query(`
                SELECT 
                    question_id,
                    opsi_id AS student_answer,
                    is_correct
                FROM student_answers
                WHERE student_exam_id = ?
                ORDER BY nomor_urut ASC
            `, [student_exam_id]);

            // 4. Lempar data dalam format JSON yang match dengan frontend
            res.json({
                success: true,
                data: {
                    siswa: siswaRows[0],
                    ujian: ujianRows[0],
                    jawaban: jawabanRows
                }
            });

            

        } catch (error) {
            console.error('🔴 ERROR di getDetailSiswaUjian:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil detail jawaban siswa', error: error.message });
        }
    },

    // 🚀 4. RESET UJIAN SISWA
    resetUjianSiswa: async (req, res) => {
        const { student_exam_id } = req.params;
        
        try {
            // 1. Hapus semua coretan jawaban siswa di kertas buram (tabel student_answers)
            await db.query(`DELETE FROM student_answers WHERE student_exam_id = ?`, [student_exam_id]);
            
            // 2. Hapus lembar ujian utamanya (tabel student_exams)
            await db.query(`DELETE FROM student_exams WHERE id = ?`, [student_exam_id]);

            res.json({ success: true, message: 'Ujian siswa berhasil direset. Siswa bisa ujian kembali!' });
        } catch (error) {
            console.error('🔴 ERROR di resetUjianSiswa:', error);
            res.status(500).json({ success: false, message: 'Gagal mereset ujian siswa', error: error.message });
        }
    }
    
};

// Ekspor objek utamanya langsung
module.exports = hasilController;