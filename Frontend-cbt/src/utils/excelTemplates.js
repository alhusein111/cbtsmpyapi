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