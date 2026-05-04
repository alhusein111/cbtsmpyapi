process.env.TZ = "Asia/Jakarta";

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http'); 
const { Server } = require('socket.io'); 

dotenv.config();
const db = require('./config/db');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
    cors: { origin: '*' } 
});

app.set('io', io);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

// ==========================================
// --- IMPORT RUTE API ---
// ==========================================
const authRoutes = require('./routes/authRoutes');
const siswaRoutes = require('./routes/siswaRoutes'); 
const staffRoutes = require('./routes/staffRoutes'); 
const masterRoutes = require('./routes/masterRoutes'); 
const examRoutes = require('./routes/examRoutes'); 
const questionRoutes = require('./routes/questionRoutes'); 
const studentAuthRoutes = require('./routes/studentAuthRoutes'); 
const studentDashboardRoutes = require('./routes/studentDashboardRoutes');
const studentExamRoutes = require('./routes/studentExamRoutes');
const adminRoutes = require('./routes/adminRoutes'); 
const gradeRoutes = require('./routes/gradeRoutes');
const homeroomRoutes = require('./routes/homeroomRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const raportRoutes = require('./routes/raportRoutes');
const nilaiRoutes = require('./routes/nilaiRoutes');

// ==========================================
// --- DAFTARKAN RUTE API ---
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/siswa', siswaRoutes); 
app.use('/api/staff', staffRoutes); 
app.use('/api/master', masterRoutes); 
app.use('/api/exams', examRoutes); 
app.use('/api/questions', questionRoutes); 
app.use('/api/student/auth', studentAuthRoutes); 

// PERBAIKAN DI SINI MAS BRO: 
// Prefix diubah jadi /api/student agar cocok dengan panggilan frontend (/api/student/exams)
app.use('/api/student', studentDashboardRoutes);

app.use('/api/student/exam', studentExamRoutes);
app.use('/api/admin', adminRoutes);  
app.use('/api/grades', gradeRoutes);
app.use('/api/homeroom', homeroomRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/raport', raportRoutes);
app.use('/api/nilai', nilaiRoutes);

// ==========================================
// --- SOCKET.IO (COMMAND CENTER & ANTI-CHEAT) ---
// ==========================================
const examSocketHandler = require('./sockets/examSocket');
examSocketHandler(io);

// ==========================================
// --- JALANKAN ROBOT CRON ---
// ==========================================
const startTokenCron = require('./cron/tokenCron');
startTokenCron(io); 

// ==========================================
// --- JALANKAN SERVER ---
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`====================================`);
    console.log(`🚀 Server & Socket.io berjalan di Port ${PORT}`);
    console.log(`====================================`);
});