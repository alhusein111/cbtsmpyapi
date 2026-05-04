import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig'; // Pastikan path ini benar!
import { 
  Users, ClipboardList, CheckSquare, AlertTriangle, LogIn, LogOut 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

const AdminDashboard = ({ socket }) => { 
  console.log("Cek Status Socket di Dashboard:", socket ? "ADA KONEKSI ✅" : "KOSONG/UNDEFINED ❌");
  
  // 1. STATE TOKEN
  const [tokens, setTokens] = useState({ masuk: '------', keluar: '------' });

  // 2. STATE STATISTIK (Disesuaikan dengan permintaan baru)
  const [stats, setStats] = useState({
    totalSiswa: 0,
    ujianAktif: 0,
    submitHariIni: 0, // Pengganti Rata-rata Nilai
    pelanggaran: 0    // Pengganti Mata Pelajaran
  });

  // 3. STATE GRAFIK
  const [dataNilai, setDataNilai] = useState([]);
  const [dataUjian, setDataUjian] = useState([]);

  // FUNGSI TARIK SEMUA DATA AWAL DARI BACKEND
  const fetchDashboardData = async () => {
    try {
      const resToken = await api.get('/api/admin/tokens'); 
      if (resToken.data) {
        setTokens({ masuk: resToken.data.token_masuk, keluar: resToken.data.token_keluar });
      }

      const resDashboard = await api.get('/api/admin/dashboard');
      if (resDashboard.data) {
        setStats({
          totalSiswa: resDashboard.data.total_siswa || 0,
          ujianAktif: resDashboard.data.ujian_aktif || 0,
          submitHariIni: resDashboard.data.submit_hari_ini || 0, // Pastikan backend ngirim key ini
          pelanggaran: resDashboard.data.pelanggaran_siswa || 0  // Pastikan backend ngirim key ini
        });
        if (resDashboard.data.grafik_nilai) setDataNilai(resDashboard.data.grafik_nilai);
        if (resDashboard.data.grafik_ujian) setDataUjian(resDashboard.data.grafik_ujian);
      }
    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error);
    }
  };

  useEffect(() => {
    // 1. Tarik data saat halaman pertama kali dimuat
    fetchDashboardData();

    if (!socket) return;

    // 2. SOCKET LISTENER: Update Token (Dari Cron Job)
    socket.on('token:update', (data) => { 
      setTokens({ masuk: data.token_masuk, keluar: data.token_keluar });
    });

    // 3. SOCKET LISTENER: Update Dashboard Real-time (Siswa Submit / Pelanggaran / Dll)
    // Pastikan backend Mas Brow memancarkan io.emit('dashboard:update', dataTerbaru) 
    socket.on('dashboard:update', (dataTerbaru) => {
      console.log("Menerima update dashboard real-time!", dataTerbaru);
      
      // Update Stats Card
      if(dataTerbaru.stats) {
        setStats(prev => ({ ...prev, ...dataTerbaru.stats }));
      }
      
      // Update Grafik Bar (Average Scores)
      if(dataTerbaru.grafik_nilai) setDataNilai(dataTerbaru.grafik_nilai);
      
      // Update Grafik Pie (Exam Completion)
      if(dataTerbaru.grafik_ujian) setDataUjian(dataTerbaru.grafik_ujian);
    });

    // Cleanup saat pindah halaman
    return () => {
      socket.off('token:update');
      socket.off('dashboard:update');
    };
  }, [socket]);

  // Persentase ujian selesai untuk Pie Chart Center Text
  const totalSiswaUjian = dataUjian.reduce((acc, curr) => acc + curr.value, 0);
  const siswaSelesai = dataUjian.find(d => d.name === 'Selesai' || d.name === 'Finished')?.value || 0;
  const persentaseSelesai = totalSiswaUjian > 0 ? Math.round((siswaSelesai / totalSiswaUjian) * 100) : 0;

  // Render Custom Legend Pie Chart agar mirip gambar
  const renderColorfulLegendText = (value, entry) => {
    const { color } = entry;
    let label = value;
    if(value === 'Finished' || value === 'Selesai') label = `Finished (${persentaseSelesai}%)`;
    if(value === 'In Progress' || value === 'Proses') label = `In Progress (${Math.round(((entry.payload.value)/totalSiswaUjian)*100)}%)`;
    if(value === 'Not Started' || value === 'Belum') label = `Not Started (${Math.round(((entry.payload.value)/totalSiswaUjian)*100)}%)`;
    return <span style={{ color: '#475569', fontSize: '12px', fontWeight: '500', marginRight: '10px' }}>{label}</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- SECTION TOKEN --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50 rounded-2xl p-6 flex justify-between items-center border border-emerald-100 shadow-sm">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Token Masuk</p>
            <h2 className="text-4xl font-black text-emerald-700 tracking-widest mb-2">{tokens.masuk}</h2>
            <p className="text-sm text-emerald-600/80">Digunakan untuk login pertama kali di CBT</p>
          </div>
          <div className="bg-emerald-200/50 p-4 rounded-xl text-emerald-600 shadow-sm">
            <LogIn size={32} strokeWidth={2} />
          </div>
        </div>

        <div className="bg-indigo-50 rounded-2xl p-6 flex justify-between items-center border border-indigo-100 shadow-sm">
          <div>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Token Keluar</p>
            <h2 className="text-4xl font-black text-indigo-700 tracking-widest mb-2">{tokens.keluar}</h2>
            <p className="text-sm text-indigo-600/80">Digunakan untuk mengakhiri sesi ujian</p>
          </div>
          <div className="bg-indigo-200/50 p-4 rounded-xl text-indigo-600 shadow-sm">
            <LogOut size={32} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* --- 4 KARTU STATISTIK (STYLE MIRIP IMAGE_09F7E5) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. Card Total Siswa (Blue Theme with Mini Bars) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Students</p>
              <h3 className="text-3xl font-black text-blue-900">{stats.totalSiswa}</h3>
            </div>
            <div className="p-2 bg-blue-50/80 rounded-lg text-blue-800">
              <Users size={20} strokeWidth={2.5} />
            </div>
          </div>
          {/* Ornamen Mini Bars */}
          <div className="mt-5 flex items-end gap-1.5 h-6">
            <div className="w-full bg-blue-200/60 h-[20%] rounded-t-sm"></div>
            <div className="w-full bg-blue-300/60 h-[40%] rounded-t-sm"></div>
            <div className="w-full bg-blue-400/60 h-[30%] rounded-t-sm"></div>
            <div className="w-full bg-blue-500/80 h-[50%] rounded-t-sm"></div>
            <div className="w-full bg-blue-700/90 h-[70%] rounded-t-sm"></div>
            <div className="w-full bg-blue-900 h-full rounded-t-sm"></div>
          </div>
        </div>

        {/* 2. Card Ujian Aktif (Green Theme with Mini Bars) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Exams</p>
              <h3 className="text-3xl font-black text-emerald-600">{stats.ujianAktif}</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
              <ClipboardList size={20} strokeWidth={2.5} />
            </div>
          </div>
          {/* Ornamen Mini Bars */}
          <div className="mt-5 flex items-end gap-1.5 h-6">
            <div className="w-full bg-emerald-300/60 h-[30%] rounded-t-sm"></div>
            <div className="w-full bg-emerald-400/70 h-[50%] rounded-t-sm"></div>
            <div className="w-full bg-emerald-200/50 h-[20%] rounded-t-sm"></div>
            <div className="w-full bg-emerald-500/80 h-[60%] rounded-t-sm"></div>
            <div className="w-full bg-emerald-600/90 h-[40%] rounded-t-sm"></div>
            <div className="w-full bg-emerald-800 h-[80%] rounded-t-sm"></div>
          </div>
        </div>

        {/* 3. Card Submit Hari Ini (Progress Bar Theme) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Submit Hari Ini</p>
              <h3 className="text-3xl font-black text-blue-900">{stats.submitHariIni}</h3>
            </div>
            <div className="p-2 bg-blue-50/80 rounded-lg text-blue-800">
              <CheckSquare size={20} strokeWidth={2.5} />
            </div>
          </div>
          {/* Ornamen Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Progress</span>
              <span className="text-[10px] font-bold text-slate-800">{Math.min(100, (stats.submitHariIni / stats.totalSiswa) * 100 || 0).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-blue-900 h-1.5 rounded-full" style={{ width: `${Math.min(100, (stats.submitHariIni / stats.totalSiswa) * 100 || 0)}%` }}></div>
            </div>
          </div>
        </div>

        {/* 4. Card Pelanggaran Siswa (Red Theme, Progress Bar) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pelanggaran Siswa</p>
              <h3 className="text-3xl font-black text-rose-600">{stats.pelanggaran}</h3>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle size={20} strokeWidth={2.5} />
            </div>
          </div>
          {/* Ornamen Progress Bar Merah */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Warning Level</span>
              <span className="text-[10px] font-bold text-rose-600">Terpantau</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: stats.pelanggaran > 0 ? '100%' : '0%' }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* --- GRAFIK DARI DATABASE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BarChart (Average Scores) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
            Average Scores per Subject
            <span className="text-slate-400 cursor-pointer">⋮</span>
          </h3>
          <div className="h-72 w-full">
            {dataNilai.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataNilai} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  {/* Grid hanya horizontal, warna pudar */}
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="mapel" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  {/* Bar warna biru tua pekat sesuai gambar */}
                  <Bar dataKey="nilai" fill="#1e3a8a" radius={[2, 2, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">Belum ada data nilai</div>
            )}
          </div>
        </div>

        {/* PieChart (Exam Completion Donut) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Exam Completion</h3>
          
          {/* PERBAIKAN 1: Ganti min-h-70 menjadi min-h-[300px] agar wadahnya cukup tinggi */}
          <div className="flex-1 w-full flex flex-col justify-center items-center relative min-h-75">
            {dataUjian.length > 0 ? (
              <>
                {/* PERBAIKAN 2: Sesuaikan posisi "top" teks agar persis di tengah Donut (top-[42%]) */}
                <div className="absolute flex flex-col items-center justify-center top-[42%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <span className="text-3xl font-black text-slate-800">{persentaseSelesai}%</span>
                  <span className="text-xs font-bold text-slate-600 mt-1">Finished</span>
                </div>
                
                {/* PERBAIKAN 3: Tambah height dan margin agar legend tidak mepet */}
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <Pie 
                      data={dataUjian} 
                      innerRadius={65}  
                      outerRadius={85}  
                      paddingAngle={2} 
                      dataKey="value" 
                      stroke="none"
                      cx="50%"
                      cy="45%"
                    >
                      {/* Mapping warna */}
                      {dataUjian.map((entry, index) => {
                        let barColor = '#e2e8f0'; // Default gray untuk Not Started
                        if(entry.name === 'Selesai' || entry.name === 'Finished') barColor = '#047857'; // Hijau tua
                        if(entry.name === 'Proses' || entry.name === 'In Progress') barColor = '#1e3a8a'; // Biru tua
                        
                        return <Cell key={`cell-${index}`} fill={entry.color || barColor} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend 
                      iconType="circle" 
                      verticalAlign="bottom" 
                      formatter={renderColorfulLegendText}
                      wrapperStyle={{ paddingTop: '15px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">Belum ada data ujian</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;