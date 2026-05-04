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
        
        // Menggunakan tabel users_siswa, student_exams, dan menghitung student_answers
        const query = `
            SELECT 
                s.id as siswa_id, 
                s.nama, 
                s.nis,
                s.is_login,
                s.is_locked,
                se.status as exam_status, 
                se.waktu_mulai_pengerjaan,
                (SELECT COUNT(id) FROM student_answers sa WHERE sa.student_exam_id = se.id AND (sa.opsi_id IS NOT NULL OR sa.jawaban_matching IS NOT NULL)) as terjawab
            FROM student_exams se
            JOIN users_siswa s ON se.siswa_id = s.id
            WHERE se.exam_id = ?
        `;
        const [peserta] = await connection.query(query, [exam_id]);
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