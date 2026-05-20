const db = require('../config/db');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const tambahSoal = async (req, res) => {
    const connection = await db.getConnection();
    try {
        console.log('Isi Body:', req.body);
        console.log('Isi Files:', req.files); 
        
        await connection.beginTransaction();

        const { subject_id, tipe_soal, teks_soal, bobot } = req.body;
        
        let gambarPath = null;
        if (req.files && Array.isArray(req.files)) {
            const fileSoal = req.files.find(f => f.fieldname === 'gambar_soal');
            if (fileSoal) {
                gambarPath = `/uploads/soal/${fileSoal.filename}`;
            }
        } else if (req.file) { 
            gambarPath = `/uploads/soal/${req.file.filename}`;
        }

        const [resultSoal] = await connection.query(
            `INSERT INTO questions (subject_id, tipe_soal, teks_soal, gambar_soal, bobot) 
             VALUES (?, ?, ?, ?, ?)`,
            [subject_id, tipe_soal, teks_soal, gambarPath, bobot || 1]
        );
        const questionId = resultSoal.insertId;

        const tipe = tipe_soal.toUpperCase();

        if (tipe === 'PG' || tipe === 'BS') {
            if (req.body.opsi_jawaban) {
                const opsiList = JSON.parse(req.body.opsi_jawaban);
                
                for (let i = 0; i < opsiList.length; i++) {
                    const opsi = opsiList[i];
                    let gambarOpsiPath = null;

                    if (req.files && Array.isArray(req.files)) {
                        const fileOpsi = req.files.find(f => f.fieldname === `gambar_opsi_${i}`);
                        if (fileOpsi) {
                            gambarOpsiPath = `/uploads/soal/${fileOpsi.filename}`;
                        }
                    }

                    await connection.query(
                        `INSERT INTO question_options (question_id, teks_opsi, gambar_opsi, is_correct) 
                         VALUES (?, ?, ?, ?)`,
                        [questionId, opsi.teks_opsi, gambarOpsiPath, opsi.is_correct]
                    );
                }
            }

        } else if (tipe === 'MJ') {
            if (req.body.matchings) {
                const matchingList = JSON.parse(req.body.matchings);
                
                for (let i = 0; i < matchingList.length; i++) {
                    const match = matchingList[i];
                    let gambarKiriPath = null;
                    let gambarKananPath = null;

                    if (req.files && Array.isArray(req.files)) {
                        const fileKiri = req.files.find(f => f.fieldname === `gambar_kiri_${i}`);
                        if (fileKiri) gambarKiriPath = `/uploads/soal/${fileKiri.filename}`;
                        
                        const fileKanan = req.files.find(f => f.fieldname === `gambar_kanan_${i}`);
                        if (fileKanan) gambarKananPath = `/uploads/soal/${fileKanan.filename}`;
                    }

                    // 🔥 PERBAIKAN: Gunakan '|| null' agar jika string kosong (""), disimpan sebagai NULL di DB
                    await connection.query(
                        `INSERT INTO question_matchings (question_id, kunci_kiri, kunci_kanan, gambar_kiri, gambar_kanan) 
                        VALUES (?, ?, ?, ?, ?)`,
                        [questionId, match.kunci_kiri || null, match.kunci_kanan || null, gambarKiriPath, gambarKananPath]
                    );
                }
            }
        }

        await connection.commit();
        res.status(201).json({ 
            success: true, 
            message: 'Soal berhasil ditambahkan!',
            data: { question_id: questionId, gambar: gambarPath }
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error Tambah Soal:', error);
        res.status(500).json({ success: false, message: error.message || 'Gagal menambahkan soal.' });
    } finally {
        connection.release();
    }
};

const updateSoal = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { subject_id, tipe_soal, teks_soal, bobot } = req.body;

        let gambarPath = req.body.gambar_lama || null; 
        if (req.files && Array.isArray(req.files)) {
            const fileSoal = req.files.find(f => f.fieldname === 'gambar_soal');
            if (fileSoal) {
                gambarPath = `/uploads/soal/${fileSoal.filename}`;
            }
        }

        await connection.query(
            `UPDATE questions SET subject_id = ?, tipe_soal = ?, teks_soal = ?, gambar_soal = ?, bobot = ? WHERE id = ?`,
            [subject_id, tipe_soal, teks_soal, gambarPath, bobot || 1, id]
        );

        const tipe = tipe_soal.toUpperCase();

        await connection.query('DELETE FROM question_options WHERE question_id = ?', [id]);
        await connection.query('DELETE FROM question_matchings WHERE question_id = ?', [id]);

        if (tipe === 'PG' || tipe === 'BS') {
            if (req.body.opsi_jawaban) {
                const opsiList = JSON.parse(req.body.opsi_jawaban);
                for (let i = 0; i < opsiList.length; i++) {
                    const opsi = opsiList[i];
                    let gambarOpsiPath = opsi.gambar_opsi || opsi.gambar_lama || null; 

                    if (req.files && Array.isArray(req.files)) {
                        const fileOpsi = req.files.find(f => f.fieldname === `gambar_opsi_${i}`);
                        if (fileOpsi) {
                            gambarOpsiPath = `/uploads/soal/${fileOpsi.filename}`;
                        }
                    }

                    await connection.query(
                        `INSERT INTO question_options (question_id, teks_opsi, gambar_opsi, is_correct) VALUES (?, ?, ?, ?)`,
                        [id, opsi.teks_opsi, gambarOpsiPath, opsi.is_correct]
                    );
                }
            }
            
        } else if (tipe === 'MJ') {
            if (req.body.matchings) {
                const matchingList = JSON.parse(req.body.matchings);
                
                for (let i = 0; i < matchingList.length; i++) {
                    const match = matchingList[i];
                    
                    let gambarKiriPath = match.gambar_kiri || null;
                    let gambarKananPath = match.gambar_kanan || null;

                    if (req.files && Array.isArray(req.files)) {
                        const fileKiri = req.files.find(f => f.fieldname === `gambar_kiri_${i}`);
                        if (fileKiri) gambarKiriPath = `/uploads/soal/${fileKiri.filename}`;
                        
                        const fileKanan = req.files.find(f => f.fieldname === `gambar_kanan_${i}`);
                        if (fileKanan) gambarKananPath = `/uploads/soal/${fileKanan.filename}`;
                    }

                    // 🔥 PERBAIKAN: Gunakan '|| null' juga di sini saat update/insert ulang data matching
                    await connection.query(
                        `INSERT INTO question_matchings (question_id, kunci_kiri, kunci_kanan, gambar_kiri, gambar_kanan) 
                        VALUES (?, ?, ?, ?, ?)`,
                        [id, match.kunci_kiri || null, match.kunci_kanan || null, gambarKiriPath, gambarKananPath]
                    );
                }
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'Soal berhasil diperbarui!' });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error Update Soal:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// [IMPORT] Import Soal Massal via Excel (DIUPDATE BIAR TERIMA examId)
const importSoalExcel = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Mohon upload file Excel.' });

    const userId = req.user ? req.user.id : 'unknown';
    const { examId } = req.params; // 👈 Menangkap parameter dari URL /exams/:examId/questions/import
    const connection = await db.getConnection();
    const filePath = req.file.path;

    try {
        await connection.beginTransaction();

        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const dataSoal = xlsx.utils.sheet_to_json(worksheet);

        let targetSubjectId = null;

        // 1. Jika import dari halaman jadwal ujian (ada examId), otomatis cari Mapel-nya
        if (examId) {
            const [examData] = await connection.query('SELECT subject_id FROM exams WHERE id = ?', [examId]);
            if (examData.length > 0) {
                targetSubjectId = examData[0].subject_id;
            } else {
                throw new Error("Jadwal Ujian tidak ditemukan di database.");
            }
        }

        // 2. Jika tidak ada examId (mungkin fitur import dari halaman lain), fallback cari mapel
        const [mapelDb] = await connection.query('SELECT id, nama_mapel FROM subjects');
        const mapMapel = {};
        mapelDb.forEach(m => {
            mapMapel[m.nama_mapel.toUpperCase()] = m.id;
        });

        for (const row of dataSoal) {
            const namaMapelExcel = row['Mata Pelajaran'];
            
            // 🔥 PRIORITAS: Gunakan subjectId dari Ujian (targetSubjectId). 
            // Kalau kosong, baru cari dari kolom Excel (mapMapel)
            const subject_id = targetSubjectId ? targetSubjectId : (namaMapelExcel ? mapMapel[namaMapelExcel.toString().toUpperCase()] : null);

            const tipe_soal = row['Tipe Soal'] || row.tipe_soal;
            const teks_soal = row['Teks Soal'] || row.teks_soal;
            const bobot = row['Bobot'] || row.bobot || 1;
            const gambar_soal = row['Gambar Soal'] || row.gambar_soal;
            const kunci_jawaban = String(row['Kunci Jawaban'] || row.kunci_jawaban || '');
            const kunci_matching = row['Kunci Menjodohkan'] || row.kunci_matching;

            // Skip jika mapel atau tipe soal tidak valid
            if (!subject_id || !tipe_soal) continue; 

            let pathGambar = null;
            if (gambar_soal) {
                const safeImageName = gambar_soal.toString().replace(/\s+/g, '_');
                pathGambar = `/uploads/soal/user_${userId}/${safeImageName}`;
            }

            const [resSoal] = await connection.query(
                `INSERT INTO questions (subject_id, tipe_soal, teks_soal, bobot, gambar_soal) VALUES (?, ?, ?, ?, ?)`,
                [subject_id, tipe_soal.toUpperCase(), teks_soal, bobot, pathGambar]
            );
            const questionId = resSoal.insertId;
            
            // Logika untuk Pilihan Ganda (PG) atau Benar Salah (BS)
            if (['PG', 'BS'].includes(tipe_soal.toUpperCase())) {
                const opsiData = [
                    { teks: row['Opsi A'], gambar: row['Gambar Opsi A'], abjad: 'A' },
                    { teks: row['Opsi B'], gambar: row['Gambar Opsi B'], abjad: 'B' },
                    { teks: row['Opsi C'], gambar: row['Gambar Opsi C'], abjad: 'C' },
                    { teks: row['Opsi D'], gambar: row['Gambar Opsi D'], abjad: 'D' }
                ];
                
                for (let i = 0; i < opsiData.length; i++) {
                    const opsi = opsiData[i];
                    if (opsi.teks !== undefined || opsi.gambar !== undefined) { 
                        
                        let pathGambarOpsi = null;
                        if (opsi.gambar) {
                            const safeName = opsi.gambar.toString().replace(/\s+/g, '_');
                            pathGambarOpsi = `/uploads/soal/user_${userId}/${safeName}`;
                        }

                        const isCorrect = (opsi.abjad === kunci_jawaban.toUpperCase()) ? 1 : 0;

                        await connection.query(
                            `INSERT INTO question_options (question_id, teks_opsi, is_correct, gambar_opsi) VALUES (?, ?, ?, ?)`,
                            [questionId, opsi.teks || '', isCorrect, pathGambarOpsi]
                        );
                    }
                }
            }
            // Logika untuk Menjodohkan (MJ)
            else if (tipe_soal.toUpperCase() === 'MJ' && kunci_matching) {
                const pairs = kunci_matching.split('|');
                for (const pair of pairs) {
                    const [kiri, kanan] = pair.split(':');
                    if (kiri && kanan) {
                        await connection.query(
                            `INSERT INTO question_matchings (question_id, kunci_kiri, kunci_kanan) VALUES (?, ?, ?)`,
                            [questionId, kiri.trim(), kanan.trim()]
                        );
                    }
                }
            }
        }

        await connection.commit();
        fs.unlinkSync(filePath);

        res.status(200).json({ success: true, message: `Import Soal Berhasil!` });

    } catch (error) {
        await connection.rollback();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
        console.error('❌ Import Excel Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Gagal memproses file Excel.' });
    } finally {
        connection.release();
    }
};

const uploadGambarMassal = (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada gambar yang diunggah.' });
    }

    res.status(200).json({
        success: true,
        message: `${req.files.length} gambar berhasil diunggah!`,
        data: req.files.map(file => file.filename) 
    });
};

const deleteQuestion = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        await connection.beginTransaction();

        await connection.query('DELETE FROM question_options WHERE question_id = ?', [id]);
        await connection.query('DELETE FROM question_matchings WHERE question_id = ?', [id]);
        
        const [result] = await connection.query('DELETE FROM questions WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            throw new Error('Soal tidak ditemukan.');
        }

        await connection.commit();
        res.json({ success: true, message: 'Soal berhasil dihapus!' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

const getQuestionsBySubject = async (req, res) => {
    try {
        const { subject_id } = req.params;
        const [questions] = await db.query('SELECT * FROM questions WHERE subject_id = ?', [subject_id]);
        
        for (let i = 0; i < questions.length; i++) {
            if (questions[i].tipe_soal === 'PG' || questions[i].tipe_soal === 'BS') {
                const [options] = await db.query('SELECT * FROM question_options WHERE question_id = ?', [questions[i].id]);
                questions[i].options = options;
            } else if (questions[i].tipe_soal === 'MJ') {
                const [matchings] = await db.query('SELECT * FROM question_matchings WHERE question_id = ?', [questions[i].id]);
                questions[i].matchings = matchings;
            }
        }

        res.json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getQuestionsByExam = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { examId } = req.params;
        const [exams] = await connection.query('SELECT subject_id FROM exams WHERE id = ?', [examId]);
        
        if (exams.length === 0) {
            return res.status(404).json({ success: false, message: 'Jadwal ujian tidak ditemukan.' });
        }
        
        const subjectId = exams[0].subject_id;
        const [questions] = await connection.query('SELECT * FROM questions WHERE subject_id = ?', [subjectId]);
        
        for (let i = 0; i < questions.length; i++) {
            if (questions[i].tipe_soal === 'PG' || questions[i].tipe_soal === 'BS') {
                const [options] = await connection.query('SELECT * FROM question_options WHERE question_id = ?', [questions[i].id]);
                questions[i].options = options;
            } else if (questions[i].tipe_soal === 'MJ') {
                const [matchings] = await db.query('SELECT * FROM question_matchings WHERE question_id = ?', [questions[i].id]);
                questions[i].matchings = matchings;
            }
        }

        res.json({ success: true, data: questions });
    } catch (error) {
        console.error('❌ Error Fetch Questions by Exam:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        const [questions] = await db.query('SELECT * FROM questions WHERE id = ?', [id]);
        
        if (questions.length === 0) {
            return res.status(404).json({ success: false, message: 'Soal tidak ditemukan.' });
        }

        const question = questions[0];

        if (question.tipe_soal === 'PG' || question.tipe_soal === 'BS') {
            const [options] = await db.query('SELECT * FROM question_options WHERE question_id = ?', [id]);
            question.opsi_jawaban = options; 
            question.options = options; 
        } else if (question.tipe_soal === 'MJ') {
            const [matchings] = await db.query('SELECT * FROM question_matchings WHERE question_id = ?', [id]);
            question.matchings = matchings;
        }

        res.json({ success: true, data: question });
    } catch (error) {
        console.error('❌ Error Get Detail Soal:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    tambahSoal, 
    updateSoal,
    importSoalExcel, 
    uploadGambarMassal, 
    getQuestionById,
    getQuestionsBySubject,
    getQuestionsByExam,
    deleteQuestion        
};