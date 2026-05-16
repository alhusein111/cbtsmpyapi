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

// ✅ [DATA REAL] ENDPOINT MONITORING YANG SUDAH TERFILTER TANGGAL & MENCEGAH DUPLIKASI HISTORI
router.get('/monitoring', async (req, res) => {
    try {
        // 1. TANGKAP INPUT TANGGAL FILTER (Jika kosong, default pakai hari ini)
        const targetDate = req.query.date || new Date().toISOString().split('T')[0];

        // 2. AMBIL STATISTIK DARI HELPER
        const dashboardData = await getDashboardStats(db);

        // 3. AMBIL DATA PESERTA BERDASARKAN FILTER TANGGAL
        // Query dimodifikasi pada kondisi LEFT JOIN agar hanya mengikat data student_exams sesuai targetDate.
        // Klausa WHERE memastikan data masa lampau hanya muncul jika ada track record ujiannya, 
        // sedangkan untuk hari ini (CURDATE) akan memunculkan semua siswa untuk melihat status "Belum Login".
        const [pesertaRows] = await db.query(`
            SELECT 
                s.nis AS id, 
                s.id AS siswa_id,
                se.id AS student_exam_id, 
                s.nama, 
                se.waktu_selesai_pengerjaan, -- 🔥 DIPERLUKAN FRONTEND UNTUK CARD VIEW & TABLE VIEW
                CASE 
                    WHEN se.status = 'Terkunci' THEN 'Terkunci'
                    WHEN se.status = 'Selesai' THEN 'Selesai'
                    WHEN se.status = 'Mengerjakan' THEN 'Mengerjakan'
                    WHEN (se.status = 'Login' OR s.is_login = 1) AND (se.id IS NULL OR DATE(se.waktu_mulai_pengerjaan) = CURDATE()) THEN 'Login'
                    ELSE 'Belum Login'
                END as status,
                
                -- Hitung Total Terjawab
                IFNULL((SELECT COUNT(id) FROM student_answers WHERE student_exam_id = se.id AND (opsi_id IS NOT NULL OR jawaban_matching IS NOT NULL)), 0) AS terjawab, 
                
                -- Total Soal dari Kertas Jawaban
                IFNULL((SELECT COUNT(id) FROM student_answers WHERE student_exam_id = se.id), 1) AS total_soal,
                
                -- Perhitungan Progress Persentase
                IFNULL(ROUND(
                    (
                        (SELECT COUNT(id) FROM student_answers WHERE student_exam_id = se.id AND (opsi_id IS NOT NULL OR jawaban_matching IS NOT NULL)) 
                        * 100.0
                    ) 
                    / 
                    NULLIF((SELECT COUNT(id) FROM student_answers WHERE student_exam_id = se.id), 0)
                ), 0) AS progress,

                -- Hitung Lama Pengerjaan
                CASE 
                    WHEN se.status = 'Selesai' AND se.waktu_selesai_pengerjaan IS NOT NULL 
                    THEN TIME_FORMAT(TIMEDIFF(se.waktu_selesai_pengerjaan, se.waktu_mulai_pengerjaan), '%H:%i:%s')
                    ELSE NULL 
                END AS lama_pengerjaan,

                -- Hitung Sisa Waktu Ujian (Detik)
                CASE 
                    WHEN se.status IN ('Mengerjakan', 'Login', 'Terkunci') AND se.waktu_mulai_pengerjaan IS NOT NULL THEN
                        GREATEST(0, (e.durasi * 60) - TIMESTAMPDIFF(SECOND, se.waktu_mulai_pengerjaan, NOW()))
                    ELSE 0
                END AS sisa_waktu_detik

            FROM users_siswa s
            -- 🔥 KUNCI MENCEGAH TIMBUNAN: Filter tanggal langsung diikat di relasi JOIN 
            LEFT JOIN student_exams se ON s.id = se.siswa_id AND (DATE(se.waktu_mulai_pengerjaan) = ? OR DATE(se.waktu_selesai_pengerjaan) = ?)
            LEFT JOIN exams e ON se.exam_id = e.id 
            -- Jika melihat tanggal hari ini, tampilkan semua siswa. Jika melihat histori, tampilkan yang ikut ujian saja.
            WHERE se.id IS NOT NULL OR (? = CURDATE())
            ORDER BY se.waktu_mulai_pengerjaan DESC, s.nama ASC
        `, [targetDate, targetDate, targetDate]);

        // 4. AMBIL LOG AKTIVITAS 
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
                CONCAT(IFNULL(s.nama, 'Sistem'), ' ', LOWER(el.detail)) AS text, 
                DATE_FORMAT(el.created_at, '%H:%i') AS time 
            FROM exam_logs el
            LEFT JOIN users_siswa s ON el.siswa_id = s.id 
            WHERE DATE(el.created_at) = ? -- Filter log sesuai tanggal terpilih
            ORDER BY el.created_at DESC 
            LIMIT 20
        `, [targetDate]);

        const trafficData = [10, 20, 45, 80, 95, 60, 30, 15, 5];

        // Helper konversi detik ke Jam:Menit:Detik
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

// ==========================================
// --- RUTE HASIL UJIAN ---
// ==========================================
router.get('/hasil/daftar-ujian', hasilController.getDaftarUjian);
router.get('/hasil/kelas/:exam_id', hasilController.getHasilKelas);
router.get('/hasil/siswa-detail/:student_exam_id', hasilController.getDetailSiswaUjian);

// KUNCI UNTUK ADMIN
router.delete('/hasil/kelas/reset/:student_exam_id', checkRole('admin'), hasilController.resetUjianSiswa);

module.exports = router;