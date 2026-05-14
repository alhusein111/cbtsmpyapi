// 👇 PERUBAHAN DISINI (1):
// Hapus import axios bawaan, ganti dengan import api dari axiosConfig
// Pastikan path (lokasi folder) './axiosConfig' sesuai dengan struktur folder mas brow!
import api from '../api/axiosConfig'; 
import { createContext, useState, useEffect, useContext } from 'react';

// 1. Buat Context
const SettingsContext = createContext();

// 2. Buat Provider (Bungkus untuk aplikasi kita)
export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [activeYear, setActiveYear] = useState("Memuat...");
    const [activeYearId, setActiveYearId] = useState(null); 

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // 👇 PERUBAHAN DISINI (2): 
                // Ganti 'axios' menjadi 'api', dan cukup tulis '/api/settings'
                const response = await api.get('/api/settings'); 
                
                const dataPengaturan = response.data.data;
                setSettings(dataPengaturan);
                setActiveYear(response.data.activeYear);
                setActiveYearId(response.data.activeYearId);

                // SIMPAN LANGSUNG KE LOCAL STORAGE SAAT PERTAMA KALI LOAD
                if (response.data.activeYearId) {
                    localStorage.setItem('activeYearId', response.data.activeYearId);
                }
                if (response.data.activeYear) {
                    localStorage.setItem('activeYearText', response.data.activeYear);
                }

                // --- BAGIAN INI UNTUK UBAH FAVICON & TITLE BROWSER OTOMATIS ---
                if (dataPengaturan.nama_sekolah) {
                    document.title = dataPengaturan.nama_sekolah; 
                }

                if (dataPengaturan.logo_sekolah) {
                    let link = document.querySelector("link[rel~='icon']");
                    if (!link) {
                        link = document.createElement('link');
                        link.rel = 'icon';
                        document.getElementsByTagName('head')[0].appendChild(link);
                    }
                    
                    // 👇 PERUBAHAN DISINI (3): 
                    // Karena Favicon bukan panggilan API (Axios), kita harus ambil URL-nya dari Vite .env
                    // Menggunakan import.meta.env.VITE_API_URL yang sudah mas brow siapkan
                    const BASE_URL = import.meta.env.VITE_API_URL;
                    link.href = `${BASE_URL}/uploads/logos/${dataPengaturan.logo_sekolah}`; 
                }

            } catch (error) {
                console.error("Gagal load setting global:", error);
                setActiveYear("Gagal memuat");
            }
        };

        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, activeYear, activeYearId }}>
            {children}
        </SettingsContext.Provider>
    );
};

// 3. Buat Custom Hook
export default SettingsProvider; 
export const useSettings = () => useContext(SettingsContext);