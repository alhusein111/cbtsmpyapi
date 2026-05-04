const db = require('../config/db');

const examSocketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('🟢 Perangkat terhubung via Socket. ID:', socket.id);

        // ==========================================
        // 1. COMMAND CENTER (ADMIN & GURU)
        // ==========================================
        
        socket.on('staff:join', (data) => {
            socket.join('staff_room');
            console.log(`👨‍🏫 Staff (Admin/Guru) bergabung ke Command Center`);
        });

        socket.on('admin:unlock', async (data) => {
            const { siswa_id } = data;
            try {
                await db.query('UPDATE users_siswa SET is_locked = 0 WHERE id = ?', [siswa_id]);
                await db.query('INSERT INTO exam_logs (siswa_id, event, detail) VALUES (?, ?, ?)', 
                    [siswa_id, 'UNLOCKED', 'Akses dibuka kembali oleh Pengawas']);
                
                io.to(`student_${siswa_id}`).emit('student:unlocked', { message: 'Akses ujianmu telah dibuka oleh Pengawas.' });
                io.to('staff_room').emit('staff:update_status', { siswa_id, status_kunci: 'AMAN' });
            } catch (error) {
                console.error('❌ Error admin:unlock:', error);
            }
        });

        socket.on('admin:force_logout', (data) => {
            const { siswa_id } = data;
            io.to(`student_${siswa_id}`).emit('force_logout', { message: 'Kamu dikeluarkan paksa oleh Pengawas.' });
            console.log(`⚠️ Siswa ${siswa_id} di-force logout oleh pengawas.`);
        });


        // ==========================================
        // 2. EVENT DARI SISWA (AKTIVITAS & ANTI-CHEAT)
        // ==========================================

        socket.on('student:join', (data) => {
            const { siswa_id } = data;
            socket.join(`student_${siswa_id}`);
        });

        socket.on('student:activity', async (data) => {
            const { siswa_id, exam_id, subject_name, detail } = data;
            try {
                await db.query('INSERT INTO exam_logs (siswa_id, exam_id, event, detail) VALUES (?, ?, ?, ?)', 
                    [siswa_id, exam_id, 'ACTIVITY', detail]);
                
                io.to('staff_room').emit('exam:status', {
                    siswa_id,
                    pesan: `[${subject_name}] ${detail}`
                });
            } catch (error) {
                console.error('❌ Error catat log activity:', error);
            }
        });

        socket.on('student:violation', async (data) => {
            const { siswa_id, exam_id, violation_type } = data;
            try {
                await db.query('UPDATE users_siswa SET is_locked = 1 WHERE id = ?', [siswa_id]);
                await db.query('INSERT INTO exam_logs (siswa_id, exam_id, event, detail) VALUES (?, ?, ?, ?)', 
                    [siswa_id, exam_id, 'VIOLATION', `Kecurangan terdeteksi: ${violation_type}`]);
                
                io.to(`student_${siswa_id}`).emit('student:locked_out', { 
                    message: 'Kecurangan terdeteksi! Ujian dikunci. Lapor ke pengawas.' 
                });

                io.to('staff_room').emit('staff:violation_alert', {
                    siswa_id,
                    pesan: `🚨 PELANGGARAN! Siswa melakukan: ${violation_type}. Layar telah dikunci.`
                });
            } catch (error) {
                console.error('❌ Error proses pelanggaran:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔴 Perangkat terputus:', socket.id);
        });
    });
};

module.exports = examSocketHandler;