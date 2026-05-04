import { useState } from 'react';
import { 
  Plus, Search, Edit, Trash2, School, BookOpen, 
  Users, UserCheck, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import Button from '../../components/Button';

const ManajemenAkademik = () => {
  const [activeTab, setActiveTab] = useState('kelas'); // 'kelas' atau 'mapel'

  // --- DUMMY DATA KELAS ---
  const dataKelas = [
    { id: 1, nama: 'VII - A', wali: 'Drs. Ahmad Subarjo', siswa: 32, tingkat: '7' },
    { id: 2, nama: 'VIII - B', wali: 'Siti Nurhaliza, S.S.', siswa: 30, tingkat: '8' },
    { id: 3, nama: 'IX - C', wali: 'Bambang Wijaya, S.Kom.', siswa: 28, tingkat: '9' },
  ];

  // --- DUMMY DATA MAPEL ---
  const dataMapel = [
    { id: 1, kode: 'MP001', nama: 'Matematika', kategori: 'Wajib', guru: 4 },
    { id: 2, kode: 'MP002', nama: 'Bahasa Inggris', kategori: 'Wajib', guru: 3 },
    { id: 3, kode: 'MP003', nama: 'Informatika', kategori: 'Pilihan', guru: 2 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Manajemen Ujian</h1>
          <p className="text-sm text-on-surface-variant mt-1">Konfigurasi kelas, rombel, dan mata pelajaran.</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus size={18} />
          Tambah {activeTab === 'kelas' ? 'Kelas' : 'Mapel'}
        </Button>
      </div>

      {/* TAB SWITCHER (Segmented Control Style) */}
      <div className="flex p-1 bg-surface-container rounded-xl w-full max-w-md border border-outline-variant">
        <button 
          onClick={() => setActiveTab('kelas')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'kelas' 
            ? 'bg-surface-container-lowest text-primary shadow-sm' 
            : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <School size={16} /> Daftar Kelas
        </button>
        <button 
          onClick={() => setActiveTab('mapel')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'mapel' 
            ? 'bg-surface-container-lowest text-primary shadow-sm' 
            : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <BookOpen size={16} /> Mata Pelajaran
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Stats (Kiri) */}
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Ringkasan</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Total Kelas</span>
                <span className="font-bold text-on-surface">18</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Total Mapel</span>
                <span className="font-bold text-on-surface">24</span>
              </div>
              <div className="pt-4 border-t border-primary/10">
                <p className="text-[10px] text-primary/70 leading-relaxed italic">
                  *Data ini digunakan sebagai referensi utama saat pembuatan jadwal ujian dan penginputan nilai raport.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table (Kanan - 3 Cols) */}
        <div className="lg:col-span-3 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          
          {/* Table Search */}
          <div className="p-4 border-b border-outline-variant bg-surface/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <input 
                type="text" 
                placeholder={`Cari ${activeTab === 'kelas' ? 'nama kelas atau wali...' : 'nama mapel atau kode...'}`}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-lowest text-xs uppercase text-on-surface-variant border-b border-outline-variant">
                {activeTab === 'kelas' ? (
                  <tr>
                    <th className="px-6 py-4 font-semibold">Tingkat</th>
                    <th className="px-6 py-4 font-semibold">Nama Kelas</th>
                    <th className="px-6 py-4 font-semibold">Wali Kelas</th>
                    <th className="px-6 py-4 font-semibold text-center">Jumlah Siswa</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-4 font-semibold">Kode</th>
                    <th className="px-6 py-4 font-semibold">Mata Pelajaran</th>
                    <th className="px-6 py-4 font-semibold">Kategori</th>
                    <th className="px-6 py-4 font-semibold text-center">Jumlah Guru</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {activeTab === 'kelas' ? (
                  dataKelas.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-secondary/10 text-secondary rounded text-xs font-bold">Kelas {item.tingkat}</span></td>
                      <td className="px-6 py-4 font-bold text-on-surface">{item.nama}</td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant text-[10px]">
                          <UserCheck size={14} />
                        </div>
                        {item.wali}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-on-surface-variant">
                          <Users size={14} /> {item.siswa}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 hover:bg-primary/10 text-on-surface-variant hover:text-primary rounded-md"><Edit size={16} /></button>
                        <button className="p-1.5 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-md"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  dataMapel.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">{item.kode}</td>
                      <td className="px-6 py-4 font-bold text-on-surface">{item.nama}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.kategori === 'Wajib' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">{item.guru} Pengajar</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 hover:bg-primary/10 text-on-surface-variant hover:text-primary rounded-md"><Edit size={16} /></button>
                        <button className="p-1.5 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-md"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManajemenAkademik;