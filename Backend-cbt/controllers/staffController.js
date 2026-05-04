const db = require('../config/db');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');

// [READ] Ambil data staff
const getStaff = async (req, res) => {
    try {
        // Tambahkan nuptk di select
        const [staff] = await db.query('SELECT id, username, nuptk, nama_lengkap, role FROM users_staff');
        res.json({ success: true, data: staff });
    } catch (error) {
        // TANGKAP ERROR DUPLIKAT DARI MYSQL
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('username')) {
                return res.status(400).json({ success: false, message: 'Gagal: Username tersebut sudah digunakan. Silakan cari yang lain!' });
            }
            if (error.sqlMessage.includes('nuptk')) {
                return res.status(400).json({ success: false, message: 'Gagal: NUPTK / ID Pegawai tersebut sudah terdaftar!' });
            }
            return res.status(400).json({ success: false, message: 'Gagal: Data yang dimasukkan sudah ada (Duplikat).' });
        }
        
        // Error server lainnya
        res.status(500).json({ success: false, message: error.message });
    }
};

// [CREATE] Tambah staff baru
const createStaff = async (req, res) => {
    try {
        // Tangkap nuptk dari req.body
        const { username, password, nuptk, nama_lengkap, role } = req.body;
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        // Insert dengan nuptk
        await db.query(
            'INSERT INTO users_staff (username, password, nuptk, nama_lengkap, role) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, nuptk, nama_lengkap, role]
        );
        res.json({ success: true, message: 'Staff/Guru berhasil ditambahkan!' });
    } catch (error) {
        // TANGKAP ERROR DUPLIKAT DARI MYSQL
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('username')) {
                return res.status(400).json({ success: false, message: 'Gagal: Username tersebut sudah digunakan. Silakan cari yang lain!' });
            }
            if (error.sqlMessage.includes('nuptk')) {
                return res.status(400).json({ success: false, message: 'Gagal: NUPTK / ID Pegawai tersebut sudah terdaftar!' });
            }
            return res.status(400).json({ success: false, message: 'Gagal: Data yang dimasukkan sudah ada (Duplikat).' });
        }
        
        // Error server lainnya
        res.status(500).json({ success: false, message: error.message });
    }
};

// [UPDATE] Edit data staff
const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, nuptk, nama_lengkap, role } = req.body;

        // 🔥 TAMBAHAN KEAMANAN: Guru hanya boleh update datanya SENDIRI!
        // req.user didapat dari verifyToken
        if (req.user.role === 'guru') {
            if (String(req.user.id) !== String(id)) {
                return res.status(403).json({ success: false, message: 'Waduh! Anda hanya bisa mengubah profil Anda sendiri mas brow!' });
            }
        }

        // 🔥 TAMBAHAN KEAMANAN: Cegah guru ubah rolenya sendiri jadi admin
        const finalRole = (req.user.role === 'guru') ? 'guru' : role; 

        let query, params;

        if (password && password.trim() !== '') {
            const hashedPassword = bcrypt.hashSync(password, 10);
            query = 'UPDATE users_staff SET username=?, password=?, nuptk=?, nama_lengkap=?, role=? WHERE id=?';
            params = [username, hashedPassword, nuptk, nama_lengkap, finalRole, id];
        } else {
            query = 'UPDATE users_staff SET username=?, nuptk=?, nama_lengkap=?, role=? WHERE id=?';
            params = [username, nuptk, nama_lengkap, finalRole, id];
        }

        await db.query(query, params);
        res.json({ success: true, message: 'Data staff berhasil diupdate!' });
    } catch (error) {
        // ... (Error handling duplikat sama seperti kode mas brow sebelumnya)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Data duplikat: NUPTK atau Username sudah dipakai!' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// [DELETE] Hapus data staff (Tidak ada perubahan di sini)
const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM users_staff WHERE id=?', [id]);
        res.json({ success: true, message: 'Staff berhasil dihapus!' });
    } catch (error) {
        // TANGKAP ERROR DUPLIKAT DARI MYSQL
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('username')) {
                return res.status(400).json({ success: false, message: 'Gagal: Username tersebut sudah digunakan. Silakan cari yang lain!' });
            }
            if (error.sqlMessage.includes('nuptk')) {
                return res.status(400).json({ success: false, message: 'Gagal: NUPTK / ID Pegawai tersebut sudah terdaftar!' });
            }
            return res.status(400).json({ success: false, message: 'Gagal: Data yang dimasukkan sudah ada (Duplikat).' });
        }
        
        // Error server lainnya
        res.status(500).json({ success: false, message: error.message });
    }
};

// [IMPORT] Import Staff Massal via Excel
const importStaffExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'File Excel tidak ditemukan!' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if (data.length === 0) return res.status(400).json({ success: false, message: 'Data Excel kosong!' });

        const values = data.map(row => {
            const rawPassword = row['Password'] || row.password || '123456';
            const hashedPassword = bcrypt.hashSync(String(rawPassword), 10);
            
            // Tangkap NUPTK, ubah jadi String, dan buang spasi jika ada
            let rawNuptk = row['NUPTK'] || row.nuptk;
            let finalNuptk = rawNuptk ? String(rawNuptk).trim() : null;
            
            return [
                row['Username'] || row.username,
                hashedPassword,
                finalNuptk, // 👈 Gunakan finalNuptk di sini
                row['Nama Lengkap'] || row.nama_lengkap,
                row['Role'] || row.role || 'guru'
            ];
        });

        // LOGIKA UPSERT: Jika Username sudah ada, update Nama, NUPTK, dan Role-nya
        const query = `
            INSERT INTO users_staff (username, password, nuptk, nama_lengkap, role) 
            VALUES ?
            ON DUPLICATE KEY UPDATE 
            nama_lengkap = VALUES(nama_lengkap), 
            nuptk = VALUES(nuptk),
            role = VALUES(role)
        `;

        await db.query(query, [values]);

        res.json({ success: true, message: `${data.length} data staff berhasil diproses!` });
    } catch (error) {
        console.error('Error Import Staff:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat memproses Excel.' });
    }
};

module.exports = { getStaff, createStaff, updateStaff, deleteStaff, importStaffExcel };