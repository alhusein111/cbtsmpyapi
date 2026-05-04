import Swal from 'sweetalert2';
import { toast } from 'sonner';

// --- BANTUAN UNTUK SONNER (TOAST) ---
export const notifySuccess = (message) => toast.success(message);
export const notifyError = (message) => toast.error(message);
export const notifyWarning = (message) => toast.warning(message);
export const notifyLoading = (message) => toast.loading(message);
export const updateToastSuccess = (id, message) => toast.success(message, { id });
export const updateToastError = (id, message) => toast.error(message, { id });

// --- BANTUAN UNTUK SWEETALERT2 (KONFIRMASI) ---
export const confirmDelete = async (namaItem = 'data ini') => {
  const result = await Swal.fire({
    title: 'Yakin ingin menghapus?',
    text: `${namaItem} tidak bisa dikembalikan setelah dihapus!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444', // Merah tailwind
    cancelButtonColor: '#64748b',  // Abu-abu tailwind
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal'
  });
  
  return result.isConfirmed; // Akan mereturn true jika user klik "Ya, Hapus!"
};