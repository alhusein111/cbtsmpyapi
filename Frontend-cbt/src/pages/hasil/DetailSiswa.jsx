import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
// IMPORT instance api dari file axiosConfig mas brow
// Sesuaikan path ../ nya jika letak filenya berbeda
import api from '../../api/axiosConfig'; 

const DetailSiswa = () => {
  const { student_exam_id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState(null);

  useEffect(() => {
    const fetchDetailSiswa = async () => {
      try {
        // PAKAI api.get (Otomatis bawa token & baseURL)
        const response = await api.get(`/api/admin/hasil/siswa-detail/${student_exam_id}`);

        if (response.data.success) {
          setDetailData(response.data.data);
        }
      } catch (error) {
        console.error("🔴 Gagal mengambil detail siswa:", error);
        alert(error.response?.data?.message || "Gagal memuat data detail siswa.");
      } finally {
        setLoading(false);
      }
    };

    if (student_exam_id) fetchDetailSiswa();
  }, [student_exam_id]);

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <p className="text-lg font-medium text-gray-600 animate-pulse">Memuat data detail siswa...</p>
      </div>
    );
  }

  if (!detailData) {
    return (
      <div className="p-6 text-center bg-slate-50 min-h-screen">
        <p className="text-red-500 font-bold text-xl">Data detail siswa tidak ditemukan.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-4 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition shadow-md"
        >
          ← Kembali ke Hasil Kelas
        </button>
      </div>
    );
  }

  const { siswa, ujian, jawaban } = detailData;

  return (
    <div className="p-6 bg-slate-50 min-h-screen print:bg-white print:p-0">
      
      {/* Header Info & Navigasi */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg uppercase">
            {siswa.nama ? siswa.nama.substring(0, 2) : 'SS'}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 print:text-black">{siswa.nama}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1 font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">🎓 {siswa.nama_kelas || '-'}</span> 
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1">🆔 NIS: {siswa.nis || '-'}</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1 font-semibold text-slate-700">📝 {ujian.title}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto print:hidden">
          <button 
            onClick={() => navigate(-1)} 
            className="flex-1 md:flex-none px-5 py-2.5 border border-slate-200 bg-white rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            ← Kembali
          </button>
          <button 
            onClick={handleDownloadPDF} 
            className="flex-1 md:flex-none px-5 py-2.5 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
          >
            💾 Cetak Laporan
          </button>
        </div>
      </div>

      {/* Ringkasan Nilai & Statistik Utama */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4 print:gap-4">
        
        {/* Total Score PieChart (BARU) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[240px]">
          <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest print:hidden">Skor Akhir</h3>
          
          {/* Container Recharts (Hanya Tampil di Layar) */}
          <div className="w-full h-36 relative print:hidden">
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-2xl font-black ${ujian.nilai_akhir >= ujian.kkm ? 'text-emerald-600' : 'text-red-500'}`}>
                  {ujian.nilai_akhir}
                </span>
             </div>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie 
                    data={[
                      { name: 'Skor Diraih', value: Number(ujian.nilai_akhir) },
                      { name: 'Sisa Skor', value: 100 - Number(ujian.nilai_akhir) }
                    ]} 
                    innerRadius={45} 
                    outerRadius={65} 
                    paddingAngle={0} 
                    dataKey="value" 
                    stroke="none"
                    animationDuration={1000}
                 >
                   {/* Cell Pertama: Warna Lulus (Hijau) atau Remedial (Merah) */}
                   <Cell fill={ujian.nilai_akhir >= ujian.kkm ? '#10b981' : '#ef4444'} />
                   {/* Cell Kedua: Warna Abu-abu untuk sisa skor sampai 100 */}
                   <Cell fill="#f1f5f9" />
                 </Pie>
                 <Tooltip formatter={(value) => [`${value} Poin`, 'Nilai']} />
               </PieChart>
             </ResponsiveContainer>
          </div>

          {/* Fallback Tampilan Simple Khusus Untuk Print (Karena Recharts kadang blank saat di-print) */}
          <div className="hidden print:flex flex-col items-center justify-center mb-3">
             <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Skor Akhir</h3>
             <div className={`w-28 h-28 rounded-full border-[6px] ${ujian.nilai_akhir >= ujian.kkm ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'} flex items-center justify-center shadow-inner`}>
                <p className="text-4xl font-black text-slate-800">{ujian.nilai_akhir}</p>
             </div>
          </div>

          <span className={`mt-2 px-4 py-1 rounded-full text-xs font-black ${ujian.nilai_akhir >= ujian.kkm ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} uppercase z-10`}>
            {ujian.nilai_akhir >= ujian.kkm ? 'LULUS' : 'REMEDIAL'}
          </span>
        </div>

        {/* Statistik Detail Cards */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Benar</p>
            <p className="text-4xl font-black text-emerald-600 mt-2">{ujian.jumlah_benar}</p>
          </div>
          <div className="border-t border-slate-50 pt-4 text-[11px] text-slate-400 leading-relaxed italic">
            Poin dihitung berdasarkan bobot soal yang dijawab dengan benar.
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Salah / Kosong</p>
            <p className="text-4xl font-black text-red-500 mt-2">{ujian.jumlah_salah}</p>
          </div>
          <div className="border-t border-slate-50 pt-4 text-[11px] text-slate-400 leading-relaxed italic">
            Termasuk jawaban yang tidak diisi oleh siswa.
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">KKM Ujian</p>
            <p className="text-4xl font-black text-blue-900 mt-2">{ujian.kkm}</p>
          </div>
          <div className="border-t border-slate-50 pt-4 text-[11px] text-slate-400 leading-relaxed italic">
            Standar minimal kelulusan untuk mata pelajaran ini.
          </div>
        </div>

      </div>

      {/* Analisis Butir Jawaban Siswa */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 print:break-inside-avoid">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-50 pb-5 gap-2">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Analisis Lembar Jawaban</h3>
            <p className="text-sm text-slate-500">Koreksi mendalam per butir soal</p>
          </div>
          <div className="flex items-center bg-slate-100 px-4 py-1.5 rounded-xl">
             <span className="text-sm font-bold text-slate-600">Total {jawaban?.length || 0} Soal</span>
          </div>
        </div>

        {/* Kotak Grid Status Jawaban */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-4">
          {jawaban && jawaban.map((item, index) => (
            <div 
              key={index} 
              className={`group relative p-4 rounded-2xl border-2 text-center transition-all duration-200 cursor-default print:break-inside-avoid
                ${item.is_correct === 1 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-300' 
                  : 'bg-red-50 border-red-100 text-red-700 hover:border-red-300'}`}
            >
              <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">No. {index + 1}</span>
              <span className="text-xl font-black">{item.is_correct === 1 ? '✓' : '✗'}</span>
              <div className="mt-2 text-[10px] font-mono bg-white/50 rounded py-0.5 border border-black/5 uppercase">
                 {item.student_answer || '-'}
              </div>
              
              {/* Tooltip sederhana saat hover */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 print:hidden">
                {item.is_correct === 1 ? 'Jawaban Benar' : 'Jawaban Salah'}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-10 flex flex-wrap gap-8 text-xs border-t border-slate-50 pt-6 print:break-inside-avoid">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-emerald-100 border-2 border-emerald-300 rounded-lg flex items-center justify-center text-emerald-700 font-bold">✓</span>
            <span className="text-slate-600 font-bold uppercase tracking-wider">Jawaban Benar</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded-lg flex items-center justify-center text-red-700 font-bold">✗</span>
            <span className="text-slate-600 font-bold uppercase tracking-wider">Salah / Tidak Diisi</span>
          </div>
        </div>
      </div>

      {/* Footer Print */}
      <div className="hidden print:block mt-12 text-center text-slate-400 text-[10px]">
        Laporan ini dicetak secara otomatis melalui sistem CBT Online pada {new Date().toLocaleString('id-ID')}
      </div>
    </div>
  );
};

export default DetailSiswa;