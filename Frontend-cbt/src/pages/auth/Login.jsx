import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
// 1. IMPORT useSettings
import { useSettings } from '../../context/SettingsContext'; 
import Input from '../../components/Input';
import Button from '../../components/Button';
import { GraduationCap, Briefcase, ShieldCheck } from 'lucide-react';

import api from '../../api/axiosConfig'; 

const Login = () => {
  const { login } = useAuth();
  // 2. Panggil state settings
  const { settings } = useSettings(); 

  const [selectedRole, setSelectedRole] = useState('siswa');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '', password: '', 
    nis: '', no_peserta: '', token_masuk: '' 
  });

  // URL Backend untuk load gambar (Pastikan port ini sama dengan backend mas brow)
  const backendBaseUrl = `${import.meta.env.VITE_API_URL}/uploads/logos/`;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    setFormData({ username: '', password: '', nis: '', no_peserta: '', token_masuk: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let endpoint = '';
      let payload = {};

      if (selectedRole === 'siswa') {
        if (!formData.nis || !formData.no_peserta || !formData.token_masuk) {
          throw new Error('Semua kolom Siswa wajib diisi!');
        }
        endpoint = '/api/auth/siswa'; 
        
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
          deviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('device_id', deviceId);
        }

        payload = {
          nis: formData.nis,
          no_peserta: formData.no_peserta,
          token_masuk: formData.token_masuk,
          device_id: deviceId
        };
      } else {
        if (!formData.username || !formData.password) {
          throw new Error('Username dan Password wajib diisi!');
        }
        endpoint = '/api/auth/admin'; 
        payload = {
          username: formData.username,
          password: formData.password
        };
      }

      const response = await api.post(endpoint, payload);

      const data =  response.data;

      if (data.success) {
        const userData = {
          ...data.data,
          role: selectedRole
        };
        // Panggil fungsi login dari AuthContext yang akan mengarahkan ke /dashboard
        login(data.token, userData);
      } else {
        setError(data.message || 'Gagal masuk. Periksa kembali data Anda.');
      }

    } catch (err) {
      if (err.response) {
        // Backend menolak (misal: password salah, username tidak ada)
        setError(err.response.data.message || 'Gagal masuk. Periksa kembali data Anda.');
      } else if (err.request) {
        // Backend mati / tidak ada respon
        setError('Tidak dapat terhubung ke server backend!');
      } else {
        // Error Javascript lainnya
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface">
      
      {/* KIRI - Panel Biru (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white opacity-5"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-black opacity-10"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
               {/* 3. Menampilkan Logo Dinamis di Panel Kiri */}
               {settings?.logo_sekolah ? (
                  <img src={`${backendBaseUrl}${settings.logo_sekolah}`} alt="Logo Sekolah" className="w-8 h-8 object-contain" />
               ) : (
                  <GraduationCap size={32} className="text-white" />
               )}
            </div>
            <div>
              {/* 4. Menampilkan Nama Sekolah Dinamis */}
              <h1 className="text-xl font-bold tracking-wider">
                {settings?.nama_sekolah ? settings.nama_sekolah.toUpperCase() : 'NAMA SEKOLAH'}
              </h1>
              <p className="text-xs text-primary-container">CBT SMPYAPI & E-Raport v1.0.0</p>
            </div>
          </div>

          <div className="space-y-6 max-w-md mt-12">
            <h2 className="text-4xl font-bold leading-tight">Selamat Datang di Portal CBT & e-Raport</h2>
            <p className="text-primary-container text-lg leading-relaxed">
              Satu platform terintegrasi untuk manajemen nilai, ujian berbasis komputer, dan transparansi akademik bagi seluruh sivitas {settings?.nama_sekolah || 'sekolah'}.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm text-primary-container font-medium">
          <div className="flex -space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-primary"></div>
            <div className="w-8 h-8 rounded-full bg-blue-300 border-2 border-primary"></div>
            <div className="w-8 h-8 rounded-full bg-blue-200 border-2 border-primary"></div>
          </div>
          <p>Dipercaya oleh 500+ siswa & staf</p>
        </div>
      </div>

      {/* KANAN - Form Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            {/* 5. Logo Tampil di HP (karena panel kiri di-hidden kalau di HP) */}
            <div className="lg:hidden mb-4">
               {settings?.logo_sekolah ? (
                  <img src={`${backendBaseUrl}${settings.logo_sekolah}`} alt="Logo" className="w-16 h-16 object-contain" />
               ) : (
                  <div className="bg-primary/10 p-4 rounded-full text-primary">
                    <GraduationCap size={32} />
                  </div>
               )}
            </div>

            <h2 className="text-2xl font-bold text-on-surface">Masuk Portal</h2>
            <p className="text-on-surface-variant mt-2 text-sm text-center lg:text-left">
              Silakan masuk menggunakan akun terdaftar Anda di {settings?.nama_sekolah || 'sekolah'}.
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pilih Peran</label>
            <div className="grid grid-cols-3 gap-3">
              <button 
                type="button"
                onClick={() => handleRoleChange('siswa')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  selectedRole === 'siswa' 
                    ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                }`}
              >
                <GraduationCap size={24} className="mb-2" />
                <span className="text-xs font-semibold">Siswa</span>
              </button>
              <button 
                type="button"
                onClick={() => handleRoleChange('guru')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  selectedRole === 'guru' 
                    ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                }`}
              >
                <Briefcase size={24} className="mb-2" />
                <span className="text-xs font-semibold">Guru</span>
              </button>
              <button 
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  selectedRole === 'admin' 
                    ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                }`}
              >
                <ShieldCheck size={24} className="mb-2" />
                <span className="text-xs font-semibold">Admin</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-error-container/50 text-error text-sm p-3 rounded-lg text-center font-medium animate-in fade-in duration-300">
                {error}
              </div>
            )}

            {selectedRole === 'siswa' ? (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <Input 
                  label="NIS (Nomor Induk Siswa)" 
                  name="nis"
                  placeholder="Contoh: 2023001" 
                  value={formData.nis}
                  onChange={handleChange}
                />
                <Input 
                  label="Nomor Peserta Ujian" 
                  name="no_peserta"
                  placeholder="Contoh: 01-001-001-8" 
                  value={formData.no_peserta}
                  onChange={handleChange}
                />
                <Input 
                  label="Token Masuk" 
                  name="token_masuk"
                  placeholder="Masukkan 6 digit token..." 
                  value={formData.token_masuk}
                  onChange={handleChange}
                />
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                <Input 
                  label="Username" 
                  name="username"
                  placeholder="Masukkan username Anda..." 
                  value={formData.username}
                  onChange={handleChange}
                />
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1">Kata Sandi</label>
                  </div>
                  <Input 
                    type="password" 
                    name="password"
                    placeholder="••••••••" 
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full mt-6 py-3" 
              isLoading={isLoading}
            >
              Masuk Sekarang
            </Button>
          </form>

          <div className="text-center text-xs text-on-surface-variant pt-8">
            <p>Butuh bantuan akses? <a href="#" className="text-secondary font-semibold hover:underline">Hubungi Operator {settings?.nama_sekolah || 'Sekolah'}</a></p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;