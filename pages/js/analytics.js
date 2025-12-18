// GOPOS API Configuration
const API_URL = 'https://asia-southeast2-proyek3-smz.cloudfunctions.net/GoPosInd';
let analyticsData = null;
let usageChart, intentChart, hourlyChart, cityChart;

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    loadAnalytics();
    loadDashboardStats();
});

async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/api/analytics`);
        if (response.ok) {
            analyticsData = await response.json();
            updateCharts(analyticsData);
            console.log('📈 Analytics loaded from server');
        }
    } catch (error) { console.warn('Using default analytics data'); }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/api/dashboard/stats`);
        if (response.ok) {
            const stats = await response.json();
            const statValues = document.querySelectorAll('.stat-value');
            if (statValues.length >= 4) {
                statValues[0].textContent = stats.total_chats?.toLocaleString('id-ID') || '12,458';
                statValues[1].textContent = stats.active_users?.toLocaleString('id-ID') || '3,284';
                statValues[2].textContent = stats.tracking_requests?.toLocaleString('id-ID') || '8,932';
                statValues[3].textContent = stats.average_rating?.toFixed(1) || '4.8';
            }
        }
    } catch (error) { console.warn('Using default stats'); }
}

function initCharts() {
    // Usage Chart
    usageChart = new Chart(document.getElementById('usageChart'), {
        type: 'line',
        data: {
            labels: Array.from({ length: 30 }, (_, i) => `${i + 1} Des`),
            datasets: [{
                label: 'Percakapan',
                data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 800) + 400),
                borderColor: '#1E3A5F',
                backgroundColor: 'rgba(30, 58, 95, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Intent Chart
    intentChart = new Chart(document.getElementById('intentChart'), {
        type: 'doughnut',
        data: {
            labels: ['Cek Ongkir', 'Cari Kantor', 'Layanan', 'FAQ', 'Lainnya'],
            datasets: [{ data: [42, 28, 15, 10, 5], backgroundColor: ['#1E3A5F', '#F26522', '#3B82F6', '#10B981', '#6B7280'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom' } } }
    });

    // Hourly Chart
    hourlyChart = new Chart(document.getElementById('hourlyChart'), {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{ label: 'Pengguna', data: [50, 30, 20, 15, 10, 25, 80, 180, 320, 450, 500, 480, 420, 400, 380, 420, 480, 520, 450, 350, 280, 180, 120, 80], backgroundColor: '#F26522' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // City Chart
    cityChart = new Chart(document.getElementById('cityChart'), {
        type: 'bar',
        data: {
            labels: ['Jakarta', 'Surabaya', 'Bandung', 'Semarang', 'Medan'],
            datasets: [{ label: 'Pengguna', data: [4500, 2800, 2200, 1800, 1500], backgroundColor: ['#1E3A5F', '#2B4F7A', '#3B82F6', '#60A5FA', '#93C5FD'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
}

function updateCharts(data) {
    if (data.daily_chats && usageChart) {
        usageChart.data.labels = data.daily_chats.map(d => d.date);
        usageChart.data.datasets[0].data = data.daily_chats.map(d => d.count);
        usageChart.update();
    }
    if (data.intent_breakdown && intentChart) {
        intentChart.data.labels = data.intent_breakdown.map(i => i.intent);
        intentChart.data.datasets[0].data = data.intent_breakdown.map(i => i.percentage);
        intentChart.update();
    }
    if (data.hourly_activity && hourlyChart) {
        hourlyChart.data.datasets[0].data = data.hourly_activity;
        hourlyChart.update();
    }
    if (data.top_cities && cityChart) {
        cityChart.data.labels = data.top_cities.map(c => c.city);
        cityChart.data.datasets[0].data = data.top_cities.map(c => c.count);
        cityChart.update();
    }
}

// Export to PDF function
async function exportToPDF() {
    const { jsPDF } = window.jspdf;

    Swal.fire({
        title: 'Generating PDF...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const content = document.querySelector('.content-wrapper');
        const canvas = await html2canvas(content, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.setFontSize(20);
        pdf.setTextColor(30, 58, 95);
        pdf.text('GOPOS Analytics Report', 14, 20);
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 28);

        pdf.addImage(imgData, 'PNG', 0, 35, pdfWidth, pdfHeight);
        pdf.save(`GOPOS_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);

        Swal.fire({
            icon: 'success',
            title: 'PDF Berhasil Dibuat!',
            text: 'File telah diunduh ke komputer Anda.',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('PDF Export Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal Export PDF',
            text: 'Terjadi kesalahan saat membuat PDF.'
        });
    }
}
