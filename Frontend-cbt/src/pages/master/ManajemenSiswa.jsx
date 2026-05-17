import { useState, useEffect } from 'react';
import { 
  Plus, Download, Filter, Edit, Trash2, 
  Users, CheckCircle, MoreHorizontal, XCircle, Search,
  Upload, FileSpreadsheet, ChevronLeft, ChevronRight, BarChart2,
  CheckSquare
} from 'lucide-react';

// Import SweetAlert2 dan Sonner
import Swal from 'sweetalert2';
import { toast } from 'sonner';

import Button from '../../components/Button';
import Modal from '../../components/Modal'; 

// Import file axiosConfig kita
import api from '../../api/axiosConfig'; 

// Import fungsi pembuat template Excel untuk siswa
import { downloadTemplateSiswa } from '../../utils/excelTemplates';

const ENDPOINT = '/api/siswa'; 

const ManajemenSiswa = () => {
  // 🔥 AMBIL DATA ROLE DARI LOCALSTORAGE
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const userRole = currentUser.role?.toLowerCase() || 'guru'; // Default ke guru agar aman

  // STATE DATA
  const [siswa, setSiswa] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState([]);

  // STATE MODALS
  const [isModalFormOpen, setIsModalFormOpen] = useState(false);
  const [isModalImportOpen, setIsModalImportOpen] = useState(false);
  
  // STATE FORM
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    nis: '',
    nisn: '',
    no_peserta: '',
    nama: '',
    class_id: '',
    is_locked: 0 // Default tambah siswa adalah aktif
  });
  const [importFile, setImportFile] = useState(null);

  // ==========================================
  // STATE BARU: PENCARIAN, FILTER & PAGINASI
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua Kelas');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ==========================================
  // STATE BARU: CHECKBOX / BULK ACTIONS
  // ==========================================
  const [selectedSiswa, setSelectedSiswa] = useState([]);
  const [targetClassId, setTargetClassId] = useState(''); // 🔥 STATE UNTUK PINDAH KELAS

  // --- API CALLS ---

  const fetchSiswa = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(ENDPOINT);
      if (response.data.success) {
        setSiswa(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching data siswa:', error);
      toast.error('Gagal mengambil data siswa dari server.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/master/classes'); 
      if (response.data.success) {
        setClasses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching data kelas:', error);
    }
  };

  useEffect(() => {
    fetchSiswa();
    fetchClasses(); 
  }, []);

  // Reset ke halaman 1 dan kosongkan checkbox jika filter/pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
    setSelectedSiswa([]); 
    setTargetClassId(''); // Reset target kelas juga
  }, [searchTerm, filterKelas, itemsPerPage]);

  const filteredSiswa = siswa.filter(item => {
    const matchSearch = (item.nama?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                        (item.nis?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                        (item.nisn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                        (item.no_peserta?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    let matchKelas = true;
    if (filterKelas !== 'Semua Kelas') {
      matchKelas = String(item.class_id) === String(filterKelas);
    }
    
    return matchSearch && matchKelas;
  });

  const totalItems = filteredSiswa.length;
  const isAll = itemsPerPage === 'all';
  const totalPages = isAll ? 1 : Math.ceil(totalItems / itemsPerPage);
  
  const startIndex = isAll ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = isAll ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
  
  const currentItems = filteredSiswa.slice(startIndex, endIndex);

  // ==========================================
  // HANDLERS CHECKBOX & BULK ACTIONS
  // ==========================================
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Pilih semua ID yang ada di halaman saat ini
      const currentIds = currentItems.map(item => item.id);
      setSelectedSiswa(currentIds);
    } else {
      // Kosongkan pilihan
      setSelectedSiswa([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedSiswa(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: `Hapus ${selectedSiswa.length} Siswa?`,
      text: "Data yang dihapus tidak bisa dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Massal!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const toastId = toast.loading('Sedang menghapus data massal...');
      try {
        await Promise.all(selectedSiswa.map(id => api.delete(`${ENDPOINT}/${id}`)));
        toast.success(`${selectedSiswa.length} data siswa berhasil dihapus!`, { id: toastId });
        setSelectedSiswa([]);
        fetchSiswa(); 
      } catch (error) {
        toast.error('Gagal menghapus beberapa atau semua data!', { id: toastId });
      }
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    const actionText = newStatus === 1 ? 'Nonaktifkan' : 'Aktifkan';
    const result = await Swal.fire({
      title: `${actionText} ${selectedSiswa.length} Siswa?`,
      text: `Status siswa terpilih akan diubah menjadi ${actionText.toLowerCase()}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus === 1 ? '#ef4444' : '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Ya, ${actionText}!`,
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const toastId = toast.loading(`Sedang memproses ${actionText.toLowerCase()} massal...`);
      try {
        await Promise.all(selectedSiswa.map(id => {
          const existingData = siswa.find(s => s.id === id);
          return api.put(`${ENDPOINT}/${id}`, { ...existingData, is_locked: newStatus });
        }));
        
        toast.success(`${selectedSiswa.length} akun siswa berhasil diperbarui!`, { id: toastId });
        setSelectedSiswa([]);
        fetchSiswa(); 
      } catch (error) {
        toast.error('Gagal memperbarui status akun!', { id: toastId });
      }
    }
  };

  // 🔥 FUNGSI BARU: PINDAH/NAIK KELAS MASSAL
  const handleBulkUpgradeClass = async () => {
    if (!targetClassId) {
      return toast.warning('Pilih kelas tujuan terlebih dahulu pada dropdown!');
    }

    const targetClassName = classes.find(c => String(c.id) === String(targetClassId))?.nama_kelas || 'Kelas Baru';

    const result = await Swal.fire({
      title: `Pindahkan ${selectedSiswa.length} Siswa?`,
      text: `Data siswa yang dicentang akan dipindahkan ke ${targetClassName}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb', // Blue-600
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Pindahkan!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const toastId = toast.loading('Sedang memindahkan kelas siswa...');
      try {
        const response = await api.put(`${ENDPOINT}/upgrade-class`, {
          studentIds: selectedSiswa,
          newClassId: targetClassId
        });

        if (response.data.success) {
          toast.success(response.data.message || 'Siswa berhasil dipindahkan!', { id: toastId });
          setSelectedSiswa([]);
          setTargetClassId(''); // Reset dropdown
          fetchSiswa(); 
        } else {
          toast.error(response.data.message || 'Gagal memindahkan siswa.', { id: toastId });
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Terjadi kesalahan pada server saat memindah kelas!';
        toast.error(errorMessage, { id: toastId });
      }
    }
  };

  // --- HANDLERS NORMAL ---

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({ nis: '', nisn: '', no_peserta: '', nama: '', class_id: '', is_locked: 0 });
    setIsModalFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setEditId(item.id);
    setFormData({
      nis: item.nis,
      nisn: item.nisn || '',
      no_peserta: item.no_peserta,
      nama: item.nama,
      class_id: item.class_id,
      is_locked: item.is_locked || 0
    });
    setIsModalFormOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (isEditMode) {
        response = await api.put(`${ENDPOINT}/${editId}`, formData);
      } else {
        response = await api.post(ENDPOINT, formData);
      }

      if (response.data.success) {
        toast.success(response.data.message || 'Data siswa berhasil disimpan!');
        setIsModalFormOpen(false);
        fetchSiswa(); 
      } else {
        toast.error(response.data.message || 'Gagal menyimpan data siswa.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Terjadi kesalahan pada server!';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Yakin ingin menghapus?',
      text: "Data siswa ini tidak bisa dikembalikan setelah dihapus!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.delete(`${ENDPOINT}/${id}`);
        if (response.data.success) {
          toast.success('Data siswa berhasil dihapus!');
          fetchSiswa(); 
        } else {
          toast.error(response.data.message || 'Gagal menghapus data siswa.');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Terjadi kesalahan saat menghapus data!';
        toast.error(errorMessage);
      }
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return toast.warning('Pilih file Excel terlebih dahulu mas brow!');

    const dataForm = new FormData();
    dataForm.append('file', importFile);

    const toastId = toast.loading('Sedang mengimpor data siswa...');

    try {
      const response = await api.post(`${ENDPOINT}/import`, dataForm, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Mantap! Data berhasil diimport.', { id: toastId });
        setIsModalImportOpen(false);
        setImportFile(null);
        fetchSiswa(); 
      } else {
        toast.error(response.data.message || 'Gagal mengimpor data.', { id: toastId });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Waduh, gagal mengimpor file Excel!';
      toast.error(errorMessage, { id: toastId });
    }
  };

  const getStatusPill = (isLogin, isLocked) => {
    if (isLocked === true || isLocked == 1) {
      return <span className="bg-rose-100 text-rose-700 px-3 py-1 text-xs font-semibold rounded-full border border-rose-200">NON-AKTIF</span>;
    }
    if (isLogin === true || isLogin == 1) {
      return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold rounded-full border border-emerald-200">AKTIF / ONLINE</span>;
    }
    return <span className="bg-slate-100 text-slate-600 px-3 py-1 text-xs font-semibold rounded-full border border-slate-200">AKTIF / OFFLINE</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Siswa</h1>
          <p className="text-sm text-slate-500 mt-1">Portal Akademik / Daftar Siswa</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {userRole === 'admin' && (
            <Button variant="primary" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white shadow-md rounded-xl px-5" onClick={handleOpenAdd}>
              <Users size={18} />
              Tambah Siswa Baru
            </Button>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TOTAL SISWA</p>
            <p className="text-2xl font-black text-slate-800">{siswa.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ONLINE / AKTIF</p>
            <p className="text-2xl font-black text-emerald-600">{siswa.filter(s => s.is_login && (!s.is_locked || s.is_locked == 0)).length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><MoreHorizontal size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">OFFLINE / AKTIF</p>
            <p className="text-2xl font-black text-amber-600">{siswa.filter(s => !s.is_login && (!s.is_locked || s.is_locked == 0)).length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center"><XCircle size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">NON-AKTIF</p>
            <p className="text-2xl font-black text-rose-600">{siswa.filter(s => s.is_locked == 1 || s.is_locked === true).length}</p>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama, NIS, atau NISN..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 shadow-sm" 
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-slate-500 hidden sm:block">Filter:</span>
              <select 
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm font-medium cursor-pointer"
              >
                <option value="Semua Kelas">Semua Kelas</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nama_kelas}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            {userRole === 'admin' && (
              <Button variant="outline" className="flex items-center gap-2 text-sm py-2 shadow-sm border-slate-200 bg-white w-full sm:w-auto justify-center" onClick={() => setIsModalImportOpen(true)}>
                <Upload size={16} /> Import
              </Button>
            )}
            <Button variant="outline" className="flex items-center gap-2 text-sm py-2 shadow-sm border-slate-200 bg-white w-full sm:w-auto justify-center">
              <Download size={16} /> Export
            </Button>
          </div>
        </div>

        {/* 🔥 PANEL BULK ACTIONS (MUNCUL JIKA ADA CHECKBOX YANG DIPILIH) */}
        {selectedSiswa.length > 0 && userRole === 'admin' && (
          <div className="bg-blue-50 px-5 py-3 border-b border-blue-100 flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
              <CheckSquare size={18} />
              <span>{selectedSiswa.length} Siswa Terpilih</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* 🔥 TAMBAHAN DROP DOWN PINDAH KELAS */}
              <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 p-1 shadow-sm">
                <select 
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="text-xs border-none bg-transparent outline-none cursor-pointer text-slate-700 px-2 font-medium min-w-30"
                >
                  <option value="">-- Pilih Kelas Baru --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nama_kelas}</option>)}
                </select>
                <button 
                  onClick={handleBulkUpgradeClass}
                  className="px-3 py-1 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                >
                  Pindah Kelas
                </button>
              </div>

              <span className="hidden md:block w-px h-6 bg-blue-200 mx-1"></span>

              <button onClick={() => handleBulkStatusUpdate(0)} className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-200">
                Aktifkan
              </button>
              <button onClick={() => handleBulkStatusUpdate(1)} className="px-3 py-1.5 text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors border border-rose-200">
                Nonaktifkan
              </button>
              <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-bold bg-white text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 shadow-sm flex items-center gap-1.5">
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto min-h-75">
          {/* Tambahkan min-w-max di sini */}
          <table className="w-full text-left text-sm text-slate-700 min-w-max">
            <thead className="bg-white text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th scope="col" className="px-4 py-4 sm:px-6 sm:py-5 w-12 whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={currentItems.length > 0 && selectedSiswa.length === currentItems.length}
                    className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer w-4 h-4" 
                  />
                </th>
                <th scope="col" className="px-4 py-4 sm:px-6 sm:py-5 whitespace-nowrap">ID / NISN</th>
                <th scope="col" className="px-4 py-4 sm:px-6 sm:py-5 whitespace-nowrap">NAMA LENGKAP</th>
                <th scope="col" className="px-4 py-4 sm:px-6 sm:py-5 whitespace-nowrap">KELAS</th>
                <th scope="col" className="px-4 py-4 sm:px-6 sm:py-5 whitespace-nowrap">STATUS</th>
                {userRole === 'admin' && (
                  <th scope="col" className="px-4 py-4 sm:px-6 sm:py-5 text-right whitespace-nowrap">AKSI</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={userRole === 'admin' ? 6 : 5} className="text-center py-10 text-slate-500">Memuat data...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={userRole === 'admin' ? 6 : 5} className="text-center py-10 text-slate-500">Tidak ada data siswa yang ditemukan.</td></tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedSiswa.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedSiswa.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4" 
                      />
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-600">{item.nisn || '-'}</p>
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap min-w-[250px]">
                      <div className="flex items-center gap-3">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.nama}&backgroundColor=0f172a,2563eb,059669&textColor=ffffff`} alt={item.nama} className="w-10 h-10 rounded-full shadow-sm" />
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.nama}</p>
                          <p className="text-[11px] text-slate-400 font-medium">NIS: {item.nis} &bull; No.Ujian: {item.no_peserta}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4 font-semibold text-slate-600 whitespace-nowrap">{item.nama_kelas || `ID: ${item.class_id}`}</td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                      {getStatusPill(item.is_login, item.is_locked)}
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginasi yang Sudah Aktif */}
        {!isLoading && totalItems > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <select 
                value={itemsPerPage} 
                onChange={(e) => setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-blue-500 cursor-pointer text-slate-600 bg-white"
              >
                <option value={10}>10 Baris</option>
                <option value={20}>20 Baris</option>
                <option value={50}>50 Baris</option>
                <option value="all">Semua</option>
              </select>
              <span>Menampilkan {startIndex + 1} - {endIndex} dari {totalItems} siswa</span>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  totalPages <= 5 || 
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-md flex items-center justify-center font-medium transition-colors ${
                        currentPage === pageNum 
                          ? 'bg-slate-800 text-white shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={idx} className="px-1 text-slate-400">...</span>;
                }
                return null;
              })}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-slate-50 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FORM (ADD/EDIT) */}
      <Modal isOpen={isModalFormOpen} onClose={() => setIsModalFormOpen(false)} title={isEditMode ? "Edit Data Siswa" : "Tambah Siswa Baru"}>
        <form onSubmit={handleSubmitForm} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">NIS <span className="text-red-500">*</span></label>
              <input type="text" name="nis" value={formData.nis} onChange={handleChange} placeholder="Nomor Induk Siswa" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">NISN</label>
              <input type="text" name="nisn" value={formData.nisn} onChange={handleChange} placeholder="Nomor Induk Siswa Nasional" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">No Peserta Ujian <span className="text-red-500">*</span></label>
              <input type="text" name="no_peserta" value={formData.no_peserta} onChange={handleChange} placeholder="Contoh: 01-123-456" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Kelas <span className="text-red-500">*</span></label>
              <select name="class_id" value={formData.class_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm font-medium" required>
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nama_kelas} (Tingkat {c.tingkat})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Nama Lengkap <span className="text-red-500">*</span></label>
              <input type="text" name="nama" value={formData.nama} onChange={handleChange} placeholder="Nama lengkap sesuai ijazah" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" required />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Status Akun <span className="text-red-500">*</span></label>
              <select name="is_locked" value={formData.is_locked} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm font-medium" required>
                <option value={0}>Aktif (Bisa Login)</option>
                <option value={1}>Tidak Aktif / Terkunci</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => setIsModalFormOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">Simpan Data</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL IMPORT EXCEL */}
      <Modal isOpen={isModalImportOpen} onClose={() => setIsModalImportOpen(false)} title="Import Data Siswa (Excel)">
        <form onSubmit={handleImportSubmit} className="space-y-5">
          
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-blue-900">Butuh template Excel?</p>
              <p className="text-xs text-blue-700 mt-0.5">Download formatnya agar sesuai dengan sistem.</p>
            </div>
            <button 
              type="button" 
              onClick={downloadTemplateSiswa} 
              className="flex items-center gap-2 px-3 py-2 bg-white text-blue-600 text-xs font-bold rounded-lg border border-blue-200 shadow-sm hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
            >
              <Download size={14} /> Download Template
            </button>
          </div>

          <div className="p-8 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/50 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
               <FileSpreadsheet size={32} className="text-blue-600" />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">Upload File Excel (.xlsx, .xls)</p>
            <p className="text-xs text-slate-500 mb-6">Pastikan format kolom sudah mengikuti template yang didownload.</p>
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={(e) => setImportFile(e.target.files[0])}
              className="text-sm file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer text-slate-500 w-full max-w-xs"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => setIsModalImportOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">Mulai Import</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ManajemenSiswa;