const db = require('../config/db');
const xlsx = require('xlsx');

// [READ] Ambil semua data siswa beserta nama kelas (JOIN)
const getSiswa = async (req, res) => {
    try {
        const query = `
            SELECT s.id, s.nis, s.nisn, s.no_peserta, s.nama, s.class_id, c.nama_kelas, s.is_login, s.is_locked 
            FROM users_siswa s
            LEFT JOIN classes c ON s.class_id = c.id
            ORDER BY s.id DESC
        `;
        const [siswa] = await db.query(query);
        res.json({ success: true, data: siswa });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [CREATE] Tambah siswa baru
const createSiswa = async (req, res) => {
    try {
        const { nis, nisn, no_peserta, nama, class_id, is_locked } = req.body;
        const lockedStatus = is_locked !== undefined ? parseInt(is_locked) : 0; 

        await db.query(
            'INSERT INTO users_siswa (nis, nisn, no_peserta, nama, class_id, is_login, is_locked) VALUES (?, ?, ?, ?, ?, 0, ?)',
            [nis, nisn, no_peserta, nama, class_id, lockedStatus]
        );
        res.json({ success: true, message: 'Siswa berhasil ditambahkan!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [UPDATE] Edit data siswa
const updateSiswa = async (req, res) => {
    try {
        const { id } = req.params;
        const { nis, nisn, no_peserta, nama, class_id, is_locked } = req.body;
        const lockedStatus = is_locked !== undefined ? parseInt(is_locked) : 0;

        await db.query(
            'UPDATE users_siswa SET nis=?, nisn=?, no_peserta=?, nama=?, class_id=?, is_locked=? WHERE id=?',
            [nis, nisn, no_peserta, nama, class_id, lockedStatus, id]
        );
        res.json({ success: true, message: 'Data siswa berhasil diupdate!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [DELETE] Hapus data siswa
const deleteSiswa = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM users_siswa WHERE id=?', [id]);
        res.json({ success: true, message: 'Siswa berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [IMPORT] Import Siswa Massal via Excel
const importSiswaExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'File Excel tidak ditemukan!' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if (data.length === 0) return res.status(400).json({ success: false, message: 'Data kosong!' });

        const [kelasDb] = await db.query('SELECT id, nama_kelas FROM classes');
        const mapKelas = {};
        kelasDb.forEach(k => {
            mapKelas[k.nama_kelas.toUpperCase()] = k.id;
        });

        const values = [];
        for (const row of data) {
            const namaKelasExcel = row['Kelas'] || row.kelas;
            const class_id = mapKelas[namaKelasExcel?.toString().toUpperCase()];

            if (!class_id) {
                return res.status(400).json({ success: false, message: `Kelas '${namaKelasExcel}' tidak ditemukan di database!` });
            }

            const is_locked_excel = row['Status (0=Aktif, 1=Terkunci)'] !== undefined 
                                    ? parseInt(row['Status (0=Aktif, 1=Terkunci)']) 
                                    : 0;

            values.push([
                row['NIS'] || row.nis,
                row['NISN'] || row.nisn,
                row['No Peserta'] || row.no_peserta,
                row['Nama Siswa'] || row.nama,
                class_id,
                0, 
                is_locked_excel 
            ]);
        }

        const query = `
            INSERT INTO users_siswa (nis, nisn, no_peserta, nama, class_id, is_login, is_locked) 
            VALUES ?
            ON DUPLICATE KEY UPDATE 
            nama = VALUES(nama), no_peserta = VALUES(no_peserta), class_id = VALUES(class_id), is_locked = VALUES(is_locked)
        `;
        await db.query(query, [values]);

        res.json({ success: true, message: `${data.length} siswa berhasil diimport/diupdate!` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [UPGRADE] Pindah/Naik Kelas Massal (BARU)
const upgradeClass = async (req, res) => {
    try {
        const { studentIds, newClassId } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Pilih minimal satu siswa untuk dipindahkan!' });
        }
        if (!newClassId) {
            return res.status(400).json({ success: false, message: 'Pilih kelas tujuan terlebih dahulu!' });
        }

        // Buat placeholder (?) sebanyak jumlah siswa yang dipilih
        const placeholders = studentIds.map(() => '?').join(','); 
        const query = `UPDATE users_siswa SET class_id = ? WHERE id IN (${placeholders})`;
        const values = [newClassId, ...studentIds];

        const [result] = await db.query(query, values);

        res.json({ 
            success: true, 
            message: `${result.affectedRows} siswa berhasil dipindahkan ke kelas baru!` 
        });
    } catch (error) {
        console.error('Error saat update kelas siswa:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Export semua fungsi
module.exports = { 
    getSiswa, 
    createSiswa, 
    updateSiswa, 
    deleteSiswa, 
    importSiswaExcel,
    upgradeClass 
};