// File: utils/statsHelper.js
// Fungsi ini menerima parameter 'dbConn' agar fleksibel (bisa pakai db utama atau connection dari transaksi/socket)

const getDashboardStats = async (dbConn) => {
    try {
        const [stats] = await dbConn.query(`
            SELECT 
                (SELECT COUNT(*) FROM users_siswa WHERE is_login = 1) AS siswa_login,
                (SELECT COUNT(*) FROM student_exams WHERE status = 'Mengerjakan') AS ujian_aktif,
                (SELECT COUNT(*) FROM student_exams WHERE status = 'Selesai' AND DATE(waktu_selesai_pengerjaan) = CURDATE()) AS submit_hari_ini,
                (SELECT COUNT(*) FROM student_exams WHERE status = 'Terkunci') AS pelanggaran_siswa
        `);

        const [pieData] = await dbConn.query(`
            SELECT status, COUNT(*) AS value 
            FROM student_exams 
            GROUP BY status
        `);

        const formattedPie = [
            { name: 'Selesai', value: pieData.find(d => d.status === 'Selesai')?.value || 0 },
            { name: 'Proses', value: pieData.find(d => d.status === 'Mengerjakan')?.value || 0 },
            { name: 'Belum', value: pieData.find(d => !['Selesai', 'Mengerjakan'].includes(d.status))?.value || 0 }
        ];

        return {
            stats: {
                siswaLogin: stats[0].siswa_login || 0,
                ujianAktif: stats[0].ujian_aktif || 0,
                submitHariIni: stats[0].submit_hari_ini || 0,
                pelanggaran: stats[0].pelanggaran_siswa || 0
            },
            grafik_ujian: formattedPie
        };
    } catch (error) {
        console.error("❌ Error di statsHelper:", error);
        throw error; // Lempar error ke controller yang memanggilnya
    }
};

module.exports = { getDashboardStats };