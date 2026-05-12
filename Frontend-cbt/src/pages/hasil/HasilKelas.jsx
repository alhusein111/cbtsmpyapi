import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios'; 
// Jika mas brow pakai instance axios khusus (misal: import api from '../utils/api'), 
// ganti axios.get di bawah menjadi api.get

const HasilKelas = () => {
  const { exam_id } = useParams(); // Mengambil ID Ujian dari URL
  const navigate = useNavigate();

  // State untuk menampung data dari Backend
  const [dataSiswa, setDataSiswa] = useState([]);
  const [statistik, setStatistik] = useState({
    total_siswa: 0,
    rata_rata: 0,
    lulus: 0,
    remedial: 0,
    persentase_lulus: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetching Data dari API
  useEffect(() => {
    const fetchHasilKelas = async () => {
      try {
        const token = localStorage.getItem('token'); 
        // Sesuaikan URL '/api/admin/hasil/kelas/' dengan rute backend mas brow
        const response = await axios.get(`http://localhost:5000/api/admin/hasil/kelas/${exam_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.success) {
          setDataSiswa(response.data.data.siswa);
          setStatistik(response.data.data.statistik);
        }
      } catch (error) {
        console.error("Gagal memuat hasil ujian:", error);
      } finally {
        setLoading(false);
      }
    };

    if (exam_id) {
      fetchHasilKelas();
    }
  }, [exam_id]);

  // Konfigurasi Data untuk Recharts (Pie Chart)
  const dataKelulusan = [
    { name: 'Lulus', value: statistik.lulus },
    { name: 'Remedial', value: statistik.remedial },
  ];
  const COLORS = ['#10b981', '#ef4444']; // Hijau dan Merah

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600 font-semibold text-lg">Memuat Data Hasil Ujian...</div>;
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-blue-600">
           &larr; Kembali
        </button>
        <p className="text-sm text-gray-500">Hasil Ujian &gt; <span className="font-semibold text-gray-800">Rekapitulasi Kelas</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card 1: Info & Statistik Cepat */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0"></div>
          <div className="relative z-10">
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">STATISTIK KELAS</span>
            <h2 className="text-xl font-bold text-blue-800 mt-4">Rekapitulasi Nilai</h2>
            <p className="text-sm text-gray-500 mt-2 mb-6">Berdasarkan hasil pengerjaan siswa yang telah selesai.</p>
            <div className="flex gap-4">
              <div className="bg-gray-50 p-3 rounded-xl flex-1 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-semibold mb-1">TOTAL SISWA</p>
                <p className="text-2xl font-bold text-gray-800">{statistik.total_siswa}</p>
              </div>
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-xl flex-1 text-center">
                <p className="text-xs tracking-wider text-emerald-800 font-semibold mb-1">RATA-RATA</p>
                <p className="text-3xl font-bold text-emerald-600">{statistik.rata_rata}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Rasio Kelulusan (Menggunakan Recharts) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <h3 className="w-full text-left font-semibold text-gray-700 mb-2">Rasio Kelulusan</h3>
          
          <div className="w-full h-40 relative">
             {/* Angka Persentase di Tengah Donut */}
             <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-2xl font-bold text-gray-800">{statistik.persentase_lulus}%</span>
             </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataKelulusan}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {dataKelulusan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full space-y-2 text-sm mt-2">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div>Lulus (≥ 75)</span>
              <span className="font-bold text-gray-700">{statistik.lulus}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div>Remedial</span>
              <span className="font-bold text-gray-700">{statistik.remedial}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Top Performer (Ranking 1-3) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4 flex justify-between items-center">Top 3 Teratas <span className="text-amber-500">🏆</span></h3>
          <div className="space-y-3">
            {dataSiswa.slice(0,3).map((siswa, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>
                    {siswa.rank}
                  </div>
                  <span className="font-medium text-gray-800">{siswa.nama}</span>
                </div>
                <span className="font-bold text-gray-700">{siswa.nilai_akhir}</span>
              </div>
            ))}
            {dataSiswa.length === 0 && <p className="text-sm text-gray-400 text-center mt-6">Belum ada data siswa.</p>}
          </div>
        </div>
      </div>

      {/* Tabel Peringkat Siswa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 className="font-semibold text-gray-800">Daftar Peringkat Kelas</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
                <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4">NIS</th>
                <th className="px-6 py-4">Skor Akhir</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {dataSiswa.map((siswa, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition">
                    <td className="px-6 py-4">
                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${siswa.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{siswa.rank}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-900">{siswa.nama}</td>
                    <td className="px-6 py-4 text-gray-500">{siswa.nis}</td>
                    <td className="px-6 py-4 font-bold text-gray-800">{siswa.nilai_akhir}</td>
                    <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${siswa.status === 'LULUS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {siswa.status}
                    </span>
                    </td>
                    <td className="px-6 py-4">
                    {/* Navigate ke halaman detail siswa spesifik */}
                    <button onClick={() => navigate(`/hasil/siswa/${siswa.student_exam_id}`)} className="text-blue-600 font-semibold hover:text-blue-800 hover:underline">Lihat Detail</button>
                    </td>
                </tr>
                ))}
                {dataSiswa.length === 0 && (
                    <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">Belum ada siswa yang menyelesaikan ujian.</td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default HasilKelas;