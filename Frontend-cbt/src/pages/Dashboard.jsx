import { useAuth } from '../context/AuthContext';
import AdminDashboard from './dashboard/AdminDashboard';
import StudentDashboard from './dashboard/StudentDashboard';

// === TERIMA PROPS SOCKET DI SINI ===
const Dashboard = ({ socket }) => {
  const { user } = useAuth();

  console.log("Data User Lengkap:", user);
  console.log("Role yang terbaca:", user?.role);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-on-surface">Halo, {user?.nama}! 👋</h1>
      </header>

      {/* Tampilkan dashboard berdasarkan role */}
      {user?.role?.toLowerCase() === 'siswa' ? (
            // Kita oper juga ke siswa (buat jaga-jaga kalau siswa butuh notif realtime)
            <StudentDashboard socket={socket} />
          ) : (
            // === OPER SOCKET KE ADMINDASHBOARD ===
            <AdminDashboard socket={socket} />
          )}
    </div>
  );
};

export default Dashboard;