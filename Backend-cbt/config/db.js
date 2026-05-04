const mysql = require('mysql2/promise');
require('dotenv').config();

// Membuat koneksi "Pool" (agar server kuat nampung banyak siswa sekaligus)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
    timezone: '+07:00', 
    dateStrings: true
});

// Tes koneksi saat server menyala
pool.getConnection()
    .then(() => console.log('✅ Database cbt_smpyapi berhasil terhubung!'))
    .catch((err) => console.error('❌ Gagal konek ke database:', err.message));

module.exports = pool;