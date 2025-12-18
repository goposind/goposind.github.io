// GOPOS API Configuration
const API_URL = 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd';
let feedbackData = [];

document.addEventListener('DOMContentLoaded', loadFeedback);

async function loadFeedback() {
    try {
        const response = await fetch(`${API_URL}/api/feedback`);
        if (response.ok) {
            feedbackData = await response.json();
            renderFeedback(feedbackData);
            console.log('⭐ Feedback loaded from server');
        }
    } catch (error) { console.warn('Could not load feedback from server'); }
}

function renderFeedback(feedbacks) {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody || !feedbacks.length) return;

    tbody.innerHTML = feedbacks.map(f => `
        <tr data-id="${f.id || ''}">
            <td>${f.phone_number}</td>
            <td>${'⭐'.repeat(f.rating || 5)}</td>
            <td>"${f.comment}"</td>
            <td>${formatTime(f.created_at)}</td>
            <td>
                <span class="chat-status ${f.status === 'reviewed' ? 'success' : 'pending'}">${f.status === 'reviewed' ? 'Reviewed' : 'Pending'}</span>
                ${f.status !== 'reviewed' ? `<button class="btn btn-sm btn-primary" onclick="markReviewed('${f.id}')">✓</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function formatTime(dateStr) {
    if (!dateStr) return 'Baru saja';
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return `${Math.floor(diff / 86400000)} hari lalu`;
}

async function markReviewed(id) {
    if (!id) return;
    try {
        await fetch(`${API_URL}/api/feedback?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'reviewed' })
        });
        Swal.fire('Berhasil!', 'Feedback ditandai sebagai reviewed', 'success');
        loadFeedback();
    } catch (error) { Swal.fire('Info', 'Status diupdate', 'info'); }
}
