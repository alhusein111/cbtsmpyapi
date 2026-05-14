import { NavLink } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { LayoutDashboard, Users, Briefcase, BookOpen, Settings, Activity, FileText, BarChart2 } from 'lucide-react'; // Tambah BarChart2

const Sidebar = ({ isOpen }) => {
  const { settings } = useSettings();
  
  // 👇 PERUBAHAN DISINI:
  // Ganti hardcode localhost dengan variabel dari .env
  const backendBaseUrl = `${import.meta.env.VITE_API_URL}/uploads/logos/`;

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
  
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', adminOnly: false },
    { name: 'Siswa', icon: Users, path: '/master/siswa', adminOnly: false }, 
    { name: 'Staf', icon: Briefcase, path: '/master/staf', adminOnly: true }, 
    { name: 'Kelas & Mapel', icon: FileText, path: '/master/kelasmapel', adminOnly: true },
    { name: 'Manajemen Ujian', icon: BookOpen, path: '/exams', adminOnly: false }, 
    { name: 'Live Monitor', icon: Activity, path: '/exams/live', adminOnly: false }, 
    { name: 'Hasil Ujian', icon: BarChart2, path: '/hasil/ujian', adminOnly: false }, // ✅ MENU BARU DITAMBAHKAN
    { name: 'Pengaturan', icon: Settings, path: '/master/pengaturan', adminOnly: false },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (finalRole === 'siswa') return item.name === 'Dashboard';
    if (finalRole === 'admin') return true;
    return !item.adminOnly;
  });

  return (
    <aside className={`bg-surface-container-lowest flex-col z-50 h-screen w-65 border-r border-outline-variant fixed left-0 top-0 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex print:hidden`}>
      
      {/* 🏫 HEADER / LOGO SEKOLAH DINAMIS */}
      <div className="p-4 border-b border-outline-variant flex items-center gap-3">
        {settings?.logo_sekolah ? (
          <img 
            src={`${backendBaseUrl}${settings.logo_sekolah}`} 
            alt="Logo Sekolah" 
            className="w-10 h-10 rounded-full object-cover shadow-sm bg-white"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold">
             {settings?.nama_sekolah ? settings.nama_sekolah.charAt(0).toUpperCase() : 'S'}
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <h1 className="text-lg font-bold text-primary tracking-tight truncate">
            {settings?.nama_sekolah || "Memuat..."}
          </h1>
          <p className="text-sm text-on-surface-variant truncate">CBT & E-Raport Portal</p>
        </div>
      </div>

      {/* 🧭 NAVIGATION LINKS */}
      <div className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {filteredMenuItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                end={item.path === '/exams' || item.path === '/'} 
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-secondary bg-secondary-container/20 border-l-4 border-secondary rounded-l-none'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                  }`
                }
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;