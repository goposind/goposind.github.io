// ===== GOPOS Admin Dashboard - User Management =====

const CONFIG = {
    apiUrl: 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd',
    pollingInterval: 5000 // 5 seconds
};

// ===== Theme Management =====
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('gopos-theme') || 'dark';
        this.setTheme(savedTheme);
        this.bindEvents();
    },
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('gopos-theme', theme);
    },
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        Toast.show(newTheme === 'dark' ? '🌙 Mode Gelap Aktif' : '☀️ Mode Terang Aktif', 'success');
    },
    bindEvents() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme());
    }
};

// ===== Toast Notifications =====
const Toast = {
    show(message, type = 'info') {
        const ToastMixin = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1000, timerProgressBar: true
        });
        ToastMixin.fire({ icon: type, title: message });
    }
};

// ===== Auth Manager =====
const AuthManager = {
    token: null,
    user: null,

    init() {
        this.token = localStorage.getItem('gopos-token');
        const userData = localStorage.getItem('gopos-user');
        this.user = userData ? JSON.parse(userData) : null;

        if (!this.token || !this.user) {
            this.redirectToLogin();
            return false;
        }

        // Check if user is admin
        if (this.user.role !== 'admin') {
            Toast.show('Akses ditolak. Hanya admin yang bisa mengakses halaman ini.', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return false;
        }

        return true;
    },

    redirectToLogin() {
        Toast.show('Silakan login terlebih dahulu', 'warning');
        setTimeout(() => window.location.href = 'index.html', 1000);
    },

    logout() {
        localStorage.removeItem('gopos-token');
        localStorage.removeItem('gopos-user');
        window.location.href = 'index.html';
    },

    getAuthHeaders() {
        return { 'Authorization': this.token, 'Content-Type': 'application/json' };
    }
};

// ===== User Management =====
const UserManagement = {
    users: [],
    filteredUsers: [],
    currentPage: 1,
    itemsPerPage: 5,
    pollingTimer: null,

    async init() {
        this.bindEvents();
        await this.loadUsers();
        this.startPolling();
    },

    bindEvents() {
        document.getElementById('addUserBtn')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.loadUsers());
        document.getElementById('logoutBtn')?.addEventListener('click', () => AuthManager.logout());
        document.getElementById('searchInput')?.addEventListener('input', (e) => this.filterUsers(e.target.value));

        // Pagination Controls
        document.getElementById('prevBtn')?.addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextBtn')?.addEventListener('click', () => this.changePage(1));
    },

    startPolling() {
        this.pollingTimer = setInterval(() => this.loadUsers(true), CONFIG.pollingInterval);
        document.getElementById('realtimeStatus').textContent = 'Live';
    },

    stopPolling() {
        if (this.pollingTimer) clearInterval(this.pollingTimer);
        document.getElementById('realtimeStatus').textContent = 'Off';
    },

    async loadUsers(silent = false) {
        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/admin/users`, {
                headers: AuthManager.getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 401) {
                    AuthManager.redirectToLogin();
                    return;
                }
                throw new Error('Failed to load users');
            }

            this.users = await response.json();
            this.filteredUsers = [...this.users]; // Initialize filtered users
            this.renderTable();
            this.updateStats();

            if (!silent) Toast.show('Data berhasil dimuat', 'success');
        } catch (error) {
            console.error('Load users error:', error);
            if (!silent) Toast.show('Gagal memuat data', 'error');
        }
    },

    renderTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (!this.filteredUsers || this.filteredUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Belum ada user terdaftar</td></tr>';
            this.renderPagination();
            return;
        }

        // Pagination Logic
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedUsers.map(user => `
            <tr data-id="${user.id}">
                <td><strong>${user.name || '-'}</strong></td>
                <td>${user.email || '-'}</td>
                <td><span class="badge badge-${user.role === 'admin' ? 'primary' : 'secondary'}">${user.role || 'user'}</span></td>
                <td><span class="badge badge-${user.status === 'active' ? 'success' : 'warning'}">${user.status || 'active'}</span></td>
                <td class="actions">
                    <button class="btn-icon" onclick="UserManagement.showEditModal('${user.id}')" title="Edit">✏️</button>
                    <button class="btn-icon btn-danger" onclick="UserManagement.deleteUser('${user.id}', '${user.name}')" title="Hapus">🗑️</button>
                </td>
            </tr>
        `).join('');

        this.renderPagination();
    },

    renderPagination() {
        const totalItems = this.filteredUsers.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startRange = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
        const endRange = Math.min(this.currentPage * this.itemsPerPage, totalItems);

        document.getElementById('startRange').textContent = startRange;
        document.getElementById('endRange').textContent = endRange;
        document.getElementById('totalItems').textContent = totalItems;

        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    },

    changePage(delta) {
        this.currentPage += delta;
        this.renderTable();
    },

    updateStats() {
        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('activeUsers').textContent = this.users.filter(u => u.status === 'active').length;
        document.getElementById('adminUsers').textContent = this.users.filter(u => u.role === 'admin').length;
    },

    filterUsers(query) {
        const lowerQuery = query.toLowerCase();

        if (!lowerQuery) {
            this.filteredUsers = [...this.users];
        } else {
            this.filteredUsers = this.users.filter(user =>
                (user.name && user.name.toLowerCase().includes(lowerQuery)) ||
                (user.email && user.email.toLowerCase().includes(lowerQuery))
            );
        }

        this.currentPage = 1; // Reset to first page
        this.renderTable();
    },

    async showAddModal() {
        const result = await Swal.fire({
            title: 'Tambah User Baru',
            html: `
                <input type="text" id="swal-name" class="swal2-input" placeholder="Nama Lengkap">
                <input type="email" id="swal-email" class="swal2-input" placeholder="Email">
                <input type="password" id="swal-password" class="swal2-input" placeholder="Password (Min 6 karakter)">
                <select id="swal-role" class="swal2-select">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const name = document.getElementById('swal-name').value;
                const email = document.getElementById('swal-email').value;
                const password = document.getElementById('swal-password').value;
                const role = document.getElementById('swal-role').value;

                if (!name || !email || !password) {
                    Swal.showValidationMessage('Mohon lengkapi semua data');
                    return false;
                }
                if (password.length < 6) {
                    Swal.showValidationMessage('Password minimal 6 karakter');
                    return false;
                }

                return {
                    name: name,
                    email: email,
                    password: password,
                    role: role,
                    status: 'active'
                };
            }
        });

        if (result.isConfirmed) {
            await this.createUser(result.value);
        }
    },

    async createUser(userData) {
        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/admin/users`, {
                method: 'POST',
                headers: AuthManager.getAuthHeaders(),
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                Toast.show('User berhasil ditambahkan', 'success');
                await this.loadUsers();
            } else {
                Toast.show(data.error || 'Gagal menambah user', 'error');
            }
        } catch (error) {
            console.error('Create user error:', error);
            Toast.show('Gagal menambah user', 'error');
        }
    },

    async showEditModal(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const result = await Swal.fire({
            title: 'Edit User',
            html: `
                <input type="text" id="swal-name" class="swal2-input" placeholder="Nama" value="${user.name || ''}">
                <input type="email" id="swal-email" class="swal2-input" placeholder="Email" value="${user.email || ''}">
                <select id="swal-role" class="swal2-select">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
                <select id="swal-status" class="swal2-select">
                    <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Update',
            cancelButtonText: 'Batal',
            preConfirm: () => ({
                name: document.getElementById('swal-name').value,
                email: document.getElementById('swal-email').value,
                role: document.getElementById('swal-role').value,
                status: document.getElementById('swal-status').value
            })
        });

        if (result.isConfirmed) {
            await this.updateUser(userId, result.value);
        }
    },

    async updateUser(userId, userData) {
        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/admin/users?id=${userId}`, {
                method: 'PUT',
                headers: AuthManager.getAuthHeaders(),
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                Toast.show('User berhasil diupdate', 'success');
                await this.loadUsers();
            } else {
                Toast.show('Gagal update user', 'error');
            }
        } catch (error) {
            console.error('Update user error:', error);
            Toast.show('Gagal update user', 'error');
        }
    },

    async deleteUser(userId, userName) {
        const result = await Swal.fire({
            title: 'Hapus User?',
            text: `User "${userName}" akan dihapus permanen.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${CONFIG.apiUrl}/api/admin/users?id=${userId}`, {
                    method: 'DELETE',
                    headers: AuthManager.getAuthHeaders()
                });

                if (response.ok) {
                    Toast.show('User berhasil dihapus', 'success');
                    await this.loadUsers();
                } else {
                    Toast.show('Gagal menghapus user', 'error');
                }
            } catch (error) {
                console.error('Delete user error:', error);
                Toast.show('Gagal menghapus user', 'error');
            }
        }
    }
};

// ===== Tab Manager =====
const TabManager = {
    currentTab: 'users',

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
    },

    switchTab(tab) {
        if (tab === this.currentTab) return;

        // Update button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update content visibility
        document.getElementById('usersSection').style.display = tab === 'users' ? 'block' : 'none';
        document.getElementById('chatHistorySection').style.display = tab === 'chatHistory' ? 'block' : 'none';
        document.getElementById('waChatSection').style.display = tab === 'waChat' ? 'block' : 'none';

        this.currentTab = tab;

        // Load data for the active tab
        if (tab === 'chatHistory') {
            ChatHistoryManager.loadSessions();
        } else if (tab === 'waChat') {
            WAChatHistoryManager.loadChats();
        }
    }
};

// ===== Chat History Manager =====
const ChatHistoryManager = {
    sessions: [],

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const refreshBtn = document.getElementById('refreshChatBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadSessions());
        }

        const searchInput = document.getElementById('searchChatInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterSessions(e.target.value));
        }
    },

    async loadSessions() {
        const tbody = document.getElementById('chatTableBody');
        tbody.innerHTML = `<tr><td colspan="5" class="loading-row"><div class="loading-spinner"></div><span>Memuat data...</span></td></tr>`;

        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/admin/chat-sessions`, {
                headers: AuthManager.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            this.sessions = data.sessions || [];

            // Update stats
            document.getElementById('totalSessions').textContent = data.total_sessions || 0;
            document.getElementById('totalMessages').textContent = data.total_messages || 0;
            document.getElementById('todaySessions').textContent = data.today_sessions || 0;

            this.renderTable();
        } catch (error) {
            console.error('Error loading chat sessions:', error);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ef4444;">Gagal memuat data</td></tr>`;
        }
    },

    renderTable() {
        const tbody = document.getElementById('chatTableBody');

        if (this.sessions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; opacity: 0.7;">Belum ada chat session</td></tr>`;
            return;
        }

        tbody.innerHTML = this.sessions.map(session => {
            const date = new Date(session.updated_at).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return `
                <tr>
                    <td>
                        <div style="font-weight: 500;">${this.escapeHtml(session.user_name || 'Unknown')}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${this.escapeHtml(session.user_email || '')}</div>
                    </td>
                    <td class="message-preview">${this.escapeHtml(session.title || 'Untitled')}</td>
                    <td><span class="badge badge-info">${session.message_count || 0} pesan</span></td>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">${date}</td>
                    <td>
                        <button class="btn-view" onclick="ChatHistoryManager.viewSession('${session.id}')">👁️ Lihat</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterSessions(query) {
        const rows = document.querySelectorAll('#chatTableBody tr');
        const q = query.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    },

    async viewSession(sessionId) {
        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/chat/sessions/${sessionId}`, {
                headers: AuthManager.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch session');

            const session = await response.json();

            // Build messages HTML
            let messagesHtml = '';
            if (session.messages && session.messages.length > 0) {
                messagesHtml = session.messages.map(msg => `
                    <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="font-weight: 500; color: var(--accent-primary);">👤 User:</div>
                        <div style="margin-bottom: 0.5rem;">${this.escapeHtml(msg.message)}</div>
                        <div style="font-weight: 500; color: var(--success);">🤖 Bot:</div>
                        <div style="white-space: pre-wrap;">${this.escapeHtml(msg.response)}</div>
                    </div>
                `).join('');
            } else {
                messagesHtml = '<p style="text-align:center; opacity: 0.7;">Tidak ada pesan</p>';
            }

            // Get full title from first message
            const fullTitle = session.messages && session.messages.length > 0
                ? session.messages[0].message
                : session.title || 'Chat Session';

            // Truncate title to 100 characters for clean display
            const displayTitle = fullTitle.length > 100
                ? fullTitle.substring(0, 100) + '...'
                : fullTitle;

            // Build modal content with header showing full question if truncated
            let headerHtml = '';
            if (fullTitle.length > 100) {
                headerHtml = `
                    <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; border-left: 3px solid var(--accent-primary);">
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Pertanyaan lengkap:</div>
                        <div style="font-size: 0.95rem;">${this.escapeHtml(fullTitle)}</div>
                    </div>
                `;
            }

            Swal.fire({
                title: `💬 ${displayTitle}`,
                html: `<div style="max-height: 400px; overflow-y: auto; text-align: left;">${headerHtml}${messagesHtml}</div>`,
                width: 650,
                showCloseButton: true,
                confirmButtonText: 'Tutup'
            });
        } catch (error) {
            console.error('Error viewing session:', error);
            Toast.show('Gagal memuat detail chat', 'error');
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===== WA Chat History Manager =====
const WAChatHistoryManager = {
    chats: [],

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const refreshBtn = document.getElementById('refreshWaChatBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadChats());
        }

        const searchInput = document.getElementById('searchWaChatInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterChats(e.target.value));
        }
    },

    async loadChats() {
        const tbody = document.getElementById('waChatTableBody');
        tbody.innerHTML = `<tr><td colspan="4" class="loading-row"><div class="loading-spinner"></div><span>Memuat data...</span></td></tr>`;

        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/admin/wa/chat/history`, {
                headers: AuthManager.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            this.chats = data.histories || [];

            // Update stats
            document.getElementById('totalWaChats').textContent = data.total_chats || 0;
            document.getElementById('totalWaMessages').textContent = data.total_messages || 0;

            this.renderTable();
        } catch (error) {
            console.error('Error loading WA chat history:', error);
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #ef4444;">Gagal memuat data</td></tr>`;
        }
    },

    renderTable() {
        const tbody = document.getElementById('waChatTableBody');

        if (this.chats.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; opacity: 0.7;">Belum ada chat WhatsApp</td></tr>`;
            return;
        }

        tbody.innerHTML = this.chats.map(chat => {
            const date = new Date(chat.updated_at).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return `
                <tr>
                    <td>
                        <div style="font-weight: 500;">📱 ${this.escapeHtml(chat.phone_number)}</div>
                    </td>
                    <td><span class="badge badge-info">${chat.message_count || 0} pesan</span></td>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">${date}</td>
                    <td>
                        <button class="btn-view" onclick="WAChatHistoryManager.viewChat('${chat.phone_number}')">👁️ Lihat</button>
                        <button class="btn-icon btn-danger" onclick="WAChatHistoryManager.deleteChat('${chat.phone_number}')" title="Hapus">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterChats(query) {
        const rows = document.querySelectorAll('#waChatTableBody tr');
        const q = query.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    },

    async viewChat(phoneNumber) {
        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/wa/chat/history/${phoneNumber}`, {
                headers: AuthManager.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch chat');

            const chat = await response.json();

            // Build messages HTML
            let messagesHtml = '';
            if (chat.messages && chat.messages.length > 0) {
                messagesHtml = chat.messages.map(msg => {
                    const time = new Date(msg.timestamp).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    });
                    const isUser = msg.role === 'user';
                    return `
                        <div style="margin-bottom: 0.75rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px; border-left: 3px solid ${isUser ? 'var(--accent-primary)' : 'var(--success)'};">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span style="font-weight: 500; color: ${isUser ? 'var(--accent-primary)' : 'var(--success)'};">${isUser ? '👤 User' : '🤖 Bot'}</span>
                                <span style="font-size: 0.75rem; color: var(--text-secondary);">${time}</span>
                            </div>
                            <div style="white-space: pre-wrap;">${this.escapeHtml(msg.content)}</div>
                        </div>
                    `;
                }).join('');
            } else {
                messagesHtml = '<p style="text-align:center; opacity: 0.7;">Tidak ada pesan</p>';
            }

            Swal.fire({
                title: `📱 ${phoneNumber}`,
                html: `<div style="max-height: 450px; overflow-y: auto; text-align: left;">${messagesHtml}</div>`,
                width: 650,
                showCloseButton: true,
                confirmButtonText: 'Tutup'
            });
        } catch (error) {
            console.error('Error viewing WA chat:', error);
            Toast.show('Gagal memuat detail chat', 'error');
        }
    },

    async deleteChat(phoneNumber) {
        const result = await Swal.fire({
            title: 'Hapus Chat?',
            text: `Riwayat chat WhatsApp ${phoneNumber} akan dihapus permanen.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${CONFIG.apiUrl}/api/wa/chat/history/${phoneNumber}`, {
                    method: 'DELETE',
                    headers: AuthManager.getAuthHeaders()
                });

                if (response.ok) {
                    Toast.show('Chat berhasil dihapus', 'success');
                    await this.loadChats();
                } else {
                    Toast.show('Gagal menghapus chat', 'error');
                }
            } catch (error) {
                console.error('Delete WA chat error:', error);
                Toast.show('Gagal menghapus chat', 'error');
            }
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===== Initialize Dashboard =====
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();

    if (AuthManager.init()) {
        UserManagement.init();
        TabManager.init();
        ChatHistoryManager.init();
        WAChatHistoryManager.init();
        console.log('📊 GOPOS Admin Dashboard Initialized');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    UserManagement.stopPolling();
});

