import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { FileSpreadsheet, Printer, Search, ChevronLeft, ChevronRight, Eye, RotateCcw } from 'lucide-react';
import api from '../../api/axiosConfig';
import * as XLSX from 'xlsx'; // Import library XLSX
import Swal from 'sweetalert2';

const HasilKelas = () => {
  const { exam_id } = useParams(); 
  const navigate = useNavigate();

  const [dataSiswa, setDataSiswa] = useState([]);
  const [statistik, setStatistik] = useState({
    kkm_digunakan: 75,
    mapel: '-',
    kelas_terdeteksi: '-',
  });
  const [loading, setLoading] = useState(true);

  const [filterKelas, setFilterKelas] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchHasilKelas = async () => {
      try {
        const response = await api.get(`/api/admin/hasil/kelas/${exam_id}`);

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

    if (exam_id) fetchHasilKelas();
  }, [exam_id]);

  const listKelasUnik = useMemo(() => {
    const kelasSet = new Set(dataSiswa.map(s => s.kelas));
    return Array.from(kelasSet).sort();
  }, [dataSiswa]);

  const { activeData, activeStatistik } = useMemo(() => {
    let filtered = filterKelas === 'Semua' 
      ? [...dataSiswa] 
      : dataSiswa.filter(s => s.kelas === filterKelas);

    filtered = filtered.sort((a, b) => b.nilai_akhir - a.nilai_akhir).map((siswa, index) => ({
      ...siswa,
      rank: index + 1 
    }));

    const totalSiswa = filtered.length;
    const lulusCount = filtered.filter(s => s.status === 'LULUS').length;
    const remedialCount = totalSiswa - lulusCount;
    const totalNilai = filtered.reduce((sum, current) => sum + (Number(current.nilai_akhir) || 0), 0);
    const rataRata = totalSiswa > 0 ? (totalNilai / totalSiswa).toFixed(2) : 0;
    const persentaseLulus = totalSiswa > 0 ? Math.round((lulusCount / totalSiswa) * 100) : 0;

    return {
      activeData: filtered,
      activeStatistik: {
        ...statistik,
        total_siswa: totalSiswa,
        rata_rata: rataRata,
        lulus: lulusCount,
        remedial: remedialCount,
        persentase_lulus: persentaseLulus
      }
    };
  }, [dataSiswa, filterKelas, statistik]);

  const searchedData = useMemo(() => {
    return activeData.filter(siswa => 
      siswa.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (siswa.nis && siswa.nis.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [activeData, searchTerm]);

  const totalPages = Math.ceil(searchedData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = searchedData.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterKelas, searchTerm, itemsPerPage]);


  // FUNGSI RESET UJIAN SISWA (VERSI SWEETALERT2)
  const handleResetUjian = async (student_exam_id, namaSiswa) => {
    // Munculkan popup konfirmasi keren dari SweetAlert2
    const result = await Swal.fire({
      title: '⚠️ Peringatan!',
      text: `Yakin ingin mereset ujian atas nama ${namaSiswa}? Semua nilai dan jawabannya akan dihapus permanen, dan siswa harus mengulang ujian dari awal.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', // Warna merah (Tailwind red-500)
      cancelButtonColor: '#64748b', // Warna abu-abu (Tailwind slate-500)
      confirmButtonText: 'Ya, Reset Ujian!',
      cancelButtonText: 'Batal'
    });
    
    // Jika admin membatalkan (klik tombol Batal atau klik di luar kotak)
    if (!result.isConfirmed) return;

    try {
      // Tampilkan efek loading (opsional tapi bagus)
      Swal.fire({
        title: 'Mereset...',
        text: 'Mohon tunggu sebentar.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Panggil API Backend untuk menghapus data
      const response = await api.delete(`/api/admin/hasil/kelas/reset/${student_exam_id}`);
      
      if (response.data.success) {
        // Tutup loading dan tampilkan pesan sukses
        Swal.fire(
          'Berhasil!',
          `Ujian milik ${namaSiswa} berhasil direset!`,
          'success'
        );
        
        // Usir data siswa yang direset dari layar secara instan
        setDataSiswa(prevData => prevData.filter(siswa => siswa.student_exam_id !== student_exam_id));
      }
    } catch (error) {
      console.error("Gagal mereset ujian:", error);
      // Tampilkan pesan error jika gagal
      Swal.fire(
        'Gagal!',
        'Terjadi kesalahan saat mereset ujian. Cek koneksi atau server.',
        'error'
      );
    }
  };

  // FUNGSI EXPORT EXCEL (.XLSX) - LOGIKA DISESUAIKAN
  const exportToExcel = () => {
    if (activeData.length === 0) return alert("Tidak ada data siswa untuk diexport!");

    try {
      const namaKelasFile = filterKelas === 'Semua' ? activeStatistik.kelas_terdeteksi : `Kelas_${filterKelas}`;
      const judulUjian = activeStatistik.mapel || "Ujian";

      // 1. Buat Judul Header untuk Baris Atas
      const infoHeader = [
        [`REKAP NILAI ${judulUjian.toUpperCase()}`],
        [`KKM: ${activeStatistik.kkm_digunakan}`],
        [`KELAS: ${filterKelas === 'Semua' ? activeStatistik.kelas_terdeteksi : filterKelas}`],
        [], // Jarak kosong
      ];

      // 2. Header Tabel
      const tableHeaders = [['Peringkat', 'NIS/NISN', 'Nama Siswa', 'Kelas', 'Benar', 'Salah', 'Nilai Akhir', 'Status']];

      // 3. Data Siswa (Menggunakan activeData yang sudah difilter & di-rank ulang)
      const tableBody = activeData.map((siswa) => [
        siswa.rank,
        siswa.nis || '-',
        siswa.nama || '-',
        siswa.kelas || '-',
        siswa.jumlah_benar ?? 0,
        siswa.jumlah_salah ?? 0,
        siswa.nilai_akhir ?? 0,
        siswa.status || '-'
      ]);

      // 4. Gabungkan Header + Table
      const finalData = [...infoHeader, ...tableHeaders, ...tableBody];

      // 5. Proses pembuatan file Excel
      const worksheet = XLSX.utils.aoa_to_sheet(finalData);
      const workbook = XLSX.utils.book_new();
      
      const namaSheet = `Rekap_${filterKelas}`.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, namaSheet);
      
      // 6. Download file .xlsx
      XLSX.writeFile(workbook, `Rekap_Nilai_${judulUjian.replace(/\s+/g, '_')}_${namaKelasFile}.xlsx`);

    } catch (error) {
      console.error('🔴 Error Export Excel:', error);
      alert('Gagal mendownload file Excel.');
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const dataKelulusan = [
    { name: 'Lulus', value: activeStatistik.lulus },
    { name: 'Remedial', value: activeStatistik.remedial },
  ];
  const COLORS = ['#10b981', '#ef4444']; 

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600 font-semibold text-lg print:hidden">Memuat Data Hasil Ujian...</div>;
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen print:bg-white print:p-0">
      {/* Bagian Header, Statistik, & Top Performer tetap sama seperti sebelumnya */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-blue-600 transition">
             &larr; Kembali
          </button>
          <p className="text-sm text-gray-500">Hasil Ujian &gt; <span className="font-semibold text-gray-800">Rekapitulasi Kelas</span></p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
             <select 
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm"
             >
                <option value="Semua">Semua Kelas</option>
                {listKelasUnik.map(kelas => (
                   <option key={kelas} value={kelas}>Kelas {kelas}</option>
                ))}
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
          </div>

          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium shadow-sm"
          >
            <FileSpreadsheet size={18} /> Export Excel (.xlsx)
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium shadow-sm"
          >
            <Printer size={18} /> PDF
          </button>
        </div>
      </div>

      {/* Header Khusus PDF */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Laporan Hasil Ujian</h1>
        <p className="text-xl font-semibold text-gray-700 mt-2">
          {activeStatistik?.mapel || 'Mata Pelajaran'} - KKM: {activeStatistik?.kkm_digunakan || 75}
        </p>
        <p className="text-gray-500 mt-1">
          Kelas: {filterKelas === 'Semua' ? activeStatistik?.kelas_terdeteksi || 'Semua' : filterKelas} | ID Ujian: ({exam_id})
        </p>
        <hr className="my-4 border-gray-400 border-t-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 print:grid-cols-3 print:gap-4 print:break-inside-avoid">
        {/* Card 1: Statistik Kelas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden print:border-gray-300">
          <div className="relative z-10">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">STATISTIK {filterKelas === 'Semua' ? 'UMUM' : `KELAS ${filterKelas}`}</span>
            <h2 className="text-xl font-bold text-gray-800 mt-4">Rekapitulasi</h2>
            <div className="flex gap-4 mt-6">
              <div className="bg-gray-50 p-3 rounded-xl flex-1 text-center border border-gray-100">
                <p className="text-xs text-gray-500 font-semibold mb-1">SISWA</p>
                <p className="text-2xl font-bold text-gray-800">{activeStatistik.total_siswa}</p>
              </div>
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-xl flex-1 text-center">
                <p className="text-xs text-emerald-800 font-semibold mb-1">RATA-RATA</p>
                <p className="text-2xl font-bold text-emerald-600">{activeStatistik.rata_rata}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Pie Chart Kelulusan */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:border-gray-300">
          <h3 className="font-semibold text-gray-700 mb-2">Rasio Kelulusan</h3>
          <div className="w-full h-32 relative print:hidden">
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-800">{activeStatistik.persentase_lulus}%</span>
             </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataKelulusan} innerRadius={40} outerRadius={55} paddingAngle={5} dataKey="value" stroke="none">
                  {dataKelulusan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs mt-4">
             <span className="text-emerald-600 font-bold">Lulus: {activeStatistik.lulus}</span>
             <span className="text-red-600 font-bold">Remed: {activeStatistik.remedial}</span>
          </div>
        </div>

        {/* Card 3: Top Performer */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:border-gray-300">
          <h3 className="font-semibold text-gray-700 mb-4">Top 3 Teratas 🏆</h3>
          <div className="space-y-2">
            {activeData.slice(0,3).map((siswa, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-600'}`}>{siswa.rank}</span>
                  <span className="font-medium truncate max-w-30">{siswa.nama}</span>
                </div>
                <span className="font-bold text-blue-700">{siswa.nilai_akhir}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabel Utama dengan Paginasi & Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:border-0">
        
        {/* Header Tabel Utama */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4 print:hidden">
          <h3 className="font-semibold text-gray-800">Daftar Peringkat Lengkap</h3>
          
          <div className="flex flex-wrap gap-4 items-center">
             <div className="flex items-center text-xs text-gray-500">
                <span>Show</span>
                <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="mx-2 border border-gray-200 rounded p-1 focus:ring-2 focus:ring-blue-500 outline-none">
                   <option value={10}>10</option>
                   <option value={20}>20</option>
                   <option value={50}>50</option>
                </select>
             </div>
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                   type="text" placeholder="Cari nama..." value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
             </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
            {/* Tambahkan border-gray-200 di thead agar garis bawahnya soft */}
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4">NIS</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Skor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 print:hidden">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {paginatedData.map((siswa, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition">
                    <td className="px-6 py-4">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${siswa.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{siswa.rank}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{siswa.nama}</td>
                    <td className="px-6 py-4 text-gray-500">{siswa.nis}</td>
                    <td className="px-6 py-4">{siswa.kelas}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{siswa.nilai_akhir}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${siswa.status === 'LULUS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {siswa.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 print:hidden">
                      <div className="flex items-center gap-2">
                        {/* Tombol Detail (Biru) */}
                        <button 
                          onClick={() => navigate(`/hasil/siswa-detail/${siswa.student_exam_id}`)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors duration-200"
                        >
                          <Eye size={14} />
                          Detail
                        </button>

                        {/* Tombol Reset (Merah) */}
                        <button 
                          onClick={() => handleResetUjian(siswa.student_exam_id, siswa.nama)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors duration-200"
                        >
                          <RotateCcw size={14} />
                          Reset
                        </button>
                      </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        {/* Pagination Footer */}
        {/* Tambahkan border-gray-100 di border-t agar garis atas paginasi soft */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white print:hidden">
           <span className="text-sm text-gray-500">
              Menampilkan {searchedData.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, searchedData.length)} dari {searchedData.length} siswa
           </span>
           <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 transition"
              >
                <ChevronLeft size={18}/>
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`min-w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition ${
                    currentPage === num 
                      ? 'bg-[#1e293b] text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages} 
                className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 transition"
              >
                <ChevronRight size={18}/>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default HasilKelas;