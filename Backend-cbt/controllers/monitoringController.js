// Backend-cbt/controllers/monitoringController.js
const db = require('../config/db'); // Sesuaikan dengan file koneksi DB kamu

const getSiswaLogs = async (req, res) => {
    // Mengambil parameter dari URL
    const { exam_id, siswa_id } = req.params; 
    let connection;

    try {
        connection = await db.getConnection();

        // Mengambil log ujian urut dari yang paling baru (DESC)
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

module.exports = { getSiswaLogs };