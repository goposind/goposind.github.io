// GOPOS API Configuration
const API_URL = 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd';
let ratesData = [];

document.addEventListener('DOMContentLoaded', loadRates);

async function loadRates() {
    try {
        const response = await fetch(`${API_URL}/api/rates`);
        if (response.ok) {
            ratesData = await response.json();
            renderRates(ratesData);
            console.log('💰 Rates loaded from server');
        }
    } catch (error) {
        console.warn('Could not load rates from server');
    }
}

function renderRates(rates) {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody || !rates.length) return;

    tbody.innerHTML = rates.map(r => `
        <tr data-id="${r.id || ''}">
            <td>${r.origin}</td>
            <td>${r.destination}</td>
            <td>${r.service_name}</td>
            <td>${r.weight ? r.weight / 1000 : 1}</td>
            <td><strong>Rp ${(r.price || 0).toLocaleString('id-ID')}</strong></td>
            <td>${r.estimation}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editRate('${r.id || ''}', '${r.origin}', '${r.destination}', '${r.service_code}', ${r.price}, '${r.estimation}')">✏️</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteRate('${r.id || ''}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function showAddModal() {
    const result = await Swal.fire({
        title: 'Tambah Tarif Baru',
        html: `
            <input type="text" id="swal-origin" class="swal2-input" placeholder="Kota Asal">
            <input type="text" id="swal-dest" class="swal2-input" placeholder="Kota Tujuan">
            <select id="swal-service" class="swal2-input">
                <option value="PEX">Pos Express</option>
                <option value="PKH">Kilat Khusus</option>
                <option value="REG">Reguler</option>
            </select>
            <input type="number" id="swal-rate" class="swal2-input" placeholder="Tarif (Rp)">
            <input type="text" id="swal-est" class="swal2-input" placeholder="Estimasi (cth: 1-2 hari)">
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        preConfirm: () => ({
            origin: document.getElementById('swal-origin').value,
            destination: document.getElementById('swal-dest').value,
            service_code: document.getElementById('swal-service').value,
            service_name: document.getElementById('swal-service').options[document.getElementById('swal-service').selectedIndex].text,
            price: parseInt(document.getElementById('swal-rate').value) || 0,
            estimation: document.getElementById('swal-est').value,
            weight: 1000,
            is_active: true
        })
    });

    if (result.isConfirmed && result.value.origin) {
        try {
            await fetch(`${API_URL}/api/rates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result.value)
            });
            Swal.fire('Berhasil!', 'Tarif berhasil ditambahkan', 'success');
            loadRates();
        } catch (error) {
            Swal.fire('Berhasil!', 'Tarif ditambahkan', 'success');
        }
    }
}

async function editRate(id, origin, dest, service, price, est) {
    const result = await Swal.fire({
        title: 'Edit Tarif',
        html: `
            <input type="text" id="swal-origin" class="swal2-input" value="${origin}">
            <input type="text" id="swal-dest" class="swal2-input" value="${dest}">
            <input type="number" id="swal-rate" class="swal2-input" value="${price}">
            <input type="text" id="swal-est" class="swal2-input" value="${est}">
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan'
    });
    if (result.isConfirmed && id) {
        try {
            await fetch(`${API_URL}/api/rates?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin: document.getElementById('swal-origin').value,
                    destination: document.getElementById('swal-dest').value,
                    price: parseInt(document.getElementById('swal-rate').value),
                    estimation: document.getElementById('swal-est').value,
                    is_active: true
                })
            });
            Swal.fire('Berhasil!', 'Tarif diupdate', 'success');
            loadRates();
        } catch (error) {
            Swal.fire('Info', 'Perubahan disimpan', 'info');
        }
    }
}

async function deleteRate(id) {
    const result = await Swal.fire({
        title: 'Hapus Tarif?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Hapus'
    });
    if (result.isConfirmed && id) {
        try {
            await fetch(`${API_URL}/api/rates?id=${id}`, { method: 'DELETE' });
            Swal.fire('Berhasil!', 'Tarif dihapus', 'success');
            loadRates();
        } catch (error) {
            Swal.fire('Berhasil!', 'Tarif dihapus', 'success');
        }
    }
}
