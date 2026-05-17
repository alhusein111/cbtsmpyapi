import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, Calendar, CheckCircle2, PlayCircle, 
  LayoutGrid, List, BookOpen, Calculator, FlaskConical, 
  Globe, FileText, Activity, RefreshCw,
  Landmark, BookText, Palette, Dumbbell, Monitor, 
  MessageSquare, BookMarked, Languages, Users, Heart, XCircle
} from 'lucide-react';
import api from '../../api/axiosConfig';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

// 1. TAMBAHAN: Import Socket (Sesuaikan path-nya jika berbeda)
import { io } from 'socket.io-client'; 

const StudentDashboard = () => {
  const navigate = useNavigate();
  
  // 1. Parsing Data Siswa
  const rawUser = localStorage.getItem('user');
  const userObj = rawUser ? JSON.parse(rawUser) : null;
  
  const studentData = {
    nama: userObj?.nama || userObj?.name || 'Nama Siswa',
    nis: userObj?.nis || '-',
    nisn: userObj?.nisn || '-',
    no_peserta: userObj?.no_peserta || userObj?.nomor_peserta || '-',
    kelas_nama: userObj?.kelas?.nama_kelas || userObj?.nama_kelas || userObj?.kelas || '-', 
    kelas_id: userObj?.kelas_id || 1,
    id: userObj?.id || null // Pastikan ID siswa tersedia
  };

  // State Utama
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState('card');
  const [exams, setExams] = useState([]);
  const [completedExams, setCompletedExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- STATE BARU UNTUK FILTER & PAGINASI ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 

  // ==========================================
  // TAMBAHAN POIN 3: LISTENER SOCKET UNTUK FORCE LOGOUT
  // ==========================================
  useEffect(() => {
    // Jika tidak ada ID siswa, batalkan
    if (!studentData.id) return;

    // 1. Inisialisasi koneksi socket ke URL Backend
    // Ganti URL ini dengan URL Backend mas brow, atau gunakan environment variable
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'; 
    const socket = io(backendUrl);

    // 2. Sesuaikan nama event dengan format backend: `force_logout:${id}`
    const eventName = `force_logout:${studentData.id}`;

    const handleForceLogout = () => {
      // Karena event name sudah spesifik per ID, tidak perlu cek ID lagi di sini
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      Swal.fire({
        icon: 'warning',
        title: 'Sesi Berakhir!',
        text: 'Device Anda telah di-reset oleh Admin. Silakan login kembali.',
        confirmButtonText: 'OK',
        allowOutsideClick: false
      }).then(() => {
        navigate('/login', { replace: true });
      });
    };

    // 3. Dengarkan event tersebut
    socket.on(eventName, handleForceLogout);

    // 4. Bersihkan koneksi saat pindah halaman (unmount)
    return () => {
      socket.off(eventName, handleForceLogout);
      socket.disconnect(); // Penting agar tidak terjadi memory leak/koneksi dobel
    };
  }, [navigate, studentData.id]);
  // ==========================================

  // 2. Real-time Clock Engine
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Fetch Data Ujian
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/api/student/exams`);

      if (response.data && response.data.success) {
        const responseData = response.data.data || {};
        
        // --- PROSES JADWAL AKTIF ---
        const jadwalArray = Array.isArray(responseData.jadwal_aktif) ? responseData.jadwal_aktif : [];
        const mappedExams = jadwalArray.map(exam => ({
          ...exam,
          id: exam.id, 
          nama_ujian: exam.nama_ujian || 'Ujian CBT',
          min_work_time: exam.min_work_time || 0,
          is_done: exam.status_pengerjaan === 'Selesai',
          // Tangkap status waktu dari backend
          status_waktu: exam.status_waktu,
          // Ujian siap dikerjakan JIKA waktunya pas DAN siswa belum menyelesaikannya
          is_ready: exam.status_waktu === 'Bisa Dikerjakan' && exam.status_pengerjaan !== 'Selesai'
        }));
        setExams(mappedExams);

        // --- PROSES RIWAYAT UJIAN ---
        const riwayatArray = Array.isArray(responseData.riwayat_ujian) ? responseData.riwayat_ujian : [];
        const mappedRiwayat = riwayatArray.map(log => ({
          id: log.log_id,
          subject: log.subject || 'Tidak Diketahui',
          type: log.type || '-',
          date: log.date, 
          status: log.status
        }));
        setCompletedExams(mappedRiwayat);

      } else {
        setExams([]);
        setCompletedExams([]);
      }
    } catch (error) {
      // ==========================================
      // TAMBAHAN: TANGKAP ERROR DARI MIDDLEWARE API
      // Jika middleware checkSiswaActive menolak request (misal siswa refresh halaman)
      // ==========================================
      if (error.response && error.response.status === 401 && error.response.data.forceLogout) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          Swal.fire({
              icon: 'warning',
              title: 'Sesi Berakhir!',
              text: 'Sesi login telah di-reset oleh Admin. Silakan login kembali.',
              confirmButtonText: 'OK',
              allowOutsideClick: false
          }).then(() => {
              navigate('/login', { replace: true });
          });
          return; // Hentikan eksekusi fetch
      }

      console.error("Gagal memuat data ujian:", error);
      toast.error('Gagal mengambil data dashboard.');
      setExams([]);
      setCompletedExams([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleStartExam = (exam) => {
    navigate(`/cbt-arena/${exam.id}`);
  };

  const getSubjectTheme = (mapelName) => {
    // ... [KODE getSubjectTheme MAS BROW TETAP SAMA] ...
    if (!mapelName) return { icon: FileText, color: 'from-slate-600 to-slate-800', bg: 'bg-slate-100', text: 'text-slate-600' };
    
    const name = mapelName.toLowerCase();

    if (name.includes('agama') || name.includes('pai')) 
      return { icon: Heart, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', text: 'text-emerald-600' };
    if (name.includes('pancasila') || name.includes('kewarganegaraan') || name.includes('pkn')) 
      return { icon: Landmark, color: 'from-red-500 to-rose-600', bg: 'bg-red-50', text: 'text-red-600' };
    if (name.includes('indonesia')) 
      return { icon: BookText, color: 'from-orange-400 to-amber-500', bg: 'bg-orange-50', text: 'text-orange-600' };
    if (name.includes('matematika') || name.includes('mtk')) 
      return { icon: Calculator, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600' };
    if (name.includes('ipa') || name.includes('alam') || name.includes('sains')) 
      return { icon: FlaskConical, color: 'from-teal-400 to-emerald-500', bg: 'bg-teal-50', text: 'text-teal-600' };
    if (name.includes('ips') || name.includes('sosial') || name.includes('sejarah')) 
      return { icon: Globe, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', text: 'text-purple-600' };
    if (name.includes('inggris')) 
      return { icon: Languages, color: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-50', text: 'text-indigo-600' };
    if (name.includes('seni') || name.includes('budaya')) 
      return { icon: Palette, color: 'from-pink-500 to-fuchsia-600', bg: 'bg-pink-50', text: 'text-pink-600' };
    if (name.includes('jasmani') || name.includes('olahraga') || name.includes('pjok') || name.includes('kesehatan')) 
      return { icon: Dumbbell, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600' };
    if (name.includes('informatika') || name.includes('komputer') || name.includes('tik')) 
      return { icon: Monitor, color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-600' };
    if (name.includes('sunda')) 
      return { icon: MessageSquare, color: 'from-lime-500 to-green-600', bg: 'bg-lime-50', text: 'text-lime-600' };
    if (name.includes('qur\'an') || name.includes('quran') || name.includes('hadits')) 
      return { icon: BookMarked, color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-50', text: 'text-yellow-600' };
    if (name.includes('arab')) 
      return { icon: BookOpen, color: 'from-sky-400 to-blue-500', bg: 'bg-sky-50', text: 'text-sky-600' };
    if (name.includes('bimbingan') || name.includes('konseling') || name.includes('bk')) 
      return { icon: Users, color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-600' };

    return { icon: FileText, color: 'from-slate-600 to-slate-800', bg: 'bg-slate-100', text: 'text-slate-600' };
  };

  // 4. LOGIKA FILTER: Tampilkan semua jadwal hari ini
  // (Karena status penguncian tombol sudah diurus oleh Backend)
  const visibleExams = exams;

  // --- LOGIKA PENCARIAN & PAGINASI ---
  const filteredExams = completedExams.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      (log.subject || '').toLowerCase().includes(term) ||
      (log.type || '').toLowerCase().includes(term) ||
      (log.status || '').toLowerCase().includes(term)
    );
  });

  const totalItems = filteredExams.length;
  const limit = itemsPerPage === 'semua' ? (totalItems || 1) : itemsPerPage;
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (currentPage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  
  const currentExams = filteredExams.slice(startIndex, endIndex);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };

  const handleLimitChange = (e) => {
    const val = e.target.value;
    setItemsPerPage(val === 'semua' ? 'semua' : Number(val));
    setCurrentPage(1);
  };

  return (
    <div className="bg-surface min-h-screen pb-12 font-sans">
      
      {/* --- TOP BAR --- */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 sm:p-2 rounded-lg text-white">
            <Activity size={20} />
          </div>
          <h1 className="font-bold text-lg sm:text-xl tracking-tight text-slate-800">CBT Arena</h1>
        </div>
        
        {/* WAKTU & TOMBOL REFRESH */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-slate-600 text-[11px] sm:text-sm font-medium">
            <Clock size={14} className="text-indigo-500 hidden sm:block" />
            <span className="hidden sm:inline">{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} -</span>
            <span className="sm:hidden">{currentTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
            <span className="font-bold text-indigo-700 w-12 sm:w-16 text-center">{currentTime.toLocaleTimeString('id-ID')}</span>
          </div>
          
          <button 
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-medium transition-all duration-300 shadow-sm border border-indigo-100 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 
            <span className="hidden sm:block text-sm">Refresh</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 space-y-8">
        
        {/* --- PROFIL HEADER --- */}
        <div className="bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
            <Globe size={300} className="-mt-10 -mr-10" />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-200 font-medium tracking-wide mb-1 text-xs sm:text-sm uppercase">Selamat Datang di Portal Ujian</p>
            <h2 className="text-2xl sm:text-3xl font-black mb-6">{studentData.nama}</h2>
            
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 sm:px-4 py-2 rounded-lg">
                <p className="text-[9px] sm:text-[10px] text-indigo-200 uppercase font-bold tracking-wider">NIS / NISN</p>
                <p className="font-mono text-xs sm:text-sm">{studentData.nis} / {studentData.nisn}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 sm:px-4 py-2 rounded-lg">
                <p className="text-[9px] sm:text-[10px] text-indigo-200 uppercase font-bold tracking-wider">No. Peserta</p>
                <p className="font-mono text-xs sm:text-sm font-bold">{studentData.no_peserta}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 sm:px-4 py-2 rounded-lg">
                <p className="text-[9px] sm:text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Kelas</p>
                <p className="font-mono text-xs sm:text-sm font-bold">{studentData.kelas_nama}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- EXAM ARENA SECTION --- */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">Jadwal Ujian Hari Ini</h3>
              <p className="text-xs sm:text-sm text-slate-500">Silahkan Berdo'a dulu sebelum ujian dimulai.</p>
            </div>
            
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm self-end sm:self-auto">
              <button 
                onClick={() => setViewMode('card')} 
                className={`p-1.5 sm:p-2 rounded-md flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-all ${viewMode === 'card' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={14} /> Card
              </button>
              <button 
                onClick={() => setViewMode('table')} 
                className={`p-1.5 sm:p-2 rounded-md flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={14} /> Table
              </button>
            </div>
          </div>

          {loading ? (
             <div className="text-center py-12 text-slate-400 animate-pulse font-medium">Memuat jadwal aktif...</div>
          ) : visibleExams.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Clock size={32} className="text-slate-300" />
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-700">Belum ada ujian yang tersedia saat ini.</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">Silakan tunggu atau klik tombol Refresh. Kartu ujian akan muncul 2 menit sebelum waktu ujian dimulai.</p>
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {visibleExams.map(exam => {
                const theme = getSubjectTheme(exam.nama_mapel);
                const Icon = theme.icon;
                
                return (
                  <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full group">
                    <div className={`h-2 w-full bg-linear-to-r ${theme.color}`}></div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${theme.bg} ${theme.text} mb-3 group-hover:scale-110 transition-transform`}>
                          <Icon size={20} className="sm:w-6 sm:h-6" />
                        </div>
                        <span className="bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                          {exam.nama_ujian}
                        </span>
                      </div>
                      
                      <h4 className="text-base sm:text-lg font-black text-slate-800 mb-1 leading-tight">{exam.nama_mapel}</h4>
                      <div className="space-y-2 mt-3 flex-1">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                          <Calendar size={14} className="text-slate-400"/> {new Date(exam.tanggal_ujian).toLocaleDateString('id-ID')}
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                          <Clock size={14} className="text-slate-400"/> {exam.waktu_mulai ? exam.waktu_mulai.substring(0, 5) : '-'} - {exam.waktu_selesai ? exam.waktu_selesai.substring(0, 5) : '-'} WIB
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                          <Activity size={14} className="text-slate-400"/> {exam.durasi} Menit (Min: {exam.min_work_time}m)
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100">
                          {exam.is_done ? (
                              <button disabled className="w-full py-2.5 sm:py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed text-sm">
                                  <CheckCircle2 size={16} /> Selesai Dikerjakan
                              </button>
                          ) : exam.status_waktu === 'Belum Waktunya' ? (
                              <button disabled className="w-full py-2.5 sm:py-3 bg-slate-100 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed text-sm">
                                  <Clock size={16} /> Mulai Pukul: {exam.waktu_mulai ? exam.waktu_mulai.substring(0, 5) : '-'}
                              </button>
                          ) : exam.status_waktu === 'Waktu Habis' ? (
                              <button disabled className="w-full py-2.5 sm:py-3 bg-rose-50 text-rose-600 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed text-sm">
                                  <XCircle size={16} /> Waktu Sudah Habis
                              </button>
                          ) : (
                              <button onClick={() => handleStartExam(exam)} className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-indigo-200 text-sm">
                                  <PlayCircle size={16} /> Mulai Ujian
                              </button>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4">Mata Pelajaran</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4">Jenis Ujian</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4">Waktu Ujian</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4">Durasi</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleExams.map(exam => {
                      const theme = getSubjectTheme(exam.nama_mapel);
                      const Icon = theme.icon;
                      return (
                        <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${theme.bg} ${theme.text}`}>
                                <Icon size={14} className="sm:w-4 sm:h-4" />
                              </div>
                              <span className="font-bold text-slate-800 text-xs sm:text-sm">{exam.nama_mapel}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium text-slate-600 text-xs sm:text-sm">{exam.nama_ujian}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs sm:text-sm">
                            {new Date(exam.tanggal_ujian).toLocaleDateString('id-ID')} <br/>
                            <span className="font-mono text-[10px] sm:text-xs text-slate-400">{exam.waktu_mulai} - {exam.waktu_selesai}</span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium text-slate-600 text-xs sm:text-sm">{exam.durasi} Menit</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                              {exam.is_done ? (
                                  <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] sm:text-xs font-bold">
                                      <CheckCircle2 size={12} className="sm:w-3.5 sm:h-3.5" /> Selesai
                                  </span>
                              ) : exam.status_waktu === 'Belum Waktunya' ? (
                                  <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100 text-slate-500 rounded-md text-[10px] sm:text-xs font-bold">
                                      <Clock size={12} className="sm:w-3.5 sm:h-3.5" /> {exam.waktu_mulai ? exam.waktu_mulai.substring(0, 5) : '-'}
                                  </span>
                              ) : exam.status_waktu === 'Waktu Habis' ? (
                                  <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-rose-50 text-rose-600 rounded-md text-[10px] sm:text-xs font-bold">
                                      <XCircle size={12} className="sm:w-3.5 sm:h-3.5" /> Habis
                                  </span>
                              ) : (
                                  <button onClick={() => handleStartExam(exam)} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 mx-auto transition-colors">
                                      <PlayCircle size={12} className="sm:w-3.5 sm:h-3.5" /> Mulai
                                  </button>
                              )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* --- RECENT COMPLETED LOGS DENGAN PENCARIAN & PAGINASI --- */}
        <div className="pt-6 sm:pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Riwayat Ujian (Selesai & Terkunci)</h3>
            
            {/* Input Pencarian */}
            <div className="w-full sm:w-auto relative">
              <input
                type="text"
                placeholder="Cari mapel, jenis, atau status..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full sm:w-64 px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4">Mata Pelajaran</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4">Jenis</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4">Tanggal</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentExams.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 sm:px-6 py-6 sm:py-8 text-center text-slate-400 text-xs sm:text-sm">
                        {searchTerm ? 'Data yang dicari tidak ditemukan.' : 'Belum ada riwayat ujian yang diselesaikan atau terkunci.'}
                      </td>
                    </tr>
                  ) : (
                    currentExams.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-slate-800 text-xs sm:text-sm">
                          {log.subject}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs sm:text-sm">
                          {log.type}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs sm:text-sm">
                          {log.date ? new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-bold uppercase rounded-md border ${
                            log.status?.toLowerCase() === 'selesai'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                              : log.status?.toLowerCase() === 'terkunci'
                              ? 'bg-rose-100 text-rose-700 border-rose-200' 
                              : 'bg-slate-100 text-slate-700 border-slate-200' 
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* --- PAGINATION FOOTER --- */}
            {totalItems > 0 && (
              <div className="px-4 py-3 sm:px-6 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Bagian Kiri: Info & Limit Dropdown */}
                <div className="flex items-center text-sm text-slate-600">
                  <span>Menampilkan</span>
                  <select 
                    value={itemsPerPage} 
                    onChange={handleLimitChange}
                    className="mx-2 border border-slate-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value="semua">Semua</option>
                  </select>
                  <span>
                    data ({totalItems === 0 ? 0 : startIndex + 1} - {endIndex} dari {totalItems})
                  </span>
                </div>

                {/* Bagian Kanan: Kontrol Paginasi */}
                <div className="flex items-center gap-1 text-sm">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                      currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    &lt;
                  </button>

                  <div className="w-8 h-8 flex items-center justify-center rounded bg-slate-800 text-white font-medium">
                    {currentPage}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                      currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;