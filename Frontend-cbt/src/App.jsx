import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';
import SettingsProvider from './context/SettingsContext'; 

// === IMPORT SOCKET.IO ===
import { io } from 'socket.io-client';

import MainLayout from './layouts/MainLayout';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ManajemenSiswa from './pages/master/ManajemenSiswa';
import ManajemenStaf from './pages/master/ManajemenStaf';
import ManajemenKelasMapel from './pages/master/ManajemenKelasMapel';
import LiveMonitoring from './pages/exams/LiveMonitoring';
import CreateQuestion from './pages/banksoal/CreateQuestion'; 
import ManajemenUjian from './pages/exams/ManajemenUjian';
import BankSoalList from './pages/exams/BankSoalList'; 
import EditQuestion from './pages/banksoal/EditQuestion'; 
import Pengaturan from './pages/master/Pengaturan';
import Dashboard from './pages/Dashboard';
import CbtArena from './pages/exams/CbtArena';
import HasilKelas from './pages/hasil/HasilKelas';
import DaftarHasilUjian from './pages/hasil/DaftarHasilUjian';
import DetailSiswa from './pages/hasil/DetailSiswa';

// === BUAT KONEKSI SOCKET DI LUAR APP ===
const socket = io('http://localhost:5000'); 

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" /> 

      <SettingsProvider>
        <AuthProvider>
          <Routes>
            {/* Rute Publik */}
            <Route path="/login" element={<Login />} />

            {/* Rute Privat (Dilindungi) */}
            <Route element={<ProtectedRoute />}>
              
              {/* ========================================================= */}
              {/* 1. RUTE UJIAN (FULL SCREEN, TANPA SIDEBAR & TANPA TOPBAR) */}
              {/* ========================================================= */}
              <Route path="/cbt-arena/:examId" element={<CbtArena />} />

              {/* ========================================================= */}
              {/* 2. RUTE DASHBOARD & ADMIN (DENGAN MAIN LAYOUT)            */}
              {/* ========================================================= */}
              <Route path="/" element={<MainLayout />}>
                {/* HANYA ADA SATU ROUTE INDEX (DASHBOARD) SEKARANG */}
                <Route index element={<Dashboard socket={socket} />} />
                
                <Route path="master/siswa" element={<ManajemenSiswa />} />
                <Route path="master/staf" element={<ManajemenStaf />} />
                <Route path="master/kelasmapel" element={<ManajemenKelasMapel />} />
                
                {/* HANYA ADA SATU ROUTE EXAMS/LIVE SEKARANG */}
                <Route path="exams/live" element={<LiveMonitoring socket={socket} />} />

                <Route path="/hasil/ujian" element={<DaftarHasilUjian />} />
                <Route path="/hasil/kelas/:exam_id" element={<HasilKelas />} />
                <Route path="/hasil/siswa/:student_exam_id" element={<DetailSiswa />} />
                
                <Route path="exams" element={<ManajemenUjian />} /> 
                <Route path="exams/:examId/questions" element={<BankSoalList />} /> 
                <Route path="exams/:examId/questions/create" element={<CreateQuestion />} />
                <Route path="exams/:examId/questions/:questionId/edit" element={<EditQuestion />} />
                <Route path="master/pengaturan" element={<Pengaturan />} />
              </Route>

            </Route>

            {/* Rute Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;