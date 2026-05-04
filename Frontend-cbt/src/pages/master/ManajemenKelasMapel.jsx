import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit, Trash2, 
  UserPlus, UserCircle, BookOpen, LayoutGrid, Layers, ChevronLeft, ChevronRight, Users,
  Calendar 
} from 'lucide-react';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import api from '../../api/axiosConfig';

// Import SweetAlert2 dan Sonner
import Swal from 'sweetalert2';
import { toast } from 'sonner';

import { useSettings } from '../../context/SettingsContext'; 

const ManajemenKelasMapel = () => {
  const { activeYear, activeYearId } = useSettings();

  const [activeTab, setActiveTab] = useState('kelas');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState('10');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', nama_kelas: '', tingkat: '', nama_mapel: '' });

  const [isWaliModalOpen, setIsWaliModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const fetchData = async () => {
    if (!activeYearId) return; 

    setIsLoading(true);
    try {
      const [resCls, resSub, resTch] = await Promise.all([
        api.get(`/api/master/classes?academic_year_id=${activeYearId}`), 
        api.get('/api/master/subjects'),
        api.get('/api/master/teachers')
      ]);

      const dCls = resCls.data;
      const dSub = resSub.data;
      const dTch = resTch.data;

      if (dCls.success) setClasses(dCls.data || []);
      if (dSub.success) setSubjects(dSub.data || []);
      if (dTch.success) setTeachers(dTch.data || []);

    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Gagal mengambil data dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    if (activeYearId) {
      fetchData(); 
    }
  }, [activeYearId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, itemsPerPage]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setIsEditMode(true);
      setFormData(item);
    } else {
      setIsEditMode(false);
      setFormData({ id: '', nama_kelas: '', tingkat: '', nama_mapel: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveData = async (e) => {
    e.preventDefault();
    const endpoint = activeTab === 'kelas' ? '/api/master/classes' : '/api/master/subjects';
    
    try {
      let response;
      if (isEditMode) {
        response = await api.put(`${endpoint}/${formData.id}`, formData);
      } else {
        response = await api.post(endpoint, formData);
      }

      const data = response.data;
      if (data.success) {
        toast.success(`Data ${activeTab === 'kelas' ? 'kelas' : 'mata pelajaran'} berhasil disimpan!`);
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error(data.message || 'Gagal menyimpan data.');
      }
    } catch (err) { 
      toast.error("Gagal menyimpan data! Terjadi kesalahan server."); 
    }
  };

  const handleDelete = async (id) => {
    const isKelas = activeTab === 'kelas';
    const labelText = isKelas ? 'kelas' : 'mata pelajaran';

    const result = await Swal.fire({
      title: 'Yakin ingin menghapus?',
      text: `Data ${labelText} ini tidak bisa dikembalikan setelah dihapus!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (result.isConfirmed) {
      try {
        const endpoint = isKelas ? '/api/master/classes' : '/api/master/subjects';
        const res = await api.delete(`${endpoint}/${id}`);
        
        if (res.data.success) {
          toast.success(`Data ${labelText} berhasil dihapus!`);
          fetchData();
        } else {
          toast.error(res.data.message || 'Gagal menghapus data.');
        }
      } catch (err) { 
        toast.error("Gagal menghapus data! Terjadi kesalahan server."); 
      }
    }
  };

  const handleOpenWaliModal = (item) => {
    setSelectedClass(item);
    setSelectedTeacherId(""); 
    setIsWaliModalOpen(true);
  };

  const handleSaveWaliKelas = async (e) => {
    e.preventDefault();
    if (!activeYearId) {
      toast.warning("Tahun ajaran aktif belum dimuat!");
      return;
    }

    try {
      const res = await api.post('/api/master/assign-homeroom', { 
        class_id: selectedClass.id, 
        teacher_id: selectedTeacherId,
        academic_year_id: activeYearId 
      });
      
      if (res.data.success) {
        toast.success('Wali kelas berhasil diatur!');
        setIsWaliModalOpen(false);
        fetchData();
      } else {
        toast.error(res.data.message || 'Gagal mengatur wali kelas.');
      }
    } catch (err) { 
      toast.error("Gagal menyimpan wali kelas! Terjadi kesalahan server."); 
    }
  };

  const filteredData = activeTab === 'kelas' 
    ? classes.filter(c => c.nama_kelas?.toLowerCase().includes(searchTerm.toLowerCase()) || c.wali_kelas?.toLowerCase().includes(searchTerm.toLowerCase()))
    : subjects.filter(s => s.nama_mapel?.toLowerCase().includes(searchTerm.toLowerCase()));

  const limit = itemsPerPage === 'Semua' ? filteredData.length : parseInt(itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / limit) || 1;
  const startIndex = (currentPage - 1) * limit;
  const currentItems = filteredData.slice(startIndex, startIndex + limit);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen pb-10">
      
      {/* ===================================== */}
      {/* HEADER DENGAN INFO TAHUN AJARAN       */}
      {/* ===================================== */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Kelas dan Mapel</h1>
          <p className="text-sm text-slate-500">Konfigurasi kelas dan mata pelajaran sekolah.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Badge Tahun Ajaran Aktif */}
          <div className="bg-white border border-indigo-100 shadow-sm px-4 py-2 rounded-xl flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Calendar size={20} />
            </div>
            <div className="text-left pr-2">
              <p className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">Tahun Ajaran Aktif</p>
              <p className="text-sm font-bold text-indigo-900">{activeYear || "Memuat..."}</p>
            </div>
          </div>

          <Button 
            onClick={() => handleOpenModal()} 
            className="bg-primary hover:bg-[#1e40af] text-white flex items-center justify-center gap-2 shadow-md whitespace-nowrap shrink-0 px-4 py-2 rounded-md"
          >
              <Plus size={18}/> Tambah {activeTab === 'kelas' ? 'Kelas' : 'Mapel'}
          </Button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button 
          onClick={() => setActiveTab('kelas')} 
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-xl transition-all ${activeTab === 'kelas' ? 'bg-white text-primary border-t border-l border-r border-slate-200 shadow-[0_2px_0_0_white]' : 'text-slate-500 hover:bg-slate-200/50'}`}
        >
          <LayoutGrid size={18} /> Daftar Kelas
        </button>
        <button 
          onClick={() => setActiveTab('mapel')} 
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-xl transition-all ${activeTab === 'mapel' ? 'bg-white text-primary border-t border-l border-r border-slate-200 shadow-[0_2px_0_0_white]' : 'text-slate-500 hover:bg-slate-200/50'}`}
        >
          <BookOpen size={18} /> Mata Pelajaran
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* KIRI: RINGKASAN */}
        <div className="w-full lg:w-1/4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 border-b pb-2">Info Master Data</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600"><LayoutGrid size={16} className="text-primary"/> <span className="text-sm font-medium">Total Kelas</span></div>
              <span className="text-lg font-black text-slate-800">{classes.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600"><BookOpen size={16} className="text-emerald-600"/> <span className="text-sm font-medium">Total Mapel</span></div>
              <span className="text-lg font-black text-slate-800">{subjects.length}</span>
            </div>
          </div>
        </div>

        {/* KANAN: TABEL */}
        <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" placeholder={`Cari nama ${activeTab === 'kelas' ? 'kelas atau wali...' : 'mata pelajaran...'}`} 
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Tampilkan:</span>
              <select 
                value={itemsPerPage} onChange={(e) => setItemsPerPage(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:border-primary text-slate-700 font-medium"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="Semua">Semua</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  {activeTab === 'kelas' ? (
                    <>
                      <th className="px-6 py-4 w-32">Tingkat</th>
                      <th className="px-6 py-4">Nama Kelas</th>
                      <th className="px-6 py-4">Wali Kelas</th>
                      <th className="px-6 py-4 text-center">Jml Siswa</th>
                      <th className="px-6 py-4 text-center w-40">Aksi</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 w-24">ID</th>
                      <th className="px-6 py-4">Nama Mata Pelajaran</th>
                      <th className="px-6 py-4 text-center w-32">Aksi</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-medium">Memuat data dari server...</td></tr>
                ) : currentItems.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-medium">Data tidak ditemukan.</td></tr>
                ) : activeTab === 'kelas' ? (
                  currentItems.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <Layers size={16} className="text-amber-500"/> Kelas {item.tingkat}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-primary text-base">{item.nama_kelas}</td>
                      <td className="px-6 py-4">
                        {item.wali_kelas ? (
                          <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <UserCircle size={18} className="text-emerald-500"/> {item.wali_kelas}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <UserCircle size={14}/> Belum diatur
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                          <Users size={14}/> {item.jumlah_siswa || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenWaliModal(item)} title="Atur Wali Kelas" className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-colors">
                            <UserPlus size={16}/>
                          </button>
                          <button onClick={() => handleOpenModal(item)} title="Edit Kelas" className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-lg transition-colors">
                            <Edit size={16}/>
                          </button>
                          <button onClick={() => handleDelete(item.id)} title="Hapus Kelas" className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-lg transition-colors">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  currentItems.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500">#{item.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 font-bold text-slate-800 text-base">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><BookOpen size={18}/></div>
                          {item.nama_mapel}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenModal(item)} title="Edit Mapel" className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-lg transition-colors">
                            <Edit size={16}/>
                          </button>
                          <button onClick={() => handleDelete(item.id)} title="Hapus Mapel" className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-lg transition-colors">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* DESAIN PAGINASI YANG DIPERBARUI */}
          {!isLoading && filteredData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 px-6 border-t border-slate-100 bg-white">
              <span className="text-sm text-slate-500 mb-4 sm:mb-0">
                Menampilkan {startIndex + 1} - {Math.min(startIndex + limit, filteredData.length)} dari {filteredData.length} data
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                  className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-all ${
                      currentPage === page
                        ? 'bg-[#1e293b] text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
                  className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH/EDIT */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${isEditMode ? 'Edit Data' : 'Tambah'} ${activeTab === 'kelas' ? 'Kelas' : 'Mata Pelajaran'}`}>
        <form onSubmit={handleSaveData} className="space-y-5 mt-2">
          {activeTab === 'kelas' ? (
            <>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Tingkat Kelas <span className="text-rose-500">*</span></label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1.5 outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary font-medium" value={formData.tingkat} onChange={e => setFormData({...formData, tingkat: e.target.value})} required>
                  <option value="" disabled>-- Pilih Tingkat --</option>
                  <option value="7">Kelas 7 (Tujuh)</option>
                  <option value="8">Kelas 8 (Delapan)</option>
                  <option value="9">Kelas 9 (Sembilan)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Nama Ruang / Kelas <span className="text-rose-500">*</span></label>
                <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1.5 outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary font-medium" placeholder="Contoh: VII - A" value={formData.nama_kelas} onChange={e => setFormData({...formData, nama_kelas: e.target.value})} required />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Nama Mata Pelajaran <span className="text-rose-500">*</span></label>
              <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1.5 outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary font-medium" placeholder="Contoh: Ilmu Pengetahuan Alam" value={formData.nama_mapel} onChange={e => setFormData({...formData, nama_mapel: e.target.value})} required />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" className="bg-primary hover:bg-[#1e40af] text-white">Simpan Data</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL WALI KELAS */}
      <Modal isOpen={isWaliModalOpen} onClose={() => setIsWaliModalOpen(false)} title={`Pilih Wali Kelas: ${selectedClass?.nama_kelas}`}>
        <form onSubmit={handleSaveWaliKelas} className="space-y-5 mt-2">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Guru / Staff <span className="text-rose-500">*</span></label>
            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1.5 outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary font-medium" value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)} required>
              <option value="" disabled>-- Klik untuk memilih Guru --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.nama_lengkap}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsWaliModalOpen(false)}>Batal</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Simpan Wali Kelas</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ManajemenKelasMapel;