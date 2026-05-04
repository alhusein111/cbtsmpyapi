const express = require('express');
const router = express.Router();

// ==========================================
// 1. IMPORT CONTROLLERS & DB
// ==========================================
const adminCtrl = require('../controllers/adminExamController');
const analysisCtrl = require('../controllers/analysisController');
const monitoringController = require('../controllers/monitoringController');
const db = require('../config/db'); 

// ==========================================
// 2. IMPORT MIDDLEWARE (SATPAM)
// ==========================================
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

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

// Endpoint Log Siswa
router.get('/monitoring/log/:exam_id/:siswa_id', checkRole('admin'), monitoringController.getSiswaLogs);

// ✅ [DATA REAL] ENDPOINT UNTUK LIVE MONITORING
router.get('/monitoring', async (req, res) => {
    try {
        // 1. AMBIL STATISTIK
        const [
            [totalSiswaResult],
            [ujianAktifResult],
            [submitHariIniResult],
            [pelanggaranResult]
        ] = await Promise.all([
            db.query('SELECT COUNT(*) AS total FROM users_siswa'), 
            db.query('SELECT COUNT(*) AS aktif FROM student_exams WHERE status = "Mengerjakan"'), 
            db.query('SELECT COUNT(*) AS selesai FROM student_exams WHERE status = "Selesai" AND DATE(waktu_selesai_pengerjaan) = CURDATE()'),
            db.query('SELECT COUNT(*) AS melanggar FROM exam_logs WHERE event = "VIOLATION" OR event = "warning" OR event = "error"') 
        ]);

        // 2. AMBIL DATA PESERTA UJIAN (Tambahan: s.id AS siswa_id dan s.is_locked untuk SOCKET)
        const [pesertaRows] = await db.query(`
            SELECT 
                s.nis AS id, 
                s.id AS siswa_id, 
                s.nama, 
                s.is_locked,
                e.status, 
                0 AS progress, 
                '00:00' AS sisaWaktu, 
                0 AS terjawab, 
                0 AS totalSoal,
                '00:00' AS idleTime
            FROM student_exams e
            JOIN users_siswa s ON e.siswa_id = s.id
            ORDER BY e.waktu_mulai_pengerjaan DESC
        `);

        // 3. AMBIL LOG AKTIVITAS TERBARU (JOIN users_siswa untuk memunculkan NAMA di Log Awal)
        const [logRows] = await db.query(`
            SELECT 
                l.id, 
                l.event AS type, 
                CONCAT(s.nama, ' ', l.detail) AS text, 
                DATE_FORMAT(l.created_at, '%H:%i') AS time 
            FROM exam_logs l
            LEFT JOIN users_siswa s ON l.siswa_id = s.id
            ORDER BY l.created_at DESC 
            LIMIT 10
        `);

        // 4. TRAFFIC AKTIVITAS (Sementara dummy)
        const trafficData = [10, 20, 45, 80, 95, 60, 30, 15, 5];

        // 5. GABUNGKAN & KIRIM DATA KE FRONTEND
        res.status(200).json({
            success: true,
            data: {
                stats: { 
                    totalSiswa: totalSiswaResult[0].total || 0, 
                    ujianAktif: ujianAktifResult[0].aktif || 0, 
                    submitHariIni: submitHariIniResult[0].selesai || 0, 
                    pelanggaran: pelanggaranResult[0].melanggar || 0 
                },
                peserta: pesertaRows,
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

module.exports = router;