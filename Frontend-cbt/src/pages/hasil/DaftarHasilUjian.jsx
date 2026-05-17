import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Users, BarChart, Loader2, LayoutGrid, List, ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from 'lucide-react';
import api from '../../api/axiosConfig';
import * as XLSX from 'xlsx';

const DaftarHasilUjian = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('card');

  const [showFilter, setShowFilter] = useState(false);
  const [filterTahunAjaran, setFilterTahunAjaran] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterMapel, setFilterMapel] = useState('');
  const [filterTipe, setFilterTipe] = useState(''); 

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/admin/hasil/daftar-ujian'); 
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

  const uniqueTahunAjaran = [...new Set(exams.map(exam => exam.tahun_ajaran).filter(Boolean))];
  const uniqueMapel = [...new Set(exams.map(e => e.mapel).filter(Boolean))];
  const uniqueTipe = [...new Set(exams.map(e => e.tipe_ujian).filter(Boolean))]; 
  const kelasOptions = ['7', '8', '9'];

  const filteredExams = exams.filter((exam) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      
      (exam.judul && exam.judul.toLowerCase().includes(searchLower)) ||
      (exam.mapel && exam.mapel.toLowerCase().includes(searchLower)) ||
      (exam.guru && exam.guru.toLowerCase().includes(searchLower))
    );
    
    const matchTahunAjaran = filterTahunAjaran ? exam.tahun_ajaran === filterTahunAjaran : true;
    const matchMapel = filterMapel ? exam.mapel === filterMapel : true;
    const matchTipe = filterTipe ? exam.tipe_ujian === filterTipe : true;
    const matchKelas = filterKelas ? 
      (String(exam.kelas_peserta) === String(filterKelas)) || 
      (exam.judul && exam.judul.includes(`Kelas ${filterKelas}`)) : true;

    return matchesSearch && matchTahunAjaran && matchMapel && matchTipe && matchKelas;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredExams.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterKelas, filterMapel, filterTipe, itemsPerPage]);

  // FUNGSI EXPORT EXCEL (CSV)
  const exportToExcel = () => {
    if (filteredExams.length === 0) return alert("Tidak ada data untuk diexport!");
    
    // Siapkan data untuk diexport (Hanya ambil kolom yang penting)
    const exportData = filteredExams.map(exam => ({
      "Nama Ujian": exam.judul || "-",
      "Mata Pelajaran": exam.mapel || "-",
      "Guru Pengampu": exam.guru || "-",
      "Tanggal Ujian": formatDate(exam.tanggal),
      "Siswa Selesai": exam.selesai || 0,
      "Total Peserta": exam.total_peserta || 0
    }));

    const headers = Object.keys(exportData[0]).join(',');
    const rows = exportData.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Daftar_Ujian.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // FUNGSI EXPORT PDF (Menggunakan Print Browser)
  const exportToPDF = () => {
    window.print();
  };


const handleExportExcel = async (examId, judulUjian = "Ujian") => {
  try {
    const response = await api.get(`/api/admin/hasil/kelas/${examId}`); 
    const dataSiswa = response.data.data.siswa; 
    const statistik = response.data.data.statistik; // Berisi kkm_digunakan

    if (!dataSiswa || dataSiswa.length === 0) {
      alert('Belum ada data siswa untuk ujian ini.');
      return;
    }

    // 1. Buat Judul Header untuk Baris Pertama (A1)
    const infoHeader = [
      [`REKAP NILAI ${judulUjian.toUpperCase()}`],
      [`KKM: ${statistik.kkm_digunakan}`],
      [], // Baris kosong untuk jarak
    ];

    // 2. Header Tabel
    const tableHeaders = [['Peringkat', 'NIS/NISN', 'Nama Siswa', 'Kelas', 'Benar', 'Salah', 'Nilai Akhir', 'Status']];

    // 3. Data Siswa
    const tableBody = dataSiswa.map((siswa, index) => [
      siswa.rank || index + 1,
      siswa.nis || '-',
      siswa.nama || '-',
      siswa.kelas || '-',
      siswa.jumlah_benar ?? 0,
      siswa.jumlah_salah ?? 0,
      siswa.nilai_akhir ?? 0,
      siswa.status || '-'
    ]);

    // 4. Gabungkan semua menjadi satu array (Header + Table)
    const finalData = [...infoHeader, ...tableHeaders, ...tableBody];

    // 5. Proses pembuatan file Excel
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    
    // Nama Sheet dinamis (Max 31 Karakter)
    const namaSheet = `Rekap_Nilai_${statistik.kelas_terdeteksi}`.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, namaSheet);
    
    // 6. Download file
    XLSX.writeFile(workbook, `Rekap_Nilai_${judulUjian.replace(/\s+/g, '_')}.xlsx`);

  } catch (error) {
    console.error('🔴 Error Export Excel:', error);
    alert('Gagal mendownload file Excel.');
  }
};

  return (
    <div className="p-6 bg-slate-50 min-h-screen print:bg-white print:p-0 print:block print:h-auto print:min-h-0 print:overflow-visible">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analisis Hasil Ujian</h1>
          <p className="text-gray-500 mt-1">Pilih sesi ujian untuk melihat rekapitulasi nilai dan analisis soal.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Tombol Export */}
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition text-sm font-medium"
            title="Export to Excel"
          >
            <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition text-sm font-medium"
            title="Export to PDF"
          >
            <Printer size={18} /> <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Toggle View Mode */}
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition ${viewMode === 'card' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Card View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Table View"
            >
              <List size={18} />
            </button>
          </div>

          <div className="relative flex-1 md:w-64 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari ujian atau mapel..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button 
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition text-sm font-medium
              ${showFilter ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={18} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* Area Khusus Tampil Saat Di-Print (PDF) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Rekapitulasi Daftar Ujian</h1>
        <hr className="my-4 border-gray-300" />
      </div>

      {showFilter && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-wrap gap-4 print:hidden animate-in fade-in slide-in-from-top-2">
          
          {/* Filter Tahun Ajaran (Baru ditambahkan) */}
          <div className="flex-1 min-w-37.5">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tahun Ajaran</label>
            <select 
              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              value={filterTahunAjaran} 
              onChange={(e) => setFilterTahunAjaran(e.target.value)}
            >
              <option value="">Semua Tahun Ajaran</option>
              {uniqueTahunAjaran.map(ta => <option key={ta} value={ta}>{ta}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-37.5">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Kelas</label>
            <select className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)}>
              <option value="">Semua Kelas</option>
              {kelasOptions.map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
          
          <div className="flex-1 min-w-37.5">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Mata Pelajaran</label>
            <select className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>
              <option value="">Semua Mapel</option>
              {uniqueMapel.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          
          <div className="flex-1 min-w-37.5">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tipe Ujian</label>
            <select className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterTipe} onChange={(e) => setFilterTipe(e.target.value)}>
              <option value="">Semua Tipe</option>
              {uniqueTipe.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div className="flex items-end">
            <button 
              onClick={() => { 
                setFilterTahunAjaran(''); // Reset tahun ajaran
                setFilterKelas(''); 
                setFilterMapel(''); 
                setFilterTipe(''); 
                setSearchTerm(''); 
              }} 
              className="text-sm text-red-500 hover:text-red-700 font-medium px-2 py-2"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 text-blue-600 print:hidden">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p className="text-gray-500 font-medium">Memuat data hasil ujian...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-200 print:hidden">{error}</div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center print:hidden">
          <Search className="text-slate-400 mb-4" size={32} />
          <h3 className="text-lg font-bold text-gray-800 mb-1">Tidak ada ujian ditemukan</h3>
          <p className="text-gray-500">Coba sesuaikan filter pencarian mas brow.</p>
        </div>
      ) : (
        <>
          {viewMode === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col print:border-gray-300">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full print:border print:border-blue-200">{exam.mapel || 'Mapel Umum'}</span>
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${exam.selesai > 0 ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-600'}`}>
                      {exam.selesai > 0 ? 'Selesai' : 'Aktif'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2">{exam.judul}</h3>
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
                  <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2 print:hidden">
                  <button 
                      onClick={() => navigate(`/hasil/kelas/${exam.id}`)} 
                      className="flex-1 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-medium transition text-sm"
                  >
                      <BarChart size={18} /> Lihat Hasil Kelas
                  </button>
                  <button 
                    onClick={() => handleExportExcel(exam.id, exam.judul)} 
                    className="flex justify-center items-center bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-xl transition text-sm"
                    title="Export Nilai ke Excel"
                  >
                    <FileSpreadsheet size={18} />
                  </button>
              </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col print:border-0 print:shadow-none print:block print:overflow-visible">
              <div className="overflow-x-auto">
                {/* Tambahkan min-w-max agar tabel meregang ke kanan saat di mobile */}
                <table className="w-full text-left text-sm text-gray-600 print:text-black min-w-max">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100 print:bg-gray-200">
                    <tr>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 border-b print:border-gray-400 whitespace-nowrap">Nama Ujian</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 border-b print:border-gray-400 whitespace-nowrap">Mata Pelajaran</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 border-b print:border-gray-400 whitespace-nowrap">Guru</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 border-b print:border-gray-400 whitespace-nowrap">Tanggal</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 border-b print:border-gray-400 text-center whitespace-nowrap">Progress Siswa</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 border-b print:border-gray-400 text-center print:hidden whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 print:divide-gray-300">
                    {(window.matchMedia('print').matches ? filteredExams : currentItems).map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50 transition print:break-inside-avoid">
                        <td className="px-4 py-3 sm:px-6 sm:py-4 font-medium text-gray-800 print:text-black min-w-[200px]">
                          {exam.judul}
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full print:border print:border-gray-300">
                            {exam.mapel || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">{exam.guru || '-'}</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">{formatDate(exam.tanggal)}</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-center whitespace-nowrap">
                          <span className="font-semibold text-gray-700 print:text-black">{exam.selesai || 0}</span>
                          <span className="text-gray-400 print:text-gray-600"> / {exam.total_peserta || 0}</span>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-center print:hidden whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => navigate(`/hasil/kelas/${exam.id}`)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
                            >
                              <BarChart size={14} /> Hasil
                            </button>
                            <button 
                              onClick={() => handleExportExcel(exam.id, exam.judul)} 
                              className="flex justify-center items-center bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-xl transition text-sm"
                              title="Export Nilai ke Excel"
                            >
                              <FileSpreadsheet size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-gray-100 gap-4 print:hidden">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Tampilkan:</span>
                    <select className="border border-gray-200 rounded-md text-sm p-1 outline-none focus:border-blue-500" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <span className="text-sm text-gray-500">
                    Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredExams.length)} dari {filteredExams.length} ujian
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1 text-gray-500 hover:text-blue-600 disabled:text-gray-300">
                    <ChevronLeft size={20} />
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button key={index} onClick={() => setCurrentPage(index + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition ${currentPage === index + 1 ? 'bg-[#1e293b] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                      {index + 1}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 text-gray-500 hover:text-blue-600 disabled:text-gray-300">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DaftarHasilUjian;