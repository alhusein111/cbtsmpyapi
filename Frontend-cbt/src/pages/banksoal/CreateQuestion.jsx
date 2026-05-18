import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, Image as ImageIcon, Plus, CheckCircle2, ArrowLeft, Trash2, Link } from 'lucide-react';
import api from '../../api/axiosConfig';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // 🔥 Import SweetAlert2 di sini

const CreateQuestion = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  // --- STATE BARU UNTUK MENYIMPAN INFO MAPEL ---
  const [realSubjectId, setRealSubjectId] = useState('');
  const [namaMapel, setNamaMapel] = useState('');

  // --- STATE SOAL ---
  const [teksSoal, setTeksSoal] = useState('');
  const [tipeSoal, setTipeSoal] = useState('PG'); 
  const [score, setScore] = useState(10);
  
  const [options, setOptions] = useState([
    { id: 'A', teks_opsi: '', is_correct: false, file_gambar: null, preview_gambar: null },
    { id: 'B', teks_opsi: '', is_correct: false, file_gambar: null, preview_gambar: null },
    { id: 'C', teks_opsi: '', is_correct: false, file_gambar: null, preview_gambar: null },
    { id: 'D', teks_opsi: '', is_correct: false, file_gambar: null, preview_gambar: null },
  ]);

  const [matchings, setMatchings] = useState([
    { id: 1, kunci_kiri: '', kunci_kanan: '' },
    { id: 2, kunci_kiri: '', kunci_kanan: '' },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  // --- EFFECT ---
  // Fetch info mapel yang asli berdasarkan examId
  useEffect(() => {
    const fetchExamInfo = async () => {
      try {
        const response = await api.get(`/api/exams/${examId}`);
        if (response.data.success) {
            setRealSubjectId(response.data.data.subject_id);
            setNamaMapel(response.data.data.nama_mapel);
        }
      } catch (error) {
        console.error('Gagal mengambil info ujian:', error);
      }
    };
    if (examId) fetchExamInfo();
  }, [examId]);

  useEffect(() => {
    if (tipeSoal === 'BS') {
      setOptions([
        { id: 'A', teks_opsi: 'Benar', is_correct: false, file_gambar: null, preview_gambar: null },
        { id: 'B', teks_opsi: 'Salah', is_correct: false, file_gambar: null, preview_gambar: null },
      ]);
    } else if (tipeSoal === 'PG') {
      setOptions([
        { id: 'A', teks_opsi: '', is_correct: false, file_gambar: null, preview_gambar: null },
        { id: 'B', teks_opsi: '', is_correct: false, file_gambar: null, preview_gambar: null },
        { id: 'C', teks_opsi: '', is_correct: false, file_gambar: null, preview_gambar: null },
        { id: 'D', teks_opsi: '', is_correct: false, file_gambar: null, preview_gambar: null },
      ]);
    }
  }, [tipeSoal]);

  // --- HANDLERS ---
  const handleAddOption = () => {
    const nextId = String.fromCharCode(65 + options.length); 
    setOptions([...options, { id: nextId, teks_opsi: '', is_correct: false, file_gambar: null, preview_gambar: null }]);
  };

  const handleOptionChange = (index, val) => {
    const newOptions = [...options];
    newOptions[index].teks_opsi = val;
    setOptions(newOptions);
  };

  const handleOptionImageChange = (index, file) => {
    if (file) {
      const newOptions = [...options];
      newOptions[index].file_gambar = file;
      newOptions[index].preview_gambar = URL.createObjectURL(file);
      setOptions(newOptions);
    }
  };

  const removeOptionImage = (index) => {
    const newOptions = [...options];
    newOptions[index].file_gambar = null;
    newOptions[index].preview_gambar = null;
    setOptions(newOptions);
  };

  const setCorrectOption = (index) => {
    const newOptions = options.map((opt, i) => ({
      ...opt,
      is_correct: i === index
    }));
    setOptions(newOptions);
  };

  const handleAddMatching = () => {
    const nextId = matchings.length > 0 ? Math.max(...matchings.map(m => m.id)) + 1 : 1;
    setMatchings([...matchings, { id: nextId, kunci_kiri: '', kunci_kanan: '' }]);
  };

  const updateMatching = (index, field, value) => {
    const newMatchings = [...matchings];
    newMatchings[index][field] = value;
    setMatchings(newMatchings);
  };

  const removeMatching = (id) => {
    setMatchings(matchings.filter(m => m.id !== id));
  };

  // --- SAVE DATA ---
  const handleSave = async () => {
    if (!realSubjectId) {
        Swal.fire('Mohon Tunggu', 'Menunggu data Mata Pelajaran... Silakan coba lagi dalam beberapa detik.', 'warning');
        return;
    }

    if (!teksSoal.trim() || teksSoal === '<p><br></p>') {
        Swal.fire('Peringatan', 'Teks soal tidak boleh kosong!', 'warning');
        return;
    }

    if (tipeSoal === 'PG' || tipeSoal === 'BS') {
        const hasCorrectAnswer = options.some(opt => opt.is_correct);
        if (!hasCorrectAnswer) {
            Swal.fire('Peringatan', 'Pilih minimal satu jawaban benar!', 'warning');
            return;
        }
    }

    if (tipeSoal === 'MJ') {
        const isValid = matchings.every(m => m.kunci_kiri.trim() && m.kunci_kanan.trim());
        if (!isValid) {
            Swal.fire('Peringatan', 'Semua pasangan kunci kiri dan kanan harus diisi!', 'warning');
            return;
        }
    }

    try {
      setIsSaving(true);
      
      const formData = new FormData();
      formData.append('subject_id', realSubjectId); 
      formData.append('tipe_soal', tipeSoal);
      formData.append('teks_soal', teksSoal);
      formData.append('bobot', score);
      
      if (tipeSoal === 'PG' || tipeSoal === 'BS') {
        const formattedOptions = options.map(opt => ({
          teks_opsi: opt.teks_opsi,
          is_correct: opt.is_correct ? 1 : 0
        }));
        formData.append('opsi_jawaban', JSON.stringify(formattedOptions));

        options.forEach((opt, index) => {
            if (opt.file_gambar) {
                formData.append(`gambar_opsi_${index}`, opt.file_gambar);
            }
        });
      } 
      else if (tipeSoal === 'MJ') {
        formData.append('matchings', JSON.stringify(matchings));
      }

      await api.post('/api/questions/tambah', formData);
      
      // 🔥 Menggunakan await agar halaman tidak pindah sebelum user klik OK
      await Swal.fire('Berhasil!', 'Mantap! Soal berhasil disimpan.', 'success');
      navigate(`/exams/${examId}/questions`); 
      
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal!', 'Gagal simpan soal: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['image', 'formula'], 
    ],
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-800 flex flex-col min-w-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xs text-slate-400 mb-1">Manajemen Ujian &gt; Bank Soal &gt; <span className="text-indigo-600 font-medium">Create Question</span></p>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/exams/${examId}/questions`)} className="p-1.5 hover:bg-slate-200 rounded-md transition text-slate-500">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">
                Buat Soal CBT {namaMapel ? `- ${namaMapel}` : ''}
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/exams/${examId}/questions`)} className="px-4 py-2 border border-slate-300 bg-white text-slate-600 rounded-md hover:bg-slate-50 transition">
            Batal
          </button>
          <button onClick={handleSave} disabled={isSaving} className={`px-4 py-2 text-white rounded-md flex items-center gap-2 transition ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-800'}`}>
            <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Soal'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-w-0">
        {/* LEFT COLUMN: Main Editor */}
        <div className="md:col-span-8 flex flex-col gap-6 min-w-0">
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
            <h3 className="font-semibold text-lg text-slate-800 mb-4">Teks Soal</h3>
            <div className="h-64 mb-4">
                <ReactQuill theme="snow" value={teksSoal} onChange={setTeksSoal} modules={modules} className="h-48" placeholder="Ketik pertanyaan di sini..." />
            </div>
          </div>

          {/* === EDITOR PG & BS === */}
          {(tipeSoal === 'PG' || tipeSoal === 'BS') && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg text-slate-800">Opsi Jawaban</h3>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full uppercase">
                    {tipeSoal === 'PG' ? 'Pilihan Ganda' : 'Benar / Salah'}
                </span>
              </div>
              
              <div className="space-y-4">
                {options.map((opt, index) => (
                  <div key={opt.id} className={`flex flex-col gap-2 p-3 border rounded-lg transition ${opt.is_correct ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                    
                    <div className="flex items-center gap-4 min-w-0">
                      <button 
                        onClick={() => setCorrectOption(index)}
                        className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-sm transition ${opt.is_correct ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {opt.is_correct ? <CheckCircle2 size={16} /> : opt.id}
                      </button>
                      <input 
                        type="text" 
                        value={opt.teks_opsi}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Ketik teks opsi ${opt.id}...`}
                        readOnly={tipeSoal === 'BS'} 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 outline-none w-full disabled:opacity-50 min-w-0"
                      />
                      
                      {/* Upload Gambar Opsi */}
                      <label className="cursor-pointer text-slate-400 hover:text-indigo-600 transition p-1 shrink-0">
                        <ImageIcon size={20} />
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleOptionImageChange(index, e.target.files[0])}
                        />
                      </label>
                    </div>

                    {/* Preview Gambar Jika Ada */}
                    {opt.preview_gambar && (
                        <div className="ml-12 relative w-fit">
                            <img src={opt.preview_gambar} alt={`Preview ${opt.id}`} className="h-24 object-contain rounded-md border border-slate-200" />
                            <button 
                                onClick={() => removeOptionImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
                  </div>
                ))}
                
                {tipeSoal === 'PG' && (
                    <button onClick={handleAddOption} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition">
                    <Plus size={18} /> Tambah Opsi ({String.fromCharCode(65 + options.length)})
                    </button>
                )}
              </div>
            </div>
          )}

          {/* === EDITOR MENJODOHKAN (MJ) === */}
          {tipeSoal === 'MJ' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg text-slate-800">Pasangan Jawaban (Menjodohkan)</h3>
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full uppercase">Menjodohkan</span>
                </div>

                <div className="space-y-3">
                    <div className="flex gap-4 mb-2 text-sm font-semibold text-slate-600">
                        <div className="flex-1">Kunci Kiri (Soal)</div>
                        <div className="flex-1">Kunci Kanan (Jawaban)</div>
                        <div className="w-10"></div>
                    </div>
                    {matchings.map((match, index) => (
                        <div key={match.id} className="flex items-center gap-4 min-w-0">
                            <input 
                                type="text" 
                                value={match.kunci_kiri} 
                                onChange={(e) => updateMatching(index, 'kunci_kiri', e.target.value)}
                                placeholder="Cth: Ibu Kota Indonesia" 
                                className="flex-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 min-w-0"
                            />
                            <Link size={16} className="text-slate-300 shrink-0" />
                            <input 
                                type="text" 
                                value={match.kunci_kanan} 
                                onChange={(e) => updateMatching(index, 'kunci_kanan', e.target.value)}
                                placeholder="Cth: Jakarta" 
                                className="flex-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 min-w-0"
                            />
                            <button onClick={() => removeMatching(match.id)} className="w-10 h-10 flex shrink-0 items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    <button onClick={handleAddMatching} className="w-full mt-2 py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-50 transition">
                        <Plus size={18} /> Tambah Pasangan
                    </button>
                </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Settings & Preview */}
        <div className="md:col-span-4 flex flex-col gap-6 min-w-0">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-800">
                <span className="text-indigo-600">⚙</span> Pengaturan Soal
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Tipe Soal</label>
                <select value={tipeSoal} onChange={(e) => setTipeSoal(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition">
                  <option value="PG">Pilihan Ganda (PG)</option>
                  <option value="BS">Benar / Salah (BS)</option>
                  <option value="MJ">Menjodohkan (MJ)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Bobot Nilai</label>
                <input type="number" value={score} min="1" onChange={(e) => setScore(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition" />
              </div>
            </div>
          </div>

          {/* Student Preview */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 w-full min-w-0 overflow-hidden">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-800">
                <span className="text-slate-400">👁</span> Pratinjau Siswa
            </h3>
            
            <div className="p-4 border border-slate-100 rounded-lg bg-slate-50 min-h-50 w-full overflow-hidden flex flex-col flex-1 min-w-0">
              
              <div 
                className="text-sm text-slate-700 mb-4 w-full min-w-0 overflow-hidden wrap-break-word **:whitespace-normal! **:wrap-break-word! **:[word-break:break-word]! [&_img]:max-w-full! [&_img]:h-auto! [&_table]:w-full! [&_table]:block! [&_table]:overflow-x-auto!" 
                style={{ 
                  wordWrap: 'break-word', 
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal' 
                }}
                dangerouslySetInnerHTML={{ __html: teksSoal || '<p class="text-slate-400 italic">Preview soal akan muncul di sini...</p>' }} 
              />
              
              {(tipeSoal === 'PG' || tipeSoal === 'BS') && (
                <div className="space-y-2 mt-4 w-full min-w-0">
                  {options.map((opt) => (
                    <div key={opt.id} className="flex flex-col gap-2 p-2 bg-white border border-slate-100 rounded-md shadow-sm w-full overflow-hidden min-w-0">
                      <div className="flex items-start gap-3 w-full min-w-0">
                        <div className="w-6 h-6 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[10px] text-slate-500 font-medium">
                          {opt.id}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-600 pt-1 w-full wrap-break-word whitespace-pre-wrap">
                            {opt.teks_opsi || '...'}
                          </p>
                        </div>
                      </div>
                      {opt.preview_gambar && (
                        <img src={opt.preview_gambar} alt="Preview" className="h-16 w-16 ml-9 object-cover rounded border border-slate-200" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tipeSoal === 'MJ' && (
                  <div className="flex gap-4 mt-4 text-xs text-slate-600 w-full min-w-0">
                    <div className="flex-1 min-w-0 space-y-2 border-r border-slate-200 pr-2">
                        {matchings.map(m => <div key={'l-'+m.id} className="p-2 bg-white rounded border border-slate-200 w-full wrap-break-word whitespace-pre-wrap">{m.kunci_kiri || '...'}</div>)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 pl-2">
                        {matchings.map(m => <div key={'r-'+m.id} className="p-2 bg-white rounded border border-slate-200 w-full wrap-break-word whitespace-pre-wrap">{m.kunci_kanan || '...'}</div>)}
                    </div>
                  </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreateQuestion;