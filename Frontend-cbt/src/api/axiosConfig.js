import axios from 'axios';

// Buat instance axios dengan URL dasar backend Mas Brow
const api = axios.create({
  baseURL: 'http://localhost:5000', // Sesuaikan dengan port backend Mas Brow
});

// Tambahkan "Satpam" (Interceptor) untuk setiap R E Q U E S T
api.interceptors.request.use(
  (config) => {
    // Otomatis selipkan token auth di setiap request jika tokennya ada
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Tambahkan "Satpam" (Interceptor) untuk setiap R E S P O N S E dari backend
api.interceptors.response.use(
  (response) => {
    // Jika sukses (status 2xx), langsung kembalikan datanya
    return response;
  },
  (error) => {
    // Jika backend menolak dengan error 401 Unauthorized
    if (error.response && error.response.status === 401) {
      
      // 💡 PERBAIKAN PENTING:
      // Ambil rute/URL yang memicu error ini
      const requestUrl = error.config.url || '';
      
      // Cek apakah error 401 ini berasal dari endpoint penyelesaian ujian.
      // (Sesuaikan path string di bawah dengan endpoint aslimu di CbtArena.jsx)
      const isExamEndpoint = requestUrl.includes('/student/exam/finish') || requestUrl.includes('/ujian/selesai');

      // Jika error 401 BUKAN dari endpoint ujian, berarti ini murni sesi login yang habis
      if (!isExamEndpoint) {
        console.warn("Sesi habis! Mengalihkan ke halaman login...");
        
        // Hapus semua jejak login
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        
        // Lempar paksa ke halaman login
        window.location.href = '/login';
      } else {
        // Jika 401 dari endpoint ujian (berarti Token Keluar Ujian yang salah),
        // JANGAN hapus sesi login dan JANGAN lempar ke halaman login!
        console.warn("Salah token keluar ujian. Dibiarkan di halaman saat ini.");
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;