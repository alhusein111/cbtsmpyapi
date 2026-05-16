import { useState, useEffect } from 'react';
import { 
  Users, GraduationCap, Briefcase, UserMinus,
  Search, Download, Plus, Edit, Trash2, 
  Calendar, FileText, ArrowRight, Upload,
  ChevronLeft, ChevronRight // BARU: Import icon untuk paginasi
} from 'lucide-react';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

// Import SweetAlert2 dan Sonner
import Swal from 'sweetalert2';
import { toast } from 'sonner';

// BARU 1: Import file axiosConfig
import api from '../../api/axiosConfig';

// BARU 2: Import fungsi pembuat template Excel
import { downloadTemplateStaff } from '../../utils/excelTemplates';

const ENDPOINT = '/api/staff';

const ManajemenStaf = () => {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalFormOpen, setIsModalFormOpen] = useState(false);
  const [isModalImportOpen, setIsModalImportOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    nuptk: '',
    password: '',
    nama_lengkap: '',
    role: 'guru'
  });
  const [importFile, setImportFile] = useState(null);

  // ==========================================
  // STATE BARU: PENCARIAN & PAGINASI
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('Semua Peran');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(ENDPOINT);
      if (response.data.success) {
        setStaff(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Gagal mengambil data staf dari server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // ==========================================
  // LOGIKA PENCARIAN & FILTER
  // ==========================================
  // Kembalikan ke halaman 1 setiap kali pencarian/filter diubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, itemsPerPage]);

  const filteredStaff = staff.filter(item => {
    const matchSearch = (item.nama_lengkap?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                        (item.nuptk?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                        (item.username?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    let matchRole = true;
    if (filterRole === 'Guru') matchRole = item.role === 'guru';
    if (filterRole === 'Admin') matchRole = item.role === 'admin' || item.role === 'kepala_sekolah';
    
    return matchSearch && matchRole;
  });

  // ==========================================
  // LOGIKA PAGINASI
  // ==========================================
  const totalItems = filteredStaff.length;
  const isAll = itemsPerPage === 'all';
  const totalPages = isAll ? 1 : Math.ceil(totalItems / (itemsPerPage));
  
  const startIndex = isAll ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = isAll ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
  
  // Data final yang ditampilkan di tabel
  const currentItems = filteredStaff.slice(startIndex, endIndex);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({ username: '', nuptk: '', password: '', nama_lengkap: '', role: 'guru' });
    setIsModalFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setEditId(item.id);
    setFormData({
      username: item.username,
      nuptk: item.nuptk || '', 
      password: '', 
      nama_lengkap: item.nama_lengkap,
      role: item.role
    });
    setIsModalFormOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!isEditMode && !formData.password) {
      return toast.warning('Password wajib diisi untuk staff baru!');
    }

    try {
      let response;
      if (isEditMode) {
        response = await api.put(`${ENDPOINT}/${editId}`, formData);
      } else {
        response = await api.post(ENDPOINT, formData);
      }

      if (response.data.success) {
        toast.success(response.data.message || 'Data staf berhasil disimpan!');
        setIsModalFormOpen(false);
        fetchStaff();
      } else {
        toast.error(response.data.message || 'Gagal menyimpan data.');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan pada server!');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Yakin ingin menghapus?',
      text: "Data staf ini tidak bisa dikembalikan setelah dihapus!",
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
          toast.success('Data staf berhasil dihapus!');
          fetchStaff();
        } else {
          toast.error(response.data.message || 'Gagal menghapus data.');
        }
      } catch (error) {
        toast.error('Gagal menghapus data! Terjadi kesalahan server.');
      }
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return toast.warning('Pilih file Excel terlebih dahulu!');

    const dataForm = new FormData();
    dataForm.append('file', importFile);

    const toastId = toast.loading('Sedang mengimpor data...');

    try {
      const response = await api.post(`${ENDPOINT}/import`, dataForm, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Import data berhasil!', { id: toastId });
        setIsModalImportOpen(false);
        setImportFile(null);
        fetchStaff();
      } else {
        toast.error(response.data.message || 'Gagal mengimpor data.', { id: toastId });
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengimpor file!', { id: toastId });
    }
  };

  const formatRole = (role) => {
    switch(role) {
      case 'admin': return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 text-xs font-semibold rounded-md">Admin / TU</span>;
      case 'kepala_sekolah': return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 text-xs font-semibold rounded-md">Kepala Sekolah</span>;
      default: return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-semibold rounded-md">Guru Pengajar</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Manajemen Staf & Guru</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data tenaga pendidik dan kependidikan.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="flex items-center gap-2 bg-white" onClick={() => setIsModalImportOpen(true)}>
            <Download size={18} /> Impor Data
          </Button>
          <Button variant="primary" className="flex items-center gap-2 bg-on-surface hover:bg-[#1e293b] text-white" onClick={handleOpenAdd}>
            <Plus size={18} /> Tambah Staf
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TOTAL STAF</p>
            <p className="text-2xl font-black text-on-surface">{staff.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><GraduationCap size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">GURU AKTIF</p>
            <p className="text-2xl font-black text-emerald-600">{staff.filter(s => s.role === 'guru').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Briefcase size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TENDIK / ADMIN</p>
            <p className="text-2xl font-black text-amber-600">{staff.filter(s => s.role === 'admin' || s.role === 'kepala_sekolah').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><UserMinus size={24} /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CUTI / NON-AKTIF</p>
            <p className="text-2xl font-black text-rose-600">0</p>
          </div>
        </div>
      </div>

      {/* MAIN TABLE & CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* ACTION BAR (Pencarian & Filter) */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari staf atau NUPTK..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 shadow-sm outline-none cursor-pointer"
            >
              <option value="Semua Peran">Semua Peran</option>
              <option value="Guru">Guru</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-75">
          {/* TAMBAHAN: Tambahkan min-w-[800px] atau min-w-max agar tabel bisa di-scroll ke kanan di HP */}
          <table className="w-full min-w-[800px] text-left text-sm text-slate-700">
            <thead className="bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">NUPTK / ID</th>
                <th className="px-6 py-5">STAF</th>
                <th className="px-6 py-5">PERAN</th>
                <th className="px-6 py-5">STATUS</th>
                <th className="px-6 py-5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan="5" className="text-center py-10 text-slate-500">Memuat data...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10 text-slate-500">Belum ada data staf / tidak ditemukan.</td></tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* TAMBAHAN: whitespace-nowrap agar teks tidak turun ke bawah */}
                    <td className="px-6 py-4 font-medium text-slate-600 whitespace-nowrap">{item.nuptk || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.nama_lengkap}&backgroundColor=0f172a,059669,2563eb&textColor=ffffff`} 
                          alt={item.nama_lengkap} 
                          className="w-10 h-10 rounded-full shadow-sm shrink-0" 
                        />
                        <div>
                          <p className="font-bold text-on-surface text-sm">{item.nama_lengkap}</p>
                          <p className="text-[11px] text-slate-400 font-medium">@{item.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatRole(item.role)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-emerald-100/50 text-emerald-600 px-3 py-1 text-[11px] font-bold uppercase rounded-full border border-emerald-200">Aktif</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
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

        {/* PAGINATION FOOTER */}
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
              <span>Menampilkan {startIndex + 1} - {endIndex} dari {totalItems} staf</span>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-slate-50"
              >
                <ChevronLeft size={18} />
              </button>
              
              {/* Tombol Nomer Halaman */}
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                // Hanya tampilkan max 5 halaman (sekitar halaman aktif) untuk kerapian
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
                          ? 'bg-[#1e293b] text-white shadow-sm' 
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
                className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-slate-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL FORM */}
      <Modal isOpen={isModalFormOpen} onClose={() => setIsModalFormOpen(false)} title={isEditMode ? "Edit Data Staf" : "Tambah Staf Baru"}>
        <form onSubmit={handleSubmitForm} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">NUPTK / ID Pegawai</label>
            <input type="text" name="nuptk" value={formData.nuptk} onChange={handleChange} placeholder="Opsional / Bisa dikosongkan" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Username <span className="text-red-500">*</span></label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500" required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Nama Lengkap <span className="text-red-500">*</span></label>
            <input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500" required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Role / Peran <span className="text-red-500">*</span></label>
            <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 font-medium" required>
              <option value="guru">Guru Pengajar</option>
              <option value="admin">Tenaga Kependidikan / Admin</option>
              <option value="kepala_sekolah">Kepala Sekolah</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-bold text-slate-700">
              Password {isEditMode && <span className="text-xs font-normal text-slate-400 ml-1">(Kosongkan jika tidak ingin diubah)</span>}
              {!isEditMode && <span className="text-red-500">*</span>}
            </label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder={isEditMode ? "Ketik sandi baru..." : "Buat kata sandi..."}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-5 mt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalFormOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" className="bg-on-surface hover:bg-[#1e293b] text-white">Simpan Data</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL IMPORT EXCEL */}
      <Modal isOpen={isModalImportOpen} onClose={() => setIsModalImportOpen(false)} title="Import Data Staf (Excel)">
        <form onSubmit={handleImportSubmit} className="space-y-5">
          
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-blue-900">Butuh template Excel?</p>
              <p className="text-xs text-blue-700 mt-0.5">Download formatnya agar sesuai dengan sistem.</p>
            </div>
            <button 
              type="button" 
              onClick={downloadTemplateStaff} 
              className="flex items-center gap-2 px-3 py-2 bg-white text-blue-600 text-xs font-bold rounded-lg border border-blue-200 shadow-sm hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
            >
              <Download size={14} /> Download Template
            </button>
          </div>

          <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors">
            <Upload size={32} className="text-slate-400 mb-4" />
            <p className="text-sm font-bold text-on-surface mb-1">Upload File Excel (.xlsx)</p>
            <p className="text-xs text-slate-500 mb-6">Pastikan format kolom sudah mengikuti template yang didownload.</p>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={(e) => setImportFile(e.target.files[0])} 
              className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
              required 
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalImportOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white">Mulai Import</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ManajemenStaf;