const cron = require('node-cron');
const db = require('../config/db');

const generateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const startTokenCron = (io) => {
    console.log('🤖 Robot Token diaktifkan...');

    // Jalan setiap 5 menit
    cron.schedule('*/5 * * * *', async () => {
        try {
            const tokenMasukBaru = generateRandomToken();
            const tokenKeluarBaru = generateRandomToken();

            const query = `
                INSERT INTO system_tokens (id, token_masuk, token_keluar, last_updated)
                VALUES (1, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                token_masuk = VALUES(token_masuk), 
                token_keluar = VALUES(token_keluar), 
                last_updated = NOW()
            `;
            
            await db.query(query, [tokenMasukBaru, tokenKeluarBaru]);

            console.log(`🔄 [CRON] Token Updated: ${tokenMasukBaru} | ${tokenKeluarBaru}`);

            // PERBAIKAN DI SINI: Gunakan io.emit langsung tanpa .to('staff_room')
            io.emit('token:update', {
                token_masuk: tokenMasukBaru,
                token_keluar: tokenKeluarBaru,
                waktu_update: new Date()
            });

        } catch (error) {
            console.error('❌ [CRON] Gagal update token:', error);
        }
    });
};

module.exports = startTokenCron;