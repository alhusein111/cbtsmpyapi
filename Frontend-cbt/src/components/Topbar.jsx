import { Menu, Bell, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Topbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-surface-container-lowest text-primary font-medium border-b border-outline-variant flex justify-between items-center h-16 px-6 w-full sticky top-0 z-40">
      
      {/* Mobile Menu Button & Brand */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="md:hidden text-on-surface-variant hover:text-primary transition-colors duration-200"
        >
          <Menu size={24} />
        </button>
        <div className="text-lg font-bold text-primary md:hidden">
          SMP YAPI
        </div>
      </div>

      {/* Breadcrumbs (Desktop) */}
      <div className="hidden md:flex items-center gap-2 text-sm text-on-surface-variant">
        <span>CBT Portal</span>
        <ChevronRight size={16} />
        <span className="text-primary font-semibold">Dashboard</span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:text-primary hover:bg-surface-container p-2 rounded-full transition-all">
          <Bell size={20} />
        </button>

        <div className="h-8 w-px bg-outline-variant hidden sm:block"></div>

        {/* Profile & Logout Section */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-sm font-bold text-on-surface">{user?.nama || 'Administrator'}</p>
            <p className="text-xs text-on-surface-variant capitalize">{user?.role || 'Admin'}</p>
          </div>
          
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold overflow-hidden border border-outline-variant">
            {user?.nama ? (
              <span>{user.nama.charAt(0).toUpperCase()}</span>
            ) : (
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <button 
            onClick={logout}
            className="group relative p-2 text-error hover:bg-error/10 rounded-full transition-all duration-300 ease-in-out"
            aria-label="Keluar"
          >
            <LogOut 
              size={20} 
              className="transition-transform duration-300 ease-in-out group-hover:translate-x-1 group-hover:scale-110" 
            />
            <span className="absolute top-full mt-2 right-0 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-surface-container-highest text-on-surface-variant font-medium text-xs py-1 px-2 rounded shadow-sm pointer-events-none">
              Keluar
            </span>
          </button>
        </div>
        
      </div>
    </header>
  );
};

export default Topbar;