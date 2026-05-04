const { getDashboardStats } = require('../utils/statsHelper');
const db = require('../config/db');
// 1. IMPORT LOGGER DI SINI
const { insertExamLog } = require('../utils/logger'); 

// Fungsi khusus untuk mengacak array (Fisher-Yates Shuffle)
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const mulaiUjian = async (req, res) => {
    const { exam_id } = req.body;
    const siswaId = req.user.id;

    if (!exam_id) {
        return res.status(400).json({ success: false, message: 'ID Ujian tidak ditemukan di Body!' });
    }

    const connection = await db.getConnection();

    try {
        const [siswaData] = await connection.query(`
            SELECT us.class_id, us.nama AS nama_siswa, us.nis, us.no_peserta, c.nama_kelas 
            FROM users_siswa us
            LEFT JOIN classes c ON CAST(us.class_id AS CHAR) = CAST(c.id AS CHAR)
            WHERE us.id = ?
        `, [siswaId]);
        
        if (siswaData.length === 0) throw new Error("Data siswa tidak ditemukan.");
        
        const siswa = siswaData[0];
        const classIdParam = JSON.stringify(siswa.class_id); 

        const [examData] = await connection.query(`
            SELECT e.id, e.subject_id, e.durasi, e.min_work_time,
                   et.nama_ujian AS jenis_ujian, s.nama_mapel
            FROM exams e
            LEFT JOIN exam_types et ON e.exam_type_id = et.id
            LEFT JOIN subjects s ON e.subject_id = s.id
            WHERE e.id = ? AND e.is_active = 1 AND JSON_CONTAINS(e.kelas_peserta, ?)
        `, [exam_id, classIdParam]);

        if (examData.length === 0) {
            return res.status(404).json({ success: false, message: 'Ujian tidak aktif, ID salah, atau Anda bukan peserta ujian ini!' });
        }

        const exam = examData[0];
        const subjectId = exam.subject_id;

        const headerInfo = {
            jenis_ujian: exam.jenis_ujian,
            nama_mapel: exam.nama_mapel,
            nama_siswa: siswa.nama_siswa,
            nis: siswa.nis,
            no_peserta: siswa.no_peserta,
            kelas: siswa.nama_kelas,
            durasi: exam.durasi,
            min_work_time: exam.min_work_time
        };

        const [existing] = await connection.query(
            'SELECT id, status, waktu_mulai_pengerjaan FROM student_exams WHERE siswa_id = ? AND exam_id = ?',
            [siswaId, exam_id]
        );

        if (existing.length > 0) {
            if (['Selesai', 'Terkunci'].includes(existing[0].status)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Anda tidak dapat masuk. Status ujian Anda saat ini: ${existing[0].status}` 
                });
            }
            
            const waktuMulaiDB = new Date(existing[0].waktu_mulai_pengerjaan);
            const waktuSekarang = new Date();
            const selisihDetik = Math.floor((waktuSekarang - waktuMulaiDB) / 1000); 
            const durasiTotalDetik = exam.durasi * 60;
            
            let sisaWaktu = durasiTotalDetik - selisihDetik;
            if (sisaWaktu < 0) sisaWaktu = 0;

            // LOGGER: Melanjutkan Ujian
            await insertExamLog(siswaId, exam_id, 'EXAM_RESUME', 'Siswa kembali masuk (melanjutkan) pengerjaan ujian');

            return res.json({ 
                success: true, 
                message: 'Melanjutkan ujian...', 
                data: { 
                    student_exam_id: existing[0].id,
                    sisa_waktu: sisaWaktu, 
                    ...headerInfo 
                } 
            });
        }

        await connection.beginTransaction();

        const [resHeader] = await connection.query(
            `INSERT INTO student_exams (siswa_id, exam_id, status, waktu_mulai_pengerjaan) 
             VALUES (?, ?, 'Mengerjakan', NOW())`,
            [siswaId, exam_id]
        );
        
        const newId = resHeader.insertId;
        
        const [questions] = await connection.query(
            'SELECT id FROM questions WHERE subject_id = ?',
            [subjectId]
        );

        if (questions.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Bank soal untuk mapel ini masih kosong!' });
        }

        const shuffled = shuffleArray(questions);
        const values = shuffled.map((q, i) => [newId, q.id, i + 1]);

        await connection.query(
            'INSERT INTO student_answers (student_exam_id, question_id, nomor_urut) VALUES ?',
            [values]
        );

        await connection.commit();
        
        // LOGGER: Mulai Ujian Baru
        await insertExamLog(siswaId, exam_id, 'EXAM_START', 'Siswa memulai pengerjaan ujian');

        return res.json({ 
            success: true, 
            message: 'Ujian berhasil dimulai',
            data: { 
                student_exam_id: newId,
                sisa_waktu: exam.durasi * 60, 
                ...headerInfo 
            } 
        });

    } catch (error) {
        if (connection && connection.rollback) await connection.rollback();
        console.error('❌ ERROR FATAL MULAI UJIAN:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

const getSoalByNomor = async (req, res) => {
    // (Kode ini dibiarkan sama seperti aslinya, tidak butuh log per soal agar DB tidak penuh)
    const { student_exam_id, nomor_urut } = req.params;
    const siswaId = req.user.id;
    const connection = await db.getConnection();

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000'; 
    const fixImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
    };

    try {
        const [examSession] = await connection.query(
            `SELECT se.status, e.is_active 
             FROM student_exams se
             JOIN exams e ON se.exam_id = e.id
             WHERE se.id = ? AND se.siswa_id = ?`,
            [student_exam_id, siswaId]
        );

        if (examSession.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak! Sesi ujian tidak valid.' });
        }
        if (examSession[0].is_active === 0) {
            return res.status(403).json({ success: false, message: 'Ujian telah dinonaktifkan oleh Admin.' });
        }
        if (examSession[0].status !== 'Mengerjakan') {
            return res.status(403).json({ success: false, message: `Tidak dapat memuat soal. Status ujian: ${examSession[0].status}` });
        }

        const [answerData] = await connection.query(
            'SELECT question_id, opsi_id, jawaban_matching, is_doubt FROM student_answers WHERE student_exam_id = ? AND nomor_urut = ?',
            [student_exam_id, nomor_urut]
        );

        if (answerData.length === 0) {
            return res.status(404).json({ success: false, message: 'Nomor soal tidak ditemukan!' });
        }

        const { question_id, opsi_id: jawaban_pg, jawaban_matching, is_doubt } = answerData[0];

        const [questionData] = await connection.query(
            'SELECT id, teks_soal, gambar_soal, tipe_soal FROM questions WHERE id = ?',
            [question_id]
        );

        if (questionData.length === 0) {
            return res.status(404).json({ success: false, message: 'Data soal induk tidak ditemukan!' });
        }

        const soal = questionData[0];
        let pilihan = [];

        if (soal.tipe_soal === 'MJ') {
            const [matchingData] = await connection.query(
                'SELECT id, kunci_kiri, kunci_kanan FROM question_matchings WHERE question_id = ?',
                [question_id]
            );
            pilihan = matchingData; 
        } else {
            const [optionsData] = await connection.query(
                'SELECT id, teks_opsi, gambar_opsi FROM question_options WHERE question_id = ?',
                [question_id]
            );
            
            const formattedOptions = optionsData.map(opt => ({
                ...opt,
                gambar_opsi: fixImageUrl(opt.gambar_opsi)
            }));

            pilihan = shuffleArray(formattedOptions); 
        }

        let parsedJawabanMatching = null;
        if (soal.tipe_soal === 'MJ' && jawaban_matching) {
            try {
                parsedJawabanMatching = typeof jawaban_matching === 'string' ? JSON.parse(jawaban_matching) : jawaban_matching;
            } catch (e) {
                parsedJawabanMatching = jawaban_matching;
            }
        }

        res.json({
            success: true,
            data: {
                nomor_urut: parseInt(nomor_urut),
                tipe_soal: soal.tipe_soal,
                soal: {
                    id: soal.id,
                    teks_soal: soal.teks_soal,
                    gambar_soal: fixImageUrl(soal.gambar_soal)
                },
                pilihan: pilihan,
                jawaban_tersimpan: {
                    opsi_id: jawaban_pg || null,
                    jawaban_matching: parsedJawabanMatching || null
                },
                ragu_ragu: is_doubt === 1
            }
        });

    } catch (error) {
        console.error('❌ Error Ambil Soal:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memuat soal.' });
    } finally {
        if (connection) connection.release();
    }
};

const saveJawaban = async (req, res) => {
    // (Kode ini dibiarkan sama seperti aslinya, tidak butuh log per simpan jawaban)
    const siswaId = req.user.id;
    const { student_exam_id, question_id, opsi_id, jawaban_matching, is_doubt } = req.body;

    if (!student_exam_id || !question_id) {
        return res.status(400).json({ success: false, message: 'ID Ujian dan ID Soal wajib dikirim!' });
    }

    const connection = await db.getConnection();

    try {
        const [examSession] = await connection.query(
            `SELECT se.status, e.is_active 
             FROM student_exams se
             JOIN exams e ON se.exam_id = e.id
             WHERE se.id = ? AND se.siswa_id = ?`,
            [student_exam_id, siswaId]
        );

        if (examSession.length === 0) return res.status(403).json({ success: false, message: 'Akses ditolak! Sesi ujian tidak valid.' });
        if (examSession[0].is_active === 0) return res.status(403).json({ success: false, message: 'Ujian dinonaktifkan Admin. Jawaban tidak dapat disimpan!' });
        if (examSession[0].status !== 'Mengerjakan') return res.status(403).json({ success: false, message: 'Ujian sudah selesai/terkunci!' });

        await connection.beginTransaction();

        const doubtValue = (is_doubt === true || is_doubt === 'true' || is_doubt === 1) ? 1 : 0;
        let finalMatching = null;
        if (jawaban_matching) {
            finalMatching = typeof jawaban_matching === 'object' ? JSON.stringify(jawaban_matching) : jawaban_matching;
        }
        
        await connection.query(
            `UPDATE student_answers SET opsi_id = ?, jawaban_matching = ?, is_doubt = ? WHERE student_exam_id = ? AND question_id = ?`,
            [opsi_id || null, finalMatching, doubtValue, student_exam_id, question_id]
        );

        await connection.query(
            `UPDATE student_exams SET last_question_id = ? WHERE id = ?`,
            [question_id, student_exam_id]
        );

        await connection.commit();

        res.json({ 
            success: true, 
            message: 'Jawaban berhasil disimpan otomatis.',
            data: { student_exam_id, question_id, is_doubt: doubtValue }
        });

    } catch (error) {
        if (connection && connection.rollback) await connection.rollback();
        res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menyimpan jawaban.' });
    } finally {
        if (connection) connection.release();
    }
};

const getNavigasiSoal = async (req, res) => {
    // (Kode ini dibiarkan sama seperti aslinya)
    const { student_exam_id } = req.params;
    const siswaId = req.user.id;
    const connection = await db.getConnection();

    try {
        const [examSession] = await connection.query(
            'SELECT status, last_question_id FROM student_exams WHERE id = ? AND siswa_id = ?',
            [student_exam_id, siswaId]
        );

        if (examSession.length === 0) return res.status(403).json({ success: false, message: 'Akses ditolak! Sesi ujian tidak valid.' });

        const [answers] = await connection.query(
            `SELECT question_id, nomor_urut, opsi_id, jawaban_matching, is_doubt 
             FROM student_answers WHERE student_exam_id = ? ORDER BY nomor_urut ASC`,
            [student_exam_id]
        );

        const petaSoal = answers.map(ans => {
            let isAnswered = false;
            if (ans.opsi_id !== null || (ans.jawaban_matching !== null && ans.jawaban_matching !== '[]' && ans.jawaban_matching !== '')) {
                isAnswered = true;
            }
            return {
                nomor_urut: ans.nomor_urut,
                question_id: ans.question_id,
                sudah_dijawab: isAnswered,
                ragu_ragu: ans.is_doubt === 1
            };
        });

        res.json({
            success: true,
            data: {
                student_exam_id: parseInt(student_exam_id),
                last_question_id: examSession[0].last_question_id,
                peta_soal: petaSoal
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Terjadi kesalahan memuat peta soal.' });
    } finally {
        if (connection) connection.release();
    }
};

// ============================================================================
// HELPER: TARIK DATA DASHBOARD TERBARU UNTUK DIKIRIM VIA SOCKET
// ============================================================================
const getUpdatedDashboardData = async (connection) => {
    try {
        // ✅ Cukup panggil Helper, terus lempar kembaliannya! Mantap!
        const dashboardData = await getDashboardStats(connection);
        return dashboardData; 
    } catch (error) {
        console.error("❌ Gagal menarik data socket:", error);
        return null;
    }
};

// ============================================================================
// FUNGSI: SELESAI UJIAN
// ============================================================================
const selesaiUjian = async (req, res) => {
    const { student_exam_id, token_keluar_input, keterangan } = req.body; 
    const siswaId = req.user.id;
    const connection = await db.getConnection();

    try {
        if (token_keluar_input !== 'FORCE_SUBMIT') {
            if (!token_keluar_input) {
                return res.status(400).json({ success: false, message: 'Token keluar wajib diisi!' });
            }

            const [sysToken] = await connection.query('SELECT token_keluar FROM system_tokens WHERE id = 1');
            if (sysToken.length === 0) {
                return res.status(500).json({ success: false, message: 'Sistem token belum dikonfigurasi.' });
            }
            
            if (token_keluar_input.toUpperCase() !== sysToken[0].token_keluar.toUpperCase()) {
                return res.status(400).json({ success: false, message: 'Token keluar salah atau sudah kedaluwarsa!' });
            }
        }

        const [examSession] = await connection.query(
            `SELECT se.*, e.min_work_time 
             FROM student_exams se JOIN exams e ON se.exam_id = e.id
             WHERE se.id = ? AND se.siswa_id = ?`,
            [student_exam_id, siswaId]
        );

        if (examSession.length === 0) return res.status(404).json({ success: false, message: 'Sesi ujian tidak ditemukan.' });
        if (examSession[0].status === 'Selesai') return res.status(400).json({ success: false, message: 'Ujian ini sudah diselesaikan.' });

        const minWorkTime = examSession[0].min_work_time || 0; 
        const waktuMulaiSiswa = new Date(examSession[0].waktu_mulai_pengerjaan); 
        const waktuSekarang = new Date();
        const selisihMenit = (waktuSekarang - waktuMulaiSiswa) / (1000 * 60);

        if (token_keluar_input !== 'FORCE_SUBMIT' && minWorkTime > 0 && selisihMenit < minWorkTime) {
            const sisaWaktu = Math.ceil(minWorkTime - selisihMenit); 
            return res.status(403).json({ 
                success: false, 
                message: `Minimal waktu pengerjaan ${minWorkTime} menit. Tunggu ${sisaWaktu} menit lagi.` 
            });
        }

        await connection.beginTransaction();

        const [dataPenilaian] = await connection.query(`
            SELECT sa.id AS answer_id, sa.question_id, sa.opsi_id AS jawaban_siswa_pg, sa.jawaban_matching AS jawaban_siswa_mj,
                   q.tipe_soal AS question_type, q.bobot
            FROM student_answers sa JOIN questions q ON sa.question_id = q.id
            WHERE sa.student_exam_id = ?
        `, [student_exam_id]);

        let totalPoinSiswa = 0, totalPoinMaksimal = 0;

        for (const item of dataPenilaian) {
            let poinSoal = 0;
            const bobot = item.bobot || 1; 
            totalPoinMaksimal += bobot;
            const type = item.question_type ? item.question_type.toLowerCase() : '';

            if (type === 'pg' || type === 'bs' || type === 'pilihan_ganda' || type === 'benar_salah') {
                const [kunciPG] = await connection.query(
                    'SELECT id FROM question_options WHERE question_id = ? AND is_correct = 1 LIMIT 1', 
                    [item.question_id]
                );
                
                const kunciBenar = kunciPG.length > 0 ? kunciPG[0].id : null;
                if (item.jawaban_siswa_pg == kunciBenar && kunciBenar !== null) {
                    poinSoal = bobot;
                }
            } 
            else if (type === 'mj' || type === 'menjodohkan' || type === 'matching') {
                const [kunciMJ] = await connection.query(
                    'SELECT kunci_kiri, kunci_kanan FROM question_matchings WHERE question_id = ?', 
                    [item.question_id]
                );
                
                try {
                    const kunciArray = kunciMJ.map(k => {
                        const strip = (str) => str ? String(str).replace(/<[^>]*>?/gm, '').trim() : '';
                        return `${strip(k.kunci_kiri)}:${strip(k.kunci_kanan)}`;
                    });
                    
                    const jawabanSiswaStr = item.jawaban_siswa_mj ? String(item.jawaban_siswa_mj) : '';
                    if (jawabanSiswaStr) {
                        const jawabSiswaArray = jawabanSiswaStr.split('|').map(j => j.trim());

                        if (kunciArray.length > 0 && jawabSiswaArray.length > 0) {
                            let benar = 0;
                            jawabSiswaArray.forEach(j => { 
                                if (kunciArray.includes(j)) benar++; 
                            });
                            poinSoal = (benar / kunciArray.length) * bobot; 
                        }
                    }
                } catch (e) { 
                    console.error("Format jawaban matching salah:", e);
                    poinSoal = 0; 
                }
            }

            const isCorrect = poinSoal === bobot ? 1 : 0;
            await connection.query('UPDATE student_answers SET is_correct = ?, score = ? WHERE id = ?', [isCorrect, poinSoal, item.answer_id]);
            totalPoinSiswa += poinSoal;
        }

        let nilaiAkhir = totalPoinMaksimal > 0 ? (totalPoinSiswa / totalPoinMaksimal) * 100 : 0;
        const receiptCode = 'RCP-' + Date.now() + Math.floor(Math.random() * 1000);

        await connection.query(
            `UPDATE student_exams SET status = 'Selesai', waktu_selesai_pengerjaan = NOW(), nilai_akhir = ?, receipt_code = ? WHERE id = ?`,
            [nilaiAkhir.toFixed(2), receiptCode, student_exam_id]
        );

        await connection.commit();

        // LOGGER: Selesai Ujian
        const defaultKeterangan = token_keluar_input === 'FORCE_SUBMIT' ? 'Waktu Habis / Force Submit' : 'Selesai Normal';
        await insertExamLog(siswaId, examSession[0].exam_id, 'EXAM_FINISH', keterangan || defaultKeterangan);

        // ===============================================================
        // 📡 SOCKET.IO TRIGGER: UPDATE DASHBOARD & SILENT UPDATE 
        // ===============================================================
        const io = req.app.get('io');
        if (io) {
            const dashboardData = await getUpdatedDashboardData(connection);
            if (dashboardData) {
                // Emit massal buat komponen yg masih pakai format lama
                io.emit('dashboard:update', dashboardData);
                
                // Emit SILENT UPDATE (Spesifik per komponen di LiveMonitoring.jsx)
                io.emit('stats:update', dashboardData.stats);
                
                // Silent update card siswa jadi "Selesai"
                io.emit('peserta:update', {
                    id: siswaId.toString(),
                    status: 'Selesai',
                    progress: 100,
                    sisaWaktu: '-'
                });

                // Cari nama siswa dulu ke database (Asumsi menggunakan 'db.query' dan tabel 'users_siswa')
                const [siswa] = await db.query('SELECT nama FROM users_siswa WHERE id = ?', [siswaId]);
                const namaSiswa = siswa.length > 0 ? siswa[0].nama : `Siswa (ID: ${siswaId})`;

                // Tambah log aktivitas siswa selesai
                const timeNow = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
                io.emit('log:new', {
                    id: Date.now(),
                    type: 'success',
                    text: `${namaSiswa} telah menyelesaikan ujian.`,
                    time: timeNow
                });
            }
        }

        res.json({
            success: true,
            data: { nilai_akhir: nilaiAkhir.toFixed(2), receipt_code: receiptCode }
        });

    } catch (error) {
        if (connection && connection.rollback) await connection.rollback();
        console.error("Error submit ujian:", error);
        res.status(500).json({ success: false, message: 'Gagal menyelesaikan ujian.' });
    } finally {
        if (connection) connection.release();
    }
};

// ============================================================================
// FUNGSI: KUNCI SESI UJIAN (PELANGGARAN)
// ============================================================================
const lockSesiUjian = async (req, res) => {
    const { student_exam_id } = req.body;
    const siswaId = req.user.id;
    const connection = await db.getConnection();

    try {
        const [examSession] = await connection.query(
            'SELECT exam_id, status FROM student_exams WHERE id = ? AND siswa_id = ?',
            [student_exam_id, siswaId]
        );

        if (examSession.length === 0) {
            return res.status(404).json({ success: false, message: 'Sesi ujian tidak ditemukan.' });
        }

        if (examSession[0].status === 'Mengerjakan') {
            await connection.query(
                `UPDATE student_exams SET status = 'Terkunci' WHERE id = ?`,
                [student_exam_id]
            );

            // LOGGER: Pelanggaran (Kunci Ujian)
            await insertExamLog(
                siswaId, 
                examSession[0].exam_id, 
                'VIOLATION_BLUR', 
                'Sistem mengunci ujian karena siswa terdeteksi berpindah tab atau keluar fullscreen.'
            );

            // ===============================================================
            // 📡 SOCKET.IO TRIGGER: UPDATE DASHBOARD ADMIN (PELANGGARAN)
            // ===============================================================
            const io = req.app.get('io');
            if (io) {
                const dashboardData = await getUpdatedDashboardData(connection);
                if (dashboardData) {
                    io.emit('dashboard:update', dashboardData);
                    io.emit('stats:update', dashboardData.stats); // Silent update angka pelanggaran

                    // Silent update card siswa jadi "Terputus" (Terkunci)
                    io.emit('peserta:update', {
                        id: siswaId.toString(),
                        status: 'Terputus' 
                    });

                    // Cari nama siswa dulu ke database
                    const [siswaTarget] = await db.query('SELECT nama FROM users_siswa WHERE id = ?', [siswaId]);
                    const namaPelanggar = siswaTarget.length > 0 ? siswaTarget[0].nama : `Siswa (ID: ${siswaId})`;

                    // Trigger alert log pelanggaran
                    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
                    io.emit('log:new', {
                        id: Date.now(),
                        type: 'error',
                        text: `Pelanggaran: Sistem mengunci ujian ${namaPelanggar} karena berpindah tab atau keluar fullscreen.`,
                        time: timeNow
                    });
                }
            }
        }

        res.json({ success: true, message: 'Sesi ujian telah dikunci karena pelanggaran.' });

    } catch (error) {
        console.error('❌ Error Kunci Ujian:', error);
        res.status(500).json({ success: false, message: 'Gagal mengunci ujian.' });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { mulaiUjian, getSoalByNomor, saveJawaban, getNavigasiSoal, selesaiUjian, lockSesiUjian };