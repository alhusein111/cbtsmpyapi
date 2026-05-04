// file: utils/generateDeskripsi.js

const generateDeskripsiKurmer = (nilai, arrayTP, kkm) => {
    // Jika guru tidak mencentang/menginput TP apa-apa, kembalikan strip
    if (!arrayTP || arrayTP.length === 0) return "-";

    const kkmValue = Number(kkm);
    const numNilai = Number(nilai);

    let predikat = "";

    // 1. LOGIKA INTERVAL KKM (Persis seperti gambar GSheet Mas Brow)
    if (numNilai < kkmValue) {
        predikat = "perlu dimaksimalkan"; // Di bawah KKM (0 - 65)
    } else {
        // Rumus: Interval = (100 - KKM) / 3
        // Contoh KKM 66 -> (100 - 66) / 3 = 11.33 dibulatkan jadi 11
        const interval = Math.round((100 - kkmValue) / 3);

        const batasAtasCukup = kkmValue + interval - 1;       // Contoh: 66 + 11 - 1 = 76
        const batasBawahSangatBaik = 100 - interval + 1;      // Contoh: 100 - 11 + 1 = 90

        if (numNilai >= batasBawahSangatBaik) {
            predikat = "sangat baik";     // (90 - 100)
        } else if (numNilai > batasAtasCukup) {
            predikat = "baik";            // (77 - 89)
        } else {
            predikat = "cukup";           // (66 - 76)
        }
    }

    // 2. PERHALUS TEKS TP (Otomatis ubah huruf pertama jadi kecil)
    // Contoh: "Memahami Al-Qur'an" -> "memahami Al-Qur'an"
    const cleanedTPs = arrayTP.map(tp => {
        let text = tp.trim();
        if (text.length > 0) {
            text = text.charAt(0).toLowerCase() + text.slice(1); // Huruf depan jadi kecil
            if (text.endsWith('.')) text = text.slice(0, -1);    // Buang titik di akhir kalimat
        }
        return text;
    });

    // 3. RANGKAI ARRAY TP DENGAN KOMA & "DAN"
    let gabunganTP = "";
    if (cleanedTPs.length === 1) {
        gabunganTP = cleanedTPs[0];
    } else if (cleanedTPs.length === 2) {
        gabunganTP = cleanedTPs.join(" dan ");
    } else {
        // Kalau 3 TP atau lebih -> A, B, dan C
        const lastTP = cleanedTPs.pop();
        gabunganTP = cleanedTPs.join(", ") + ", dan " + lastTP;
    }

    // 4. BUAT KALIMAT FINAL YANG HALUS
    if (predikat === "perlu dimaksimalkan") {
        return `Peserta didik menunjukkan penguasaan yang masih ${predikat} dalam ${gabunganTP}.`;
    } else {
        return `Menunjukkan penguasaan yang ${predikat} dalam ${gabunganTP}.`;
    }
};

module.exports = { generateDeskripsiKurmer };