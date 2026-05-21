import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Edit, Calendar, Clock, Download, X, Trash2, CheckCircle2, XCircle, Search, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Filter, FileText, Layers } from 'lucide-react';
import api from '../../api/axiosConfig'; 
import { notifySuccess, notifyError, notifyWarning, confirmDelete } from '../../utils/alertHelper';
import { exportSoalKeExcel } from '../../utils/excelTemplates';

const ManajemenUjian = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- STATE UNTUK PAGINASI, PENCARIAN & FILTER ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExamType, setFilterExamType] = useState(''); 
  const [filterClass, setFilterClass] = useState(''); // 🔥 Tambahan state filter kelas
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [masterData, setMasterData] = useState({
    academicYears: [],
    examTypes: [],
    subjects: [],
    classes: [],
    teachers: []
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); 
  const [editId, setEditId] = useState(null); 
  
  const activeYearId = localStorage.getItem('activeYearId');
  const activeYearText = localStorage.getItem('activeYearText') || "Belum diatur";

  const [formData, setFormData] = useState({
    academic_year_id: activeYearId || '',
    exam_type_id: '',
    subject_id: '',
    kelas_peserta: [], 
    guru_id: '',
    tanggal_ujian: '',
    waktu_mulai: '',
    waktu_selesai: '',
    durasi: 90,
    min_work_time: 30, 
    is_active: 1
  });

  let userRole = localStorage.getItem('role');
  if (!userRole) {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const userData = JSON.parse(userString);
        userRole = userData?.role;
      } catch (e) {
        console.error("Gagal parsing data user");
      }
    }
  }
  const finalRole = userRole ? String(userRole).replace(/['"]/g, '').toLowerCase() : 'tidak_diketahui';

  useEffect(() => {
    fetchExams();
    if (finalRole === 'admin') {
      fetchMasterData(); 
    }
  }, [finalRole]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const url = activeYearId 
        ? `/api/exams?academic_year_id=${activeYearId}` 
        : '/api/exams';
        
      const response = await api.get(url); 
      if (response.data.success) {
        setExams(response.data.data);
      }
    } catch (error) {
      console.error('Gagal mengambil data ujian:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [resAY, resET, resSub, resCls, resTch] = await Promise.all([
        api.get('/api/master/academic-years'),
        api.get('/api/master/exam-types'),
        api.get('/api/master/subjects'),
        api.get('/api/master/classes'),
        api.get('/api/master/teachers')
      ]);

      setMasterData({
        academicYears: resAY.data.data || [],
        examTypes: resET.data.data || [],
        subjects: resSub.data.data || [],
        classes: resCls.data.data || [],
        teachers: resTch.data.data || []
      });
    } catch (error) {
      console.error("Gagal memuat master data untuk form:", error);
    }
  };

  // Ubah fungsi handleExportExcel lama menjadi seperti ini:
  const handleExportExcel = async (exam) => {
    try {
      setLoading(true);
      // Panggil API untuk mengambil seluruh daftar soal berdasarkan ID Ujian
      const response = await api.get(`/api/exams/${exam.id}/questions`);
      
      if (response.data.success) {
        const listSoal = response.data.data || [];
        
        if (listSoal.length === 0) {
          notifyWarning(`Belum ada soal yang di-input untuk mata pelajaran ${exam.nama_mapel}`);
          return;
        }

        // Jalankan fungsi export template dengan data dinamis
        exportSoalKeExcel(exam.nama_mapel || 'Mata Pelajaran', listSoal);
        notifySuccess(`Berhasil mengexport ${listSoal.length} soal untuk backup!`);
      } else {
        notifyError("Gagal memuat data soal dari server.");
      }
    } catch (error) {
      console.error('Gagal export soal:', error);
      notifyError('Terjadi kesalahan: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (e, classId) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      setFormData(prev => ({
        ...prev,
        kelas_peserta: [...prev.kelas_peserta, classId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        kelas_peserta: prev.kelas_peserta.filter(id => String(id) !== String(classId))
      }));
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setEditId(null);
    setFormData({
      academic_year_id: activeYearId || '', 
      exam_type_id: '', subject_id: '', kelas_peserta: [], 
      guru_id: '', tanggal_ujian: '', waktu_mulai: '', waktu_selesai: '', durasi: 90, min_work_time: 30, is_active: 1
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (exam) => {
    setIsEditMode(true);
    setEditId(exam.id);
    
    const formattedDate = exam.tanggal_ujian ? new Date(exam.tanggal_ujian).toISOString().split('T')[0] : '';

    setFormData({
      academic_year_id: exam.academic_year_id ? String(exam.academic_year_id) : activeYearId || '',
      exam_type_id: exam.exam_type_id ? String(exam.exam_type_id) : '',
      subject_id: exam.subject_id ? String(exam.subject_id) : '',
      guru_id: exam.guru_id ? String(exam.guru_id) : '',
      kelas_peserta: Array.isArray(exam.kelas_peserta) 
        ? exam.kelas_peserta.map(String) 
        : JSON.parse(exam.kelas_peserta || '[]').map(String),
      tanggal_ujian: formattedDate,
      waktu_mulai: exam.waktu_mulai || '',
      waktu_selesai: exam.waktu_selesai || '',
      durasi: exam.durasi || 90,
      min_work_time: exam.min_work_time || 30, 
      is_active: exam.is_active !== undefined ? exam.is_active : 1
    });
    setIsModalOpen(true);
  };

  const handleDeleteExam = async (id) => {
    const isYakin = await confirmDelete('Jadwal ujian beserta soalnya');
    if (isYakin) {
      try {
        const response = await api.delete(`/api/exams/${id}`);
        if (response.data.success) {
          notifySuccess('Ujian berhasil dihapus!');
          fetchExams();
        }
      } catch (error) {
        notifyError('Gagal menghapus: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (formData.kelas_peserta.length === 0) {
      notifyWarning("Pilih minimal 1 kelas peserta!");
      return;
    }

    const payload = {
      ...formData,
      kelas_peserta: formData.kelas_peserta.map(Number)
    };

    try {
      if (isEditMode) {
        await api.put(`/api/exams/${editId}`, payload);
        notifySuccess('Jadwal ujian berhasil diperbarui!');
      } else {
        await api.post('/api/exams', payload);
        notifySuccess('Jadwal ujian berhasil dibuat!');
      }
      setIsModalOpen(false); 
      fetchExams(); 
    } catch (error) {
      notifyError('Gagal menyimpan jadwal: ' + (error.response?.data?.message || error.message));
    }
  };

  const getDisplayKelas = (exam) => {
    if (exam.nama_kelas && exam.nama_kelas.trim() !== '') {
      return exam.nama_kelas;
    }
    
    if (masterData.classes.length > 0 && exam.kelas_peserta) {
      try {
        const parsed = Array.isArray(exam.kelas_peserta) 
          ? exam.kelas_peserta 
          : JSON.parse(exam.kelas_peserta || '[]');
          
        const names = parsed.map(id => {
          const match = masterData.classes.find(c => String(c.id) === String(id));
          return match ? match.nama_kelas : null;
        }).filter(Boolean);
        
        if (names.length > 0) return names.join(', ');
      } catch (err) {
        return '-';
      }
    }
    return '-';
  };

  const displayedExams = activeYearId 
    ? exams.filter(exam => String(exam.academic_year_id) === String(activeYearId))
    : exams;

  const uniqueExamTypes = [...new Set(displayedExams.map(exam => exam.nama_ujian))].filter(Boolean);

  // ==========================================
  // 1. STATE & FUNGSI UNTUK SORTING
  // ==========================================
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="ml-1.5 inline-block text-slate-300 group-hover:text-slate-500 transition" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={14} className="ml-1.5 inline-block text-indigo-600" /> 
      : <ChevronDown size={14} className="ml-1.5 inline-block text-indigo-600" />;
  };

  // ==========================================
  // 2. MENDAPATKAN DAFTAR KELAS DINAMIS
  // ==========================================
  const uniqueClasses = [
    ...new Set(
      displayedExams.flatMap(exam => {
        const classString = getDisplayKelas(exam);
        if (classString && classString !== '-') {
          return classString.split(',').map(item => item.trim());
        }
        return [];
      })
    )
  ].filter(Boolean).sort();

  // ==========================================
  // 3. PROSES FILTERING DATA
  // ==========================================
  const filteredExams = displayedExams.filter(exam => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = (
      (exam.nama_mapel && exam.nama_mapel.toLowerCase().includes(searchLower)) ||
      (exam.nama_ujian && exam.nama_ujian.toLowerCase().includes(searchLower)) ||
      (exam.nama_guru && exam.nama_guru.toLowerCase().includes(searchLower))
    );
    const matchType = filterExamType ? exam.nama_ujian === filterExamType : true;
    
    // Filter Kelas
    const examClassesStr = getDisplayKelas(exam).toLowerCase();
    const matchClass = filterClass ? examClassesStr.includes(filterClass.toLowerCase()) : true;
    
    return matchSearch && matchType && matchClass;
  });

  // ==========================================
  // 4. PROSES SORTING DATA
  // ==========================================
  const sortedExams = useMemo(() => {
    let sortableItems = [...filteredExams]; 
    
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Khusus untuk pengurutan Waktu Ujian (gabungan tanggal & jam)
        if (sortConfig.key === 'waktu_ujian') {
          aValue = new Date(`${a.tanggal_ujian} ${a.waktu_mulai}`).getTime();
          bValue = new Date(`${b.tanggal_ujian} ${b.waktu_mulai}`).getTime();
        }

        // Handle string agar case-insensitive
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        // Handle nilai null/undefined
        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredExams, sortConfig]);

  // ==========================================
  // 5. PROSES PAGINATION (Potong data dari sortedExams)
  // ==========================================
  const isAll = itemsPerPage === 'semua';
  const totalItems = sortedExams.length; 
  const totalPages = isAll ? 1 : Math.ceil(totalItems / itemsPerPage);
  
  const indexOfLastItem = isAll ? totalItems : currentPage * itemsPerPage;
  const indexOfFirstItem = isAll ? 0 : indexOfLastItem - itemsPerPage;
  
  // 👇 INI KUNCI PERBAIKANNYA: Potong dari sortedExams, bukan filteredExams
  const currentItems = sortedExams.slice(indexOfFirstItem, indexOfLastItem);

  // ==========================================
  // 6. RENDER PAGINATION BUTTONS
  // ==========================================
  const renderPaginationButtons = () => {
    const buttons = [];
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition ${
            currentPage === i
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Ujian</h1>
          <p className="text-sm text-slate-500">Kelola jadwal ujian dan bank soal mata pelajaran</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm shrink-0 w-full sm:w-auto">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <Calendar size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TAHUN AJARAN AKTIF</span>
              <span className="text-sm font-bold text-indigo-900">{activeYearText}</span>
            </div>
          </div>

          {finalRole === 'admin' && (
            <button onClick={handleOpenAddModal} className="px-4 py-3 bg-indigo-900 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-800 transition shadow-sm w-full sm:w-auto whitespace-nowrap">
              <Plus size={18} /> Tambah Jadwal
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="flex flex-col lg:flex-row justify-between items-center p-4 border-b border-slate-200 gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-wrap">
            {/* Input Pencarian */}
            <div className="relative w-full sm:w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari mapel, jenis, atau guru..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); 
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            {/* Filter Jenis Ujian */}
            <div className="relative w-full sm:w-44">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={filterExamType}
                onChange={(e) => {
                  setFilterExamType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white cursor-pointer"
              >
                <option value="">Semua Ujian</option>
                {uniqueExamTypes.map((type, index) => (
                  <option key={index} value={type}>{type}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight size={16} className="text-slate-400 rotate-90" />
              </div>
            </div>

            {/* 🔥 FILTER KELAS BARU (DINAMIS) */}
            <div className="relative w-full sm:w-44">
              <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={filterClass}
                onChange={(e) => {
                  setFilterClass(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white cursor-pointer"
              >
                <option value="">Semua Kelas</option>
                {uniqueClasses.map((className, index) => (
                  <option key={index} value={className}>{className}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight size={16} className="text-slate-400 rotate-90" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-600 w-full lg:w-auto justify-end">
            <span>Tampilkan:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(e.target.value === 'semua' ? 'semua' : Number(e.target.value));
                setCurrentPage(1); 
              }} 
              className="border border-slate-300 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-white text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value="semua">Semua</option>
            </select>
            <span>data</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th 
                    className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100 transition group select-none"
                    onClick={() => handleSort('nama_mapel')}
                  >
                    <div className="flex items-center">Nama Mapel / Ujian {renderSortIcon('nama_mapel')}</div>
                  </th>
                  <th 
                    className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100 transition group select-none"
                    onClick={() => handleSort('kelas_peserta')}
                  >
                    <div className="flex items-center">Kelas {renderSortIcon('kelas_peserta')}</div>
                  </th>
                  <th 
                    className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100 transition group select-none"
                    onClick={() => handleSort('nama_guru')}
                  >
                    <div className="flex items-center">Guru Pengampu {renderSortIcon('nama_guru')}</div>
                  </th>
                  <th 
                    className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100 transition group select-none"
                    onClick={() => handleSort('waktu_ujian')}
                  >
                    <div className="flex items-center">Waktu Ujian {renderSortIcon('waktu_ujian')}</div>
                  </th>
                  <th 
                    className="p-4 font-semibold text-center whitespace-nowrap cursor-pointer hover:bg-slate-100 transition group select-none"
                    onClick={() => handleSort('is_active')}
                  >
                    <div className="flex items-center justify-center">Status {renderSortIcon('is_active')}</div>
                  </th> 
                  <th className="p-4 font-semibold text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">Memuat data ujian...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    {searchTerm || filterExamType || filterClass
                      ? 'Data tidak ditemukan berdasarkan filter / pencarian Anda.' 
                      : `Belum ada jadwal ujian untuk Tahun Ajaran ${activeYearText}.`}
                  </td>
                </tr>
              ) : (
                currentItems.map((exam) => {
                  const totalSoal = Number(exam.jumlah_soal) || 0;

                  return (
                    <tr key={exam.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="p-4 min-w-[270px]">
                        <p className="font-semibold text-indigo-900">{exam.nama_mapel}</p>
                        <p className="text-sm text-slate-500 mb-1.5">{exam.nama_ujian}</p>
                        
                        <div className="flex items-center">
                          {totalSoal === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                              ⚠ Belum Ada Soal (0)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                              <FileText size={11} /> {totalSoal} Soal Tersedia
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium whitespace-nowrap">{getDisplayKelas(exam)}</td>
                      <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{exam.nama_guru || '-'}</td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                          <Calendar size={14} /> 
                          {new Date(exam.tanggal_ujian).toLocaleDateString('id-ID')} 
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={14} /> {exam.waktu_mulai} - {exam.waktu_selesai}
                        </div>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full ${exam.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {exam.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {exam.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => navigate(`/exams/${exam.id}/questions`)} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap">
                            <BookOpen size={16} /> Kelola Soal
                          </button>
                          {finalRole === 'admin' && (
                              <>
                                <button onClick={() => handleEditClick(exam)} className="p-1.5 border border-slate-200 text-blue-500 hover:bg-blue-50 rounded transition" title="Edit Ujian">
                                  <Edit size={16} />
                                </button>
                                <button onClick={() => handleDeleteExam(exam.id)} className="p-1.5 border border-slate-200 text-red-500 hover:bg-red-50 rounded transition" title="Hapus Ujian">
                                  <Trash2 size={16} />
                                </button>
                                <button onClick={() => handleExportExcel(exam)} className="p-1.5 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded transition" title="Export Soal">
                                  <Download size={16} />
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isAll && totalPages > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
            <span className="text-sm text-slate-500">
              Menampilkan <span className="font-medium text-slate-700">{totalItems === 0 ? 0 : indexOfFirstItem + 1}</span> - <span className="font-medium text-slate-700">{Math.min(indexOfLastItem, totalItems)}</span> dari <span className="font-medium text-slate-700">{totalItems}</span> data
            </span>
            
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => prev - 1)} 
                className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition duration-200"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex gap-1 mx-1">
                {renderPaginationButtons()}
              </div>

              <button 
                disabled={currentPage === totalPages || totalPages === 0} 
                onClick={() => setCurrentPage(prev => prev + 1)} 
                className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition duration-200"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {isEditMode ? 'Edit Jadwal Ujian' : 'Tambah Jadwal Ujian'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Pelajaran</label>
                  <select 
                    required 
                    disabled 
                    value={formData.academic_year_id} 
                    onChange={(e) => setFormData({...formData, academic_year_id: e.target.value})} 
                    className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-100 cursor-not-allowed text-slate-600"
                  >
                    <option value="" disabled>Pilih Tahun Pelajaran</option>
                    {masterData.academicYears.map(item => (
                      <option key={item.id} value={item.id}>{item.tahun_pelajaran} - {item.semester}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-indigo-600 mt-1 font-medium">*Otomatis mengikuti Tahun Ajaran Aktif</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Ujian</label>
                  <select required value={formData.exam_type_id} onChange={(e) => setFormData({...formData, exam_type_id: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="" disabled>Pilih Jenis Ujian</option>
                    {masterData.examTypes.map(item => (
                      <option key={item.id} value={item.id}>{item.kode_ujian} - {item.nama_ujian}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mata Pelajaran</label>
                  <select required value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="" disabled>Pilih Mapel</option>
                    {masterData.subjects.map(item => (
                      <option key={item.id} value={item.id}>{item.nama_mapel}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Guru Pengampu</label>
                  <select required value={formData.guru_id} onChange={(e) => setFormData({...formData, guru_id: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="" disabled>Pilih Guru Pengampu</option>
                    {masterData.teachers.map(item => (
                      <option key={item.id} value={item.id}>{item.nama_lengkap}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kelas Peserta Ujian <span className="text-red-500">*</span> <span className="text-xs text-slate-500 font-normal">(Bisa pilih lebih dari 1)</span>
                  </label>
                  <div className="w-full p-3 border border-slate-300 rounded-lg max-h-40 overflow-y-auto bg-slate-50">
                    {masterData.classes.length === 0 ? (
                      <p className="text-xs text-slate-500">Belum ada data kelas...</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {masterData.classes.map(item => (
                          <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-200 p-1.5 rounded transition">
                            <input
                              type="checkbox"
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              checked={formData.kelas_peserta.map(String).includes(String(item.id))}
                              onChange={(e) => handleCheckboxChange(e, item.id)}
                            />
                            <span className="text-sm text-slate-700 font-medium">{item.nama_kelas}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Ujian</label>
                  <input type="date" required value={formData.tanggal_ujian} onChange={(e) => setFormData({...formData, tanggal_ujian: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Mulai</label>
                  <input type="time" required value={formData.waktu_mulai} onChange={(e) => setFormData({...formData, waktu_mulai: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Selesai</label>
                  <input type="time" required value={formData.waktu_selesai} onChange={(e) => setFormData({...formData, waktu_selesai: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Durasi Ujian (Menit)</label>
                  <input type="number" required value={formData.durasi} onChange={(e) => setFormData({...formData, durasi: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Minimal Pengerjaan (Menit)</label>
                  <input type="number" required value={formData.min_work_time} onChange={(e) => setFormData({...formData, min_work_time: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={formData.is_active === 1 || formData.is_active === true}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Aktifkan Ujian Ini</p>
                    <p className="text-xs text-slate-500">Jika dicentang, ujian ini akan muncul di dashboard siswa dan bisa dikerjakan.</p>
                  </div>
                </label>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition">
                  {isEditMode ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManajemenUjian;