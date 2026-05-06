// Backend-cbt/sockets/examSocket.js
const db = require('../config/db');

const examSocketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 Perangkat terhubung via Socket. ID:', socket.id);

    socket.on('staff:join', (data) => {
      socket.join('staff_room');
      console.log(`👨‍🏫 Staff (Admin/Guru) bergabung ke Command Center`);
    });

    // 1. ADMIN MEMBUKA KUNCI
    socket.on('admin:unlock', async (data) => {
      const { siswa_id } = data;
      try {
        // Ambil nama siswa
        const [siswa] = await db.query('SELECT nama FROM users_siswa WHERE id = ?', [siswa_id]);
        const namaSiswa = siswa.length > 0 ? siswa[0].nama : 'Siswa Anonim';
        const logText = `[${namaSiswa}] Akses ujian dibuka kembali oleh Pengawas`;

        await db.query('UPDATE users_siswa SET is_locked = 0 WHERE id = ?', [siswa_id]);
        await db.query('INSERT INTO exam_logs (siswa_id, event, detail, created_at) VALUES (?, ?, ?, NOW())', 
          [siswa_id, 'UNLOCKED', logText]);
        
        io.to(`student_${siswa_id}`).emit('student:unlocked', { message: 'Akses ujianmu telah dibuka oleh Pengawas.' });
        
        io.to('staff_room').emit('staff:peserta_update', { siswa_id, is_locked: 0 });
        io.to('staff_room').emit('staff:log_new', { 
          type: 'UNLOCKED', 
          text: logText, 
          siswa_id, 
          time: new Date() 
        });
      } catch (error) {
        console.error('❌ Error admin:unlock:', error);
      }
    });

    socket.on('admin:force_logout', (data) => {
      const { siswa_id } = data;
      io.to(`student_${siswa_id}`).emit('force_logout', { message: 'Kamu dikeluarkan paksa oleh Pengawas.' });
    });

    socket.on('student:join', (data) => {
      const { siswa_id } = data;
      socket.join(`student_${siswa_id}`);
    });

    // 2. AKTIVITAS SISWA (Menjawab / Pindah Soal)
    socket.on('student:activity', async (data) => {
      const { siswa_id, exam_id, subject_name, detail, action, total_terjawab } = data;
      try {
        // Ambil nama siswa
        const [siswa] = await db.query('SELECT nama FROM users_siswa WHERE id = ?', [siswa_id]);
        const namaSiswa = siswa.length > 0 ? siswa[0].nama : 'Siswa Anonim';
        const logText = `[${namaSiswa}] ${detail}`; // Format: [Nama] Detail (Misal: [Budi] Menjawab soal no 1)

        await db.query('INSERT INTO exam_logs (siswa_id, exam_id, event, detail, created_at) VALUES (?, ?, ?, ?, NOW())', 
          [siswa_id, exam_id, 'ACTIVITY', logText]);
        
        io.to('staff_room').emit('staff:peserta_update', { 
          siswa_id, 
          terjawab: total_terjawab 
        });

        io.to('staff_room').emit('staff:log_new', { 
          type: 'ACTIVITY', 
          text: logText, 
          siswa_id, 
          time: new Date() 
        });
      } catch (error) {
        console.error('❌ Error catat log activity:', error);
      }
    });

    // 3. PELANGGARAN SISWA
    socket.on('student:violation', async (data) => {
      const { siswa_id, exam_id, violation_type } = data;
      try {
        // Ambil nama siswa
        const [siswa] = await db.query('SELECT nama FROM users_siswa WHERE id = ?', [siswa_id]);
        const namaSiswa = siswa.length > 0 ? siswa[0].nama : 'Siswa Anonim';
        const logText = `[${namaSiswa}] Kecurangan terdeteksi: ${violation_type}`;

        await db.query('UPDATE users_siswa SET is_locked = 1 WHERE id = ?', [siswa_id]);
        await db.query('INSERT INTO exam_logs (siswa_id, exam_id, event, detail, created_at) VALUES (?, ?, ?, ?, NOW())', 
          [siswa_id, exam_id, 'VIOLATION', logText]);
        
        io.to(`student_${siswa_id}`).emit('student:locked_out', { 
          message: 'Kecurangan terdeteksi! Ujian dikunci. Lapor ke pengawas.' 
        });

        io.to('staff_room').emit('staff:peserta_update', { siswa_id, is_locked: 1 });
        io.to('staff_room').emit('staff:log_new', { 
          type: 'VIOLATION', 
          text: logText, 
          siswa_id, 
          time: new Date() 
        });
      } catch (error) {
        console.error('❌ Error proses pelanggaran:', error);
      }
    });

    socket.on('disconnect', () => {
      // Boleh dikosongkan atau di-log
    });
  });
};

module.exports = examSocketHandler;