import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  // 1. Tunggu sampai pengecekan token di AuthContext selesai
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-primary font-semibold animate-pulse">Memuat data...</div>
      </div>
    );
  }

  // 2. Kalau belum login, arahkan ke halaman login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. Pengecekan Role (Dibuat case-insensitive agar aman)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role?.toLowerCase() || '';
    const allowedRolesLower = allowedRoles.map(role => role.toLowerCase());

    if (!allowedRolesLower.includes(userRole)) {
      // Hilangkan alert() karena akan memblokir UI. 
      // Langsung redirect saja ke dashboard bawaan.
      console.warn(`Akses Ditolak: Role '${userRole}' tidak diizinkan masuk ke halaman ini.`);
      return <Navigate to="/dashboard" replace />; 
    }
  }

  // 4. Kalau semua aman, izinkan masuk ke komponen/halaman yang dituju
  return <Outlet />;
};

export default ProtectedRoute;