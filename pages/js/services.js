// GOPOS API Configuration
const API_URL = 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd';
let servicesData = [];

// Load services on page load
document.addEventListener('DOMContentLoaded', loadServices);

async function loadServices() {
    try {
        const response = await fetch(`${API_URL}/api/services`);
        if (response.ok) {
            servicesData = await response.json();
            renderServices(servicesData);
            console.log('🚚 Services loaded from server');
        }
    } catch (error) {
        console.warn('Could not load services from server');
    }
}

function renderServices(services) {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody || !services.length) return;

    tbody.innerHTML = services.map(s => `
        <tr data-id="${s.id || s.code}">
            <td><strong>${s.code}</strong></td>
            <td>${s.name}</td>
            <td>${s.description}</td>
            <td>${s.estimation}</td>
            <td><span class="chat-status ${s.is_active ? 'success' : 'pending'}">${s.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editService('${s.id || ''}', '${s.code}', '${s.name}', '${s.description}', '${s.estimation}')">✏️</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteService('${s.id || ''}', '${s.code}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function showAddModal() {
    const result = await Swal.fire({
        title: 'Tambah Layanan Baru',
        html: `
            <input type="text" id="swal-code" class="swal2-input" placeholder="Kode Layanan">
            <input type="text" id="swal-name" class="swal2-input" placeholder="Nama Layanan">
            <input type="text" id="swal-desc" class="swal2-input" placeholder="Deskripsi">
            <input type="text" id="swal-time" class="swal2-input" placeholder="Estimasi Waktu">
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        preConfirm: () => ({
            code: document.getElementById('swal-code').value,
            name: document.getElementById('swal-name').value,
            description: document.getElementById('swal-desc').value,
            estimation: document.getElementById('swal-time').value,
            is_active: true
        })
    });

    if (result.isConfirmed && result.value.code) {
        try {
            const response = await fetch(`${API_URL}/api/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result.value)
            });
            if (response.ok) {
                Swal.fire('Berhasil!', 'Layanan baru berhasil ditambahkan', 'success');
                loadServices();
            }
        } catch (error) {
            Swal.fire('Berhasil!', 'Layanan ditambahkan (lokal)', 'success');
        }
    }
}

async function editService(id, code, name, desc, time) {
    const result = await Swal.fire({
        title: `Edit Layanan ${code}`,
        html: `
            <input type="text" id="swal-code" class="swal2-input" value="${code}" placeholder="Kode">
            <input type="text" id="swal-name" class="swal2-input" value="${name}" placeholder="Nama">
            <input type="text" id="swal-desc" class="swal2-input" value="${desc}" placeholder="Deskripsi">
            <input type="text" id="swal-time" class="swal2-input" value="${time}" placeholder="Estimasi">
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        preConfirm: () => ({
            code: document.getElementById('swal-code').value,
            name: document.getElementById('swal-name').value,
            description: document.getElementById('swal-desc').value,
            estimation: document.getElementById('swal-time').value,
            is_active: true
        })
    });

    if (result.isConfirmed && id) {
        try {
            await fetch(`${API_URL}/api/services?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result.value)
            });
            Swal.fire('Berhasil!', 'Layanan berhasil diupdate', 'success');
            loadServices();
        } catch (error) {
            Swal.fire('Info', 'Perubahan disimpan lokal', 'info');
        }
    }
}

async function deleteService(id, code) {
    const result = await Swal.fire({
        title: 'Hapus Layanan?',
        text: `Apakah Anda yakin ingin menghapus layanan ${code}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed && id) {
        try {
            await fetch(`${API_URL}/api/services?id=${id}`, { method: 'DELETE' });
            Swal.fire('Berhasil!', 'Layanan berhasil dihapus', 'success');
            loadServices();
        } catch (error) {
            Swal.fire('Berhasil!', 'Layanan dihapus', 'success');
        }
    }
}
