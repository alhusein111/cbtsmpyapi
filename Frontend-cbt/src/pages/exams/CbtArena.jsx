import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, LogOut, Map, CheckCircle2, ChevronLeft, ChevronRight, Play, Info } from 'lucide-react';
import api from '../../api/axiosConfig'; // Sesuaikan path axios Anda
import { toast } from 'sonner';
import Swal from 'sweetalert2';

// === HELPER FUNCTIONS ===
const stripHtml = (html) => {
  if (!html) return "";
  let tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const fixImageUrl = (imagePath) => {
  if (!imagePath) return '';
  // Kalau path udah format web atau base64, biarkan saja
  if (imagePath.startsWith('http') || imagePath.startsWith('data:image')) return imagePath;
  
  const backendUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''; 
  // Gabungkan URL backend dengan path gambar
  return imagePath.startsWith('/') ? `${backendUrl}${imagePath}` : `${backendUrl}/uploads/soal/${imagePath}`;
};

const fixHTMLContent = (html) => {
  if (!html) return '';
  const backendUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
  // Memperbaiki src gambar di dalam string HTML agar mengarah ke backend yang benar
  return html.replace(/src="(\/[^"]+)"/g, `src="${backendUrl}$1"`);
};

const BASE_URL = import.meta.env.VITE_API_URL;
// =======================

const CbtArena = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  // === STATE LOBBY & INFORMASI HEADER ===
  const [isInLobby, setIsInLobby] = useState(true);
  const [infoUjian, setInfoUjian] = useState({ jenis_ujian: 'CBT Arena', nama_mapel: 'Ujian Aktif' });
  const [infoSiswa, setInfoSiswa] = useState({ nama: 'Nama Siswa', identitas: 'NIS/No', kelas: '' });

  // === STATE UJIAN UTAMA ===
  const [studentExamId, setStudentExamId] = useState(null);
  const [soalAktif, setSoalAktif] = useState(null);
  const [pilihan, setPilihan] = useState([]);
  const [navigasi, setNavigasi] = useState([]);
  const [nomorAktif, setNomorAktif] = useState(1);
  const [jawabanTersimpan, setJawabanTersimpan] = useState(null); 
  const [jawabanText, setJawabanText] = useState(''); 
  const [raguRagu, setRaguRagu] = useState(false);
  const [loading, setLoading] = useState(false);

  // === STATE KHUSUS MENJODOHKAN (MJ) ===
  const [leftOptions, setLeftOptions] = useState([]);
  const [rightOptions, setRightOptions] = useState([]);
  const [mjMatches, setMjMatches] = useState([]); 
  const [activeKiri, setActiveKiri] = useState(null);
  const containerMjRef = useRef(null);
  const [linesMj, setLinesMj] = useState([]);
  const matchColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  // === STATE WAKTU & TIMER ===
  const [currentTime, setCurrentTime] = useState(new Date());
  const [durasiTotal, setDurasiTotal] = useState(7200);
  const [sisaWaktu, setSisaWaktu] = useState(7200);
  const [minWorkTime, setMinWorkTime] = useState(1800); // dalam DETIK
  const [waktuBerjalan, setWaktuBerjalan] = useState(0); 
  
  // === STATE KEAMANAN & MODAL ===
  const [showModalSelesai, setShowModalSelesai] = useState(false);
  const [tokenKeluar, setTokenKeluar] = useState('');
  const [timeOutMode, setTimeOutMode] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // STATE BARU UNTUK LOCK SYSTEM

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Cek KTP Khusus dari aplikasi Android kita
    const isAppCbt = userAgent.includes("APP_CBT_YAPI");

    // JIKA dia buka di HP, TAPI BUKAN dari aplikasi CBT kita (tidak punya KTP)
    if (isMobile && !isAppCbt) {
      Swal.fire({
        icon: 'warning',
        title: 'PERINGATAN',
        text: 'Harap gunakan Aplikasi Mobile CBT SMP YAPI untuk mengerjakan ujian di HP!',
        confirmButtonText: 'Mengerti',
        allowOutsideClick: false
      }).then(() => {
        navigate('/login', { replace: true });
      });
    }
  }, [navigate]);

  const handleMulaiKlik = async () => {
    // Cek KTP lagi di sini
    const isAppCbt = navigator.userAgent.includes("APP_CBT_YAPI");

    try {
      // HANYA minta HTML5 Fullscreen JIKA BUKAN dari Aplikasi Android kita (misal: pakai PC/Laptop)
      if (!isAppCbt) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        }
      }
      setIsInLobby(false);
      initExam(); 
    } catch (err) {
      toast.error("Gagal masuk mode Fullscreen. Pastikan browser Anda mengizinkannya.");
    }
  };

  const initExam = async () => {
    try {
      setLoading(true);
      const resStart = await api.post('/api/student/exam/start', { exam_id: examId });
      
      if (resStart.data.success) {
        const dataExam = resStart.data.data;
        setStudentExamId(dataExam.student_exam_id);
        localStorage.setItem('student_exam_id', dataExam.student_exam_id);
        
        setInfoUjian({
          jenis_ujian: dataExam.jenis_ujian || 'CBT Arena',
          nama_mapel: dataExam.nama_mapel || 'Ujian Aktif'
        });
        setInfoSiswa({
          nama: dataExam.nama_siswa || 'Siswa',
          identitas: dataExam.nis || dataExam.no_peserta || 'Peserta',
          kelas: dataExam.kelas || ''
        });

        if (dataExam.sisa_waktu !== undefined) setSisaWaktu(dataExam.sisa_waktu);
        if (dataExam.durasi_total !== undefined) setDurasiTotal(dataExam.durasi_total);
        
        // Konversi min_work_time (Menit) ke Detik
        if (dataExam.min_work_time !== undefined) setMinWorkTime(dataExam.min_work_time * 60);
        
        fetchNavigasi(dataExam.student_exam_id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal memulai ujian!");
      if (document.fullscreenElement) document.exitFullscreen?.();
      navigate('/dashboard');
    }
  };

  const fetchNavigasi = async (stdExamId) => {
    try {
      const resNav = await api.get(`/api/student/exam/${stdExamId}/navigasi`);
      if (resNav.data.success) {
        setNavigasi(resNav.data.data.peta_soal || []);
        const lastQId = resNav.data.data.last_question_id;
        let startNomor = 1;
        if (lastQId && resNav.data.data.peta_soal) {
          const matched = resNav.data.data.peta_soal.find(p => p.question_id === lastQId);
          if (matched) startNomor = matched.nomor_urut;
        }
        setNomorAktif(startNomor);
      }
    } catch (error) {
      toast.error("Gagal memuat peta soal.");
    }
  };

  // === USEEFFECT KEAMANAN ===
  useEffect(() => {
    if (isInLobby || isLocked || isSubmitting) return; 

    const handlePelanggaran = async () => {
      setIsLocked(true); 
      
      const forceExitFullscreen = async () => {
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
        } catch (err) {
          console.warn("Abaikan error exit fullscreen:", err);
        }
      };

      try {
          const token = localStorage.getItem('token'); 
          await api.post('/api/student/exam/lock-ujian', 
              { student_exam_id: studentExamId },
              { headers: { 'Authorization': `Bearer ${token}` } }
          );

          Swal.fire({
            icon: 'error',
            title: '🚫 PELANGGARAN TERDETEKSI!',
            text: 'Anda terdeteksi meminimize browser atau pindah tab. Ujian Anda telah dikunci oleh sistem. Silakan lapor Pengawas!',
            confirmButtonText: 'Keluar',
            allowOutsideClick: false
          }).then(async () => {
            await forceExitFullscreen(); 
            navigate('/login', { replace: true }); 
          });

      } catch (error) {
          console.error("Gagal mengunci ujian:", error);
          Swal.fire({
            icon: 'error',
            title: 'Pelanggaran',
            text: 'Terjadi pelanggaran. Anda dikeluarkan dari mode ujian secara paksa.',
            confirmButtonText: 'Keluar',
            allowOutsideClick: false
          }).then(async () => {
            await forceExitFullscreen(); 
            navigate('/login', { replace: true }); 
          });
      }
    };

    const preventDefaultActions = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) || 
        (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'C' || e.key === 'c' || e.key === 'V' || e.key === 'v'))
      ) {
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handlePelanggaran();
      }
    };

    const handleFullscreenChange = () => {
      const isAppCbt = navigator.userAgent.includes("APP_CBT_YAPI");
      if (!isAppCbt && !document.fullscreenElement && !timeOutMode && !isSubmitting) {
        handlePelanggaran();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !timeOutMode && !isSubmitting) {
        handlePelanggaran();
      }
    };

    const handleBlur = () => {
      if (!timeOutMode && !isSubmitting) {
        handlePelanggaran();
      }
    };

    const handleAndroidPelanggaran = (e) => {
      console.log("ALARM DARI ANDROID: ", e.detail);
      if (!timeOutMode && !isSubmitting) {
        handlePelanggaran(); 
      }
    };

    document.addEventListener('contextmenu', preventDefaultActions);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pelanggaran_terdeteksi', handleAndroidPelanggaran);
    
    return () => {
      document.removeEventListener('contextmenu', preventDefaultActions);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pelanggaran_terdeteksi', handleAndroidPelanggaran);
    };
  }, [isInLobby, timeOutMode, navigate, studentExamId, isLocked, isSubmitting]);

  // === USEEFFECT LOAD SOAL ===
  useEffect(() => {
    const loadSoal = async () => {
      if (!studentExamId || isInLobby) return;
      try {
        setLoading(true);
        setJawabanTersimpan(null);
        setJawabanText('');
        setRaguRagu(false);
        setActiveKiri(null);
        setMjMatches([]);
        setLinesMj([]);

        const resSoal = await api.get(`/api/student/exam/${studentExamId}/soal/${nomorAktif}`);
        if (resSoal.data.success) {
          const data = resSoal.data.data;
          const currentTipe = data.tipe_soal || data.soal?.tipe_soal || 'PG';
          setSoalAktif({ ...data.soal, tipe_soal: currentTipe }); 
          setPilihan(data.pilihan || []);

          if (currentTipe === 'MJ' || currentTipe === 'matching' || currentTipe === 'menjodohkan') {
              // Kita bawa semua properti dari DB (dengan ...p) atau spesifik tentukan properti gambarnya
                const kiri = (data.pilihan || []).map(p => ({ 
                    id: p.id, 
                    teks: p.kunci_kiri,
                    gambar: p.gambar_kiri || p.gambar_opsi || p.gambar // Sesuaikan dengan nama field di database/backend untuk gambar kiri
                }));

                const kanan = (data.pilihan || []).map(p => ({ 
                    id: p.id, 
                    teks: p.kunci_kanan,
                    gambar: p.gambar_kanan || p.gambar_opsi || p.gambar // Sesuaikan dengan nama field di database/backend untuk gambar kanan
                }));
              setLeftOptions(kiri);
              
              const shuffledKanan = [...kanan].sort(() => Math.random() - 0.5);
              setRightOptions(shuffledKanan);

              let parsedMatches = [];
              const savedDb = data.jawaban_tersimpan?.jawaban_matching || ''; 
              if (typeof savedDb === 'string' && savedDb.includes(':')) {
                  const pairs = savedDb.split('|');
                  pairs.forEach(pair => {
                      const [tKiri, tKanan] = pair.split(':');
                      const objKiri = kiri.find(k => stripHtml(k.teks) === stripHtml(tKiri));
                      const objKanan = kanan.find(k => stripHtml(k.teks) === stripHtml(tKanan));
                      if (objKiri && objKanan) {
                          parsedMatches.push({ kiri: objKiri, kanan: objKanan });
                      }
                  });
              }
              setMjMatches(parsedMatches);
              setJawabanText(savedDb);
          } else {
              setJawabanTersimpan(data.jawaban_tersimpan?.opsi_id || null); 
              setJawabanText(data.jawaban_tersimpan?.jawaban_esai || '');
          }
          setRaguRagu(data.ragu_ragu || false);
        }
      } catch (error) {
        toast.error("Gagal memuat soal nomor " + nomorAktif);
      } finally {
        setLoading(false);
      }
    };
    loadSoal();
  }, [nomorAktif, studentExamId, isInLobby]);

  const updateLines = () => {
    if (!containerMjRef.current || mjMatches.length === 0) {
      setLinesMj([]);
      return;
    }
    const containerRect = containerMjRef.current.getBoundingClientRect();
    const newLines = mjMatches.map((match, idx) => {
        const nodeKiri = document.getElementById(`node-kiri-${match.kiri.id}`);
        const nodeKanan = document.getElementById(`node-kanan-${match.kanan.id}`);
        if (nodeKiri && nodeKanan) {
            const rectKiri = nodeKiri.getBoundingClientRect();
            const rectKanan = nodeKanan.getBoundingClientRect();
            return {
                x1: rectKiri.left - containerRect.left + (rectKiri.width / 2),
                y1: rectKiri.top - containerRect.top + (rectKiri.height / 2),
                x2: rectKanan.left - containerRect.left + (rectKanan.width / 2),
                y2: rectKanan.top - containerRect.top + (rectKanan.height / 2),
                color: matchColors[idx % matchColors.length]
            };
        }
        return null;
    }).filter(Boolean);
    setLinesMj(newLines);
  };

  useEffect(() => {
    const timerId = setTimeout(updateLines, 100); 
    window.addEventListener('resize', updateLines);
    return () => { 
      clearTimeout(timerId); 
      window.removeEventListener('resize', updateLines); 
    };
  }, [mjMatches, leftOptions, rightOptions]);

  useEffect(() => {
    if (isInLobby) return;
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, [isInLobby]);

  useEffect(() => {
    if (isInLobby || timeOutMode) return; 

    const timer = setInterval(() => {
      setSisaWaktu(prev => {
        if (prev <= 1) {
          setTimeOutMode(true);
          return 0;
        }
        return prev - 1;
      });
      setWaktuBerjalan(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isInLobby, timeOutMode]); 

  useEffect(() => {
    let to;
    if (timeOutMode) {
      if (timeoutCountdown > 0) {
        to = setTimeout(() => setTimeoutCountdown(prev => prev - 1), 1000);
      } else if (timeoutCountdown === 0) {
        if (!isSubmitting) {
          submitUjianSelesai(true); 
        }
      }
    }
    return () => {
      if (to) clearTimeout(to);
    };
  }, [timeOutMode, timeoutCountdown]);

  const getQuestionType = () => {
    const type = (soalAktif?.tipe_soal || soalAktif?.jenis_soal || '').toLowerCase();
    if (type === 'essay' || type === 'uraian') return 'essay';
    if (type === 'menjodohkan' || type === 'matching' || type === 'mj') return 'menjodohkan';
    if (type === 'bs' || type === 'benar_salah' || type === 'benarsalah' || type === 'benar-salah') return 'bs';
    return 'pg'; 
  };

  const saveAnswerToDB = async (opsiId = null, textValue = null, isDoubt = raguRagu) => {
    const qType = getQuestionType();
    const isTextBased = qType === 'essay' || qType === 'menjodohkan';
    const currentNomor = nomorAktif;
    const currentQuestionId = soalAktif?.id;
    
    setNavigasi(prev => prev.map(n => 
      n.nomor_urut === currentNomor 
        ? { ...n, sudah_dijawab: isTextBased ? (textValue && textValue.trim().length > 0) : !!opsiId, ragu_ragu: isDoubt } 
        : n
    ));

    try {
      await api.put('/api/student/exam/save-answer', {
        student_exam_id: studentExamId,
        question_id: currentQuestionId,
        opsi_id: (qType === 'pg' || qType === 'bs') ? opsiId : null,
        jawaban_esai: qType === 'essay' ? textValue : null,
        jawaban_matching: qType === 'menjodohkan' ? textValue : null,
        is_doubt: isDoubt
      });
    } catch (error) {
      toast.error('Gagal auto-save. Cek koneksi Anda!');
    }
  };

  const handlePilihJawabanPG = (opsiId) => {
    setJawabanTersimpan(opsiId);
    saveAnswerToDB(opsiId, null, raguRagu);
  };
  const handleBlurTextBased = () => saveAnswerToDB(null, jawabanText, raguRagu);
  const handleToggleRagu = () => {
    const newVal = !raguRagu;
    setRaguRagu(newVal);
    saveAnswerToDB(jawabanTersimpan, jawabanText, newVal);
  };
  const handleNavigasiSoal = (targetNomor) => {
    const qType = getQuestionType();
    if (qType === 'essay' || qType === 'menjodohkan') saveAnswerToDB(null, jawabanText, raguRagu);
    setNomorAktif(targetNomor);
  };

  const handleKlikKiriMJ = (kiriObj) => setActiveKiri(kiriObj);
  const handleKlikKananMJ = (kananObj) => {
    if (!activeKiri) {
      toast.info("Pilih penyataan di kotak kiri terlebih dahulu!");
      return;
    }
    let newMatches = mjMatches.filter(m => m.kiri.id !== activeKiri.id && m.kanan.id !== kananObj.id);
    newMatches.push({ kiri: activeKiri, kanan: kananObj });
    setMjMatches(newMatches);
    setActiveKiri(null);

    const stringForDb = newMatches.map(m => `${stripHtml(m.kiri.teks)}:${stripHtml(m.kanan.teks)}`).join('|');
    setJawabanText(stringForDb);
    saveAnswerToDB(null, stringForDb, raguRagu);
  };

  const keluarUjianAman = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (fsError) {
      console.warn("Abaikan error exit fullscreen:", fsError);
    }
    localStorage.removeItem('student_exam_id'); 
    navigate('/dashboard', { replace: true });
  };

  const submitUjianSelesai = async (isForceSubmit = false) => {
    if (isSubmitting) return;

    if (!isForceSubmit && !tokenKeluar) {
      toast.error("Silakan masukkan Token Keluar dari pengawas!");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const res = await api.post('/api/student/exam/finish', {
        student_exam_id: studentExamId,
        token_keluar_input: isForceSubmit ? 'FORCE_SUBMIT' : tokenKeluar,
        keterangan: isForceSubmit ? 'Waktu Habis / Force Submit' : 'Selesai Normal'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.data.success || res.data.already_finished) {
        if (!isForceSubmit) toast.success(res.data.message || "Ujian Selesai!");
        keluarUjianAman(); 
      } else {
        toast.error(res.data.message || "Gagal menyelesaikan ujian!");
        setIsSubmitting(false); 
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Terjadi kesalahan pada server!";
      if (errorMsg.toLowerCase().includes("sudah diselesaikan") || errorMsg.toLowerCase().includes("selesai")) {
        keluarUjianAman();
      } else {
        toast.error(errorMsg);
        setIsSubmitting(false); 
      }
    }
  };

  const formatTime = (seconds) => {
    const validSeconds = Math.max(0, seconds);
    const h = Math.floor(validSeconds / 3600);
    const m = Math.floor((validSeconds % 3600) / 60);
    const s = validSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColors = () => {
    if (durasiTotal === 0) return { bg: 'bg-emerald-600', text: 'text-white', progress: 'bg-emerald-400' };
    const persentase = (sisaWaktu / durasiTotal) * 100;
    if (persentase > 50) return { bg: 'bg-emerald-600', text: 'text-white', progress: 'bg-emerald-400' };
    if (persentase > 20) return { bg: 'bg-amber-400', text: 'text-amber-900', progress: 'bg-amber-300' };
    return { bg: 'bg-red-600 animate-pulse', text: 'text-white', progress: 'bg-red-400' };
  };
  const timerTheme = getTimerColors();

  if (isInLobby) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 z-50 fixed inset-0">
        <div className="bg-white max-w-md w-full rounded-3xl shadow-xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Persiapan Ujian</h1>
          <p className="text-slate-600 mb-8 text-sm md:text-base leading-relaxed">
            Halaman ini akan menggunakan mode <strong>Layar Penuh (Fullscreen)</strong>. Pastikan koneksi internet Anda stabil.
          </p>
          <button 
            onClick={handleMulaiKlik}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
          >
            <Play size={20} className="group-hover:scale-110 transition-transform" />
            `MULAI UJIAN SEKARANG`
          </button>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-slate-500 text-sm font-bold hover:text-slate-800">
            Batal & Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  } 

  const qType = getQuestionType();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none fixed inset-0 z-50 overflow-y-auto">
      
      {timeOutMode && (
        <div className="fixed inset-0 z-60 bg-slate-900/95 flex flex-col justify-center items-center text-white backdrop-blur-md">
          <Clock size={80} className="text-red-500 mb-6 animate-bounce" />
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-wider text-transparent bg-clip-text bg-linear-to-r from-red-400 to-rose-600">WAKTU HABIS!</h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 font-light">Ujian akan ditutup otomatis dalam</p>
          <div className="text-8xl font-black text-red-500 mb-8">{timeoutCountdown}</div>
        </div>
      )}

      {/* HEADER DINAMIS */}
      <div className={`sticky top-0 z-40 w-full shadow-lg transition-colors duration-500 ${timerTheme.bg} ${timerTheme.text}`}>
        <div className="flex justify-between items-center px-4 md:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">{infoUjian.jenis_ujian} - {infoUjian.nama_mapel}</h1>
              <p className="text-[11px] opacity-90 uppercase tracking-widest font-bold">
                {infoSiswa.nama} - {infoSiswa.identitas} {infoSiswa.kelas ? `/ ${infoSiswa.kelas}` : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-mono text-2xl font-black bg-black/20 px-4 py-1.5 rounded-xl backdrop-blur-sm shadow-inner">
              <Clock size={20} className={sisaWaktu < 300 ? "animate-spin" : ""} /> 
              {formatTime(sisaWaktu)}
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-black/10">
          <div className={`h-full ${timerTheme.progress} transition-all duration-1000 ease-linear`} style={{ width: `${Math.min(100, Math.max(0, (sisaWaktu / durasiTotal) * 100))}%` }}></div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row max-w-350 mx-auto w-full p-4 md:p-6 gap-6 flex-1 h-full">
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            
            <div className="bg-slate-50 border-b border-slate-200 p-4 md:px-6 md:py-4 flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black text-slate-800">
                Soal No. <span className="text-indigo-600">{nomorAktif}</span>
              </h2>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider">
                {qType === 'essay' ? 'Esai' : qType === 'menjodohkan' ? 'Menjodohkan' : qType === 'bs' ? 'Benar / Salah' : 'Pilihan Ganda'}
              </span>
            </div>
            
            <div className="p-4 md:p-8 flex-1 overflow-y-auto w-full min-w-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="font-medium animate-pulse">Menyiapkan soal...</p>
                </div>
              ) : (
                <>
                  <div className="mb-8 text-slate-800 text-lg md:text-xl leading-relaxed w-full min-w-0 flex flex-col">
                    <div 
                      className="w-full min-w-0 overflow-hidden wrap-break-word **:whitespace-normal! **:wrap-break-word! **:[word-break:break-word]! [&_img]:max-w-full! [&_img]:h-auto! [&_table]:w-full! [&_table]:block! [&_table]:overflow-x-auto!" 
                      style={{ 
                        wordWrap: 'break-word', 
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal' 
                      }}
                      dangerouslySetInnerHTML={{ __html: fixHTMLContent(soalAktif?.teks_soal || '') }} 
                    />
                    
                    {/* 👇 SEBELUMNYA BELUM MENGGUNAKAN fixImageUrl */}
                    {soalAktif?.gambar_soal && (
                      <img 
                        src={fixImageUrl(soalAktif.gambar_soal)} 
                        alt="Ilustrasi Soal" 
                        className="max-w-full h-auto rounded-xl border border-slate-200 my-4 shadow-sm" 
                      />
                    )}
                  </div>

                  {qType === 'essay' && (
                    <div className="mt-4 animate-in fade-in duration-300">
                      <textarea 
                        className="w-full min-h-50 p-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-lg text-slate-700 transition-all resize-y"
                        placeholder="Ketik jawaban esai Anda di sini..."
                        value={jawabanText}
                        onChange={(e) => setJawabanText(e.target.value)}
                        onBlur={handleBlurTextBased}
                      />
                    </div>
                  )}

                  {qType === 'menjodohkan' && (
                      <div className="mt-4 animate-in fade-in duration-300">
                        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl mb-8 flex gap-3 text-indigo-800">
                          <Info size={20} className="shrink-0 mt-0.5" />
                          <p className="text-sm font-medium">Ini adalah soal tipe <strong>Menjodohkan</strong>. Silakan klik kotak sebelah kiri lalu klik pasangannya di kotak sebelah kanan.</p>
                        </div>

                        <div className="relative w-full px-2" ref={containerMjRef}>
                          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                              {linesMj.map((line, i) => (
                                  <line 
                                    key={`line-${i}`} 
                                    x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} 
                                    stroke={line.color} strokeWidth="3" strokeLinecap="round" 
                                  />
                              ))}
                          </svg>

                          <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-32 relative z-10">
                            {/* KOLOM KIRI */}
                            <div className="flex-1 flex flex-col gap-4">
                              {leftOptions.map((item) => {
                                const matchIndex = mjMatches.findIndex(m => m.kiri.id === item.id);
                                const isMatched = matchIndex !== -1;
                                const isSelected = activeKiri?.id === item.id;
                                const borderColor = isSelected ? '#4f46e5' : (isMatched ? matchColors[matchIndex % matchColors.length] : '#e2e8f0');
                                const gambarOpsiKiri = item.gambar || item.gambar_opsi;

                                return (
                                  <div 
                                    key={`kiri-${item.id}`} 
                                    onClick={() => handleKlikKiriMJ(item)}
                                    className="flex justify-between items-center p-4 border-2 rounded-xl shadow-sm transition-all cursor-pointer bg-white hover:bg-slate-50 min-w-0 w-full"
                                    style={{ borderColor: borderColor }}
                                  >
                                    <div className="flex flex-col gap-2 flex-1 min-w-0 pr-4">
                                      {item.teks && (
                                        <div className="text-slate-700 font-medium text-sm md:text-base break-words mj-content" dangerouslySetInnerHTML={{ __html: fixHTMLContent(item.teks) }} />
                                      )}
                                      {gambarOpsiKiri && (
                                        <img 
                                          src={fixImageUrl(gambarOpsiKiri)} 
                                          alt="Opsi Kiri" 
                                          className="max-w-full h-auto rounded-lg border border-slate-100 shadow-sm my-1"
                                          style={{ maxHeight: '120px', objectFit: 'contain', alignSelf: 'flex-start' }}
                                        />
                                      )}
                                    </div>
                                    <div 
                                      id={`node-kiri-${item.id}`} 
                                      className="w-4 h-4 md:w-5 md:h-5 rounded-full shrink-0 z-20"
                                      style={{ backgroundColor: borderColor }}
                                    ></div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* KOLOM KANAN */}
                            <div className="flex-1 flex flex-col gap-4">
                              {rightOptions.map((item) => {
                                const matchIndex = mjMatches.findIndex(m => m.kanan.id === item.id);
                                const isMatched = matchIndex !== -1;
                                const borderColor = isMatched ? matchColors[matchIndex % matchColors.length] : '#e2e8f0';
                                const gambarOpsiKanan = item.gambar || item.gambar_opsi;

                                return (
                                  <div 
                                    key={`kanan-${item.id}`} 
                                    onClick={() => handleKlikKananMJ(item)}
                                    className="flex items-center p-4 border-2 rounded-xl shadow-sm transition-all cursor-pointer bg-white hover:bg-slate-50 min-w-0 w-full"
                                    style={{ borderColor: borderColor }}
                                  >
                                    <div 
                                      id={`node-kanan-${item.id}`} 
                                      className="w-4 h-4 md:w-5 md:h-5 rounded-full shrink-0 mr-4 z-20"
                                      style={{ backgroundColor: borderColor }}
                                    ></div>

                                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                                      {item.teks && (
                                        <div className="text-slate-700 font-medium w-full text-sm md:text-base break-words mj-content" dangerouslySetInnerHTML={{ __html: fixHTMLContent(item.teks) }} />
                                      )}
                                      {gambarOpsiKanan && (
                                        <img 
                                          src={fixImageUrl(gambarOpsiKanan)} 
                                          alt="Opsi Kanan" 
                                          className="max-w-full h-auto rounded-lg border border-slate-100 shadow-sm my-1"
                                          style={{ maxHeight: '120px', objectFit: 'contain', alignSelf: 'flex-start' }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <textarea className="hidden" value={jawabanText} readOnly />
                      </div>
                  )}

                  {(qType === 'pg' || qType === 'bs') && (
                    <div className="flex flex-col gap-3 md:gap-4 animate-in fade-in duration-300">
                      {pilihan.map((opsi, idx) => {
                        const isSelected = String(jawabanTersimpan) === String(opsi.id);
                        return (
                          <label 
                            key={opsi.id} 
                            onClick={() => handlePilihJawabanPG(opsi.id)}
                            className={`flex items-start p-4 md:p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-50/50 shadow-sm shadow-indigo-100' 
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mr-4 ${isSelected ? 'border-indigo-600' : 'border-slate-300'}`}>
                              {isSelected && <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>}
                            </div>
                            
                            <div className="text-base md:text-lg text-slate-700 leading-snug flex w-full min-w-0">
                              <span className="font-black mr-2 text-slate-900 shrink-0">{String.fromCharCode(65 + idx)}.</span> 
                              
                              <div className="w-full flex flex-col gap-2 min-w-0 overflow-hidden">
                                {opsi.teks_opsi && (
                                  <div 
                                    className="w-full overflow-x-auto wrap-break-word whitespace-normal **:whitespace-normal! **:max-w-full! [&>p]:m-0 [&_img]:max-w-full! [&_img]:h-auto [&_img]:my-2 [&_img]:rounded-md" 
                                    dangerouslySetInnerHTML={{ __html: fixHTMLContent(opsi.teks_opsi) }} 
                                  />
                                )}

                                {/* 👇 SEBELUMNYA BELUM MENGGUNAKAN fixImageUrl */}
                                {opsi.gambar_opsi && (
                                  <img 
                                    src={fixImageUrl(opsi.gambar_opsi)} 
                                    alt={`Opsi ${String.fromCharCode(65 + idx)}`} 
                                    className="max-w-full h-auto rounded-lg border border-slate-200 shadow-sm"
                                    style={{ maxHeight: '200px', objectFit: 'contain' }}
                                  />
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 md:p-6 flex justify-between items-center">
              <button 
                onClick={() => handleNavigasiSoal(Math.max(1, nomorAktif - 1))}
                disabled={nomorAktif === 1}
                className="px-4 py-2.5 md:px-6 md:py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
              >
                <ChevronLeft size={20} /> <span className="hidden sm:block">Soal Sebelumnya</span>
              </button>

              <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 md:px-6 md:py-3 rounded-xl border-2 transition-all ${raguRagu ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                <input 
                  type="checkbox" 
                  checked={raguRagu} 
                  onChange={handleToggleRagu} 
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer" 
                />
                <span className="font-bold text-sm md:text-base">Ragu-ragu</span>
              </label>

              <button 
                onClick={() => handleNavigasiSoal(Math.min(navigasi.length, nomorAktif + 1))}
                disabled={nomorAktif === navigasi.length || navigasi.length === 0}
                className="px-4 py-2.5 md:px-6 md:py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold flex items-center gap-2 shadow-sm shadow-indigo-200 disabled:opacity-50 transition-all"
              >
                <span className="hidden sm:block">Soal Selanjutnya</span> <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 h-fit sticky top-24">
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Map className="w-5 h-5 text-indigo-500" /> Navigasi Soal
              </h3>
            </div>
            
            <div className="flex flex-wrap gap-3 text-[10px] md:text-xs mb-6 font-bold text-slate-600 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-emerald-500 rounded border border-emerald-600 shadow-inner"></div> Dijawab</div>
              <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-amber-400 rounded border border-amber-500 shadow-inner"></div> Ragu</div>
              <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-slate-100 rounded border border-slate-300 shadow-inner"></div> Belum</div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-[40vh] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-300">
              {navigasi.map((nav) => {
                let btnClass = 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'; 
                if (nav.sudah_dijawab) btnClass = 'bg-emerald-500 text-white border-emerald-600 shadow-inner';
                if (nav.ragu_ragu) btnClass = 'bg-amber-400 text-amber-900 border-amber-500 shadow-inner';
                
                const isActive = nav.nomor_urut === nomorAktif;
                if (isActive) btnClass += ' ring-2 ring-offset-2 ring-indigo-600 scale-105 z-10';

                return (
                  <button
                    key={nav.nomor_urut}
                    onClick={() => handleNavigasiSoal(nav.nomor_urut)}
                    className={`w-full aspect-square flex items-center justify-center font-bold text-sm md:text-base rounded-lg border transition-all duration-200 ${btnClass}`}
                  >
                    {nav.nomor_urut}
                  </button>
                );
              })}
            </div>

            {waktuBerjalan >= minWorkTime ? (
              <button 
                onClick={() => setShowModalSelesai(true)}
                className="w-full mt-8 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-black py-4 rounded-xl border-2 border-red-200 hover:border-red-600 flex items-center justify-center gap-2 transition-all shadow-sm group"
              >
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> SELESAI UJIAN
              </button>
            ) : (
              <div className="w-full mt-8 bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Selesai Ujian Terkunci</p>
                <p className="text-sm font-medium text-slate-700">Terbuka dalam {formatTime(minWorkTime - waktuBerjalan)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL SELESAI UJIAN */}
      {showModalSelesai && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 text-center mb-2">Selesai Ujian?</h3>
            <p className="text-slate-600 text-center text-sm md:text-base mb-6">
              Pastikan Anda telah memeriksa kembali semua jawaban. Ujian yang telah diselesaikan tidak dapat diulang.
            </p>
            
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Token Keluar (Tanya Pengawas)</label>
              <input 
                type="text" 
                value={tokenKeluar}
                onChange={(e) => setTokenKeluar(e.target.value.toUpperCase())}
                placeholder="Masukkan 6 Digit Token"
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-center font-mono text-2xl font-black tracking-[0.5em] transition-all uppercase"
                maxLength={6}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => {
                  setShowModalSelesai(false);
                  setTokenKeluar(''); 
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                disabled={isSubmitting}
              >
                Batal Selesai
              </button>

              <button 
                onClick={() => submitUjianSelesai(false)} 
                disabled={!tokenKeluar || isSubmitting}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-200 transition-all flex justify-center items-center gap-2"
              >
                {isSubmitting ? 'Memproses...' : 'Ya, Selesai!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CbtArena;