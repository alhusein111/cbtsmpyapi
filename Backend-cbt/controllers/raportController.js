const db = require('../config/db');

// ==========================================
// 🖨️ GET DATA CETAK RAPORT (PSTS, PSAS, PSAT, PSAJ)
// ==========================================
const getCetakRaport = async (req, res) => {
    // Tambahan parameter: tanggal_pembagian (diisi dari frontend)
    const { siswa_id, class_id, academic_year_id, tipe_ujian, tanggal_pembagian } = req.query;

    try {
        // 1. Ambil Data Header (Siswa, Kelas, Tahun Ajaran)
        const [studentData] = await db.query(`
            SELECT 
                s.nama AS nama_siswa, s.nis, s.nisn, 
                c.nama_kelas, c.tingkat AS grade_level, 
                ay.tahun_pelajaran AS tahun_ajaran, ay.semester
            FROM users_siswa s
            JOIN classes c ON s.class_id = c.id
            JOIN academic_years ay ON ay.id = ?
            WHERE s.id = ?
        `, [academic_year_id, siswa_id]);

        if (studentData.length === 0) {
            return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan' });
        }

        const student = studentData[0];
        const fase = "D"; // Asumsi SMP = Fase D

        // 2. Ambil Setting KKM 
        const [kkmData] = await db.query(
            'SELECT kkm_value FROM kkm_settings WHERE grade_level = ? AND academic_year_id = ?',
            [student.grade_level, academic_year_id]
        );
        const kkm = kkmData.length > 0 ? kkmData[0].kkm_value : 70;

        // 3. Ambil Data Wali Kelas
        const [homeroomTeacher] = await db.query(`
            SELECT t.nama_lengkap AS nama_wali, t.nuptk AS nip 
            FROM homeroom_teachers ht
            JOIN users_staff t ON ht.teacher_id = t.id
            WHERE ht.class_id = ? AND ht.academic_year_id = ?
        `, [class_id, academic_year_id]);
        
        const waliKelas = homeroomTeacher.length > 0 ? homeroomTeacher[0] : { nama_wali: "Belum diset", nip: "-" };

        // 4. Ambil Data Kepala Sekolah 
        const [kepsekData] = await db.query(`
            SELECT nama_lengkap AS nama_kepsek, nuptk AS nip_kepsek 
            FROM users_staff 
            WHERE role = 'kepala_sekolah'
            LIMIT 1
        `);
        const kepsek = kepsekData.length > 0 ? kepsekData[0] : { nama_kepsek: "Belum diset", nip_kepsek: "-" };

        // 5. Ambil Nilai Raport 
        const [grades] = await db.query(`
            SELECT 
                sub.nama_mapel, 
                g.nilai_raport, 
                g.nilai_keterampilan,
                g.deskripsi_pengetahuan,
                g.deskripsi_keterampilan
            FROM student_grades g
            JOIN subjects sub ON g.subject_id = sub.id
            WHERE g.siswa_id = ? AND g.academic_year_id = ?
        `, [siswa_id, academic_year_id]);

        let totalNilai = 0;
        const nilaiProcessed = grades.map((g, index) => {
            const mapelData = {
                no: index + 1,
                mapel: g.nama_mapel,
                nilai: g.nilai_raport || 0,
                nilai_keterampilan: g.nilai_keterampilan || 0 
            };
            
            totalNilai += mapelData.nilai;

            if (tipe_ujian === 'PSTS') {
                mapelData.keterangan = mapelData.nilai >= kkm ? 'Tuntas' : 'Tidak Tuntas';
            } else {
                mapelData.capaian_kompetensi = g.deskripsi_pengetahuan || '-';
                mapelData.deskripsi_keterampilan = g.deskripsi_keterampilan || '-'; 
            }
            return mapelData;
        });
        
        const rataRata = grades.length > 0 ? (totalNilai / grades.length).toFixed(2) : 0;

        // ✨ [BARU] 5b. Ambil Ranking Sekelas
        const [semuaNilaiKelas] = await db.query(`
            SELECT siswa_id, AVG(nilai_raport) as rata_rata 
            FROM student_grades 
            WHERE class_id = ? AND academic_year_id = ? 
            GROUP BY siswa_id 
            ORDER BY rata_rata DESC
        `, [class_id, academic_year_id]);

        // Cari urutan siswa ini di dalam array yang sudah diurutkan berdasarkan nilai terbesar
        const rankIndex = semuaNilaiKelas.findIndex(row => Number(row.siswa_id) === Number(siswa_id));
        const rankingSiswa = rankIndex !== -1 ? rankIndex + 1 : '-';

        // ✨ [UPDATE] 6. Ambil Absensi & Catatan Wali & Keputusan (Naik/Lulus)
        const [homeroom] = await db.query(
            'SELECT sakit, izin, alpa, catatan_wali_kelas, status_keputusan, deskripsi_keputusan FROM homeroom_records WHERE siswa_id = ? AND academic_year_id = ?',
            [siswa_id, academic_year_id]
        );
        const absensi = homeroom.length > 0 ? homeroom[0] : { sakit: 0, izin: 0, alpa: 0, catatan_wali_kelas: '', status_keputusan: null, deskripsi_keputusan: null };

        // 7. Ambil Ekstrakurikuler
        const [ekskul] = await db.query(`
            SELECT e.nama_ekskul, se.predikat, se.keterangan
            FROM student_extracurriculars se
            JOIN homeroom_records h ON se.homeroom_record_id = h.id
            JOIN extracurriculars e ON se.extracurricular_id = e.id
            WHERE h.siswa_id = ? AND h.academic_year_id = ?
        `, [siswa_id, academic_year_id]);

        // ✨ [BARU] 7b. Ambil Prestasi Siswa
        const [prestasi] = await db.query(`
            SELECT jenis_prestasi, keterangan
            FROM student_achievements
            WHERE siswa_id = ? AND academic_year_id = ?
        `, [siswa_id, academic_year_id]);

        // 8. Generate Header Teks Tipe Ujian
        let teks_tipe_ujian = '';
        if (tipe_ujian === 'PSTS') teks_tipe_ujian = 'PENILAIAN SUMATIF TENGAH SEMESTER (PSTS)';
        else if (tipe_ujian === 'PSAS') teks_tipe_ujian = 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)';
        else if (tipe_ujian === 'PSAT') teks_tipe_ujian = 'PENILAIAN SUMATIF AKHIR TAHUN (PSAT)';
        else if (tipe_ujian === 'PSAJ') teks_tipe_ujian = 'PENILAIAN SUMATIF AKHIR JENJANG (PSAJ)';

        // ✨ [UPDATE] 9. LOGIKA BLOK KEPUTUSAN 
        let blok_keputusan = null; 
        if (tipe_ujian === 'PSAT' && (student.grade_level === '7' || student.grade_level === '8')) {
            const kelasSelanjutnya = parseInt(student.grade_level) + 1;
            blok_keputusan = {
                tampil: true,
                tipe: 'kenaikan_kelas',
                pesan: 'Berdasarkan pencapaian kompetensi pada semester ke-1 dan ke-2, Siswa ditetapkan *)',
                status_db: absensi.status_keputusan,       // Ambil dari DB ('Naik' / 'Tidak Naik')
                deskripsi_db: absensi.deskripsi_keputusan, // Ambil dari DB ('Naik ke kelas 8')
                opsi_1: `Naik ke kelas ${kelasSelanjutnya}`,
                opsi_2: `Tidak Naik Tinggal Di Kelas ${student.grade_level}`,
                footnote: '*) Coret yang tidak perlu.'
            };
        } else if (tipe_ujian === 'PSAJ' && student.grade_level === '9') {
            blok_keputusan = {
                tampil: true,
                tipe: 'kelulusan',
                pesan: `Berdasarkan kriteria kelulusan pada kurikulum sekolah tahun pelajaran ${student.tahun_ajaran} siswa ditetapkan *)`,
                status_db: absensi.status_keputusan,
                deskripsi_db: absensi.deskripsi_keputusan,
                opsi_1: 'Tuntas',
                opsi_2: 'Tidak Tuntas',
                footnote: '*) Coret yang tidak perlu.'
            };
        }

        // 10. Generate String dinamis
        const nisn_text = student.nisn ? student.nisn : '-';
        const string_nis_nisn = `${student.nis} / ${nisn_text}`;
        const string_tipe_ujian_footer = tipe_ujian === 'PSTS' ? 'PSTS' : (tipe_ujian + ' ' + student.tahun_ajaran.split('/')[0]); 
        
        // Footnote 
        const footnote = `${student.nis} | ${student.nama_siswa} | ${student.nama_kelas} | ${string_tipe_ujian_footer} | ${student.semester === '1' ? '1 (Satu)' : '2 (Dua)'}`;

        // Titimangsa Pembagian Raport
        let tgl_cetak_final = '';

        if (tanggal_pembagian) {
            tgl_cetak_final = tanggal_pembagian;
        } else {
            const [dbDate] = await db.query(`
                SELECT tanggal_pembagian 
                FROM report_distribution_dates 
                WHERE academic_year_id = ? AND semester = ? AND tipe_ujian = ?
            `, [academic_year_id, student.semester, tipe_ujian]);

            if (dbDate.length > 0) {
                const dateObj = new Date(dbDate[0].tanggal_pembagian);
                tgl_cetak_final = dateObj.toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                });
            } else {
                tgl_cetak_final = new Date().toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                });
            }
        }

        const titimangsa_teks = `Lebakbiru, ${tgl_cetak_final}`;

        // ✨ [UPDATE] 11. Racik JSON Final
        const responseData = {
            header: {
                nama_siswa: student.nama_siswa,
                nis_nisn: string_nis_nisn,
                nama_sekolah: "SMP YAPI AL-HUSAENI",
                alamat: "KP. LEBAKBIRU",
                kelas: student.nama_kelas,
                fase: fase,
                semester: student.semester === '1' ? '1 (Satu)' : '2 (Dua) / Genap',
                tahun_ajaran: student.tahun_ajaran,
                tipe_ujian: teks_tipe_ujian
            },
            body: {
                kkm: kkm,
                nilai_mapel: nilaiProcessed,
                rata_rata: Number(rataRata),
                ranking: rankingSiswa, // <-- Tambahan Ranking
                absensi: {
                    sakit: absensi.sakit,
                    izin: absensi.izin,
                    alpa: absensi.alpa
                },
                ekskul: ekskul.map((e, i) => ({ no: i + 1, ...e })),
                prestasi: prestasi.map((p, i) => ({ no: i + 1, ...p })), // <-- Tambahan Prestasi
                catatan_wali: absensi.catatan_wali_kelas,
                blok_keputusan: blok_keputusan 
            },
            tanda_tangan: {
                titimangsa: titimangsa_teks,
                orang_tua: "", 
                kepala_sekolah: kepsek.nama_kepsek,
                nip_kepala_sekolah: kepsek.nip_kepsek,
                wali_kelas: waliKelas.nama_wali,
                nip_wali_kelas: waliKelas.nip
            },
            footer: {
                footnote: footnote
            }
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Error Cetak Raport:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// ==========================================
// 📊 GET CEK KELENGKAPAN NILAI KELAS
// ==========================================
const cekKelengkapanNilai = async (req, res) => {
    const { class_id, academic_year_id } = req.query;

    try {
        // 1. Ambil total mapel wajib (asumsi ambil dari tabel subjects)
        const [totalMapelData] = await db.query('SELECT COUNT(id) AS total FROM subjects');
        const totalMapel = totalMapelData[0].total || 0;

        // 2. Ambil data siswa dan hitung berapa nilai yang sudah diinput untuk mereka
        const [rekapSiswa] = await db.query(`
            SELECT 
                s.id AS siswa_id, 
                s.nama AS nama_siswa,
                COUNT(g.subject_id) AS mapel_terisi
            FROM users_siswa s
            LEFT JOIN student_grades g ON s.id = g.siswa_id AND g.academic_year_id = ?
            WHERE s.class_id = ?
            GROUP BY s.id
            ORDER BY s.nama ASC
        `, [academic_year_id, class_id]);

        // 3. Racik data balikan
        const hasilRekap = rekapSiswa.map(siswa => {
            const persentase = totalMapel === 0 ? 0 : Math.round((siswa.mapel_terisi / totalMapel) * 100);
            return {
                siswa_id: siswa.siswa_id,
                nama_siswa: siswa.nama_siswa,
                mapel_terisi: siswa.mapel_terisi,
                total_mapel: totalMapel,
                status: siswa.mapel_terisi >= totalMapel ? 'Lengkap' : 'Belum Lengkap',
                persentase_selesai: persentase
            };
        });

        // 4. Cek apakah sekelas sudah beres semua?
        const sekelasSelesai = hasilRekap.every(s => s.status === 'Lengkap');

        res.json({
            success: true,
            sekelas_siap_cetak: sekelasSelesai,
            data: hasilRekap
        });

    } catch (error) {
        console.error('Error Cek Kelengkapan:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// 🖨️ GET CETAK RAPORT SEKELAS (BATCH)
// ==========================================
const getCetakRaportSekelas = async (req, res) => {
    const { class_id, academic_year_id, tipe_ujian, tanggal_pembagian } = req.query;

    try {
        // 1. Ambil daftar ID siswa di kelas tersebut
        const [siswaDiKelas] = await db.query(
            'SELECT id FROM users_siswa WHERE class_id = ? ORDER BY nama ASC', 
            [class_id]
        );

        if (siswaDiKelas.length === 0) {
            return res.status(404).json({ success: false, message: 'Tidak ada siswa di kelas ini' });
        }

        // 2. Trik Jitu: Kita ambil URL aslinya dan panggil ulang API single cetak
        // Menggunakan axios atau fetch internal itu beresiko lemot jika siswanya 40 orang.
        // Solusi terbaik untuk frontend adalah: Frontend mendapatkan array ID siswa ini, 
        // lalu frontend yang melooping cetak PDF-nya. Ini mencegah server Backend Mas Brow jebol/timeout.

        const daftarIdSiswa = siswaDiKelas.map(s => s.id);

        res.json({
            success: true,
            message: 'Berhasil mengambil daftar siswa untuk cetak sekelas',
            total_siswa: daftarIdSiswa.length,
            data_id_siswa: daftarIdSiswa,
            // Kasih instruksi ke frontend URL mana yang harus di loop
            contoh_url_looping: `/api/raport/cetak?siswa_id={id_dari_array}&class_id=${class_id}&academic_year_id=${academic_year_id}&tipe_ujian=${tipe_ujian}&tanggal_pembagian=${tanggal_pembagian || ''}`
        });

    } catch (error) {
        console.error('Error Cetak Sekelas:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCetakRaport, cekKelengkapanNilai, getCetakRaportSekelas
};