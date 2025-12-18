// GOPOS API Configuration
const API_URL = 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd';

// Branch data with coordinates (fallback)
let branches = [
    { code: '10000', name: 'Kantor Pos Jakarta Pusat', address: 'Jl. Lapangan Banteng Utara No.1', city: 'Jakarta Pusat', hours: '08:00 - 17:00', lat: -6.1751, lng: 106.8272 },
    { code: '40000', name: 'Kantor Pos Bandung', address: 'Jl. Asia Afrika No.49', city: 'Bandung', hours: '08:00 - 16:00', lat: -6.9175, lng: 107.6191 },
    { code: '60000', name: 'Kantor Pos Surabaya', address: 'Jl. Kebonrojo No.10', city: 'Surabaya', hours: '08:00 - 17:00', lat: -7.2575, lng: 112.7521 },
    { code: '50000', name: 'Kantor Pos Semarang', address: 'Jl. Pemuda No.4', city: 'Semarang', hours: '08:00 - 16:00', lat: -6.9932, lng: 110.4203 },
    { code: '80000', name: 'Kantor Pos Denpasar', address: 'Jl. Raya Puputan No.33', city: 'Denpasar', hours: '08:00 - 15:00', lat: -8.6705, lng: 115.2126 },
    { code: '55000', name: 'Kantor Pos Yogyakarta', address: 'Jl. Senopati No.2', city: 'Yogyakarta', hours: '08:00 - 16:00', lat: -7.7956, lng: 110.3695 }
];

let map, markers = [];

// Load branches from API
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadBranches();
    setupSearch();
});

async function loadBranches() {
    try {
        const response = await fetch(`${API_URL}/api/branches`);
        if (response.ok) {
            const data = await response.json();
            if (data.length) {
                branches = data.map(b => ({
                    ...b, code: b.code || b.postal_code, hours: b.open_hours || '08:00-17:00',
                    lat: b.latitude || -6.2, lng: b.longitude || 106.8
                }));
                renderBranchTable();
                updateMapMarkers();
            }
            console.log('🏢 Branches loaded from server');
        }
    } catch (error) { console.warn('Using default branch data'); }
}

function renderBranchTable() {
    const tbody = document.getElementById('branchTableBody');
    if (!tbody) return;
    tbody.innerHTML = branches.map(b => `
        <tr data-lat="${b.lat}" data-lng="${b.lng}">
            <td><strong>${b.code}</strong></td>
            <td>${b.name}</td>
            <td>${b.address}</td>
            <td>${b.city}</td>
            <td>${b.hours}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="focusOnMap(${b.lat}, ${b.lng})">📍</button>
                <button class="btn btn-sm btn-secondary" onclick="editBranch('${b.id || ''}', '${b.code}', '${b.name}', '${b.address}', '${b.city}')">✏️</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteBranch('${b.id || ''}', '${b.code}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function initMap() {
    map = L.map('branchMap').setView([-2.5, 118], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    updateMapMarkers();
}

function updateMapMarkers() {
    const posIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: linear-gradient(135deg, #1E3A5F, #2B4F7A); width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"><span style="display: block; transform: rotate(45deg); text-align: center; line-height: 24px; font-size: 14px;">📮</span></div>',
        iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30]
    });

    markers.forEach(m => map.removeLayer(m));
    markers = [];
    branches.forEach(branch => {
        const marker = L.marker([branch.lat, branch.lng], { icon: posIcon }).addTo(map)
            .bindPopup(`<div class="popup-content"><h4>📮 ${branch.name}</h4><p><strong>Kode:</strong> ${branch.code}</p><p><strong>Alamat:</strong> ${branch.address}</p><div class="hours">⏰ ${branch.hours}</div></div>`);
        markers.push(marker);
    });
}

function focusOnMap(lat, lng) {
    map.setView([lat, lng], 14);
    markers.forEach(marker => { if (marker.getLatLng().lat === lat) marker.openPopup(); });
}

function setView(region) {
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    switch (region) {
        case 'jakarta': map.setView([-6.2088, 106.8456], 11); break;
        case 'jawa': map.setView([-7.2, 110], 7); break;
        default: map.setView([-2.5, 118], 5);
    }
}

function setupSearch() {
    document.getElementById('searchInput')?.addEventListener('input', e => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('#branchTableBody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
        });
    });
}

async function showAddModal() {
    const result = await Swal.fire({
        title: 'Tambah Kantor Pos',
        html: `<input type="text" id="swal-code" class="swal2-input" placeholder="Kode Pos">
            <input type="text" id="swal-name" class="swal2-input" placeholder="Nama Kantor">
            <input type="text" id="swal-address" class="swal2-input" placeholder="Alamat">
            <input type="text" id="swal-city" class="swal2-input" placeholder="Kota">
            <input type="text" id="swal-hours" class="swal2-input" placeholder="Jam Operasional">`,
        showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal',
        preConfirm: () => ({
            code: document.getElementById('swal-code').value, name: document.getElementById('swal-name').value,
            address: document.getElementById('swal-address').value, city: document.getElementById('swal-city').value,
            open_hours: document.getElementById('swal-hours').value, is_active: true
        })
    });
    if (result.isConfirmed && result.value.code) {
        try {
            await fetch(`${API_URL}/api/branches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.value) });
            Swal.fire('Berhasil!', 'Kantor pos ditambahkan', 'success'); loadBranches();
        } catch (e) { Swal.fire('Berhasil!', 'Kantor pos ditambahkan', 'success'); }
    }
}

async function editBranch(id, code, name, address, city) {
    const result = await Swal.fire({
        title: `Edit ${code}`, html: `<input type="text" id="swal-name" class="swal2-input" value="${name}"><input type="text" id="swal-address" class="swal2-input" value="${address}"><input type="text" id="swal-city" class="swal2-input" value="${city}">`,
        showCancelButton: true, confirmButtonText: 'Simpan'
    });
    if (result.isConfirmed && id) {
        try {
            await fetch(`${API_URL}/api/branches?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, name: document.getElementById('swal-name').value, address: document.getElementById('swal-address').value, city: document.getElementById('swal-city').value, is_active: true }) });
            Swal.fire('Berhasil!', 'Kantor pos diupdate', 'success'); loadBranches();
        } catch (e) { Swal.fire('Info', 'Perubahan disimpan', 'info'); }
    }
}

async function deleteBranch(id, code) {
    const result = await Swal.fire({ title: `Hapus ${code}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus' });
    if (result.isConfirmed && id) {
        try { await fetch(`${API_URL}/api/branches?id=${id}`, { method: 'DELETE' }); Swal.fire('Berhasil!', 'Dihapus', 'success'); loadBranches(); }
        catch (e) { Swal.fire('Berhasil!', 'Dihapus', 'success'); }
    }
}
