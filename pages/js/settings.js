// GOPOS API Configuration
const API_URL = 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd';

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/api/settings`);
        if (response.ok) {
            const settings = await response.json();
            applySettings(settings);
            console.log('📋 Settings loaded from server');
        }
    } catch (error) {
        console.warn('Could not load settings from server, using defaults');
    }
}

function applySettings(settings) {
    const toggles = document.querySelectorAll('.toggle-switch input');
    if (settings.auto_reply !== undefined) toggles[0].checked = settings.auto_reply;
    if (settings.typing_indicator !== undefined) toggles[1].checked = settings.typing_indicator;
    if (settings.push_notifications !== undefined) toggles[2].checked = settings.push_notifications;
    if (settings.email_notifications !== undefined) toggles[3].checked = settings.email_notifications;
    if (settings.sound_alerts !== undefined) toggles[4].checked = settings.sound_alerts;
    if (settings.critical_alerts_only !== undefined) toggles[5].checked = settings.critical_alerts_only;
    if (settings.dark_mode_default !== undefined) {
        const darkMode = document.getElementById('darkModeDefault');
        if (darkMode) darkMode.checked = settings.dark_mode_default;
    }
}

function collectSettings() {
    const toggles = document.querySelectorAll('.toggle-switch input');
    const selects = document.querySelectorAll('.setting-select');

    return {
        auto_reply: toggles[0]?.checked ?? true,
        typing_indicator: toggles[1]?.checked ?? true,
        push_notifications: toggles[2]?.checked ?? true,
        email_notifications: toggles[3]?.checked ?? false,
        sound_alerts: toggles[4]?.checked ?? true,
        critical_alerts_only: toggles[5]?.checked ?? false,
        dark_mode_default: document.getElementById('darkModeDefault')?.checked ?? true,
        compact_mode: toggles[7]?.checked ?? false,
        animations: toggles[8]?.checked ?? true,
        response_delay: parseInt(selects[0]?.value) || 1,
        bot_language: selects[1]?.value || 'Indonesia',
        font_size: selects[2]?.value || 'Normal'
    };
}

async function saveSettings() {
    const settings = collectSettings();

    try {
        const response = await fetch(`${API_URL}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Pengaturan Disimpan!',
                text: 'Semua perubahan telah berhasil disimpan ke server.',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        console.warn('Could not save to server, saving locally');
        localStorage.setItem('gopos-settings', JSON.stringify(settings));
        Swal.fire({
            icon: 'success',
            title: 'Pengaturan Disimpan!',
            text: 'Perubahan disimpan secara lokal.',
            timer: 2000,
            showConfirmButton: false
        });
    }
}

function toggleApiKey(btn) {
    const input = btn.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🔒';
}

function resetSettings() {
    Swal.fire({
        icon: 'warning',
        title: 'Reset Pengaturan?',
        text: 'Semua pengaturan akan dikembalikan ke default.',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Reset!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('gopos-settings');
            location.reload();
            Swal.fire('Berhasil!', 'Pengaturan telah direset.', 'success');
        }
    });
}

function clearData() {
    Swal.fire({
        icon: 'warning',
        title: 'Hapus Semua Data?',
        text: 'Tindakan ini tidak dapat dibatalkan!',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            Swal.fire('Berhasil!', 'Semua data lokal telah dihapus.', 'success');
        }
    });
}

function deleteAccount() {
    Swal.fire({
        icon: 'error',
        title: 'Hapus Akun?',
        text: 'Akun akan dihapus secara permanen dan tidak dapat dikembalikan!',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Hapus Akun!',
        cancelButtonText: 'Batal'
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 'd':
                e.preventDefault();
                window.location.href = '../dashboard.html';
                break;
            case 't':
                e.preventDefault();
                document.getElementById('themeToggle')?.click();
                break;
            case 'b':
                e.preventDefault();
                document.getElementById('sidebarToggle')?.click();
                break;
            case 's':
                e.preventDefault();
                saveSettings();
                break;
        }
    }
});
