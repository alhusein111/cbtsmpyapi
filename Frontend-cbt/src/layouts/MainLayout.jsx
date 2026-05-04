import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-65 h-screen overflow-hidden">
        {/* Topbar */}
        <Topbar toggleSidebar={toggleSidebar} />

        {/* Scrollable Canvas (Halaman Utama akan render di sini) */}
        <main className="flex-1 overflow-y-auto p-6 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
             <Outlet /> {/* <-- Konten dari Routes akan masuk ke sini */}
          </div>
        </main>
      </div>

      {/* Overlay untuk Mobile ketika Sidebar Terbuka */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </div>
  );
};

export default MainLayout;