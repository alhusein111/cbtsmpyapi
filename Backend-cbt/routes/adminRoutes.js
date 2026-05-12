const { getDashboardStats } = require('../utils/statsHelper');
const db = require('../config/db'); 
const express = require('express');
const router = express.Router();

// ==========================================
// 1. IMPORT CONTROLLERS & DB
// ==========================================
const adminCtrl = require('../controllers/adminExamController');
const analysisCtrl = require('../controllers/analysisController');
const monitoringController = require('../controllers/monitoringController');

// ==========================================
// 2. IMPORT MIDDLEWARE (SATPAM)
// ==========================================
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

const hasilController = require('../controllers/hasilController');

// ==========================================
// 3. RUTE SEBELUM SATPAM GLOBAL
// ==========================================
router.post('/exams/analysis', analysisCtrl.generateAnalysis);

// ==========================================
// 4. PASANG SATPAM GLOBAL DI SINI
// ==========================================
router.use(verifyToken, checkRole('admin', 'guru')); 

// ---------------------------------------------------------
// Semua rute di bawah ini AMAN dan HANYA BISA DIAKSES oleh Admin/Guru
// ---------------------------------------------------------

router.get('/dashboard', adminCtrl.getDashboardAdmin);
router.post('/exams/reset-siswa', adminCtrl.resetSiswaUjian);
router.post('/peserta/reset-login', adminCtrl.resetLoginDevice);

// Endpoint Log Siswa
router.get('/monitoring/log/:exam_id/:siswa_id', checkRole('admin'), monitoringController.getSiswaLogs);

// ✅ [DATA REAL] ENDPOINT UNTUK LIVE MONITORING
router.get('/monitoring', async (req, res) => {
    try {
        // ✅ 1. AMBIL STATISTIK DARI HELPER
        const dashboardData = await getDashboardStats(db);

        // ==============================================================
        // 2. AMBIL DATA PESERTA (Perbaikan Progress 100% & Waktu)
        // ==============================================================
        const [pesertaRows] = await db.query(`
            SELECT 
                s.nis AS id, 
                s.id AS siswa_id,
                se.id AS student_exam_id, 
                s.nama, 
                CASE 
                    WHEN se.status = 'Terkunci' THEN 'Terkunci'
                    WHEN se.status = 'Selesai' THEN 'Selesai'
                    WHEN se.status = 'Mengerjakan' THEN 'Mengerjakan'
                    WHEN se.status = 'Login' OR s.is_login = 1 THEN 'Login'
                    ELSE 'Belum Login'
                END as status,
                
                -- Hitung Total Terjawab
                IFNULL((SELECT COUNT(id) FROM student_answers WHERE student_exam_id = se.id AND (opsi_id IS NOT NULL OR jawaban_matching IS NOT NULL)), 0) AS terjawab, 
                
                -- ✅ FIX 1: Total soal BUKAN DARI BANK SOAL, tapi dari jumlah kertas jawaban siswa yang ter-generate!
                IFNULL((SELECT COUNT(id) FROM student_answers WHERE student_exam_id = se.id), 1) AS total_soal,
                
                -- ✅ FIX 2: Progress fleksibel menghitung: (Terjawab / Total Soal Siswa) * 100
                -- Dikali 100.0 agar SQL tidak membulatkan desimal menjadi 0 sebelum dihitung
                IFNULL(ROUND(
                    (
                        (SELECT COUNT(id) FROM student_answers WHERE student_exam_id = se.id AND (opsi_id IS NOT NULL OR jawaban_matching IS NOT NULL)) 
                        * 100.0
                    ) 
                    / 
                    NULLIF((SELECT COUNT(id) FROM student_answers WHERE student_exam_id = se.id), 0)
                ), 0) AS progress,

                -- Hitung Lama Pengerjaan (Selisih Waktu Selesai - Waktu Mulai)
                CASE 
                    WHEN se.status = 'Selesai' AND se.waktu_selesai_pengerjaan IS NOT NULL 
                    THEN TIME_FORMAT(TIMEDIFF(se.waktu_selesai_pengerjaan, se.waktu_mulai_pengerjaan), '%H:%i:%s')
                    ELSE NULL 
                END AS lama_pengerjaan,

                -- Hitung Sisa Waktu Detik
                CASE 
                    WHEN se.status IN ('Mengerjakan', 'Login', 'Terkunci') AND se.waktu_mulai_pengerjaan IS NOT NULL THEN
                        GREATEST(0, (e.durasi * 60) - TIMESTAMPDIFF(SECOND, se.waktu_mulai_pengerjaan, NOW()))
                    ELSE 0
                END AS sisa_waktu_detik

            FROM users_siswa s
            LEFT JOIN student_exams se ON s.id = se.siswa_id
            LEFT JOIN exams e ON se.exam_id = e.id -- Join ke exams untuk ambil durasi
            WHERE s.is_login = 1 OR se.id IS NOT NULL
            ORDER BY se.waktu_mulai_pengerjaan DESC, s.nama ASC
        `);

        // ==============================================================
        // 3. AMBIL LOG AKTIVITAS (Tetap sama, tidak ada yang dirubah)
        // ==============================================================
        const [logRows] = await db.query(`
            SELECT 
                el.id, 
                CASE 
                    WHEN el.event = 'EXAM_FINISH' THEN 'success'
                    WHEN el.event = 'VIOLATION_BLUR' THEN 'error'
                    WHEN el.event = 'APP_LOGIN' THEN 'start'
                    WHEN el.event = 'APP_LOGOUT' THEN 'warning'
                    ELSE 'info'
                END AS type, 
                
                -- CONCAT: Gabungkan Nama Siswa dengan isi Log
                CONCAT(IFNULL(s.nama, 'Sistem'), ' ', LOWER(el.detail)) AS text, 
                
                DATE_FORMAT(el.created_at, '%H:%i') AS time 
            FROM exam_logs el
            LEFT JOIN users_siswa s ON el.siswa_id = s.id 
            ORDER BY el.created_at DESC 
            LIMIT 20
        `);

        const trafficData = [10, 20, 45, 80, 95, 60, 30, 15, 5];

        // Helper ubah detik ke format Jam:Menit:Detik
        const formatSisaWaktu = (seconds) => {
            if (seconds <= 0) return "00:00:00";
            const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
        };

        const pesertaFormatted = pesertaRows.map(p => ({
            ...p,
            sisaWaktu: formatSisaWaktu(p.sisa_waktu_detik)
        }));

        res.status(200).json({
            success: true,
            data: {
                stats: dashboardData.stats, 
                peserta: pesertaFormatted,
                logs: logRows,
                traffic: trafficData
            }
        });

    } catch (error) {
        console.error('Error fetch live monitoring:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data database' });
    }
});

// Endpoint untuk mengambil token
router.get('/tokens', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT token_masuk, token_keluar FROM system_tokens WHERE id = 1');
        
        if (rows.length > 0) {
            res.json({
                token_masuk: rows[0].token_masuk,
                token_keluar: rows[0].token_keluar
            });
        } else {
            res.status(404).json({ message: 'Token belum di-generate oleh sistem' });
        }
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});


// ✅ ENDPOINT: REKAP HASIL UJIAN PER KELAS
router.get('/hasil/kelas/:exam_id', async (req, res) => {
    const { exam_id } = req.params;
    // Asumsi batas KKM / Lulus adalah 75
    const KKM = 75; 

    try {
        const [hasilRows] = await db.query(`
            SELECT 
                s.nis,
                s.id AS siswa_id,
                s.nama,
                se.id AS student_exam_id,
                se.nilai_akhir,
                CASE 
                    WHEN se.nilai_akhir >= ? THEN 'LULUS'
                    ELSE 'REMEDIAL'
                END AS status
            FROM student_exams se
            JOIN users_siswa s ON se.siswa_id = s.id
            WHERE se.exam_id = ? AND se.status = 'Selesai'
            ORDER BY se.nilai_akhir DESC
        `, [KKM, exam_id]);

        // Kalkulasi Statistik Cepat di Backend
        const totalSiswa = hasilRows.length;
        const lulusCount = hasilRows.filter(h => h.status === 'LULUS').length;
        const remedialCount = totalSiswa - lulusCount;
        
        let rataRata = 0;
        if (totalSiswa > 0) {
            const totalNilai = hasilRows.reduce((sum, current) => sum + (current.nilai_akhir || 0), 0);
            rataRata = (totalNilai / totalSiswa).toFixed(2);
        }

        // Tambahkan Ranking secara dinamis berdasarkan urutan array (karena sudah di-ORDER BY nilai_akhir DESC)
        const hasilWithRank = hasilRows.map((item, index) => ({
            ...item,
            rank: index + 1
        }));

        res.status(200).json({
            success: true,
            data: {
                statistik: {
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
        console.error('Error fetch hasil kelas:', error);
        res.status(500).json({ message: 'Gagal mengambil data hasil ujian kelas' });
    }
});


//Hasil Controller
router.get('/hasil/daftar-ujian', verifyToken, hasilController.getDaftarUjian);
router.get('/hasil/kelas/:exam_id', verifyToken, hasilController.getHasilKelas);


module.exports = router;