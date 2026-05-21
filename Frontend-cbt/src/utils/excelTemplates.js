// File: src/utils/excelTemplates.js
import * as XLSX from 'xlsx';

// 1. Fungsi Template Siswa
export const downloadTemplateSiswa = () => {
    const data = [
        { 
          'NIS': '1001', 
          'NISN': '00112233', 
          'No Peserta': '01-001', 
          'Nama Siswa': 'Andi Noya', 
          'Kelas': '7A', 
          'is_locked (0=Aktif, 1=Terkunci)': 0 
        },
        { 
          'NIS': '1002', 
          'NISN': '00112244', 
          'No Peserta': '01-002', 
          'Nama Siswa': 'Budi Sudarsono', 
          'Kelas': '7A', 
          'is_locked (0=Aktif, 1=Terkunci)': 1 
        }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Siswa");
    XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
};

// 2. Fungsi Template Guru/Staff
export const downloadTemplateStaff = () => {
    const data = [
        { 'Username': 'guru_andi', 'Password': 'password123', 'NUPTK': '1999200', 'Nama Lengkap': 'Andi S.Pd', 'Role': 'guru' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Staff");
    XLSX.writeFile(wb, "Template_Import_Staff.xlsx");
};

// 3. Fungsi Template Soal (Berdasarkan Mapel)
export const downloadTemplateSoal = (namaMapel) => {
    const data = [
        { 
            'Mata Pelajaran': namaMapel, 
            'Tipe Soal': 'PG', 
            'Teks Soal': 'Siapa penemu listrik?', 
            'Bobot': 2, 
            'Gambar Soal': '', 
            'Opsi A': 'Tesla', 'Gambar Opsi A': '', 'Opsi B': 'Edison', 'Gambar Opsi B': '', 'Opsi C': 'Newton', 'Gambar Opsi C': '', 'Opsi D': 'Einstein', 'Gambar Opsi D': '', 
            'Kunci Jawaban': 'B', 
            'Kunci Menjodohkan': '' 
        },
        { 
            'Mata Pelajaran': namaMapel, 
            'Tipe Soal': 'BS', 
            'Teks Soal': 'Bumi itu bulat', 
            'Bobot': 1, 
            'Gambar Soal': '', 
            'Opsi A': 'Benar', 'Gambar Opsi A': '', 'Opsi B': 'Salah', 'Gambar Opsi B': '', 'Opsi C': '', 'Gambar Opsi C': '', 'Opsi D': '', 'Gambar Opsi D': '', 
            'Kunci Jawaban': 'A', 
            'Kunci Menjodohkan': '' 
        },
        { 
            'Mata Pelajaran': namaMapel, 
            'Tipe Soal': 'MJ', 
            'Teks Soal': 'Cocokkan hewan dengan jenisnya!', 
            'Bobot': 4, 
            'Gambar Soal': '', 
            'Opsi A': '', 'Gambar Opsi A': '', 'Opsi B': '', 'Gambar Opsi B': '', 'Opsi C': '', 'Gambar Opsi C': '', 'Opsi D': '', 'Gambar Opsi D': '', 
            'Kunci Jawaban': '', 
            'Kunci Menjodohkan': 'Sapi:Mamalia|Hiu:Ikan|Elang:Burung|Kucing:Mamalia' 
        }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Soal");
    XLSX.writeFile(wb, `Template_Soal_${namaMapel.replace(/\s+/g, '_')}.xlsx`); 
};


// 🔥 FILTER & MAPPING PINTAR UNTUK EXPORT SOAL BACKUP

export const exportSoalKeExcel = (namaMapel, listSoal) => {
    
    // 1. Fungsi Helper untuk membersihkan tag HTML
    const cleanHtmlText = (htmlString) => {
        if (!htmlString) return '';
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            return (doc.body.textContent || "").trim();
        } catch (e) {
            return htmlString.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
        }
    };

    // 2. Mapping data sesuai respon Array dari Backend
    const data = listSoal.map(q => {
        const tipe = String(q.tipe_soal || 'PG').toUpperCase();
        
        // Siapkan variabel kosong
        let opsiA = '', opsiB = '', opsiC = '', opsiD = '';
        let imgA = '', imgB = '', imgC = '', imgD = '';
        let kunciJawaban = '';
        let kunciMJ = '';

        // 🔥 LOGIKA UNTUK PG & BS (Mengekstrak dari array q.options)
        if ((tipe === 'PG' || tipe === 'BS') && Array.isArray(q.options)) {
            const abjad = ['A', 'B', 'C', 'D'];
            
            q.options.forEach((opt, index) => {
                const teksBersih = cleanHtmlText(opt.teks_opsi);
                const gambarOpsi = opt.gambar_opsi || '';

                if (index === 0) { opsiA = teksBersih; imgA = gambarOpsi; }
                else if (index === 1) { opsiB = teksBersih; imgB = gambarOpsi; }
                else if (index === 2) { opsiC = teksBersih; imgC = gambarOpsi; }
                else if (index === 3) { opsiD = teksBersih; imgD = gambarOpsi; }
                
                // Cari Kunci Jawaban (Mencari opsi yang is_correct nya 1)
                if (opt.is_correct === 1 || opt.is_correct === true || String(opt.is_correct) === '1') {
                    kunciJawaban = abjad[index]; // Akan menghasilkan A, B, C, atau D
                }
            });
        }

        // 🔥 LOGIKA UNTUK MJ (Mengekstrak dari array q.matchings)
        if (tipe === 'MJ' && Array.isArray(q.matchings)) {
            kunciMJ = q.matchings.map(m => {
                const kiri = cleanHtmlText(m.kunci_kiri);
                const kanan = cleanHtmlText(m.kunci_kanan);
                return `${kiri}:${kanan}`;
            }).join('|');
        }

        return {
            'Mata Pelajaran': namaMapel, 
            'Tipe Soal': tipe, 
            'Teks Soal': cleanHtmlText(q.teks_soal), 
            'Bobot': q.bobot || 1, 
            'Gambar Soal': q.gambar_soal || '', 
            'Opsi A': opsiA, 
            'Gambar Opsi A': imgA, 
            'Opsi B': opsiB, 
            'Gambar Opsi B': imgB, 
            'Opsi C': opsiC, 
            'Gambar Opsi C': imgC, 
            'Opsi D': opsiD, 
            'Gambar Opsi D': imgD, 
            'Kunci Jawaban': kunciJawaban, 
            'Kunci Menjodohkan': kunciMJ
        };
    });

    // 3. Proses generate berkas Excel
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Soal"); 
    
    const cleanMapelName = String(namaMapel).replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Backup_Soal_${cleanMapelName}.xlsx`);
};