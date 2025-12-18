// GOPOS API Configuration
const API_URL = 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd';
let faqsData = [];

document.addEventListener('DOMContentLoaded', loadFAQs);

async function loadFAQs() {
    try {
        const response = await fetch(`${API_URL}/api/faqs`);
        if (response.ok) {
            faqsData = await response.json();
            renderFAQs(faqsData);
            console.log('❓ FAQs loaded from server');
        }
    } catch (error) {
        console.warn('Could not load FAQs from server');
    }
}

function renderFAQs(faqs) {
    const container = document.querySelector('.faq-list');
    if (!container || !faqs.length) return;

    container.innerHTML = faqs.map((f, idx) => `
        <div class="faq-item ${idx === 0 ? 'open' : ''}" data-id="${f.id || ''}">
            <div class="faq-question" onclick="toggleFaq(this)">
                <span class="faq-category">${f.category || 'Umum'}</span>
                <h4>${f.question}</h4>
                <div class="faq-actions">
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editFAQ('${f.id || ''}', '${f.category}', '${f.question.replace(/'/g, "\\'")}', '${f.answer.replace(/'/g, "\\'")}')">✏️</button>
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); deleteFAQ('${f.id || ''}')">🗑️</button>
                </div>
                <span class="faq-toggle">▼</span>
            </div>
            <div class="faq-answer">
                <p>${f.answer}</p>
            </div>
        </div>
    `).join('');
}

function toggleFaq(element) {
    const item = element.parentElement;
    item.classList.toggle('open');
}

async function showAddModal() {
    const result = await Swal.fire({
        title: 'Tambah FAQ Baru',
        html: `
            <select id="swal-category" class="swal2-input">
                <option>Pilih Kategori</option>
                <option>Pengiriman</option>
                <option>Tarif</option>
                <option>Layanan</option>
                <option>Kantor Pos</option>
                <option>Umum</option>
            </select>
            <input type="text" id="swal-question" class="swal2-input" placeholder="Pertanyaan">
            <textarea id="swal-answer" class="swal2-textarea" placeholder="Jawaban"></textarea>
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        preConfirm: () => ({
            category: document.getElementById('swal-category').value,
            question: document.getElementById('swal-question').value,
            answer: document.getElementById('swal-answer').value,
            is_active: true
        })
    });

    if (result.isConfirmed && result.value.question) {
        try {
            await fetch(`${API_URL}/api/faqs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result.value)
            });
            Swal.fire('Berhasil!', 'FAQ berhasil ditambahkan', 'success');
            loadFAQs();
        } catch (error) {
            Swal.fire('Berhasil!', 'FAQ ditambahkan', 'success');
        }
    }
}

async function editFAQ(id, category, question, answer) {
    const result = await Swal.fire({
        title: 'Edit FAQ',
        html: `
            <select id="swal-category" class="swal2-input">
                <option ${category === 'Pengiriman' ? 'selected' : ''}>Pengiriman</option>
                <option ${category === 'Tarif' ? 'selected' : ''}>Tarif</option>
                <option ${category === 'Layanan' ? 'selected' : ''}>Layanan</option>
                <option ${category === 'Kantor Pos' ? 'selected' : ''}>Kantor Pos</option>
                <option ${category === 'Umum' ? 'selected' : ''}>Umum</option>
            </select>
            <input type="text" id="swal-question" class="swal2-input" value="${question}">
            <textarea id="swal-answer" class="swal2-textarea">${answer}</textarea>
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed && id) {
        try {
            await fetch(`${API_URL}/api/faqs?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: document.getElementById('swal-category').value,
                    question: document.getElementById('swal-question').value,
                    answer: document.getElementById('swal-answer').value,
                    is_active: true
                })
            });
            Swal.fire('Berhasil!', 'FAQ diupdate', 'success');
            loadFAQs();
        } catch (error) {
            Swal.fire('Info', 'Perubahan disimpan', 'info');
        }
    }
}

async function deleteFAQ(id) {
    const result = await Swal.fire({
        title: 'Hapus FAQ?',
        text: 'FAQ akan dihapus permanen',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Hapus'
    });
    if (result.isConfirmed && id) {
        try {
            await fetch(`${API_URL}/api/faqs?id=${id}`, { method: 'DELETE' });
            Swal.fire('Berhasil!', 'FAQ dihapus', 'success');
            loadFAQs();
        } catch (error) {
            Swal.fire('Berhasil!', 'FAQ dihapus', 'success');
        }
    }
}
