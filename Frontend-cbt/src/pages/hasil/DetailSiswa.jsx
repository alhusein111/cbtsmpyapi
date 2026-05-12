import React from 'react';
import { useNavigate } from 'react-router-dom';

const DetailSiswa = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-xl overflow-hidden">
            {/* Ganti dengan img src foto siswa */}
            <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-500 font-bold text-xl">BS</div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Budi Santoso</h1>
            <p className="text-sm text-gray-500 flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="bg-gray-200 p-1 rounded">🎓</span> Kelas 9A</span> 
              <span>•</span>
              <span className="flex items-center gap-1"><span className="bg-gray-200 p-1 rounded">📅</span> Midterm Mathematics 2026</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border bg-white rounded-lg font-medium text-gray-700 hover:bg-gray-50">🖨 Print Report</button>
          <button className="px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800">⬇ Download PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card Score */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative">
          <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-50 p-1 rounded-full">✓</div>
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Total Score</h3>
          <div className="w-40 h-40 rounded-full border-[12px] border-emerald-500 flex items-center justify-center mb-6">
            <div className="text-center">
              <p className="text-4xl font-black text-gray-800">85<span className="text-lg text-gray-400 font-medium">/100</span></p>
              <p className="text-sm font-bold text-emerald-600 mt-1">LULUS</p>
            </div>
          </div>
          <div className="w-full flex justify-between border-t pt-4">
            <div className="text-center w-1/2 border-r">
              <p className="text-xs text-gray-400 uppercase font-semibold">Rank</p>
              <p className="text-lg font-bold text-gray-800">4<span className="text-sm font-normal text-gray-500">/32</span></p>
            </div>
            <div className="text-center w-1/2">
              <p className="text-xs text-gray-400 uppercase font-semibold">Duration</p>
              <p className="text-lg font-bold text-gray-800">82<span className="text-sm font-normal text-gray-500">m</span></p>
            </div>
          </div>
        </div>

        {/* Card Topic Performance (TP/ATP) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">Topic Performance</h3>
            <span className="text-xs text-gray-500">3 Topics Analyzed</span>
          </div>

          <div className="space-y-6">
            {/* Topic 1 */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold text-blue-900">Aljabar (Persamaan Linear)</span>
                <span className="font-bold text-gray-700">92%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                <div className="bg-emerald-400 h-2.5 rounded-full" style={{ width: '92%' }}></div>
              </div>
              <p className="text-xs text-gray-500">Penguasaan yang sangat baik dalam fungsi dan persamaan linier.</p>
            </div>
            
            {/* Topic 2 */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold text-blue-900">Geometri (Bangun Ruang)</span>
                <span className="font-bold text-gray-700">78%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                <div className="bg-orange-400 h-2.5 rounded-full" style={{ width: '78%' }}></div>
              </div>
              <p className="text-xs text-gray-500">Pemahaman yang baik, namun perlu teliti pada rumus volume.</p>
            </div>

            {/* Topic 3 */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-bold text-blue-900">Statistika (Data & Probabilitas)</span>
                <span className="font-bold text-gray-700">85%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                <div className="bg-blue-800 h-2.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <p className="text-xs text-gray-500">Konsisten dalam interpretasi data.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Feedback Banner */}
      <div className="bg-blue-950 rounded-2xl p-6 flex items-start gap-6 shadow-lg mb-6 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-9xl text-white/5 font-black">99</div>
        <img src="https://ui-avatars.com/api/?name=Ibu+Aminah&background=random" alt="Teacher" className="w-16 h-16 rounded-full border-2 border-white/20 z-10" />
        <div className="flex-1 z-10">
          <p className="text-blue-200 text-sm font-semibold mb-2 uppercase tracking-wider">Feedback Pengajar</p>
          <p className="italic text-lg text-blue-50 leading-relaxed mb-4">
            "Budi menunjukkan pemahaman yang sangat kuat di bidang Aljabar. Ia sangat teliti dalam pengerjaan soal persamaan linear. Untuk kedepannya, fokuskan sedikit lebih banyak waktu pada latihan soal Statistik terutama dalam penentuan median dan modus. Kerja bagus!"
          </p>
          <p className="font-bold">Ibu Siti Aminah, M.Pd. <span className="text-blue-300 font-normal text-sm">• Guru Matematika</span></p>
        </div>
        <button className="z-10 px-4 py-2 bg-blue-100 text-blue-900 font-bold rounded-lg hover:bg-white transition mt-4 md:mt-0">
          Hubungi Pengajar
        </button>
      </div>

    </div>
  );
};

export default DetailSiswa;