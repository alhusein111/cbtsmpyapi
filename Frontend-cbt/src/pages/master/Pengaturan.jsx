import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext'; 
import { 
  User, Shield, Calendar, FileText, Megaphone, Plus, Edit, Trash2, 
  Save, X, Search, ChevronLeft, ChevronRight, Building2, UserCheck, 
  Image as ImageIcon, Target, CalendarDays
} from 'lucide-react';
import api from '../../api/axiosConfig';
import { Toaster, toast } from 'sonner';
import Swal from 'sweetalert2';


// --- Komponen Switch Toggle Elegan ---
const Switch = ({ checked, onChange }) => (
  <button 
    type="button"
    onClick={onChange}
    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
  >
    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : ''}`}></div>
  </button>
);

const Pengaturan = () => {
  const { activeYear, activeYearId } = useSettings();
  const [activeTab, setActiveTab] = useState('profil');

  // --- Ambil Role User ---
  const currentUser = JSON.parse(localStorage.getItem('user')) || {}; 
  const userId = currentUser.id || 1; 
  const userRole = currentUser.role?.toLowerCase() || 'guru'; 

  // --- STATE DATA ---
  const [profile, setProfile] = useState({ username: '', nuptk: '', nama_lengkap: '', role: '' });
  const [passwords, setPasswords] = useState({ password_baru: '', konfirmasi: '' });
  const [academicYears, setAcademicYears] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [kkms, setKkms] = useState([]); // State Data KKM
  const [raportDates, setRaportDates] = useState([]); // State Data Tanggal Raport

  // --- STATE PENGATURAN GLOBAL SEKOLAH ---
  const [globalSettings, setGlobalSettings] = useState({
    nama_sekolah: '', alamat_sekolah: '', kepala_sekolah_nama: '', kepala_sekolah_nip: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [currentLogo, setCurrentLogo] = useState('');
  const [activeYearText, setActiveYearText] = useState('Memuat...');

  // --- STATE MODAL CRUD ---
  const [modalType, setModalType] = useState(null); 
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({});

  // --- STATE SEARCH & PAGINATION ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Reset Search & Pagination saat ganti tab
  useEffect(() => {
    setSearchTerm('');
    setCurrentPage(1);
    setItemsPerPage(5);
  }, [activeTab]);

  useEffect(() => {
    fetchProfile();
    // Fetch data master hanya jika user adalah admin
    if (userRole === 'admin') {
      if (activeTab === 'akademik') fetchAcademicYears();
      if (activeTab === 'ujian') fetchExamTypes();
      if (activeTab === 'sekolah') fetchGlobalSettings();
      if (activeTab === 'kkm') fetchKkms();
      if (activeTab === 'raport') {
        fetchRaportDates();
        fetchAcademicYears();
        fetchExamTypes();
      }
      if (activeTab === 'pengumuman') {
        fetchAnnouncements();
        fetchAcademicYears(); 
      }
    }
  }, [activeTab, userRole]);

  // ==========================================
  // 🔄 FUNGSI FETCH (GET DATA)
  // ==========================================
  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/staff');
      if (res.data.success) {
        const myProfile = res.data.data.find(user => user.id === userId);
        if (myProfile) setProfile(myProfile);
      }
    } catch (err) { console.error("Gagal load profil", err); }
  };

  const fetchGlobalSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      if (res.data.success) {
        setGlobalSettings({
          nama_sekolah: res.data.data.nama_sekolah || '',
          alamat_sekolah: res.data.data.alamat_sekolah || '',
          kepala_sekolah_nama: res.data.data.kepala_sekolah_nama || '',
          kepala_sekolah_nip: res.data.data.kepala_sekolah_nip || '',
        });
        setCurrentLogo(res.data.data.logo_sekolah || '');
        setActiveYearText(res.data.activeYear);
      }
    } catch (err) { console.error("Gagal load pengaturan sekolah", err); }
  };

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/api/master/academic-years');
      if (res.data.success) {
        setAcademicYears(res.data.data);
        const activeYear = res.data.data.find(ay => ay.is_active === 1 || ay.is_active === true);
        if (activeYear) {
          localStorage.setItem('activeYearId', activeYear.id);
          localStorage.setItem('activeYearText', `${activeYear.tahun_pelajaran} - ${activeYear.semester}`);
        }
      }
    } catch (err) { console.error(err); }
  };

  const fetchExamTypes = async () => {
    try {
      const res = await api.get('/api/master/exam-types');
      if (res.data.success) setExamTypes(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/api/master/announcements'); 
      if (res.data.success) setAnnouncements(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchKkms = async () => {
    if (!activeYearId) return; 
    try {
      // 👇 Kembali pakai /api/settings, TAPI wajib ada parameter tahun aktif
      const res = await api.get(`/api/settings/kkm?academic_year_id=${activeYearId}`); 
      if (res.data.success) setKkms(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchRaportDates = async () => {
    if (!activeYearId) return;
    try {
      // 👇 Kembali pakai /api/settings
      const res = await api.get(`/api/settings/raport-dates?academic_year_id=${activeYearId}`); 
      if (res.data.success) setRaportDates(res.data.data);
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // 💾 HANDLER SUBMIT
  // ==========================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/api/staff/${userId}`, profile);
      if (res.data.success) {
        toast.success('Profil berhasil diperbarui!');
        fetchProfile();
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal update profil'); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.password_baru !== passwords.konfirmasi) {
      return toast.error('Password dan konfirmasi tidak cocok!');
    }
    try {
      const payload = { ...profile, password: passwords.password_baru };
      const res = await api.put(`/api/staff/${userId}`, payload);
      if (res.data.success) {
        toast.success('Password berhasil diperbarui!');
        setPasswords({ password_baru: '', konfirmasi: '' });
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal ganti password'); }
  };

  const handleSaveGlobalSettings = async (e) => {
    e.preventDefault();
    const submitData = new FormData();
    submitData.append('nama_sekolah', globalSettings.nama_sekolah);
    submitData.append('alamat_sekolah', globalSettings.alamat_sekolah);
    submitData.append('kepala_sekolah_nama', globalSettings.kepala_sekolah_nama);
    submitData.append('kepala_sekolah_nip', globalSettings.kepala_sekolah_nip);
    if (logoFile) submitData.append('logo_sekolah', logoFile);

    try {
      const response = await api.post('/api/settings', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        toast.success('Pengaturan Global berhasil disimpan!');
        fetchGlobalSettings(); 
        setLogoFile(null); 
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) { toast.error('Gagal menyimpan pengaturan sekolah.'); }
  };

  const handleCrudSubmit = async (e) => {
    e.preventDefault();
    try {
      let endpoint = '';
      let payload = { ...formData }; 

      // Untuk Master
      if (modalType === 'akademik') endpoint = '/api/master/academic-years';
      else if (modalType === 'ujian') endpoint = '/api/master/exam-types';
      else if (modalType === 'pengumuman') endpoint = '/api/master/announcements';
      
      // Untuk Settings (KKM & Raport)
      else if (modalType === 'kkm') {
        endpoint = '/api/settings/kkm'; // 👈 Kembali ke /api/settings
        payload.academic_year_id = activeYearId; 
      }
      else if (modalType === 'raport') {
        endpoint = '/api/settings/raport-dates'; // 👈 Kembali ke /api/settings
        payload.academic_year_id = activeYearId; 
      }

      let res;
      if (isEdit) res = await api.put(`${endpoint}/${editId}`, payload);
      else res = await api.post(endpoint, payload);

      if (res.data.success) {
        toast.success(res.data.message || `Data ${modalType} berhasil disimpan!`);
        closeModal();
        if (modalType === 'akademik') fetchAcademicYears();
        if (modalType === 'ujian') fetchExamTypes();
        if (modalType === 'pengumuman') fetchAnnouncements();
        if (modalType === 'kkm') fetchKkms();
        if (modalType === 'raport') fetchRaportDates();
      }
    } catch (err) { toast.error(err.response?.data?.message || `Gagal menyimpan data ${modalType}`); }
  };

  const handleDelete = async (type, id) => {
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    try {
      let endpoint = '';
      if (type === 'akademik') endpoint = `/api/master/academic-years/${id}`;
      else if (type === 'ujian') endpoint = `/api/master/exam-types/${id}`;
      else if (type === 'pengumuman') endpoint = `/api/master/announcements/${id}`;
      else if (type === 'kkm') endpoint = `/api/settings/kkm/${id}`; // 👈 Kembali ke /api/settings
      else if (type === 'raport') endpoint = `/api/settings/raport-dates/${id}`; // 👈 Kembali ke /api/settings

      const res = await api.delete(endpoint);
      if (res.data.success) {
        toast.success(res.data.message || 'Data berhasil dihapus');
        if (type === 'akademik') fetchAcademicYears();
        if (type === 'ujian') fetchExamTypes();
        if (type === 'pengumuman') fetchAnnouncements();
        if (type === 'kkm') fetchKkms();
        if (type === 'raport') fetchRaportDates();
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus data'); }
  };

  // ==========================================
  // 🎛️ KONTROL MODAL
  // ==========================================
  const openModal = (type, data = null) => {
    setModalType(type);
    setIsEdit(!!data);
    setEditId(data ? data.id : null);

    if (type === 'akademik') {
      setFormData(data || { tahun_pelajaran: '', semester: 'Ganjil', is_active: 0 });
    } else if (type === 'ujian') {
      setFormData(data || { kode_ujian: '', nama_ujian: '' });
    } else if (type === 'kkm') {
      setFormData(data || { grade_level: '', kkm_value: '' });
    } else if (type === 'raport') {
      const activeYear = academicYears.find(ay => ay.is_active === 1);
      setFormData(data || { tipe_ujian: '', tanggal_pembagian: '', academic_year_id: activeYear ? activeYear.id : '' });
    } else if (type === 'pengumuman') {
      const activeYear = academicYears.find(ay => ay.is_active === 1);
      setFormData(data || { 
        tipe: 'pengumuman', judul: '', isi: '', target_class_id: '', 
        academic_year_id: activeYear ? activeYear.id : '' 
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setFormData({});
  };

  // ==========================================
  // 🔍 FILTER & PAGINATION LOGIC
  // ==========================================
  const applyPagination = (data) => {
    if (itemsPerPage === 'all') return { data, totalPages: 1 };
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    return { data: paginatedData, totalPages };
  };

  const searchData = (data, fields) => data.filter(item => 
    fields.some(field => String(item[field] || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resAkademik = applyPagination(searchData(academicYears, ['tahun_pelajaran', 'semester']));
  const resUjian = applyPagination(searchData(examTypes, ['kode_ujian', 'nama_ujian']));
  const resPengumuman = applyPagination(searchData(announcements, ['judul', 'tipe', 'tahun_pelajaran']));
  const resKkm = applyPagination(searchData(kkms, ['grade_level', 'kkm_value']));
  const resRaport = applyPagination(searchData(raportDates, ['tipe_ujian', 'tanggal_pembagian']));

  const renderTableControls = () => (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 px-6 pt-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Tampilkan</span>
        <select
          value={itemsPerPage}
          onChange={(e) => { setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1); }}
          className="bg-slate-50 border-0 ring-1 ring-slate-200 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value="all">Semua</option>
        </select>
        <span className="text-sm text-slate-500">data</span>
      </div>
      <div className="relative w-full sm:w-64">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" placeholder="Cari data..." value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
    </div>
  );

  const renderPagination = (totalPages) => {
    if (itemsPerPage === 'all' || totalPages <= 1) return null;
    return (
      <div className="flex justify-between items-center mt-4 px-6 pb-6">
        <span className="text-sm text-slate-500">Halaman {currentPage} dari {totalPages}</span>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"><ChevronLeft size={18}/></button>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition"><ChevronRight size={18}/></button>
        </div>
      </div>
    );
  };

  // --- FILTER MENU BERDASARKAN ROLE ---
  const allTabs = [
    { id: 'profil', label: 'Profil Pengguna', icon: User, roles: ['admin', 'guru'] },
    { id: 'keamanan', label: 'Keamanan Akun', icon: Shield, roles: ['admin', 'guru'] },
    { id: 'sekolah', label: 'Identitas Sekolah', icon: Building2, roles: ['admin'] },
    { id: 'akademik', label: 'Tahun Pelajaran', icon: Calendar, roles: ['admin'] },
    { id: 'ujian', label: 'Jenis Ujian', icon: FileText, roles: ['admin'] },
    { id: 'kkm', label: 'Data KKM', icon: Target, roles: ['admin'] }, // TAB KKM
    { id: 'raport', label: 'Jadwal Raport', icon: CalendarDays, roles: ['admin'] }, // TAB TANGGAL RAPORT
    { id: 'pengumuman', label: 'Pengumuman', icon: Megaphone, roles: ['admin'] },
  ];

  const menuTabs = allTabs.filter(tab => tab.roles.includes(userRole));
  const inputClass = "w-full bg-slate-50 border-0 ring-1 ring-slate-200 p-3 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 transition-all";

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800 relative">
      <Toaster position="top-right" richColors />
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Sistem</h1>
          <p className="text-sm text-slate-500">
            {userRole === 'admin' ? 'Kelola profil dan konfigurasi sistem sekolah.' : 'Kelola informasi profil dan keamanan akun Anda.'}
          </p>
        </div>
        {userRole === 'admin' && ['sekolah', 'akademik', 'ujian', 'kkm', 'raport', 'pengumuman'].includes(activeTab) && (
          <div className="bg-white border border-indigo-100 shadow-sm px-4 py-2 rounded-xl flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Tahun Ajaran Aktif</p>
              {/* 👇 INI YANG DIGANTI: Menggunakan {activeYear} dari context */}
              <p className="text-sm font-bold text-indigo-900">{activeYear}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* SIDEBAR TABS DINAMIS */}
        <div className="w-full lg:w-1/4 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {menuTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-5 py-4 flex items-center gap-3 border-b border-slate-100 transition-colors ${
                    isActive ? 'bg-indigo-50 border-l-4 border-l-indigo-800 text-indigo-800 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-800' : 'text-slate-400'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* KONTEN UTAMA */}
        <div className="w-full lg:w-3/4 space-y-6">
          
          {/* TAB: PROFIL PENGGUNA */}
          {activeTab === 'profil' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="border-b border-slate-100 pb-6 mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">Profil Pengguna</h2>
                  <p className="text-sm text-slate-500">Perbarui informasi dasar akun Anda.</p>
                </div>
                <button onClick={handleUpdateProfile} className="px-4 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 transition text-sm font-medium">
                  Simpan Profil
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
                  <input type="text" value={profile.nama_lengkap} onChange={e => setProfile({...profile, nama_lengkap: e.target.value})} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Username</label>
                  <input type="text" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">NUPTK / ID</label>
                  <input type="text" value={profile.nuptk || ''} onChange={e => setProfile({...profile, nuptk: e.target.value})} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Hak Akses (Role)</label>
                  <input type="text" value={profile.role} disabled className="w-full bg-slate-100 border-0 ring-1 ring-slate-200 p-3 rounded-lg text-slate-400 cursor-not-allowed outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* TAB: KEAMANAN */}
          {activeTab === 'keamanan' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
              <div className="border-b border-slate-100 pb-6 mb-6">
                <h2 className="text-lg font-bold">Keamanan Akun</h2>
                <p className="text-sm text-slate-500">Ganti sandi akun Anda secara berkala.</p>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Password Baru</label>
                  <input type="password" required value={passwords.password_baru} onChange={e => setPasswords({...passwords, password_baru: e.target.value})} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Konfirmasi Password Baru</label>
                  <input type="password" required value={passwords.konfirmasi} onChange={e => setPasswords({...passwords, konfirmasi: e.target.value})} className={inputClass} />
                </div>
                <div className="pt-2">
                  <button type="submit" className="px-5 py-2.5 bg-indigo-900 text-white font-medium rounded-lg hover:bg-indigo-800 transition text-sm">
                    Perbarui Sandi
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: IDENTITAS SEKOLAH (HANYA ADMIN) */}
          {userRole === 'admin' && activeTab === 'sekolah' && (
            <form onSubmit={handleSaveGlobalSettings} className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <Building2 className="text-indigo-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-700">Identitas Sekolah</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Sekolah</label>
                      <input type="text" value={globalSettings.nama_sekolah} onChange={e => setGlobalSettings({...globalSettings, nama_sekolah: e.target.value})} className={inputClass} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                      <textarea value={globalSettings.alamat_sekolah} onChange={e => setGlobalSettings({...globalSettings, alamat_sekolah: e.target.value})} rows="3" className={inputClass} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Logo Sekolah</label>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mt-2">
                      <div className="w-24 h-24 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                        {currentLogo ? (
                          <img src={`http://localhost:5000/uploads/logos/${currentLogo}`} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon size={32} className="text-slate-400" />
                        )}
                      </div>
                      <div className="w-full">
                        <input type="file" accept="image/png, image/jpeg" onChange={e => setLogoFile(e.target.files[0])} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer w-full mb-2" />
                        <p className="text-xs text-slate-500">Format: JPG, PNG. Ukuran ideal 1:1.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <UserCheck className="text-indigo-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-700">Kepala Sekolah</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                    <input type="text" value={globalSettings.kepala_sekolah_nama} onChange={e => setGlobalSettings({...globalSettings, kepala_sekolah_nama: e.target.value})} placeholder="Contoh: Dr. H. Budi, M.Pd." className={inputClass} required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">NIP / NUPTK</label>
                    <input type="text" value={globalSettings.kepala_sekolah_nip} onChange={e => setGlobalSettings({...globalSettings, kepala_sekolah_nip: e.target.value})} placeholder="Contoh: 19700101 199512 1 001" className={inputClass} required />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-md">
                  <Save size={20} /> Simpan Pengaturan Sekolah
                </button>
              </div>
            </form>
          )}

          {/* TAB: AKADEMIK (HANYA ADMIN) */}
          {userRole === 'admin' && activeTab === 'akademik' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Tahun Pelajaran</h2>
                <button onClick={() => openModal('akademik')} className="px-4 py-2 bg-indigo-900 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-800 transition">
                  <Plus size={16} /> Tambah Data
                </button>
              </div>
              {renderTableControls()}
              <div className="overflow-x-auto px-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Tahun Pelajaran</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Semester</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600 text-center w-40">Status Aktif</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resAkademik.data.length > 0 ? resAkademik.data.map((ay) => (
                      <tr key={ay.id} className="hover:bg-slate-50 transition-colors">
                        <td className="border-0! border-b! border-slate-100! p-4 font-medium text-slate-800">{ay.tahun_pelajaran}</td>
                        <td className="border-0! border-b! border-slate-100! p-4 text-slate-600">{ay.semester}</td>
                        <td className="border-0! border-b! border-slate-100! p-4">
                          <div className="flex justify-center"><Switch checked={ay.is_active === 1 || ay.is_active === true} onChange={() => {}} /></div>
                        </td>
                        <td className="border-0! border-b! border-slate-100! p-4 text-center">
                          <button onClick={() => openModal('akademik', ay)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1 transition"><Edit size={16}/></button>
                          <button onClick={() => handleDelete('akademik', ay.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan="4" className="border-0! border-b! border-slate-100! text-center p-6 text-slate-500">Tidak ada data ditemukan</td></tr>}
                  </tbody>
                </table>
              </div>
              {renderPagination(resAkademik.totalPages)}
            </div>
          )}

          {/* TAB: UJIAN (HANYA ADMIN) */}
          {userRole === 'admin' && activeTab === 'ujian' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Jenis Ujian</h2>
                <button onClick={() => openModal('ujian')} className="px-4 py-2 bg-indigo-900 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-800 transition">
                  <Plus size={16} /> Tambah Jenis
                </button>
              </div>
              {renderTableControls()}
              <div className="overflow-x-auto px-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600 w-16">#</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Kode Ujian</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Nama Ujian</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resUjian.data.length > 0 ? resUjian.data.map((et, index) => (
                      <tr key={et.id} className="hover:bg-slate-50 transition-colors">
                        <td className="border-0! border-b! border-slate-100! p-4 text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="border-0! border-b! border-slate-100! p-4 font-medium text-slate-800">{et.kode_ujian}</td>
                        <td className="border-0! border-b! border-slate-100! p-4 text-slate-600">{et.nama_ujian}</td>
                        <td className="border-0! border-b! border-slate-100! p-4 text-center">
                          <button onClick={() => openModal('ujian', et)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1 transition"><Edit size={16}/></button>
                          <button onClick={() => handleDelete('ujian', et.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan="4" className="border-0! border-b! border-slate-100! text-center p-6 text-slate-500">Tidak ada data ditemukan</td></tr>}
                  </tbody>
                </table>
              </div>
              {renderPagination(resUjian.totalPages)}
            </div>
          )}

          {/* TAB: KKM (HANYA ADMIN) */}
          {userRole === 'admin' && activeTab === 'kkm' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Kriteria Ketuntasan Minimal (KKM)</h2>
                <button onClick={() => openModal('kkm')} className="px-4 py-2 bg-indigo-900 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-800 transition">
                  <Plus size={16} /> Tambah KKM
                </button>
              </div>
              {renderTableControls()}
              <div className="overflow-x-auto px-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Tingkat Kelas (Grade)</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Nilai KKM</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resKkm.data.length > 0 ? resKkm.data.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                        <td className="border-0! border-b! border-slate-100! p-4 font-medium text-slate-800">Kelas {k.grade_level}</td>
                        <td className="border-0! border-b! border-slate-100! p-4 text-slate-600">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg font-bold">{k.kkm_value}</span>
                        </td>
                        <td className="border-0! border-b! border-slate-100! p-4 text-center">
                          <button onClick={() => openModal('kkm', k)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1 transition"><Edit size={16}/></button>
                          <button onClick={() => handleDelete('kkm', k.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan="3" className="border-0! border-b! border-slate-100! text-center p-6 text-slate-500">Tidak ada data ditemukan</td></tr>}
                  </tbody>
                </table>
              </div>
              {renderPagination(resKkm.totalPages)}
            </div>
          )}

          {/* TAB: JADWAL RAPORT (HANYA ADMIN) */}
          {userRole === 'admin' && activeTab === 'raport' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Jadwal Pembagian Raport</h2>
                <button onClick={() => openModal('raport')} className="px-4 py-2 bg-indigo-900 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-800 transition">
                  <Plus size={16} /> Set Jadwal
                </button>
              </div>
              {renderTableControls()}
              <div className="overflow-x-auto px-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Tipe Ujian</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Tahun Pelajaran</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Tanggal Pembagian</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resRaport.data.length > 0 ? resRaport.data.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="border-0! border-b! border-slate-100! p-4 font-medium text-slate-800 uppercase">{r.tipe_ujian}</td>
                        
                        {/* 👇 PERBAIKAN: Mengambil nama tahun pelajaran dari state academicYears berdasarkan ID */}
                        <td className="border-0! border-b! border-slate-100! p-4 text-slate-600">
                          {academicYears.find(ay => ay.id === r.academic_year_id)?.tahun_pelajaran || 'Aktif'}
                        </td>
                        
                        <td className="border-0! border-b! border-slate-100! p-4 text-slate-600 font-medium">
                          {new Date(r.tanggal_pembagian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </td>
                        <td className="border-0! border-b! border-slate-100! p-4 text-center">
                          <button onClick={() => openModal('raport', r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1 transition"><Edit size={16}/></button>
                          <button onClick={() => handleDelete('raport', r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan="4" className="border-0! border-b! border-slate-100! text-center p-6 text-slate-500">Tidak ada data ditemukan</td></tr>}
                  </tbody>
                </table>
              </div>
              {renderPagination(resRaport.totalPages)}
            </div>
          )}

          {/* TAB: PENGUMUMAN (HANYA ADMIN) */}
          {userRole === 'admin' && activeTab === 'pengumuman' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Pengumuman & Tata Tertib</h2>
                <button onClick={() => openModal('pengumuman')} className="px-4 py-2 bg-indigo-900 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-800 transition">
                  <Plus size={16} /> Buat Baru
                </button>
              </div>
              {renderTableControls()}
              <div className="overflow-x-auto px-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600 w-32">Tipe</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Judul</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600">Tahun Pelajaran</th>
                      <th className="border-0! border-b-2! border-slate-100! p-4 font-semibold text-sm text-slate-600 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resPengumuman.data.length > 0 ? resPengumuman.data.map((an) => (
                      <tr key={an.id} className="hover:bg-slate-50 transition-colors">
                        <td className="border-0! border-b! border-slate-100! p-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide uppercase ${an.tipe === 'tata_tertib' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                            {an.tipe.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="border-0! border-b! border-slate-100! p-4 font-medium text-slate-800">{an.judul}</td>
                        <td className="border-0! border-b! border-slate-100! p-4 text-slate-600">{an.tahun_pelajaran} - {an.semester}</td>
                        <td className="border-0! border-b! border-slate-100! p-4 text-center">
                          <button onClick={() => openModal('pengumuman', an)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1 transition"><Edit size={16}/></button>
                          <button onClick={() => handleDelete('pengumuman', an.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan="4" className="border-0! border-b! border-slate-100! text-center p-6 text-slate-500">Tidak ada data ditemukan</td></tr>}
                  </tbody>
                </table>
              </div>
              {renderPagination(resPengumuman.totalPages)}
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL CRUD GLOBAL ================= */}
      {modalType && userRole === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold capitalize text-slate-800">{isEdit ? 'Edit' : 'Tambah'} {modalType.replace('_', ' ')}</h2>
              <button type="button" onClick={closeModal} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCrudSubmit} className="p-6 space-y-5">
              
              {modalType === 'akademik' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Tahun Pelajaran</label>
                    <input type="text" value={formData.tahun_pelajaran || ''} onChange={e => setFormData({...formData, tahun_pelajaran: e.target.value})} placeholder="Cth: 2025/2026" required className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Semester</label>
                    <select value={formData.semester || 'Ganjil'} onChange={e => setFormData({...formData, semester: e.target.value})} className={inputClass}>
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch checked={formData.is_active === 1 || formData.is_active === true} onChange={() => setFormData({...formData, is_active: formData.is_active === 1 ? 0 : 1})} />
                    <span className="text-sm font-medium text-slate-700 cursor-pointer" onClick={() => setFormData({...formData, is_active: formData.is_active === 1 ? 0 : 1})}>Jadikan Semester Aktif</span>
                  </div>
                </>
              )}

              {modalType === 'ujian' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Kode Ujian</label>
                    <input type="text" value={formData.kode_ujian || ''} onChange={e => setFormData({...formData, kode_ujian: e.target.value})} placeholder="Cth: UTS" required className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Nama Ujian</label>
                    <input type="text" value={formData.nama_ujian || ''} onChange={e => setFormData({...formData, nama_ujian: e.target.value})} placeholder="Cth: Ujian Tengah Semester" required className={inputClass} />
                  </div>
                </>
              )}

              {modalType === 'kkm' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Tingkat Kelas</label>
                    <select value={formData.grade_level || ''} onChange={e => setFormData({...formData, grade_level: e.target.value})} required className={inputClass}>
                      <option value="">Pilih Kelas...</option>
                      {['7', '8', '9'].map(num => (
                        <option key={num} value={num}>Kelas {num}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Nilai KKM</label>
                    <input type="number" min="0" max="100" value={formData.kkm_value || ''} onChange={e => setFormData({...formData, kkm_value: e.target.value})} placeholder="Cth: 75" required className={inputClass} />
                  </div>
                  {/* Dropdown Tahun Ajaran DIHAPUS. Nanti otomatis disisipkan saat Submit. */}
                </>
              )}

              {modalType === 'raport' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Tipe Ujian</label>
                    <select value={formData.tipe_ujian || ''} onChange={e => setFormData({...formData, tipe_ujian: e.target.value})} required className={inputClass}>
                      <option value="">Pilih Tipe Ujian...</option>
                      {examTypes.map(et => (
                        <option key={et.id} value={et.nama_ujian}>{et.nama_ujian}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Tanggal Pembagian Raport</label>
                    {/* 👇 PERBAIKAN: Potong format string tanggal menjadi YYYY-MM-DD menggunakan substring(0, 10) */}
                    <input 
                      type="date" 
                      value={formData.tanggal_pembagian ? formData.tanggal_pembagian.toString().substring(0, 10) : ''} 
                      onChange={e => setFormData({...formData, tanggal_pembagian: e.target.value})} 
                      required 
                      className={inputClass} 
                    />
                  </div>
                </>
              )}

              {modalType === 'pengumuman' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Tipe</label>
                    <select value={formData.tipe || 'pengumuman'} onChange={e => setFormData({...formData, tipe: e.target.value})} className={inputClass}>
                      <option value="pengumuman">Pengumuman</option>
                      <option value="tata_tertib">Tata Tertib</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Judul</label>
                    <input type="text" value={formData.judul || ''} onChange={e => setFormData({...formData, judul: e.target.value})} required className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Tahun Pelajaran (Opsional)</label>
                    <select value={formData.academic_year_id || ''} onChange={e => setFormData({...formData, academic_year_id: e.target.value})} className={inputClass}>
                      <option value="">Pilih Tahun Pelajaran...</option>
                      {academicYears.map(ay => (
                        <option key={ay.id} value={ay.id}>{ay.tahun_pelajaran} - {ay.semester}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Isi Pesan</label>
                    <textarea rows="4" value={formData.isi || ''} onChange={e => setFormData({...formData, isi: e.target.value})} required className={inputClass}></textarea>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition">Batal</button>
                <button type="submit" className="px-5 py-2 bg-indigo-900 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-800 text-sm font-medium transition shadow-sm">
                  <Save size={16} /> {isEdit ? 'Simpan Perubahan' : 'Tambah Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pengaturan;