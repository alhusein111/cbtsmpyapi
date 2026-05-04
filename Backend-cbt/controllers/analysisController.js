const db = require('../config/db');

const generateAnalysis = async (req, res) => {
    const { exam_id, class_id } = req.body;
    const teacher_id = req.user.id;

    try {
        // 1. Ambil nilai siswa (HANYA DARI KELAS YANG DIPILIH), urutkan dari Tertinggi ke Terendah
        // PERUBAHAN: Menambahkan JOIN ke users_siswa untuk memfilter class_id
        const [studentExams] = await db.query(
            `SELECT se.id AS student_exam_id, se.siswa_id, se.nilai_akhir 
             FROM student_exams se
             JOIN users_siswa s ON se.siswa_id = s.id
             WHERE se.exam_id = ? AND se.status = 'Selesai' AND s.class_id = ?
             ORDER BY se.nilai_akhir DESC`,
            [exam_id, class_id]
        );

        const totalSiswa = studentExams.length;
        if (totalSiswa === 0) {
            return res.status(400).json({ success: false, message: 'Belum ada siswa dari kelas ini yang selesai ujian.' });
        }

        // --- MENGHITUNG MEAN (Mt) & STANDAR DEVIASI (St) KELAS ---
        const totalNilaiKelas = studentExams.reduce((sum, s) => sum + s.nilai_akhir, 0);
        const meanTotal = totalNilaiKelas / totalSiswa; // Mt

        let sumSquaredDiffs = 0;
        const studentScoreMap = {}; // Untuk pencarian cepat nilai siswa
        studentExams.forEach(s => {
            sumSquaredDiffs += Math.pow(s.nilai_akhir - meanTotal, 2);
            studentScoreMap[s.student_exam_id] = s.nilai_akhir;
        });

        const variansTotal = sumSquaredDiffs / totalSiswa; // S^2_t
        const standarDeviasiTotal = Math.sqrt(variansTotal); // S_t

        // 3. Tentukan Kelompok Atas (27%) dan Bawah (27%)
        const persentase = 0.27;
        const jumlahKelompok = Math.max(1, Math.round(totalSiswa * persentase));

        const kelompokAtasIds = studentExams.slice(0, jumlahKelompok).map(s => s.student_exam_id);
        const kelompokBawahIds = studentExams.slice(-jumlahKelompok).map(s => s.student_exam_id);

        // 4. Tarik SEMUA data jawaban siswa di ujian ini (Khusus siswa yang sudah difilter di atas)
        const [allAnswers] = await db.query(
            `SELECT question_id, student_exam_id, opsi_id, is_correct 
             FROM student_answers 
             WHERE student_exam_id IN (?)`,
            [studentExams.map(s => s.student_exam_id)]
        );

        // 5. Kelompokkan dan Olah Data Mentah
        const groupedByQuestion = {};
        allAnswers.forEach(ans => {
            if (!groupedByQuestion[ans.question_id]) {
                groupedByQuestion[ans.question_id] = {
                    totalBenar: 0,
                    benarAtas: 0,
                    benarBawah: 0,
                    sumScoreBenar: 0, // Untuk Mp (Mean anak yang jawab benar)
                    pengecoh: {}      // Untuk analisis pengecoh
                };
            }
            
            const q = groupedByQuestion[ans.question_id];
            
            if (ans.is_correct === 1) {
                q.totalBenar += 1;
                q.sumScoreBenar += studentScoreMap[ans.student_exam_id]; // Tambahkan nilai anak ini
                if (kelompokAtasIds.includes(ans.student_exam_id)) q.benarAtas += 1;
                if (kelompokBawahIds.includes(ans.student_exam_id)) q.benarBawah += 1;
            } else {
                // Mencatat data pengecoh (Opsi yang salah)
                if (ans.opsi_id) {
                    if (!q.pengecoh[ans.opsi_id]) {
                        q.pengecoh[ans.opsi_id] = { total: 0, atas: 0, bawah: 0 };
                    }
                    q.pengecoh[ans.opsi_id].total += 1;
                    if (kelompokAtasIds.includes(ans.student_exam_id)) q.pengecoh[ans.opsi_id].atas += 1;
                    if (kelompokBawahIds.includes(ans.student_exam_id)) q.pengecoh[ans.opsi_id].bawah += 1;
                }
            }
        });

        // 6. PROSES RUMUS STATISTIK PER SOAL & RELIABILITAS
        const hasilAnalisisSoal = [];
        let nomorUrut = 1;
        let sumPQ = 0; // Untuk hitung KR-20 (Reliabilitas)
        const totalSoal = Object.keys(groupedByQuestion).length; // K

        for (const [questionId, data] of Object.entries(groupedByQuestion)) {
            // A. TINGKAT KESUKARAN (P)
            const p = data.totalBenar / totalSiswa;
            const q_val = 1 - p;
            sumPQ += (p * q_val); // Akumulasi untuk rumus KR-20

            let kategoriKesukaran = 'Sedang';
            if (p < 0.30) kategoriKesukaran = 'Sukar';
            if (p > 0.70) kategoriKesukaran = 'Mudah';

            // B. DAYA PEMBEDA (D)
            const proporsiAtas = data.benarAtas / jumlahKelompok;
            const proporsiBawah = data.benarBawah / jumlahKelompok;
            const dayaPembeda = proporsiAtas - proporsiBawah;
            
            let kategoriDayaPembeda = 'Jelek';
            if (dayaPembeda >= 0.40) kategoriDayaPembeda = 'Sangat Baik';
            else if (dayaPembeda >= 0.30) kategoriDayaPembeda = 'Baik';
            else if (dayaPembeda >= 0.20) kategoriDayaPembeda = 'Cukup';
            else if (dayaPembeda <= 0) kategoriDayaPembeda = 'Dibuang/Revisi Total';

            // C. VALIDITAS (Point Biserial)
            let meanP = data.totalBenar > 0 ? (data.sumScoreBenar / data.totalBenar) : 0;
            let validitas = 0;
            if (standarDeviasiTotal > 0 && q_val > 0 && p > 0) {
                validitas = ((meanP - meanTotal) / standarDeviasiTotal) * Math.sqrt(p / q_val);
            }
            const statusValiditas = validitas >= 0.30 ? 'Valid' : 'Tidak Valid';

            // D. ANALISIS PENGECOH
            const evaluasiPengecoh = {};
            for (const [opsiId, stat] of Object.entries(data.pengecoh)) {
                const persentasePilih = (stat.total / totalSiswa) * 100;
                let statusPengecoh = 'Berfungsi';

                if (persentasePilih < 5) {
                    statusPengecoh = 'Tidak Berfungsi (< 5% siswa memilih)';
                } else if (stat.atas >= stat.bawah) {
                    statusPengecoh = 'Tidak Berfungsi (Lebih banyak mengecoh kelompok atas)';
                }

                evaluasiPengecoh[opsiId] = {
                    total_pilih: stat.total,
                    persentase: persentasePilih.toFixed(2) + '%',
                    status: statusPengecoh
                };
            }

            hasilAnalisisSoal.push({
                nomor_soal: nomorUrut++,
                question_id: parseInt(questionId),
                kesukaran: { indeks: p.toFixed(2), kategori: kategoriKesukaran },
                daya_pembeda: { indeks: dayaPembeda.toFixed(2), kategori: kategoriDayaPembeda },
                validitas: { r_pbi: validitas.toFixed(2), status: statusValiditas },
                pengecoh: evaluasiPengecoh
            });
        }

        // 7. RELIABILITAS UJIAN (KR-20)
        let reliabilitasKR20 = 0;
        if (totalSoal > 1 && variansTotal > 0) {
            reliabilitasKR20 = (totalSoal / (totalSoal - 1)) * (1 - (sumPQ / variansTotal));
        }

        let kategoriReliabilitas = 'Sangat Rendah';
        if (reliabilitasKR20 >= 0.80) kategoriReliabilitas = 'Sangat Tinggi (Konsisten)';
        else if (reliabilitasKR20 >= 0.60) kategoriReliabilitas = 'Tinggi';
        else if (reliabilitasKR20 >= 0.40) kategoriReliabilitas = 'Sedang';
        else if (reliabilitasKR20 >= 0.20) kategoriReliabilitas = 'Rendah';

        // 8. BUNGKUS KE DALAM JSON
        const finalReportJSON = {
            statistik_kelas: {
                total_siswa: totalSiswa,
                rata_rata_nilai: meanTotal.toFixed(2),
                standar_deviasi: standarDeviasiTotal.toFixed(2),
                reliabilitas_ujian: {
                    kr_20: reliabilitasKR20.toFixed(2),
                    kategori: kategoriReliabilitas
                }
            },
            butir_soal: hasilAnalisisSoal
        };

        // 9. SIMPAN KE DATABASE (UPSERT)
        await db.query(`
            INSERT INTO exam_analysis_reports (exam_id, teacher_id, class_id, analysis_data, last_processed)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            analysis_data = VALUES(analysis_data), last_processed = NOW()
        `, [exam_id, teacher_id, class_id, JSON.stringify(finalReportJSON)]);

        res.json({
            success: true,
            message: 'Analisis Lengkap per kelas berhasil dihitung!',
            data: finalReportJSON
        });

    } catch (error) {
        console.error('❌ Error Hitung Analisis:', error);
        res.status(500).json({ success: false, message: 'Gagal memproses analisis butir soal.' });
    }
};

module.exports = { generateAnalysis };