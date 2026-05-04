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
        // ✅ 1. AMBIL STATISTIK DARI HELPER
        const dashboardData = await getDashboardStats(db);

        // 2. AMBIL DATA PESERTA 
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
                0 AS progress, 
                '00:00' AS sisaWaktu, 
                0 AS terjawab, 
                0 AS totalSoal,
                '00:00' AS idleTime
            FROM users_siswa s
            LEFT JOIN student_exams se ON s.id = se.siswa_id
            WHERE s.is_login = 1 OR se.id IS NOT NULL
            ORDER BY se.waktu_mulai_pengerjaan DESC, s.nama ASC
        `);

        // 3. AMBIL LOG AKTIVITAS 
        const [logRows] = await db.query(`
            SELECT 
                id, 
                CASE 
                    WHEN event = 'EXAM_FINISH' THEN 'success'
                    WHEN event = 'VIOLATION_BLUR' THEN 'error'
                    WHEN event = 'APP_LOGIN' THEN 'start'
                    WHEN event = 'APP_LOGOUT' THEN 'warning'
                    ELSE 'info'
                END AS type, 
                detail AS text, 
                DATE_FORMAT(created_at, '%H:%i') AS time 
            FROM exam_logs 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        const trafficData = [10, 20, 45, 80, 95, 60, 30, 15, 5];

        res.status(200).json({
            success: true,
            data: {
                stats: dashboardData.stats, // ✅ Ambil hasil dari helper
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