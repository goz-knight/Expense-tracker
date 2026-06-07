/* ============================================
   EXPENSE TRACKER - APPLICATION LOGIC
   ============================================ */

// ---- Categories ----
const CATEGORIES = {
    expense: [
        { id: 'food', name: 'Food & Dining', icon: '🍕', color: '#171717' },
        { id: 'transport', name: 'Transportation', icon: '🚗', color: '#404040' },
        { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#525252' },
        { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#737373' },
        { id: 'bills', name: 'Bills & Utilities', icon: '🔌', color: '#a3a3a3' },
        { id: 'health', name: 'Health', icon: '💊', color: '#262626' },
        { id: 'education', name: 'Education', icon: '📚', color: '#6b7280' },
        { id: 'other_expense', name: 'Other', icon: '📦', color: '#d4d4d4' },
    ],
    income: [
        { id: 'salary', name: 'Salary', icon: '💼', color: '#16a34a' },
        { id: 'freelance', name: 'Freelance', icon: '💻', color: '#15803d' },
        { id: 'investment', name: 'Investment', icon: '📈', color: '#166534' },
        { id: 'gift', name: 'Gift', icon: '🎁', color: '#14532d' },
        { id: 'other_income', name: 'Other', icon: '💰', color: '#22c55e' },
    ],
};

// ---- State ----
let transactions = JSON.parse(localStorage.getItem('expenseTracker_transactions') || '[]');
let editingId = null;
let deleteId = null;
let currentType = 'expense';

// ---- DOM Elements ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    setupGreeting();
    setupNavigation();
    setupModal();
    setupFilters();
    setupMobile();
    populateCategoryFilters();
    renderAll();
    lucide.createIcons();
});

// ---- Greeting Setup ----
function setupGreeting() {
    const greetEl = $('#greetingText');
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    if (greetEl) greetEl.textContent = greeting;
}

// ---- Navigation ----
function setupNavigation() {
    $$('.nav-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });

    $$('.see-all').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(link.dataset.view);
        });
    });
}

function switchView(viewName) {
    $$('.nav-item').forEach((n) => n.classList.remove('active'));
    $(`.nav-item[data-view="${viewName}"]`).classList.add('active');

    $$('.view').forEach((v) => v.classList.remove('active'));
    $(`#${viewName}View`).classList.add('active');

    // Close mobile sidebar
    $('#sidebar').classList.remove('open');
    const overlay = $('.sidebar-overlay');
    if (overlay) overlay.classList.remove('active');

    if (viewName === 'analytics') renderAnalytics();
}

// ---- Modal ----
function setupModal() {
    const openModal = () => {
        editingId = null;
        resetForm();
        $('#modalTitle').textContent = 'Add Transaction';
        $('#saveBtn').innerHTML = '<i data-lucide="check"></i> Save Transaction';
        $('#modalOverlay').classList.add('active');
        lucide.createIcons();
    };

    $('#addTransactionBtn').addEventListener('click', openModal);
    $('#addTransactionBtn2').addEventListener('click', openModal);
    $('#addBtnMobile').addEventListener('click', openModal);

    const closeModal = () => {
        $('#modalOverlay').classList.remove('active');
        resetForm();
    };

    $('#modalClose').addEventListener('click', closeModal);
    $('#cancelBtn').addEventListener('click', closeModal);
    $('#modalOverlay').addEventListener('click', (e) => {
        if (e.target === $('#modalOverlay')) closeModal();
    });

    // Type toggle
    $('#expenseToggle').addEventListener('click', () => setTransactionType('expense'));
    $('#incomeToggle').addEventListener('click', () => setTransactionType('income'));

    // Form submit
    $('#transactionForm').addEventListener('submit', handleFormSubmit);

    // Delete modal
    $('#deleteModalClose').addEventListener('click', () => {
        $('#deleteModalOverlay').classList.remove('active');
    });
    $('#cancelDeleteBtn').addEventListener('click', () => {
        $('#deleteModalOverlay').classList.remove('active');
    });
    $('#confirmDeleteBtn').addEventListener('click', () => {
        if (deleteId !== null) {
            transactions = transactions.filter((t) => t.id !== deleteId);
            saveTransactions();
            renderAll();
            showToast('Transaction deleted');
            deleteId = null;
        }
        $('#deleteModalOverlay').classList.remove('active');
    });

    // Set default date
    $('#transactionDate').valueAsDate = new Date();
}

function setTransactionType(type) {
    currentType = type;
    $('#expenseToggle').classList.toggle('active', type === 'expense');
    $('#incomeToggle').classList.toggle('active', type === 'income');
    populateCategorySelect();
}

function populateCategorySelect() {
    const select = $('#transactionCategory');
    select.innerHTML = '<option value="">Select category</option>';
    CATEGORIES[currentType].forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.icon} ${cat.name}`;
        select.appendChild(option);
    });
}

function resetForm() {
    $('#transactionForm').reset();
    currentType = 'expense';
    setTransactionType('expense');
    $('#transactionDate').valueAsDate = new Date();
}

function handleFormSubmit(e) {
    e.preventDefault();

    const name = $('#transactionName').value.trim();
    const amount = parseFloat($('#transactionAmount').value);
    const category = $('#transactionCategory').value;
    const date = $('#transactionDate').value;
    const note = $('#transactionNote').value.trim();

    if (!name || !amount || !category || !date) return;

    if (editingId) {
        const idx = transactions.findIndex((t) => t.id === editingId);
        if (idx !== -1) {
            transactions[idx] = { ...transactions[idx], name, amount, category, date, note, type: currentType };
        }
        showToast('Transaction updated');
    } else {
        transactions.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            name,
            amount,
            category,
            date,
            note,
            type: currentType,
            createdAt: new Date().toISOString(),
        });
        showToast('Transaction saved');
    }

    saveTransactions();
    renderAll();
    $('#modalOverlay').classList.remove('active');
    resetForm();
}

// ---- Edit / Delete ----
function editTransaction(id) {
    const t = transactions.find((tx) => tx.id === id);
    if (!t) return;

    editingId = id;
    setTransactionType(t.type);
    $('#transactionName').value = t.name;
    $('#transactionAmount').value = t.amount;
    $('#transactionCategory').value = t.category;
    $('#transactionDate').value = t.date;
    $('#transactionNote').value = t.note || '';

    $('#modalTitle').textContent = 'Edit Transaction';
    $('#saveBtn').innerHTML = '<i data-lucide="check"></i> Update Transaction';
    $('#modalOverlay').classList.add('active');
    lucide.createIcons();
}

function confirmDelete(id) {
    deleteId = id;
    $('#deleteModalOverlay').classList.add('active');
}

// ---- Filters ----
function setupFilters() {
    $('#searchInput').addEventListener('input', renderTransactionsList);
    $('#filterType').addEventListener('change', renderTransactionsList);
    $('#filterCategory').addEventListener('change', renderTransactionsList);
    $('#filterSort').addEventListener('change', renderTransactionsList);
    $('#analyticsPeriod').addEventListener('change', renderAnalytics);
}

function populateCategoryFilters() {
    const select = $('#filterCategory');
    select.innerHTML = '<option value="all">All Categories</option>';
    [...CATEGORIES.expense, ...CATEGORIES.income].forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.icon} ${cat.name}`;
        select.appendChild(option);
    });
}

function getFilteredTransactions() {
    const search = ($('#searchInput')?.value || '').toLowerCase();
    const type = $('#filterType')?.value || 'all';
    const category = $('#filterCategory')?.value || 'all';
    const sort = $('#filterSort')?.value || 'newest';

    let filtered = [...transactions];

    if (search) {
        filtered = filtered.filter(
            (t) => t.name.toLowerCase().includes(search) || (t.note || '').toLowerCase().includes(search)
        );
    }
    if (type !== 'all') {
        filtered = filtered.filter((t) => t.type === type);
    }
    if (category !== 'all') {
        filtered = filtered.filter((t) => t.category === category);
    }

    switch (sort) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'highest':
            filtered.sort((a, b) => b.amount - a.amount);
            break;
        case 'lowest':
            filtered.sort((a, b) => a.amount - b.amount);
            break;
    }

    return filtered;
}

// ---- Mobile ----
function setupMobile() {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    $('#menuToggle').addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        $('#sidebar').classList.remove('open');
        overlay.classList.remove('active');
    });
}

// ---- Data ----
function saveTransactions() {
    localStorage.setItem('expenseTracker_transactions', JSON.stringify(transactions));
}

function getCategoryInfo(catId) {
    const allCats = [...CATEGORIES.expense, ...CATEGORIES.income];
    return allCats.find((c) => c.id === catId) || { name: 'Other', icon: '📦', color: '#737373' };
}

// ---- Rendering ----
function renderAll() {
    renderSummary();
    renderRecentTransactions();
    renderTransactionsList();
    renderMonthlyChart();
    renderCategoryChart();
    renderAnalytics();
}

function renderSummary() {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    $('#totalBalance').textContent = formatCurrency(balance);
    $('#totalIncome').textContent = formatCurrency(income);
    $('#totalExpense').textContent = formatCurrency(expense);
}

function renderRecentTransactions() {
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 5);
    const container = $('#recentTransactionsList');

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="receipt"></i>
                <p>No transactions yet</p>
                <span>Add your first transaction to get started</span>
            </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = recent.map((t) => createTransactionHTML(t)).join('');
    lucide.createIcons();
    attachTransactionListeners(container);
}

function renderTransactionsList() {
    const filtered = getFilteredTransactions();
    const container = $('#allTransactionsList');

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="receipt"></i>
                <p>No transactions found</p>
                <span>Try adjusting your filters or add a new transaction</span>
            </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = filtered.map((t) => createTransactionHTML(t)).join('');
    lucide.createIcons();
    attachTransactionListeners(container);
}

function createTransactionHTML(t) {
    const cat = getCategoryInfo(t.category);
    const sign = t.type === 'income' ? '+' : '-';
    const cls = t.type;
    const dateStr = new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return `
        <div class="transaction-item" data-id="${t.id}">
            <div class="transaction-icon" style="background:${t.type === 'income' ? '#f0fdf4' : '#f5f5f5'}">${cat.icon}</div>
            <div class="transaction-details">
                <div class="transaction-name">${escapeHtml(t.name)}</div>
                <div class="transaction-meta">
                    <span>${cat.name}</span>
                    <span class="dot"></span>
                    <span>${dateStr}</span>
                </div>
            </div>
            <div class="transaction-amount ${cls}">${sign}${formatCurrency(t.amount)}</div>
            <div class="transaction-actions">
                <button class="action-btn edit-btn" title="Edit"><i data-lucide="pencil"></i></button>
                <button class="action-btn delete delete-btn" title="Delete"><i data-lucide="trash-2"></i></button>
            </div>
        </div>`;
}

function attachTransactionListeners(container) {
    container.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('.transaction-item').dataset.id;
            editTransaction(id);
        });
    });
    container.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('.transaction-item').dataset.id;
            confirmDelete(id);
        });
    });
}

// ---- Charts ----
function renderMonthlyChart() {
    const canvas = $('#monthlyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // Last 6 months data
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: d.toLocaleDateString('en-US', { month: 'short' }),
            year: d.getFullYear(),
            month: d.getMonth(),
        });
    }

    const monthData = months.map((m) => {
        const income = transactions
            .filter((t) => {
                const d = new Date(t.date);
                return t.type === 'income' && d.getMonth() === m.month && d.getFullYear() === m.year;
            })
            .reduce((s, t) => s + t.amount, 0);
        const expense = transactions
            .filter((t) => {
                const d = new Date(t.date);
                return t.type === 'expense' && d.getMonth() === m.month && d.getFullYear() === m.year;
            })
            .reduce((s, t) => s + t.amount, 0);
        return { ...m, income, expense };
    });

    const maxVal = Math.max(...monthData.map((d) => Math.max(d.income, d.expense)), 100);

    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    // Grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = paddingTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(w - paddingRight, y);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#a3a3a3';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        const val = maxVal - (maxVal / 4) * i;
        ctx.fillText(formatCompact(val), paddingLeft - 10, y + 4);
    }

    // Bars
    const groupWidth = chartW / months.length;
    const barWidth = groupWidth * 0.25;
    const gap = 4;

    monthData.forEach((d, i) => {
        const x = paddingLeft + groupWidth * i + groupWidth / 2;

        // Income bar
        const incomeH = maxVal > 0 ? (d.income / maxVal) * chartH : 0;
        ctx.fillStyle = '#000000';
        const rx1 = x - barWidth - gap / 2;
        const ry1 = paddingTop + chartH - incomeH;
        roundedRect(ctx, rx1, ry1, barWidth, incomeH, 4);

        // Expense bar
        const expenseH = maxVal > 0 ? (d.expense / maxVal) * chartH : 0;
        ctx.fillStyle = '#d4d4d4';
        const rx2 = x + gap / 2;
        const ry2 = paddingTop + chartH - expenseH;
        roundedRect(ctx, rx2, ry2, barWidth, expenseH, 4);

        // Month label
        ctx.fillStyle = '#737373';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, x, h - 12);
    });

    // Legend
    ctx.fillStyle = '#000000';
    roundedRect(ctx, w - 160, 8, 10, 10, 2);
    ctx.fillStyle = '#404040';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Income', w - 145, 17);

    ctx.fillStyle = '#d4d4d4';
    roundedRect(ctx, w - 85, 8, 10, 10, 2);
    ctx.fillStyle = '#404040';
    ctx.fillText('Expense', w - 70, 17);
}

function renderCategoryChart() {
    const canvas = $('#categoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const expenses = transactions.filter((t) => t.type === 'expense');
    const catTotals = {};
    expenses.forEach((t) => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });

    const sortedCats = Object.entries(catTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const total = sortedCats.reduce((s, [, v]) => s + v, 0);
    const legendContainer = $('#categoryLegend');

    if (total === 0) {
        // Draw empty circle
        ctx.strokeStyle = '#e5e5e5';
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 30, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#a3a3a3';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No expenses', w / 2, h / 2);

        legendContainer.innerHTML = '';
        return;
    }

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 30;
    const grays = ['#171717', '#404040', '#525252', '#737373', '#a3a3a3', '#d4d4d4'];

    let startAngle = -Math.PI / 2;
    const legendItems = [];

    sortedCats.forEach(([catId, amount], i) => {
        const cat = getCategoryInfo(catId);
        const slice = (amount / total) * Math.PI * 2;
        const color = grays[i % grays.length];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Thin white border between slices
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        legendItems.push(`
            <div class="legend-item">
                <span class="legend-dot" style="background:${color}"></span>
                ${cat.icon} ${cat.name}
            </div>`);

        startAngle += slice;
    });

    // Inner donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Center text
    ctx.fillStyle = '#171717';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatCurrency(total), cx, cy + 5);

    legendContainer.innerHTML = legendItems.join('');
}

// ---- Analytics ----
function renderAnalytics() {
    const period = $('#analyticsPeriod')?.value || 'month';
    const now = new Date();
    let filtered = [...transactions];

    if (period === 'month') {
        filtered = filtered.filter((t) => {
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    } else if (period === 'year') {
        filtered = filtered.filter((t) => {
            const d = new Date(t.date);
            return d.getFullYear() === now.getFullYear();
        });
    }

    const expenses = filtered.filter((t) => t.type === 'expense');
    const incomeTotal = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenseTotal = expenses.reduce((s, t) => s + t.amount, 0);

    // Stats
    const daysInPeriod = period === 'month' ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : period === 'year' ? 365 : Math.max(1, Math.ceil((now - new Date(Math.min(...transactions.map(t => new Date(t.date))))) / 86400000));
    const avgDaily = expenseTotal / Math.max(daysInPeriod, 1);
    const largest = expenses.length ? Math.max(...expenses.map((t) => t.amount)) : 0;
    const savingsRate = incomeTotal > 0 ? ((incomeTotal - expenseTotal) / incomeTotal) * 100 : 0;

    $('#avgDaily').textContent = formatCurrency(avgDaily);
    $('#largestExpense').textContent = formatCurrency(largest);
    $('#totalTransactions').textContent = filtered.length;
    $('#savingsRate').textContent = Math.max(0, savingsRate).toFixed(1) + '%';

    // Category breakdown
    const catTotals = {};
    expenses.forEach((t) => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });

    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const maxCat = sortedCats.length ? sortedCats[0][1] : 0;

    const breakdownEl = $('#categoryBreakdown');

    if (sortedCats.length === 0) {
        breakdownEl.innerHTML = `
            <div class="empty-state">
                <i data-lucide="pie-chart"></i>
                <p>No data yet</p>
                <span>Add some transactions to see your breakdown</span>
            </div>`;
        lucide.createIcons();
        return;
    }

    breakdownEl.innerHTML = sortedCats
        .map(([catId, amount]) => {
            const cat = getCategoryInfo(catId);
            const pct = expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0;
            const barPct = maxCat > 0 ? (amount / maxCat) * 100 : 0;
            return `
            <div class="breakdown-row">
                <div class="breakdown-icon">${cat.icon}</div>
                <div class="breakdown-info">
                    <div class="breakdown-name">${cat.name}</div>
                    <div class="breakdown-bar">
                        <div class="breakdown-fill" style="width:${barPct}%"></div>
                    </div>
                </div>
                <div>
                    <div class="breakdown-amount">${formatCurrency(amount)}</div>
                    <span class="breakdown-percent">${pct.toFixed(1)}%</span>
                </div>
            </div>`;
        })
        .join('');
}

// ---- Utilities ----
function formatCurrency(n) {
    return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompact(n) {
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
    return '$' + n.toFixed(0);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function roundedRect(ctx, x, y, w, h, r) {
    if (h < 1) return;
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

function showToast(message) {
    const toast = $('#toast');
    $('#toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// Re-render charts on resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        renderMonthlyChart();
        renderCategoryChart();
    }, 200);
});
