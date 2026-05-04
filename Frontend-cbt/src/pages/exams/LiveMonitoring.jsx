import { useState, useEffect } from 'react';
import { 
  Activity, Users, CheckCircle2, AlertTriangle, 
  Search, LayoutGrid, List, Clock, MessageSquare, 
  RefreshCcw, PlayCircle, Eye, Bell, ArrowRightCircle
} from 'lucide-react';

const LiveMonitoring = () => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' atau 'table'

  // --- DUMMY DATA PESERTA ---
  const [peserta, setPeserta] = useState([
    { id: '10293847', nama: 'Ahmad Saputra', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad', progress: 75, terjawab: 30, totalSoal: 40, status: 'Aktif', sisaWaktu: '45:20' },
    { id: '10293848', nama: 'Budi Nugroho', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi', progress: 40, terjawab: 16, totalSoal: 40, status: 'Idle', idleTime: '05:20', sisaWaktu: '52:10' },
    { id: '10293849', nama: 'Citra Wulandari', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Citra', progress: 15, terjawab: 6, totalSoal: 40, status: 'Terputus', sisaWaktu: '--:--' },
    { id: '10293850', nama: 'Dwi Irawan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dwi', progress: 100, terjawab: 40, totalSoal: 40, status: 'Selesai', sisaWaktu: '-' },
    { id: '10293851', nama: 'Eka Kusuma', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eka', progress: 88, terjawab: 35, totalSoal: 40, status: 'Aktif', sisaWaktu: '12:05' },
    { id: '10293852', nama: 'Fajar Hidayat', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fajar', progress: 60, terjawab: 24, totalSoal: 40, status: 'Aktif', sisaWaktu: '30:15' },
  ]);

  // --- DUMMY DATA LOGS ---
  const logs = [
    { id: 1, time: 'Baru saja', text: 'Ahmad Saputra mulai mengerjakan ujian.', type: 'start' },
    { id: 2, time: '2 menit yang lalu', text: 'Budi Nugroho berpindah tab browser.', type: 'warning' },
    { id: 3, time: '5 menit yang lalu', text: 'Dwi Irawan menyelesaikan ujian.', type: 'success' },
    { id: 4, time: '12 menit yang lalu', text: 'Koneksi Citra Wulandari terputus.', type: 'error' },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Aktif': return 'bg-success text-white border-success';
      case 'Selesai': return 'bg-primary text-white border-primary';
      case 'Idle': return 'bg-warning text-white border-warning';
      case 'Terputus': return 'bg-error text-white border-error';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  };

  const getStatusBadge = (status, idleTime) => {
    switch (status) {
      case 'Aktif': return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-success/10 text-success border border-success/20">● Aktif</span>;
      case 'Selesai': return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20">✔ Selesai</span>;
      case 'Idle': return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-warning/10 text-warning border border-warning/20">● Idle ({idleTime})</span>;
      case 'Terputus': return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-error/10 text-error border border-error/20">● Terputus</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      
      {/* KIRI: AREA UTAMA (STATS & DAFTAR SISWA) */}
      <div className="flex-1 space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
              Monitoring Real-time 
              <span className="px-2 py-0.5 rounded text-[10px] bg-error text-white font-black uppercase animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]">Live</span>
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">Ujian Aktif: Matematika Semester Ganjil</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
            Akhiri Sesi Ujian
          </button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"><Users size={16} /></div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Peserta</p>
            </div>
            <p className="text-2xl font-black text-on-surface">120</p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-success">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success"><PlayCircle size={16} /></div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Mengerjakan</p>
            </div>
            <p className="text-2xl font-black text-success">95</p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-primary">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><CheckCircle2 size={16} /></div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Selesai</p>
            </div>
            <p className="text-2xl font-black text-primary">20</p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm border-t-4 border-t-warning">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-warning"><AlertTriangle size={16} /></div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Idle / Peringatan</p>
            </div>
            <p className="text-2xl font-black text-warning">5</p>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & TOGGLE VIEW */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm">
          <h2 className="text-lg font-bold text-on-surface">Aktivitas Siswa</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input type="text" placeholder="Cari nama atau NIS..." className="w-full pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex bg-surface-container p-1 rounded-lg border border-outline-variant">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>
                <LayoutGrid size={18} />
              </button>
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT: GRID OR TABLE VIEW */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {peserta.map((p) => (
              <div key={p.id} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
                {/* Card Header */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <img src={p.avatar} alt={p.nama} className="w-10 h-10 rounded-full bg-surface-container" />
                    <div>
                      <p className="font-bold text-on-surface text-sm">{p.nama}</p>
                      <p className="text-[10px] text-on-surface-variant font-mono">ID: {p.id}</p>
                    </div>
                  </div>
                  {getStatusBadge(p.status, p.idleTime)}
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-on-surface-variant">Progress</span>
                    <span className="text-on-surface">{p.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className={`h-full ${p.status === 'Selesai' ? 'bg-primary' : p.status === 'Terputus' ? 'bg-error' : p.status === 'Idle' ? 'bg-warning' : 'bg-success'}`} style={{ width: `${p.progress}%` }}></div>
                  </div>
                </div>

                {/* Footer Info & Actions */}
                <div className="flex justify-between items-end pt-2 border-t border-outline-variant/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                      <Clock size={12} /> {p.status === 'Terputus' ? 'Koneksi Hilang' : p.sisaWaktu}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                      <CheckCircle2 size={12} /> {p.terjawab}/{p.totalSoal} Soal
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.status === 'Selesai' ? (
                      <button className="px-3 py-1.5 text-xs font-bold bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors">Lihat Hasil</button>
                    ) : (
                      <>
                        <button className="p-1.5 text-on-surface-variant hover:text-primary bg-surface-container hover:bg-primary/10 rounded-lg transition-colors" title="Kirim Pesan"><MessageSquare size={14} /></button>
                        <button className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${p.status === 'Terputus' ? 'bg-error text-white hover:bg-error/90' : 'bg-surface-container-highest text-on-surface hover:bg-on-surface hover:text-surface-container-lowest'}`}>
                          {p.status === 'Terputus' ? 'Paksa Login' : 'Reset Login'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/50 text-xs uppercase text-on-surface-variant border-b border-outline-variant">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Siswa</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Progress</th>
                    <th className="px-6 py-4 font-semibold">Sisa Waktu</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {peserta.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-container-lowest/50">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getStatusStyle(p.status)}`}>
                          {p.nama.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{p.nama}</p>
                          <p className="text-[10px] text-on-surface-variant">{p.id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(p.status, p.idleTime)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-surface-container rounded-full overflow-hidden">
                            <div className={`h-full ${p.status === 'Selesai' ? 'bg-primary' : p.status === 'Terputus' ? 'bg-error' : p.status === 'Idle' ? 'bg-warning' : 'bg-success'}`} style={{ width: `${p.progress}%` }}></div>
                          </div>
                          <span className="text-xs font-bold">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{p.sisaWaktu}</td>
                      <td className="px-6 py-4 text-right">
                        {p.status === 'Selesai' ? (
                          <button className="p-2 text-on-surface-variant hover:text-primary"><Eye size={16} /></button>
                        ) : p.status === 'Terputus' ? (
                          <button className="text-xs font-bold text-error hover:underline flex items-center gap-1 justify-end ml-auto"><RefreshCcw size={12} /> Reset Login</button>
                        ) : (
                          <button className="p-2 text-on-surface-variant hover:text-warning"><Bell size={16} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* KANAN: SIDEBAR WIDGETS (TRAFFIC & LOGS) */}
      <div className="w-full lg:w-80 space-y-6">
        
        {/* TRAFFIC CHART */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-sm text-on-surface">Traffic Aktivitas</h3>
            <Activity size={16} className="text-on-surface-variant" />
          </div>
          <div className="flex items-end gap-2 h-32 w-full">
            {/* Simple CSS Bar Chart Mockup */}
            {[40, 60, 30, 80, 50, 90, 100, 70, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                <div className={`w-full rounded-t-sm transition-all duration-500 ${i > 6 ? 'bg-success' : 'bg-surface-container-highest group-hover:bg-primary/50'}`} style={{ height: `${h}%` }}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
            <span>08:00</span>
            <span className="text-success flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span> LIVE NOW</span>
          </div>
        </div>

        {/* ACTIVITY LOGS */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm flex-1">
          <h3 className="font-bold text-sm text-on-surface mb-6">Log Aktivitas</h3>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.75 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-outline-variant before:via-outline-variant before:to-transparent">
            {logs.map((log) => (
              <div key={log.id} className="relative flex items-start gap-4">
                <div className={`relative z-10 w-6 h-6 rounded-full border-2 border-surface-container-lowest flex items-center justify-center bg-white ${
                  log.type === 'start' ? 'text-success' : 
                  log.type === 'warning' ? 'text-warning' : 
                  log.type === 'error' ? 'text-error' : 'text-primary'
                }`}>
                  {log.type === 'start' ? <ArrowRightCircle size={14} className="bg-success text-white rounded-full" /> : 
                   log.type === 'warning' ? <div className="w-2.5 h-2.5 rounded bg-warning" /> : 
                   log.type === 'error' ? <AlertTriangle size={12} /> : 
                   <CheckCircle2 size={14} className="text-primary" />}
                </div>
                <div>
                  <p className="text-xs text-on-surface font-medium leading-relaxed">{log.text}</p>
                  <p className="text-[10px] text-on-surface-variant mt-1">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default LiveMonitoring;