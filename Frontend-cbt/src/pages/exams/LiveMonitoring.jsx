import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import { 
  Activity, Users, CheckSquare, AlertTriangle, ClipboardList,
  Search, LayoutGrid, List, Clock, MessageSquare, 
  RefreshCcw, Eye, ArrowRightCircle, CheckCircle2, Unlock
} from 'lucide-react';

const LiveMonitoring = ({ socket, examId = 1 }) => { 
  const [viewMode, setViewMode] = useState('grid');
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    siswaLogin: 0,
    ujianAktif: 0,
    submitHariIni: 0,
    pelanggaran: 0
  });

  const [peserta, setPeserta] = useState([]);
  const [logs, setLogs] = useState([]);
  const [trafficData, setTrafficData] = useState([]);

  const fetchMonitoringData = async () => {
    try {
      if (peserta.length === 0) setIsLoading(true); 
      const response = await api.get('/api/admin/monitoring');
      const payload = response.data?.data || response.data;

      if (payload) {
        if (payload.stats) setStats(payload.stats);
        if (payload.peserta) setPeserta(payload.peserta);
        if (payload.logs) setLogs(payload.logs);
        if (payload.traffic) setTrafficData(payload.traffic);
      }
    } catch (error) {
      console.error("❌ [REST API] Gagal mengambil data Live Monitoring:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();

    if (!socket) return;

    const handleSilentRefresh = () => {
      fetchMonitoringData();
    };

    socket.on('peserta:update', handleSilentRefresh);
    socket.on('stats:refresh', handleSilentRefresh);
    socket.on('stats:update', handleSilentRefresh);
    socket.on('log:new', handleSilentRefresh);

    return () => {
      socket.off('peserta:update', handleSilentRefresh);
      socket.off('stats:refresh', handleSilentRefresh);
      socket.off('stats:update', handleSilentRefresh);
      socket.off('log:new', handleSilentRefresh);
    };
  }, [socket]);

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
      // ✅ Perbaikan: Sesuaikan endpoint dengan yang ada di adminRoutes.js
      await api.post('/api/admin/exams/reset-siswa', { student_exam_id: studentExamId });
    } else {
      await api.post(`/api/admin/peserta/${actionType}`, { id: siswaId });
    }
    
    // Refresh data setelah aksi berhasil
    fetchMonitoringData();

    // (Opsional) Tambahkan notifikasi sukses jika pakai SweetAlert
    Swal.fire('Berhasil!', `Aksi ${actionType} sukses dilakukan.`, 'success');

  } catch (error) {
    console.error(`❌ Gagal: ${actionType}`, error);
    // (Opsional) Tambahkan notifikasi error jika pakai SweetAlert
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

  const handleBukaKunci = async (studentExamId, namaSiswa) => {
    // 1. Konfirmasi dulu biar gak kepencet
    const konfirmasi = await Swal.fire({
        title: 'Buka Kunci Ujian?',
        text: `Apakah Anda yakin ingin membuka kunci ujian untuk ${namaSiswa}? Siswa harus login ulang setelah ini.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Buka!',
        cancelButtonText: 'Batal'
    });

    if (konfirmasi.isConfirmed) {
        try {
            // 2. Tembak API Backend
            const response = await api.post('/api/admin/exams/reset-siswa', { 
                student_exam_id: studentExamId 
            });

            if (response.data.success) {
                Swal.fire('Berhasil!', response.data.message, 'success');
                
                // 3. (Opsional) Refresh data lokal jika socket belum auto-update
                // fetchMonitoringData(); 
            }
        } catch (error) {
            console.error('❌ Gagal: buka-kunci', error);
            Swal.fire('Gagal!', error.response?.data?.message || 'Terjadi kesalahan server.', 'error');
            }
        }
    };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      
      {/* KIRI: AREA UTAMA */}
      <div className="flex-1 space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Monitoring Real-time 
              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-600 text-white font-black uppercase animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.5)]">Live</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">Ujian Aktif: Matematika Semester Ganjil</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            Akhiri Sesi Ujian
          </button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Siswa Login */}
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

          {/* Card 2: Active Exams */}
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

          {/* Card 3: Submit Hari Ini */}
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

          {/* Card 4: Pelanggaran (Membaca ujian yang "Terkunci") */}
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

        {/* TOOLBAR */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">Aktivitas Siswa</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Cari nama atau NIS..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
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
          <div className="py-10 text-center text-slate-500 animate-pulse font-medium bg-white rounded-xl border border-slate-200">Memuat data live dari server...</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {peserta.length > 0 ? peserta.map((p) => {
              const totalSoal = p.total_soal || 40; 
              const progressPct = p.terjawab ? Math.round((p.terjawab / totalSoal) * 100) : 0;

              return (
                <div key={p.siswa_id || Math.random()} className={`bg-white p-5 rounded-2xl border ${p.status === 'Terkunci' ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'} shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4`}>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner ${getAvatarColor(p.nama)}`}>
                        {getInitials(p.nama)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{p.nama || 'Tanpa Nama'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {p.id || '-'}</p>
                      </div>
                    </div>
                    {getStatusBadge(p.status)}
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
                        <Clock size={12} /> {p.status === 'Belum Login' ? 'Belum Mulai' : p.sisaWaktu || '-'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <CheckCircle2 size={12} /> {p.terjawab || 0} Terjawab
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {p.status === 'Selesai' && (
                        <button className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">Lihat Hasil</button>
                      )}
                      
                      {p.status === 'Terkunci' && (
                        <button 
                          // Format: (param1: studentExamId, param2: siswaId, param3: actionType)
                          onClick={() => handleAksiPeserta(p.student_exam_id, p.siswa_id, 'buka-kunci')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
                        >
                          <Unlock size={14} /> Buka Kunci
                        </button>
                      )}

                      {['Login', 'Mengerjakan'].includes(p.status) && (
                         <button 
                         onClick={() => handleAksiPeserta(null, p.siswa_id, 'reset-login')}
                         className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                       >
                         Reset Device
                       </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-10 text-center text-slate-500 bg-white rounded-xl border border-slate-200 font-medium">Sesi ujian belum dimulai atau tidak ada peserta.</div>
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
                    <th className="px-6 py-4 font-semibold">Sisa Waktu</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {peserta.length > 0 ? peserta.map((p) => {
                     const totalSoal = p.total_soal || 40; 
                     const progressPct = p.terjawab ? Math.round((p.terjawab / totalSoal) * 100) : 0;
                     return (
                      <tr key={p.id || Math.random()} className={`transition-colors ${p.status === 'Terkunci' ? 'bg-rose-50/20' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner ${getAvatarColor(p.nama)}`}>
                            {getInitials(p.nama)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{p.nama || 'Tanpa Nama'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{p.id || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 ${getStatusProgressBarColor(p.status)}`} style={{ width: `${progressPct}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-700">{progressPct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{p.sisaWaktu || '-'}</td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          {p.status === 'Selesai' && (
                            <button className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">Lihat Hasil</button>
                          )}
                          {p.status === 'Terkunci' && (
                            <button 
                              // Format: (param1: studentExamId, param2: siswaId, param3: actionType)
                              onClick={() => handleAksiPeserta(p.student_exam_id, p.siswa_id, 'buka-kunci')}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
                            >
                              <Unlock size={14} /> Buka Kunci
                            </button>
                          )}
                          {['Login', 'Mengerjakan'].includes(p.status) && (
                            <button 
                              onClick={() => handleAksiPeserta(null, p.siswa_id, 'reset-login')}
                              className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                            >
                              Reset Device
                            </button>
                          )}
                        </td>
                      </tr>
                     )
                  }) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-slate-500 font-medium">Sesi ujian belum dimulai atau tidak ada peserta.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* KANAN: SIDEBAR WIDGETS */}
      <div className="w-full lg:w-80 space-y-6">
        
        {/* TRAFFIC CHART */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-sm text-slate-800">Traffic Aktivitas</h3>
            <Activity size={16} className="text-slate-400" />
          </div>
          <div className="flex items-end gap-2 h-32 w-full">
            {trafficData.length > 0 ? trafficData.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                <div 
                  className={`w-full rounded-t-sm transition-all duration-500 ${i === trafficData.length - 1 ? 'bg-emerald-500' : 'bg-slate-200 group-hover:bg-blue-300'}`} 
                  style={{ height: `${h || 5}%` }}
                ></div>
              </div>
            )) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Menunggu data...</div>
            )}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>08:00</span>
            <span className="text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE NOW
            </span>
          </div>
        </div>

        {/* ACTIVITY LOGS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1">
          <h3 className="font-bold text-sm text-slate-800 mb-6">Log Aktivitas</h3>
          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
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