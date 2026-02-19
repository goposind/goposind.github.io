// ===== GOPOS Chat Page - ChatGPT/Gemini Style =====

const CONFIG = {
    apiUrl: 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd',
    endpoints: {
        chatbot: '/api/chatbot',      // Original Gemini endpoint (for guests)
        chat: '/api/chat',             // Chat with history (for logged in users)
        history: '/api/chat/history',  // Chat history endpoint (legacy)
        sessions: '/api/chat/sessions' // Multi-session endpoint
    }
};

// ===== Theme Management =====
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('gopos-theme') || 'dark';
        this.setTheme(savedTheme);
        this.updateIcon();
        this.bindEvents();
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('gopos-theme', theme);
        this.updateIcon();
    },

    updateIcon() {
        const theme = document.documentElement.getAttribute('data-theme');
        const icons = document.querySelectorAll('#themeToggle, #themeBtn');
        icons.forEach(icon => {
            if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        });
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },

    bindEvents() {
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('themeBtn')?.addEventListener('click', () => this.toggleTheme());
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
        this.updateUI();
        console.log('🔐 Auth:', this.token ? '✓ Token Present' : '✗ No Token');
    },

    isLoggedIn() {
        return !!this.token && !!this.user;
    },

    updateUI() {
        const userName = document.getElementById('sidebarUserName');
        if (userName) {
            userName.textContent = this.user?.name || this.user?.phonenumber || 'Guest';
        }
    },

    getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = this.token;
            console.log('📤 Auth headers created with token');
        } else {
            console.warn('⚠️ No token available for auth headers');
        }
        return headers;
    }
};

// ===== Sidebar Manager =====
const SidebarManager = {
    init() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('mobileOverlay');
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('menuBtn')?.addEventListener('click', () => this.toggle());
        document.getElementById('sidebarToggle')?.addEventListener('click', () => this.toggle());
        this.overlay?.addEventListener('click', () => this.close());
    },

    toggle() {
        this.sidebar?.classList.toggle('active');
        this.overlay?.classList.toggle('active');
    },

    close() {
        this.sidebar?.classList.remove('active');
        this.overlay?.classList.remove('active');
    }
};

// ===== Chat Manager =====
const ChatManager = {
    messages: [],
    conversationHistory: [], // For Gemini API context
    serverHistory: null, // Store full server history for sidebar persistence
    sessions: [],        // List of sessions for sidebar
    currentSessionId: null, // Current active session ID
    isTyping: false,

    init() {
        this.messagesContainer = document.getElementById('chatMessages');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.input = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');

        this.bindEvents();
        this.loadHistory();
        this.autoResizeInput();
    },

    bindEvents() {
        // Send button
        this.sendBtn?.addEventListener('click', () => this.sendMessage());

        // Enter to send (Shift+Enter for new line)
        this.input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Enable/disable send button based on input
        this.input?.addEventListener('input', () => {
            this.sendBtn.disabled = !this.input.value.trim();
            this.autoResizeInput();
        });

        // New chat button
        document.getElementById('newChatBtn')?.addEventListener('click', () => this.newChat());

        // Suggestion cards
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                if (prompt) {
                    this.input.value = prompt;
                    this.sendBtn.disabled = false;
                    this.sendMessage();
                }
            });
        });
    },

    autoResizeInput() {
        if (this.input) {
            this.input.style.height = 'auto';
            this.input.style.height = Math.min(this.input.scrollHeight, 200) + 'px';
        }
    },

    async loadHistory() {
        if (!AuthManager.isLoggedIn()) {
            // Load from sessionStorage for guests
            const sessionHistory = sessionStorage.getItem('gopos-chat-messages');
            if (sessionHistory) {
                this.messages = JSON.parse(sessionHistory);
                this.rebuildConversationHistory();
                this.renderMessages();
            }
            this.renderHistorySidebar();
            return;
        }

        // Load sessions list for logged-in users
        try {
            console.log('🔄 Loading chat sessions...');
            const response = await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.sessions}`, {
                headers: AuthManager.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.sessions = data.sessions || [];
                console.log('✅ Sessions loaded:', this.sessions.length);

                // If there are sessions, load the most recent one
                if (this.sessions.length > 0) {
                    await this.loadSession(this.sessions[0].id);
                }
            } else {
                console.error('❌ Failed to load sessions:', response.status);
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
        }

        this.renderHistorySidebar();
    },

    // Load a specific session by ID
    async loadSession(sessionId) {
        if (!sessionId) return;

        try {
            const response = await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.sessions}/${sessionId}`, {
                headers: AuthManager.getAuthHeaders()
            });

            if (response.ok) {
                const session = await response.json();
                this.currentSessionId = sessionId;

                // Convert to internal format
                if (session.messages && Array.isArray(session.messages)) {
                    this.messages = session.messages.map(m => ({
                        userMessage: m.message,
                        botResponse: m.response,
                        source: m.source,
                        timestamp: m.created_at
                    }));
                    this.rebuildConversationHistory();
                    this.renderMessages();
                } else {
                    this.messages = [];
                    this.conversationHistory = [];
                }

                console.log('📂 Session loaded:', sessionId);
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }

        this.renderHistorySidebar();
    },

    // Rebuild Gemini conversation history from messages
    rebuildConversationHistory() {
        this.conversationHistory = [];
        this.messages.forEach(msg => {
            this.conversationHistory.push({
                role: 'user',
                parts: [{ text: msg.userMessage }]
            });
            if (msg.botResponse) {
                this.conversationHistory.push({
                    role: 'model',
                    parts: [{ text: msg.botResponse }]
                });
            }
        });
        // Keep only last 20 messages for context
        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }
    },

    renderMessages() {
        if (this.messages.length === 0) {
            this.welcomeScreen.style.display = 'flex';
            this.messagesContainer.classList.remove('active');
            return;
        }

        this.welcomeScreen.style.display = 'none';
        this.messagesContainer.classList.add('active');
        this.messagesContainer.innerHTML = '';

        this.messages.forEach(msg => {
            // User message
            this.appendMessage('user', msg.userMessage);
            // Bot response
            if (msg.botResponse) {
                this.appendMessage('bot', msg.botResponse);
            }
        });

        this.scrollToBottom();
    },

    async appendMessage(role, content, animate = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${role}`;

        const avatar = role === 'user' ? '👤' : '📮';
        const avatarTitle = role === 'user' ? 'Anda' : 'GOPOS AI';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        messageDiv.innerHTML = `<div class="message-avatar" title="${avatarTitle}">${avatar}</div>`;
        messageDiv.appendChild(contentDiv);
        this.messagesContainer.appendChild(messageDiv);

        if (animate && role === 'bot') {
            // Typewriter effect for bot messages - wait for it to complete
            await this.typeWriter(contentDiv, content);
        } else {
            contentDiv.innerHTML = this.formatMessage(content);
        }
    },

    async typeWriter(element, text) {
        element.classList.add('typing');

        // Split text into words for word-by-word animation like Gemini
        const words = text.split(/(\s+)/);
        let currentText = '';
        let wordIndex = 0;

        // Calculate dynamic speed based on text length
        const baseSpeed = 30; // ms per word
        const minSpeed = 15;
        const speed = Math.max(minSpeed, baseSpeed - Math.floor(words.length / 10));

        return new Promise(resolve => {
            const addWord = () => {
                if (wordIndex < words.length) {
                    currentText += words[wordIndex];
                    element.innerHTML = this.formatMessage(currentText);
                    wordIndex++;
                    this.scrollToBottom();

                    // Variable speed - faster for spaces, slower for words
                    const nextDelay = words[wordIndex - 1].trim() === '' ? speed / 3 : speed;
                    setTimeout(addWord, nextDelay);
                } else {
                    // Done typing
                    element.classList.remove('typing');
                    element.innerHTML = this.formatMessage(text);
                    resolve();
                }
            };

            // Start animation
            addWord();
        });
    },

    formatMessage(content) {
        if (!content) return '';

        // Enhanced markdown-like formatting
        let formatted = content
            // Escape HTML first
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Parse markdown tables
        formatted = this.parseMarkdownTables(formatted);

        formatted = formatted
            // Code blocks (```)
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code (`)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold (**)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic (*)
            .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
            // Bullet points
            .replace(/^• /gm, '<span class="bullet">•</span> ')
            .replace(/^- /gm, '<span class="bullet">•</span> ')
            // Numbered lists
            .replace(/^(\d+)\. /gm, '<span class="number">$1.</span> ')
            // Line breaks (but not inside tables)
            .replace(/\n/g, '<br>');

        return formatted;
    },

    // Parse markdown tables into HTML tables
    parseMarkdownTables(text) {
        const lines = text.split('\n');
        let result = [];
        let tableLines = [];
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check if line looks like a table row (starts and ends with |)
            if (line.startsWith('|') && line.endsWith('|')) {
                // Check if it's a separator line (|---|---|)
                const isSeparator = /^\|[\s\-:]+\|$/.test(line.replace(/\|/g, '|').replace(/[^|\-:\s]/g, ''));

                if (!inTable) {
                    inTable = true;
                    tableLines = [];
                }

                tableLines.push({ line, isSeparator });
            } else {
                // If we were in a table, render it
                if (inTable && tableLines.length > 0) {
                    result.push(this.renderTable(tableLines));
                    tableLines = [];
                    inTable = false;
                }
                result.push(line);
            }
        }

        // Handle table at the end of content
        if (inTable && tableLines.length > 0) {
            result.push(this.renderTable(tableLines));
        }

        return result.join('\n');
    },

    // Render a markdown table as HTML
    renderTable(tableLines) {
        if (tableLines.length < 2) {
            // Not enough lines for a valid table
            return tableLines.map(t => t.line).join('\n');
        }

        let html = '<div class="table-container"><table class="chat-table">';
        let isHeader = true;
        let hasRenderedHeader = false;

        for (const { line, isSeparator } of tableLines) {
            if (isSeparator) {
                // Skip separator line, but mark that next rows are body
                isHeader = false;
                continue;
            }

            // Parse cells
            const cells = line
                .split('|')
                .slice(1, -1) // Remove empty first and last elements
                .map(cell => cell.trim());

            if (cells.length === 0) continue;

            if (isHeader && !hasRenderedHeader) {
                html += '<thead><tr>';
                cells.forEach(cell => {
                    html += `<th>${cell}</th>`;
                });
                html += '</tr></thead><tbody>';
                hasRenderedHeader = true;
            } else {
                html += '<tr>';
                cells.forEach(cell => {
                    html += `<td>${cell}</td>`;
                });
                html += '</tr>';
            }
        }

        html += '</tbody></table></div>';
        return html;
    },

    showTyping() {
        if (this.isTyping) return;
        this.isTyping = true;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message message-bot';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-avatar" title="GOPOS AI">📮</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                    <span class="typing-text">GOPOS AI sedang mengetik...</span>
                </div>
            </div>
        `;

        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    },

    hideTyping() {
        this.isTyping = false;
        document.getElementById('typingIndicator')?.remove();
    },

    async sendMessage() {
        const text = this.input?.value.trim();
        if (!text || this.isTyping) return;

        // Hide welcome screen
        this.welcomeScreen.style.display = 'none';
        this.messagesContainer.classList.add('active');

        // Add user message to UI
        this.appendMessage('user', text);
        this.input.value = '';
        this.sendBtn.disabled = true;
        this.autoResizeInput();
        this.scrollToBottom();

        // Add to conversation history for context
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: text }]
        });

        // Show typing indicator
        this.showTyping();

        try {
            let botResponse, source;

            if (AuthManager.isLoggedIn()) {
                // Use /api/chat endpoint (saves to session)
                const response = await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.chat}`, {
                    method: 'POST',
                    headers: AuthManager.getAuthHeaders(),
                    body: JSON.stringify({
                        session_id: this.currentSessionId || '',
                        message: text,
                        history: this.conversationHistory.slice(-20)
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    console.error('❌ Save failed:', response.status, data);
                } else {
                    console.log('💾 Message saved to session:', data.session_id);
                    // Update currentSessionId if new session was created
                    if (data.session_id && !this.currentSessionId) {
                        this.currentSessionId = data.session_id;
                    }
                }

                botResponse = data.response || 'Maaf, terjadi kesalahan.';
                source = data.source || 'unknown';

            } else {
                // Use /api/chatbot endpoint (Gemini only, no persistence)
                const response = await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.chatbot}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: text,
                        history: this.conversationHistory.slice(-20)
                    })
                });

                const data = await response.json();
                botResponse = data.response || 'Maaf, terjadi kesalahan.';
                source = data.source || 'unknown';
            }

            this.hideTyping();



            // Add bot response to conversation history
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: botResponse }]
            });

            // Keep conversation history manageable
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            // Add to messages array
            this.messages.push({
                userMessage: text,
                botResponse: botResponse,
                source: source,
                timestamp: new Date().toISOString()
            });

            // Update serverHistory immediately for logged-in users
            if (AuthManager.isLoggedIn()) {
                if (!this.serverHistory) {
                    this.serverHistory = {
                        messages: []
                    };
                }
                // Add new message to serverHistory
                this.serverHistory.messages.push({
                    message: text,
                    response: botResponse,
                    source: source,
                    created_at: new Date().toISOString()
                });
            } else {
                // Save to sessionStorage for guests
                sessionStorage.setItem('gopos-chat-messages', JSON.stringify(this.messages));
            }

            // Display bot response with animation and wait for it to complete
            await this.appendMessage('bot', botResponse, true);

            // Show follow-up suggestions AFTER typing animation is done
            this.showFollowUpSuggestions(text, botResponse);

            this.scrollToBottom();

            // Refresh sessions list for logged-in users (to update sidebar with new/updated sessions)
            if (AuthManager.isLoggedIn()) {
                await this.refreshSessions();
            } else {
                this.renderHistorySidebar();
            }

        } catch (error) {
            console.error('Chat error:', error);
            this.hideTyping();

            // Remove failed user message from history
            this.conversationHistory.pop();

            this.appendMessage('bot', 'Maaf, terjadi kesalahan koneksi. Silakan coba lagi.');
        }
    },

    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    },

    newChat() {
        // Clear current session state
        this.messages = [];
        this.conversationHistory = [];
        this.currentSessionId = null; // Will create new session on first message

        // Clear UI and show welcome screen
        this.messagesContainer.innerHTML = '';
        this.messagesContainer.classList.remove('active');
        this.welcomeScreen.style.display = 'flex';

        this.renderHistorySidebar();
        SidebarManager.close();
    },

    async clearServerHistory() {
        try {
            await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.history}`, {
                method: 'DELETE',
                headers: AuthManager.getAuthHeaders()
            });
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    },

    showFollowUpSuggestions(userMessage, botResponse) {
        // Remove existing suggestions
        const existingSuggestions = this.messagesContainer.querySelector('.follow-up-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }

        // Generate contextual suggestions based on the conversation
        const suggestions = this.generateSuggestions(userMessage, botResponse);

        if (suggestions.length === 0) return;

        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'follow-up-suggestions';
        suggestionsDiv.innerHTML = suggestions.map(suggestion =>
            `<button class="follow-up-chip" data-prompt="${this.escapeHtml(suggestion)}">${this.escapeHtml(suggestion)}</button>`
        ).join('');

        this.messagesContainer.appendChild(suggestionsDiv);

        // Add click handlers
        suggestionsDiv.querySelectorAll('.follow-up-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.dataset.prompt;
                this.input.value = prompt;
                this.sendBtn.disabled = false;
                suggestionsDiv.remove();
                this.sendMessage();
            });
        });
    },

    generateSuggestions(userMessage, botResponse) {
        const suggestions = [];
        const lowerMessage = userMessage.toLowerCase();
        const lowerResponse = botResponse.toLowerCase();

        // Detect if user is writing in English
        const isEnglish = /\b(how much|shipping|delivery|ship to|send to|cost|price|what|services|available)\b/i.test(userMessage);

        // International shipping related
        if (lowerMessage.includes('internasional') || lowerMessage.includes('ems') ||
            lowerMessage.includes('luar negeri') || lowerResponse.includes('internasional') ||
            lowerResponse.includes('zona') || lowerMessage.includes('international') ||
            lowerMessage.includes('overseas') || lowerResponse.includes('zone')) {
            if (isEnglish) {
                suggestions.push('How much to ship 1kg to Japan?');
                suggestions.push('What documents for export?');
                suggestions.push('How long does EMS take?');
            } else {
                suggestions.push('Berapa ongkir ke Jepang 1kg?');
                suggestions.push('Dokumen apa saja untuk ekspor?');
                suggestions.push('Berapa lama pengiriman EMS?');
            }
        }
        // Ongkir related (both domestic and international)
        else if (lowerMessage.includes('ongkir') || lowerMessage.includes('tarif') || lowerResponse.includes('ongkir') ||
            lowerMessage.includes('shipping') || lowerMessage.includes('cost') || lowerMessage.includes('rate')) {
            if (isEnglish) {
                suggestions.push('How much to ship 2kg to Malaysia?');
                suggestions.push('What is the difference between EMS and Parcel?');
                suggestions.push('How much to ship 1kg to Singapore?');
            } else {
                suggestions.push('Berapa ongkir ke Malaysia 2kg?');
                suggestions.push('Apa perbedaan EMS dan Paket Pos?');
                suggestions.push('Berapa ongkir ke Singapura 1kg?');
            }
        }
        // Document related
        else if (lowerMessage.includes('dokumen') || lowerMessage.includes('cn23') ||
            lowerResponse.includes('dokumen') || lowerResponse.includes('invoice') ||
            lowerMessage.includes('document') || lowerMessage.includes('customs')) {
            if (isEnglish) {
                suggestions.push('How to fill CN23?');
                suggestions.push('What is a Commercial Invoice?');
                suggestions.push('Export value limit?');
            } else {
                suggestions.push('Cara mengisi CN23?');
                suggestions.push('Apa itu Commercial Invoice?');
                suggestions.push('Batas nilai barang ekspor?');
            }
        }
        // Kantor pos related
        else if (lowerMessage.includes('kantor pos') || lowerMessage.includes('lokasi') || lowerResponse.includes('kantor pos') ||
            lowerMessage.includes('post office') || lowerMessage.includes('location')) {
            if (isEnglish) {
                suggestions.push('Post office operating hours?');
                suggestions.push('Can I send EMS at all post offices?');
                suggestions.push('Can I pick up packages at the post office?');
            } else {
                suggestions.push('Jam operasional kantor pos?');
                suggestions.push('Bisa kirim EMS di semua kantor pos?');
                suggestions.push('Apakah bisa ambil paket di kantor pos?');
            }
        }
        // Layanan related
        else if (lowerMessage.includes('layanan') || lowerResponse.includes('layanan') ||
            lowerMessage.includes('service') || lowerResponse.includes('service')) {
            if (isEnglish) {
                suggestions.push('What is EMS?');
                suggestions.push('How much to ship to Europe?');
                suggestions.push('Which countries are covered?');
            } else {
                suggestions.push('Apa itu EMS?');
                suggestions.push('Berapa tarif kirim ke Eropa?');
                suggestions.push('Negara mana saja yang dijangkau?');
            }
        }
        // Default suggestions - mix of both languages
        else {
            if (isEnglish) {
                suggestions.push('How much to ship to Singapore?');
                suggestions.push('Shipping from Jakarta to Bandung?');
                suggestions.push('What international shipping services?');
            } else {
                suggestions.push('Berapa ongkir ke Singapura?');
                suggestions.push('Berapa ongkir Jakarta ke Bandung?');
                suggestions.push('Apa saja layanan pengiriman internasional?');
            }
        }

        // Limit to 3 suggestions
        return suggestions.slice(0, 3);
    },

    // Refresh sessions list from server
    async refreshSessions() {
        try {
            const response = await fetch(`${CONFIG.apiUrl}${CONFIG.endpoints.sessions}`, {
                headers: AuthManager.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.sessions = data.sessions || [];
                console.log('🔄 Sessions refreshed:', this.sessions.length);
                this.renderHistorySidebar();
            }
        } catch (error) {
            console.error('Failed to refresh sessions:', error);
        }
    },

    renderHistorySidebar() {
        const todayHistory = document.getElementById('todayHistory');
        const previousHistory = document.getElementById('previousHistory');

        if (!todayHistory || !previousHistory) return;

        // For logged-in users, show sessions list
        if (AuthManager.isLoggedIn() && this.sessions.length > 0) {
            // Get today's date for comparison
            const today = new Date().toDateString();

            let todayHtml = '';
            let previousHtml = '';

            this.sessions.forEach(session => {
                const sessionDate = new Date(session.updated_at).toDateString();
                const isActive = session.id === this.currentSessionId;
                const title = this.escapeHtml(session.title || 'Percakapan');

                const itemHtml = `
                    <div class="history-item ${isActive ? 'active' : ''}" data-session-id="${session.id}" style="cursor: pointer;">
                        <span class="icon">💬</span>
                        <span class="title">${title}</span>
                    </div>
                `;

                if (sessionDate === today) {
                    todayHtml += itemHtml;
                } else {
                    previousHtml += itemHtml;
                }
            });

            todayHistory.innerHTML = todayHtml || '<div class="history-item empty-state" style="cursor: default; opacity: 0.7;">Belum ada chat hari ini</div>';
            previousHistory.innerHTML = previousHtml;

            // Add click handlers
            document.querySelectorAll('.history-item[data-session-id]').forEach(item => {
                item.addEventListener('click', () => {
                    const sessionId = item.getAttribute('data-session-id');
                    this.loadSession(sessionId);
                    SidebarManager.close();
                });
            });

            return;
        }

        // For guests or no sessions, show message-based history
        if (this.messages.length === 0) {
            todayHistory.innerHTML = '<div class="history-item empty-state" style="cursor: default; opacity: 0.7;">Belum ada percakapan</div>';
            previousHistory.innerHTML = '';
            return;
        }

        // Show current session title for guests
        const latestMessage = this.messages[this.messages.length - 1];
        const messageText = latestMessage.userMessage || latestMessage.message || 'Chat';
        const title = messageText.substring(0, 30) + (messageText.length > 30 ? '...' : '');

        todayHistory.innerHTML = `
            <div class="history-item active">
                <span class="icon">💬</span>
                <span class="title">${this.escapeHtml(title)}</span>
            </div>
        `;
        previousHistory.innerHTML = '';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    AuthManager.init();
    SidebarManager.init();
    ChatManager.init();

});
