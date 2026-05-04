// Backend-cbt/controllers/monitoringController.js
const db = require('../config/db'); 

const getSiswaLogs = async (req, res) => {
    const { exam_id, siswa_id } = req.params; 
    let connection;
    try {
        connection = await db.getConnection();
        const [logs] = await connection.query(
            `SELECT event, detail, created_at 
             FROM exam_logs 
             WHERE exam_id = ? AND siswa_id = ? 
             ORDER BY created_at DESC`,
            [exam_id, siswa_id]
        );
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('❌ Error fetch logs:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data log aktivitas.' });
    } finally {
        if (connection) connection.release();
    }
};

const getLivePeserta = async (req, res) => {
    const { exam_id } = req.params;
    let connection;
    try {
        connection = await db.getConnection();
        
        // PERBAIKAN: Gunakan CASE WHEN agar urutan prioritas status tepat sasaran!
        const query = `
            SELECT 
                s.id as siswa_id, 
                s.nama, 
                s.nis,
                s.is_login,
                s.is_locked,
                CASE 
                    WHEN se.status = 'Terkunci' OR s.is_locked = 1 THEN 'Terkunci'
                    WHEN se.status = 'Selesai' THEN 'Selesai'
                    WHEN se.status = 'Mengerjakan' THEN 'Mengerjakan'
                    WHEN s.is_login = 1 THEN 'Login'
                    ELSE 'Belum Login'
                END as exam_status,
                se.waktu_mulai_pengerjaan,
                (SELECT COUNT(id) FROM student_answers sa WHERE sa.student_exam_id = se.id AND (sa.opsi_id IS NOT NULL OR sa.jawaban_matching IS NOT NULL)) as terjawab
            FROM users_siswa s
            LEFT JOIN student_exams se ON s.id = se.siswa_id AND se.exam_id = ?
            WHERE s.class_id IN (SELECT class_id FROM exam_classes WHERE exam_id = ?)
        `;
        
        // Catatan: Saya ubah LEFT JOIN dari users_siswa. Agar peserta yang belum klik 
        // "Mulai Ujian" (belum ada row di student_exams) tetap tampil dengan status "Belum Login / Login".
        
        const [peserta] = await connection.query(query, [exam_id, exam_id]);
        res.json({ success: true, data: peserta });
    } catch (error) {
        console.error('❌ Error fetch live peserta:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data peserta.' });
    } finally {
        if (connection) connection.release();
    }
};

const getGlobalLogs = async (req, res) => {
    const { exam_id } = req.params;
    let connection;
    try {
        connection = await db.getConnection();
        const query = `
            SELECT 
                el.id, 
                s.nama, 
                el.event as type, 
                el.detail as text, 
                el.created_at as time
            FROM exam_logs el
            JOIN users_siswa s ON el.siswa_id = s.id
            WHERE el.exam_id = ?
            ORDER BY el.created_at DESC
            LIMIT 20
        `;
        const [logs] = await connection.query(query, [exam_id]);
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('❌ Error fetch global logs:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil log aktivitas.' });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { getSiswaLogs, getLivePeserta, getGlobalLogs };