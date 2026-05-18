import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { 
  Activity, Users, CheckSquare, AlertTriangle, ClipboardList,
  Search, LayoutGrid, List, Clock, MessageSquare, 
  RefreshCcw, Eye, ArrowRightCircle, CheckCircle2, Unlock, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import Swal from 'sweetalert2';

const LiveMonitoring = ({ socket, examId = 1 }) => { 
  // --- HELPER UNTUK FORMAT TANGGAL HARI INI (LOCAL TIME) ---
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- STATE DASAR ---
  const [viewMode, setViewMode] = useState('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString()); // Default: Tanggal Sekarang
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    siswaLogin: 0,
    ujianAktif: 0,
    submitHariIni: 0,
    pelanggaran: 0
  });

  const [peserta, setPeserta] = useState([]);
  const [logs, setLogs] = useState([]);

// --- STATE & LOGIC TRAFFIC AKTIVITAS ---
  const [trafficData, setTrafficData] = useState(Array(20).fill(0));
  const [trafficStartTime, setTrafficStartTime] = useState('');
  const lastLogIdRef = useRef(null);
  const isInitialLoad = useRef(true); // 🔥 Mencegah overwrite saat awal muat halaman

  // 1. Ambil data lama dari localStorage SETIAP TANGGAL BERUBAH
  useEffect(() => {
    if (!selectedDate) return;
    
    isInitialLoad.current = true; // Set true setiap ganti tanggal

    const savedTraffic = localStorage.getItem(`cbt_traffic_data_${selectedDate}`);
    if (savedTraffic) {
      setTrafficData(JSON.parse(savedTraffic));
    } else {
      setTrafficData(Array(20).fill(0));
    }

    const savedTime = localStorage.getItem(`cbt_traffic_start_time_${selectedDate}`);
    if (savedTime) {
      setTrafficStartTime(savedTime);
    } else {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setTrafficStartTime(timeStr);
      localStorage.setItem(`cbt_traffic_start_time_${selectedDate}`, timeStr);
    }

    // Beri jeda sedikit agar state selesai ter-update sebelum diizinkan menyimpan
    setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
  }, [selectedDate]);

  // 2. Simpan data ke localStorage HANYA JIKA bukan loading awal
  useEffect(() => {
    if (isInitialLoad.current || !selectedDate) return;
    localStorage.setItem(`cbt_traffic_data_${selectedDate}`, JSON.stringify(trafficData));
  }, [trafficData, selectedDate]);

  // TICKING TIMELINE: Geser grafik setiap 10 detik
  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficData(prevData => {
        return [...prevData.slice(1), 0];
      });
    }, 10000); 

    return () => clearInterval(interval);
  }, []);

  // PENDETEKSI AKTIVITAS: Berdasarkan LOG NYATA siswa
  useEffect(() => {
    if (logs && logs.length > 0) {
      if (lastLogIdRef.current === null) {
        lastLogIdRef.current = logs[0].id;
        return;
      }

      const newLogs = logs.filter(log => log.id > lastLogIdRef.current);

      if (newLogs.length > 0) {
        lastLogIdRef.current = logs[0].id;

        setTrafficData(prevData => {
          const newData = [...prevData];
          newData[newData.length - 1] += newLogs.length;
          return newData;
        });
      }
    }
  }, [logs]); 

  const maxTraffic = Math.max(...trafficData, 5); 

  // --- FETCH DATA (REST API DENGAN FILTER TANGGAL) ---
  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true); 
      const response = await api.get(`/api/admin/monitoring?date=${selectedDate}`);
      const payload = response.data?.data || response.data;

      if (payload) {
        if (payload.stats) setStats(payload.stats);
        if (payload.peserta) setPeserta(payload.peserta);
        if (payload.logs) setLogs(payload.logs);
      }
    } catch (error) {
      console.error("❌ [REST API] Gagal mengambil data Live Monitoring:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- SOCKET LISTENERS & TRIGGER FETCH DATA ---
  useEffect(() => {
    fetchMonitoringData();

    if (!socket) return;

    const handleSilentRefresh = () => {
      // Refresh diam-diam tanpa merusak state loading jika tanggal yang dibuka adalah hari ini
      if (selectedDate === getTodayDateString()) {
        api.get(`/api/admin/monitoring?date=${selectedDate}`).then((response) => {
          const payload = response.data?.data || response.data;
          if (payload) {
            if (payload.stats) setStats(payload.stats);
            if (payload.peserta) setPeserta(payload.peserta);
            if (payload.logs) setLogs(payload.logs);
          }
        }).catch(err => console.error(err));
      }
    };

    const handleProgressUpdate = (dataUpdate) => {
      if (selectedDate !== getTodayDateString()) return; // Abaikan update real-time jika melihat histori tanggal lain
      setPeserta((prevPeserta) => 
        prevPeserta.map((p) => {
          if (p.siswa_id === dataUpdate.siswa_id) {
            return { 
                ...p, 
                terjawab: dataUpdate.terjawab,
                total_soal: dataUpdate.total_soal || p.total_soal 
            }; 
          }
          return p;
        })
      );
    };

    socket.on('peserta:update', handleSilentRefresh);
    socket.on('stats:refresh', handleSilentRefresh);
    socket.on('stats:update', handleSilentRefresh);
    socket.on('log:new', handleSilentRefresh);
    socket.on('peserta:progress_update', handleProgressUpdate); 

    return () => {
      socket.off('peserta:update', handleSilentRefresh);
      socket.off('stats:refresh', handleSilentRefresh);
      socket.off('stats:update', handleSilentRefresh);
      socket.off('log:new', handleSilentRefresh);
      socket.off('peserta:progress_update', handleProgressUpdate); 
    };
  }, [socket, selectedDate]); // Mengulang effect saat tanggal filter diubah

  // --- HELPER FUNCTIONS ---
  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-rose-600', 'bg-indigo-600', 'bg-cyan-600', 'bg-violet-600'];
    const index = (name?.length || 0) % colors.length;
    return colors[index];
  };

const handleAksiPeserta = async (studentExamId, siswaId, actionType) => {
    try {
      if (actionType === 'buka-kunci') {
        await api.post('/api/admin/exams/reset-siswa', { student_exam_id: studentExamId });
        await fetchMonitoringData(); // 🔥 Tambahkan await
      } 
      else if (actionType === 'reset-login') {
        const konfirmasi = await Swal.fire({
          title: 'Reset Device?',
          text: 'Ini akan menghapus sesi perangkat siswa. Siswa harus login ulang dari awal. Lanjutkan?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Ya, Reset!'
        });

        if (konfirmasi.isConfirmed) {
          // 1. Tembak API Reset
          await api.post('/api/admin/peserta/reset-login', { id: siswaId });
          
          // 2. 🔥 WAJIB AWAIT: Tunggu sampai data terbaru dari server selesai ditarik
          await fetchMonitoringData(); 
          
          // 3. Baru munculkan notifikasi sukses
          Swal.fire('Berhasil!', 'Device siswa berhasil di-reset.', 'success');
        }
      } 
      else {
        await api.post(`/api/admin/peserta/${actionType}`, { id: siswaId });
        await fetchMonitoringData(); // 🔥 Tambahkan await
      }
    } catch (error) {
      console.error(`❌ Gagal: ${actionType}`, error);
      Swal.fire('Gagal!', `Terjadi kesalahan saat memproses ${actionType}.`, 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Selesai': 
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200">✔ Selesai</span>;
      case 'Mengerjakan': 
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">● Mengerjakan</span>;
      case 'Terkunci': 
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">🔒 Terkunci</span>;
      case 'Login': 
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">● Login (Standby)</span>;
      case 'Belum Login':
      default: 
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500 border border-slate-200">○ Belum Login</span>;
    }
  };

  const getStatusProgressBarColor = (status) => {
    if (status === 'Selesai') return 'bg-blue-600';
    if (status === 'Terkunci') return 'bg-rose-600';
    if (status === 'Login') return 'bg-indigo-400';
    if (status === 'Belum Login') return 'bg-slate-300';
    return 'bg-emerald-500';
  };

  // --- FILTER, PENCARIAN & PAGINASI (DENGAN DEDUPLIKASI) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 

  const uniquePeserta = useMemo(() => {
    const map = new Map();
    peserta.forEach(p => {
      const uniqueKey = p.student_exam_id || p.siswa_id || p.id;
      if (uniqueKey) {
        map.set(uniqueKey, p);
      }
    });
    return Array.from(map.values());
  }, [peserta]); 

  const daftarKelas = useMemo(() => {
    const classes = uniquePeserta.map(p => p.kelas).filter(Boolean);
    return [...new Set(classes)].sort();
  }, [uniquePeserta]);

  const filteredData = useMemo(() => {
    return uniquePeserta.filter(p => {
      const nama = p.nama ? p.nama.toLowerCase() : '';
      const idSiswa = p.id ? p.id.toString().toLowerCase() : '';
      const search = searchTerm.toLowerCase();

      const matchSearch = nama.includes(search) || idSiswa.includes(search);
      const matchKelas = kelasFilter ? p.kelas === kelasFilter : true;
      
      return matchSearch && matchKelas;
    });
  }, [uniquePeserta, searchTerm, kelasFilter]);

  const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = itemsPerPage === 'All' ? 0 : (currentPage - 1) * itemsPerPage;
  const paginatedData = itemsPerPage === 'All' 
    ? filteredData 
    : filteredData.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, kelasFilter, itemsPerPage]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      
      {/* KIRI: AREA UTAMA */}
      <div className="flex-1 space-y-6">
        
        {/* HEADER & FILTER TANGGAL SEJAJAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Monitoring Real-time 
              {selectedDate === getTodayDateString() && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-600 text-white font-black uppercase animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.5)]">Live</span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Ujian Sesi: {selectedDate === getTodayDateString() ? 'Hari Ini' : selectedDate}</p>
          </div>
          
          {/* FILTER TANGGAL DI ATAS SEJAJAR KANAN */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-inner w-full sm:w-auto">
            <Calendar size={16} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:inline">Tanggal Ujian:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer w-full sm:w-auto"
            />
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Siswa Login</p>
                <h3 className="text-3xl font-black text-blue-900">{stats?.siswaLogin || 0}</h3>
              </div>
              <div className="p-2 bg-blue-50/80 rounded-lg text-blue-800">
                <Users size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-5 flex items-end gap-1.5 h-6">
              <div className="w-full bg-blue-200/60 h-[20%] rounded-t-sm"></div>
              <div className="w-full bg-blue-300/60 h-[40%] rounded-t-sm"></div>
              <div className="w-full bg-blue-400/60 h-[30%] rounded-t-sm"></div>
              <div className="w-full bg-blue-500/80 h-[50%] rounded-t-sm"></div>
              <div className="w-full bg-blue-700/90 h-[70%] rounded-t-sm"></div>
              <div className="w-full bg-blue-900 h-full rounded-t-sm"></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Exams</p>
                <h3 className="text-3xl font-black text-emerald-600">{stats?.ujianAktif || 0}</h3>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                <ClipboardList size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-5 flex items-end gap-1.5 h-6">
              <div className="w-full bg-emerald-300/60 h-[30%] rounded-t-sm"></div>
              <div className="w-full bg-emerald-400/70 h-[50%] rounded-t-sm"></div>
              <div className="w-full bg-emerald-200/50 h-[20%] rounded-t-sm"></div>
              <div className="w-full bg-emerald-500/80 h-[60%] rounded-t-sm"></div>
              <div className="w-full bg-emerald-600/90 h-[40%] rounded-t-sm"></div>
              <div className="w-full bg-emerald-800 h-[80%] rounded-t-sm"></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Submit Hari Ini</p>
                <h3 className="text-3xl font-black text-blue-900">{stats?.submitHariIni || 0}</h3>
              </div>
              <div className="p-2 bg-blue-50/80 rounded-lg text-blue-800">
                <CheckSquare size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Progress</span>
                <span className="text-[10px] font-bold text-slate-800">
                  {stats?.siswaLogin > 0 ? Math.min(100, (stats.submitHariIni / stats.siswaLogin) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-900 h-1.5 rounded-full" style={{ width: `${stats?.siswaLogin > 0 ? Math.min(100, (stats.submitHariIni / stats.siswaLogin) * 100) : 0}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pelanggaran</p>
                <h3 className="text-3xl font-black text-rose-600">{stats?.pelanggaran || 0}</h3>
              </div>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Warning Level</span>
                <span className="text-[10px] font-bold text-rose-600">{stats?.pelanggaran > 0 ? 'Terpantau' : 'Aman'}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-rose-500 h-1.5 rounded-full transition-all" style={{ width: stats?.pelanggaran > 0 ? '100%' : '0%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">Aktivitas Siswa</h2>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
            <div className="flex items-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
               <span className="mr-2">Tampilkan</span>
               <select 
                  value={itemsPerPage} 
                  onChange={(e) => setItemsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value))} 
                  className="bg-transparent outline-none cursor-pointer font-bold text-slate-700"
               >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value="All">Semua</option>
               </select>
            </div>

            {daftarKelas.length > 0 && (
                <select 
                  value={kelasFilter} 
                  onChange={(e) => setKelasFilter(e.target.value)} 
                  className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-600"
                >
                    <option value="">Semua Kelas</option>
                    {daftarKelas.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
            )}

            <div className="relative flex-1 sm:min-w-62.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Cari nama atau NIS..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
              />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <LayoutGrid size={18} />
              </button>
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT SISWA */}
        {isLoading ? (
          <div className="py-10 text-center text-slate-500 animate-pulse font-medium bg-white rounded-xl border border-slate-200">Memuat data monitoring dari server...</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedData.length > 0 ? paginatedData.map((p) => { 
              const totalSoal = p.total_soal || p.totalSoal || 1; 
              let progressPct = p.terjawab ? Math.round((p.terjawab / totalSoal) * 100) : 0;
              if (p.status === 'Selesai' || progressPct > 100) {
                  progressPct = 100;
              }
              const displayWaktu = p.status === 'Selesai' ? (p.lama_pengerjaan || 'Selesai') : (p.sisaWaktu || '-');

              return (
                <div key={p.student_exam_id || p.siswa_id || p.id} className={`bg-white p-5 rounded-2xl border ${p.status === 'Terkunci' ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'} shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4`}>
                  
                  {/* 🔥 PERBAIKAN STRUKTUR HEADER CARD: ANTI BENTROK & TUMPANG TINDIH 🔥 */}
                  <div className="flex justify-between items-start gap-3 min-w-0 w-full">
                    <div className="flex gap-3 items-center min-w-0 flex-1">
                      {/* Avatar dikunci agar tidak mengecil saat nama panjang */}
                      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-inner ${getAvatarColor(p.nama)}`}>
                        {getInitials(p.nama)}
                      </div>
                      {/* Teks nama diberikan batas min-w-0 agar bisa wrap secara rapi */}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-sm break-words line-clamp-2 leading-tight" title={p.nama}>
                          {p.nama || 'Tanpa Nama'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {p.id || '-'}</p>
                      </div>
                    </div>
                    {/* Badge dikunci flex-shrink-0 agar bentuknya tidak gepeng tertekan nama */}
                    <div className="flex-shrink-0 pt-0.5">
                      {getStatusBadge(p.status)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-slate-800">{progressPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${getStatusProgressBarColor(p.status)}`} style={{ width: `${progressPct}%` }}></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-3 border-t border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Clock size={12} /> {p.status === 'Belum Login' ? 'Belum Mulai' : displayWaktu}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <CheckCircle2 size={12} /> {p.terjawab || 0} Terjawab
                      </div>
                      
                      {p.status === 'Selesai' && p.waktu_selesai_pengerjaan && (
                        <div className="text-[9px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium inline-block mt-1">
                          Selesai: {new Date(p.waktu_selesai_pengerjaan).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {p.status === 'Selesai' && (
                        <button onClick={() => navigate(`/hasil/siswa-detail/${p.student_exam_id || p.id}`)} className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg transition-colors border border-indigo-100">
                          Lihat Hasil
                        </button>
                      )}
                      {p.status === 'Terkunci' && (
                        <button onClick={() => handleAksiPeserta(p.student_exam_id, p.siswa_id, 'buka-kunci')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-sm transition-colors">
                          <Unlock size={14} /> Buka Kunci
                        </button>
                      )}
                      {['Login', 'Mengerjakan'].includes(p.status) && (
                          <button onClick={() => handleAksiPeserta(p.student_exam_id, p.siswa_id, 'reset-login')} className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
                            Reset Device
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-10 text-center text-slate-500 bg-white rounded-xl border border-slate-200 font-medium">
                {searchTerm || kelasFilter ? 'Tidak ada siswa yang sesuai dengan pencarian/filter.' : 'Tidak ada aktivitas ujian pada tanggal yang dipilih.'}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Siswa</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Progress</th>
                    <th className="px-6 py-4 font-semibold">Waktu / Selesai</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.length > 0 ? paginatedData.map((p) => { 
                      const totalSoal = p.total_soal || p.totalSoal || 1; 
                      let progressPct = p.terjawab ? Math.round((p.terjawab / totalSoal) * 100) : 0;
                      if (p.status === 'Selesai' || progressPct > 100) {
                          progressPct = 100;
                      }
                      const displayWaktu = p.status === 'Selesai' ? (p.lama_pengerjaan || 'Selesai') : (p.sisaWaktu || '-');

                      return (
                      <tr key={p.student_exam_id || p.siswa_id || p.id} className={`transition-colors ${p.status === 'Terkunci' ? 'bg-rose-50/20' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner ${getAvatarColor(p.nama)}`}>
                            {getInitials(p.nama)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{p.nama || 'Tanpa Nama'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{p.id || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap w-[1%]">{getStatusBadge(p.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 ${getStatusProgressBarColor(p.status)}`} style={{ width: `${progressPct}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-700">{progressPct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                          <div>{displayWaktu}</div>
                          {p.status === 'Selesai' && p.waktu_selesai_pengerjaan && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(p.waktu_selesai_pengerjaan).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          {p.status === 'Selesai' && (
                            <button onClick={() => navigate(`/hasil/siswa-detail/${p.student_exam_id || p.id}`)} className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg transition-colors border border-indigo-100">
                              Lihat Hasil
                            </button>
                          )}
                          {p.status === 'Terkunci' && (
                            <button onClick={() => handleAksiPeserta(p.student_exam_id, p.siswa_id, 'buka-kunci')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-sm transition-colors">
                              <Unlock size={14} /> Buka Kunci
                            </button>
                          )}
                          {['Login', 'Mengerjakan'].includes(p.status) && (
                            <button onClick={() => handleAksiPeserta(p.student_exam_id, p.siswa_id, 'reset-login')} className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
                              Reset Device
                            </button>
                          )}
                        </td>
                      </tr>
                      )
                  }) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-slate-500 font-medium">
                         {searchTerm || kelasFilter ? 'Tidak ada siswa yang sesuai dengan pencarian/filter.' : 'Tidak ada aktivitas ujian pada tanggal yang dipilih.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- FOOTER PAGINATION --- */}
        {!isLoading && filteredData.length > 0 && (
          <div className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 bg-white mt-4 shadow-sm">
             <span className="text-sm text-slate-500">
                Menampilkan {startIndex + 1} - {itemsPerPage === 'All' ? filteredData.length : Math.min(startIndex + itemsPerPage, filteredData.length)} dari {filteredData.length} siswa
             </span>
             
             {itemsPerPage !== 'All' && totalPages > 1 && (
                 <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1} 
                      className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={18}/>
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => {
                      if (totalPages > 7 && (num < currentPage - 2 || num > currentPage + 2) && num !== 1 && num !== totalPages) {
                          if (num === currentPage - 3 || num === currentPage + 3) return <span key={num} className="text-slate-400">...</span>;
                          return null;
                      }

                      return (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          className={`min-w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition ${
                            currentPage === num 
                              ? 'bg-[#1e293b] text-white shadow-sm' 
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      )
                    })}

                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages} 
                      className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition"
                    >
                      <ChevronRight size={18}/>
                    </button>
                 </div>
             )}
          </div>
        )}
      </div>

      {/* KANAN: SIDEBAR WIDGETS */}
      <div className="w-full lg:w-80 space-y-6">
        
        {/* TRAFFIC CHART */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          
          {/* Efek visual garis grid tipis di latar belakang agar terlihat seperti grafik sungguhan */}
          <div className="absolute inset-x-0 top-16 bottom-14 flex flex-col justify-between px-5">
            <div className="border-t border-slate-100 w-full h-px"></div>
            <div className="border-t border-slate-100 w-full h-px"></div>
          </div>

          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="font-bold text-sm text-slate-800">Traffic Aktivitas</h3>
            <div className={`p-1.5 rounded-full ${trafficData[trafficData.length - 1] > 0 ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
              <Activity size={16} />
            </div>
          </div>
          
          {/* Wadah Utama Grafik */}
          <div className="flex items-end gap-2 h-32 w-full pt-4 relative z-10">
            {trafficData.map((h, i) => {
              
              // Perhitungan ketinggian (Landasan visual 5% agar batang kosong tetap terlihat estetik)
              const heightPercentage = Math.max((h / maxTraffic) * 100, 5); 
              
              return (
                
                <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full" title={`${h} aktivitas`}>
                  
                  {/* Tooltip Angka kecil yang muncul saat di-hover */}
                  <div className="absolute -top-7 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap shadow-sm">
                    {h} Aktivitas
                  </div>

                  <div 
                    className={`w-full rounded-t-sm transition-all duration-300 relative z-10 ${
                      i === trafficData.length - 1 
                        ? h > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-300' // Detik berjalan saat ini
                        : h > 0 
                          ? 'bg-blue-400 group-hover:bg-blue-500' // Ada aktivitas siswa
                          : 'bg-slate-100 group-hover:bg-slate-200' // Batang kosong (Idle), HARUS TERLIHAT!
                    }`} 
                    // 🔥 Tinggi batang dalam persen akan berfungsi jika induknya (di atas) h-full
                    style={{ height: `${heightPercentage}%` }} 
                  ></div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider relative z-10">
            <span>{trafficStartTime || "08:00"}</span>
            <span className="text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE NOW
            </span>
          </div>
        </div>

        {/* ACTIVITY LOGS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1">
          <h3 className="font-bold text-sm text-slate-800 mb-6">Log Aktivitas</h3>
          <div className="space-y-6 max-h-125 overflow-y-auto pr-2">
            {logs.length > 0 ? logs.map((log) => (
              <div key={log.id || Math.random()} className="relative flex items-start gap-4">
                <div className={`relative z-10 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center bg-white ${
                  log.type === 'start' ? 'text-emerald-500' : 
                  log.type === 'warning' ? 'text-amber-500' : 
                  log.type === 'error' ? 'text-rose-500' : 'text-blue-500'
                }`}>
                  {log.type === 'start' ? <ArrowRightCircle size={14} className="bg-emerald-500 text-white rounded-full" /> : 
                   log.type === 'warning' ? <div className="w-2.5 h-2.5 rounded bg-amber-500" /> : 
                   log.type === 'error' ? <AlertTriangle size={12} /> : 
                   <CheckCircle2 size={14} className="text-blue-500" />}
                </div>
                <div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{log.text}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{log.time}</p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-slate-400 text-center py-4 relative z-10 bg-white">Belum ada aktivitas terekam.</p>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default LiveMonitoring;