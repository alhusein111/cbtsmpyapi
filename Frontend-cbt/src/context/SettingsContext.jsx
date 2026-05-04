import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios'; 

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
                const response = await axios.get('http://localhost:5000/api/settings'); 
                
                const dataPengaturan = response.data.data;
                setSettings(dataPengaturan);
                setActiveYear(response.data.activeYear);
                setActiveYearId(response.data.activeYearId);

                // 👇 SIMPAN LANGSUNG KE LOCAL STORAGE SAAT PERTAMA KALI LOAD
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
                    link.href = `http://localhost:5000/uploads/logos/${dataPengaturan.logo_sekolah}`; 
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