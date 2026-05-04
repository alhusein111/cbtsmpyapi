// Sesuaikan path ini dengan letak koneksi database kamu
const db = require(('../config/db')); 

/**
 * Fungsi untuk mencatat aktivitas siswa ke tabel exam_logs
 * @param {number} siswaId - ID Siswa dari users_siswa
 * @param {number|null} examId - ID Ujian (bisa null jika event tidak terikat ujian, misal: baru login aplikasi)
 * @param {string} eventName - Kategori event (contoh: 'LOGIN_APP', 'START_EXAM', 'VIOLATION', 'FINISH_EXAM')
 * @param {string} detailText - Penjelasan detail dari event tersebut
 */
const insertExamLog = async (siswaId, examId, eventName, detailText) => {
    let connection;
    try {
        connection = await db.getConnection();
        
        // Memasukkan data ke tabel exam_logs sesuai struktur database kamu
        await connection.query(
            `INSERT INTO exam_logs (siswa_id, exam_id, event, detail, created_at) VALUES (?, ?, ?, ?, NOW())`,
            [siswaId, examId || null, eventName, detailText]
        );
        
        console.log(`✅ Log saved: [${eventName}] SiswaID: ${siswaId}`);
    } catch (error) {
        console.error('❌ Gagal menyimpan exam log:', error);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { insertExamLog };