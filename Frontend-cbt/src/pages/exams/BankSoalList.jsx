import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { 
  ArrowLeft, Plus, Edit, Trash2, FileText, 
  Upload, Download, FileSpreadsheet, Search, ChevronLeft, ChevronRight, Filter 
} from 'lucide-react';

// Import SweetAlert2 dan Sonner
import Swal from 'sweetalert2';
import { toast } from 'sonner';

import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { downloadTemplateSoal } from '../../utils/excelTemplates';

const BankSoalList = () => {
  const { examId } = useParams(); 
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([]);
  const [namaMapel, setNamaMapel] = useState('');
  const [loading, setLoading] = useState(true);

  // --- STATE UNTUK PAGINASI, PENCARIAN & FILTER ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipe, setFilterTipe] = useState(''); // State baru untuk filter jenis soal
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalImportOpen, setIsModalImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const questionsResponse = await api.get(`/api/exams/${examId}/questions`); 
      if (questionsResponse.data.success) {
        setQuestions(questionsResponse.data.data);
      }
    } catch (error) {
      console.error('Gagal mengambil data soal:', error);
      toast.error('Gagal mengambil data soal dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchExamInfo = async () => {
      try {
        const examResponse = await api.get(`/api/exams/${examId}`);
        if (examResponse.data.success) {
          setNamaMapel(examResponse.data.data.nama_mapel);
        }
      } catch (error) {
        console.error('Gagal mengambil data ujian:', error);
      }
    };

    fetchExamInfo();
    fetchQuestions();
  }, [examId]);

  const handleDelete = async (questionId) => {
    const result = await Swal.fire({
      title: 'Yakin ingin menghapus?',
      text: "Data soal ini tidak bisa dikembalikan setelah dihapus!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', 
      cancelButtonColor: '#64748b', 
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/questions/${questionId}`);
        setQuestions(questions.filter(q => q.id !== questionId));
        toast.success('Soal berhasil dihapus!'); 
      } catch (error) {
        console.error('Gagal menghapus:', error);
        toast.error('Gagal menghapus soal. Silakan coba lagi.');
      }
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return toast.warning('Pilih file Excel terlebih dahulu mas brow!');

    const dataForm = new FormData();
    dataForm.append('file_excel', importFile);
    dataForm.append('exam_id', examId); 

    const toastId = toast.loading('Sedang mengimpor soal...');

    try {
      const response = await api.post(`/api/questions/import-excel/${examId}`, dataForm, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Mantap! Soal berhasil diimport.', { id: toastId });
        setIsModalImportOpen(false);
        setImportFile(null);
        fetchQuestions(); 
      } else {
        toast.error(response.data.message, { id: toastId });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Waduh, gagal mengimpor file Excel!';
      toast.error(errorMessage, { id: toastId });
    }
  };

  const stripHtml = (html) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // --- LOGIKA FILTER PENCARIAN & JENIS SOAL ---
  const filteredQuestions = questions.filter(q => {
    const searchLower = searchTerm.toLowerCase();
    const cleanText = stripHtml(q.teks_soal).toLowerCase();
    
    // Cek kecocokan pencarian text
    const matchSearch = cleanText.includes(searchLower) || (q.tipe_soal && q.tipe_soal.toLowerCase().includes(searchLower));
    
    // Cek kecocokan filter tipe soal
    const matchTipe = filterTipe ? q.tipe_soal === filterTipe : true;

    return matchSearch && matchTipe;
  });

  // --- LOGIKA PAGINASI ---
  const isAll = itemsPerPage === 'semua';
  const totalItems = filteredQuestions.length;
  const totalPages = isAll ? 1 : Math.ceil(totalItems / itemsPerPage);
  
  const indexOfLastItem = isAll ? totalItems : currentPage * itemsPerPage;
  const indexOfFirstItem = isAll ? 0 : indexOfLastItem - itemsPerPage;
  const currentItems = filteredQuestions.slice(indexOfFirstItem, indexOfLastItem);

  // Helper untuk membuat array nomor halaman
  const getPageNumbers = () => {
    let pages = [];
    // Batasi jumlah tombol halaman yang tampil jika terlalu banyak (opsional)
    // Untuk saat ini kita tampilkan semua angka halaman
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      {/* ... Header dan Card Total Soal tetap sama ... */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/exams')}
          className="p-2 border border-slate-300 bg-white text-slate-600 rounded-md hover:bg-slate-100 transition"
          title="Kembali ke Daftar Ujian"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Daftar Soal Ujian {namaMapel ? `- ${namaMapel}` : ''}
          </h1>
          <p className="text-sm text-slate-500">Kelola butir soal untuk jadwal ini</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Soal</p>
            <p className="text-2xl font-bold text-indigo-900">{questions.length}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 text-sm py-2.5 px-4 shadow-sm border-slate-200" 
            onClick={() => setIsModalImportOpen(true)}
          >
            <Upload size={18} /> Import Soal
          </Button>

          <button 
            onClick={() => navigate(`/exams/${examId}/questions/create`)}
            className="px-5 py-2.5 bg-indigo-700 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-800 transition shadow-sm font-medium"
          >
            <Plus size={18} /> Tambah Soal Baru
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* --- HEADER TABEL: SEARCH, FILTER JENIS SOAL & LIMIT --- */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-slate-200 gap-4 bg-slate-50/50">
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
            {/* Input Pencarian */}
            <div className="relative w-full sm:w-72">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari cuplikan soal..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); 
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
              />
            </div>

            {/* Filter Jenis Soal */}
            <div className="relative w-full sm:w-56">
              <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select 
                value={filterTipe}
                onChange={(e) => {
                  setFilterTipe(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition appearance-none bg-white cursor-pointer"
              >
                <option value="">Semua Jenis Soal</option>
                <option value="PG">Pilihan Ganda (PG)</option>
                <option value="BS">Benar Salah (BS)</option>
                <option value="MJ">Menjodohkan (MJ)</option>
              </select>
            </div>
          </div>
          
          {/* Limit Data */}
          <div className="flex items-center gap-2 text-sm text-slate-600 w-full sm:w-auto justify-end">
            <span>Tampilkan:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(e.target.value === 'semua' ? 'semua' : Number(e.target.value));
                setCurrentPage(1);
              }} 
              className="border border-slate-300 rounded-md py-1.5 px-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value="semua">Semua</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto h-fit">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                <th className="p-4 font-semibold w-16 text-center">No</th>
                <th className="p-4 font-semibold w-32">Tipe</th>
                <th className="p-4 font-semibold">Cuplikan Soal</th>
                <th className="p-4 font-semibold w-24 text-center">Bobot</th>
                <th className="p-4 font-semibold w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">Memuat data soal...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    {searchTerm || filterTipe ? (
                      <p>Tidak ditemukan soal yang cocok dengan filter pencarianmu.</p>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3">
                          <FileText size={48} className="text-slate-300" />
                          <p className="text-lg font-medium text-slate-600">Belum ada soal untuk ujian ini.</p>
                          <button 
                            onClick={() => navigate(`/exams/${examId}/questions/create`)}
                            className="mt-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition font-medium"
                          >
                            Buat soal pertama sekarang
                          </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                currentItems.map((q, index) => (
                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="p-4 align-top text-center font-medium text-slate-500">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="p-4 align-top">
                      <span className={`inline-block whitespace-nowrap px-2.5 py-1 text-xs font-bold rounded-md 
                        ${q.tipe_soal === 'PG' ? 'bg-blue-50 text-blue-700' : 
                          q.tipe_soal === 'BS' ? 'bg-emerald-50 text-emerald-700' : 
                          'bg-amber-50 text-amber-700'}`}>
                        {q.tipe_soal === 'PG' ? 'Pilihan Ganda' : q.tipe_soal === 'BS' ? 'Benar Salah' : q.tipe_soal === 'MJ' ? 'Menjodohkan' : q.tipe_soal}
                      </span>
                    </td>
                    <td className="p-4 align-top text-sm text-slate-700">
                      {stripHtml(q.teks_soal).substring(0, 100)}...
                    </td>
                    <td className="p-4 align-top text-center font-medium text-slate-600">{q.bobot}</td>
                    <td className="p-4 align-top text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => navigate(`/exams/${examId}/questions/${q.id}/edit`)}
                          className="p-1.5 border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded transition" 
                          title="Edit Soal"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(q.id)} 
                          className="p-1.5 border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 rounded transition" 
                          title="Hapus Soal"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- FOOTER TABEL: DESAIN PAGINASI BARU --- */}
        {!isAll && totalPages > 0 && (
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-sm gap-4 bg-white">
            <div className="text-slate-500 font-medium">
              Menampilkan <span className="text-slate-900">{totalItems === 0 ? 0 : indexOfFirstItem + 1}</span> hingga <span className="text-slate-900">{Math.min(indexOfLastItem, totalItems)}</span> dari <span className="text-slate-900">{totalItems}</span> data
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => prev - 1)} 
                className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition mr-1"
              >
                <ChevronLeft size={16} />
              </button>
              
              {/* Render nomor halaman */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map(num => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition duration-200
                      ${currentPage === num 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
                      }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button 
                disabled={currentPage === totalPages || totalPages === 0} 
                onClick={() => setCurrentPage(prev => prev + 1)} 
                className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition ml-1"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalImportOpen} onClose={() => setIsModalImportOpen(false)} title="Import Bank Soal (Excel)">
         {/* ... Isi modal import tetap sama ... */}
        <form onSubmit={handleImportSubmit} className="space-y-5">
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-indigo-900">Butuh template Excel?</p>
              <p className="text-xs text-indigo-700 mt-0.5">Download formatnya untuk melihat struktur penulisan soal (PG/Essay, Pilihan, Kunci Jawaban).</p>
            </div>
            <button 
              type="button" 
              onClick={() => downloadTemplateSoal(namaMapel || 'Mapel Umum')}
              className="flex items-center gap-2 px-3 py-2 bg-white text-indigo-600 text-xs font-bold rounded-lg border border-indigo-200 shadow-sm hover:bg-indigo-600 hover:text-white transition-colors whitespace-nowrap"
            >
              <Download size={14} /> Download Template
            </button>
          </div>

          <div className="p-8 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
               <FileSpreadsheet size={32} className="text-indigo-600" />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">Upload File Excel (.xlsx, .xls)</p>
            <p className="text-xs text-slate-500 mb-6">Pastikan format soal, bobot, dan kunci jawaban sudah sesuai template.</p>
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={(e) => setImportFile(e.target.files[0])}
              className="text-sm file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer text-slate-500 w-full max-w-xs"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => setIsModalImportOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">Mulai Import</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default BankSoalList;