import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-background overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
      
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col md:ml-65 h-screen overflow-hidden print:block print:h-auto print:overflow-visible print:m-0">
        
        <Topbar toggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto p-6 bg-surface-container-low print:block print:h-auto print:overflow-visible print:p-0 print:bg-white">
          <div className="max-w-7xl mx-auto print:max-w-none print:m-0">
             <Outlet />
          </div>
        </main>
      </div>

      {/* Overlay untuk Mobile ketika Sidebar Terbuka */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </div>
  );
};

export default MainLayout;