// GOPOS API Configuration
const API_URL = 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd';
let usersData = [];

document.addEventListener('DOMContentLoaded', loadUsers);

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/api/users`);
        if (response.ok) {
            usersData = await response.json();
            renderUsers(usersData);
            updateStats(usersData);
            console.log('👥 Users loaded from server');
        }
    } catch (error) { console.warn('Could not load users from server'); }
}

function renderUsers(users) {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody || !users.length) return;

    tbody.innerHTML = users.map((u, i) => `
        <tr>
            <td><strong>#U${String(i + 1).padStart(3, '0')}</strong></td>
            <td>${u.phone_number}</td>
            <td>${u.total_chats || 0}</td>
            <td>${formatTime(u.last_active)}</td>
            <td>${formatDate(u.joined_at)}</td>
            <td><span class="chat-status ${u.status === 'active' ? 'success' : 'pending'}">${u.status === 'active' ? 'Aktif' : 'Idle'}</span></td>
        </tr>
    `).join('');
}

function updateStats(users) {
    const stats = document.querySelectorAll('.stat-value');
    if (stats.length >= 4) {
        const total = users.length;
        const active = users.filter(u => u.status === 'active').length;
        stats[0].textContent = total.toLocaleString('id-ID');
        stats[1].textContent = active.toLocaleString('id-ID');
    }
}

function formatTime(dateStr) {
    if (!dateStr) return 'Tidak aktif';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return 'Baru saja';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return `${Math.floor(diff / 86400000)} hari lalu`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
