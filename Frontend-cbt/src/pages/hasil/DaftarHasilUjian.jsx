import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Users, BarChart, Loader2 } from 'lucide-react';
import api from '../../api/axiosConfig'; // Pastikan path ini sesuai dengan struktur folder mas brow

const DaftarHasilUjian = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk data API
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ambil data dari backend saat komponen pertama kali di-render
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      // Sesuaikan endpoint ini dengan konfigurasi routing backend mas brow
      const response = await api.get('/admin/hasil/daftar-ujian'); 
      if (response.data.success) {
        setExams(response.data.data);
      } else {
        setError('Gagal memuat data ujian');
      }
    } catch (err) {
      console.error("Error fetching exams:", err);
      setError('Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logika untuk fitur pencarian (Filter data berdasarkan input search)
  const filteredExams = exams.filter((exam) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (exam.judul && exam.judul.toLowerCase().includes(searchLower)) ||
      (exam.mapel && exam.mapel.toLowerCase().includes(searchLower)) ||
      (exam.guru && exam.guru.toLowerCase().includes(searchLower))
    );
  });

  // Fungsi helper untuk format tanggal ke format Indonesia
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analisis Hasil Ujian</h1>
          <p className="text-gray-500 mt-1">Pilih sesi ujian untuk melihat rekapitulasi nilai dan analisis soal.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari ujian atau mapel..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
            <Filter size={18} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* Handling Tampilan Berdasarkan State (Loading, Error, Data Kosong, dan Sukses) */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 text-blue-600">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p className="text-gray-500 font-medium">Memuat data hasil ujian...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-200">
          {error}
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
          <div className="bg-slate-100 p-4 rounded-full mb-4">
            <Search className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Tidak ada ujian ditemukan</h3>
          <p className="text-gray-500">Coba ubah kata kunci pencarian mas brow.</p>
        </div>
      ) : (
        /* Grid Kartu Ujian (Menggunakan filteredExams) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
              
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                  {exam.mapel || 'Mapel Umum'}
                </span>
                {/* Asumsi: jika ada peserta yang selesai, ujian dianggap sudah ada hasilnya */}
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${exam.selesai > 0 ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-600'}`}>
                  {exam.selesai > 0 ? 'Selesai' : 'Aktif'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2" title={exam.judul}>
                {exam.judul}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-1">{exam.guru || 'Guru Tidak Diketahui'}</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{formatDate(exam.tanggal)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Users size={16} className="text-gray-400" />
                  <span>{exam.selesai || 0} / {exam.total_peserta || 0} Siswa Selesai</span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                <button 
                  onClick={() => navigate(`/hasil/kelas/${exam.id}`)}
                  className="flex-1 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-medium transition"
                >
                  <BarChart size={18} />
                  Lihat Hasil Kelas
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DaftarHasilUjian;