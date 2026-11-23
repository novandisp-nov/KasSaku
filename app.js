/* ==========================================
   1. KONFIGURASI & STATE APLIKASI
   ========================================== */
const STORAGE_KEY = 'kassaku_data_v1';

// Data awal jika aplikasi baru pertama kali dibuka
const defaultState = {
  budget: 0,
  transactions: [],
  hasEnteredApp: false
};

// Ambil data dari localStorage atau pakai defaultState
let state = loadState();
let deferredInstallPrompt = null;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...defaultState };

    const parsed = JSON.parse(saved);
    return {
      budget: Number(parsed.budget) || 0,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      hasEnteredApp: Boolean(parsed.hasEnteredApp)
    };
  } catch (err) {
    console.error('Gagal membaca data localStorage:', err);
    return { ...defaultState };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Gagal menyimpan data ke localStorage:', err);
  }
}

/* ==========================================
   2. REFERENSI ELEMEN DOM
   ========================================== */
const openingScreen = document.getElementById('opening-screen');
const mainApp = document.getElementById('main-app');
const btnEnterApp = document.getElementById('btn-enter-app');
const btnBackIntro = document.getElementById('btn-back-intro');
const btnInstall = document.getElementById('btn-install');

const remainingBudgetEl = document.getElementById('remaining-budget');
const budgetStatusBadgeEl = document.getElementById('budget-status-badge');
const budgetProgressBarEl = document.getElementById('budget-progress-bar');
const totalExpenseTextEl = document.getElementById('total-expense-text');
const totalBudgetTextEl = document.getElementById('total-budget-text');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');

const budgetForm = document.getElementById('budget-form');
const budgetInput = document.getElementById('budget-input');

const transactionForm = document.getElementById('transaction-form');
const txTypeInput = document.getElementById('tx-type');
const txCategoryInput = document.getElementById('tx-category');
const txAmountInput = document.getElementById('tx-amount');
const txNoteInput = document.getElementById('tx-note');

const transactionListEl = document.getElementById('transaction-list');
const btnResetAll = document.getElementById('btn-reset-all');

/* ==========================================
   3. FORMAT ANGKA & TANGGAL
   ========================================== */
function formatRupiah(amount) {
  const num = Number(amount) || 0;
  const sign = num < 0 ? '-' : '';
  return `${sign}Rp ${Math.abs(Math.round(num)).toLocaleString('id-ID')}`;
}

function formatDateToday() {
  return new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ==========================================
   4. KONTROL LAYAR PEMBUKA & DASHBOARD
   ========================================== */
function showDashboard() {
  openingScreen.classList.add('hidden');
  mainApp.classList.remove('hidden');
  state.hasEnteredApp = true;
  saveState();
  renderAll();
}

function showOpeningScreen() {
  mainApp.classList.add('hidden');
  openingScreen.classList.remove('hidden');
}

/* ==========================================
   5. PERHITUNGAN & RENDER TAMPILAN
   ========================================== */
function calculateSummary() {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of state.transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      totalIncome += amount;
    } else if (tx.type === 'expense') {
      totalExpense += amount;
    }
  }

  const remainingBudget = state.budget - totalExpense;
  return { totalIncome, totalExpense, remainingBudget };
}

function renderSummary() {
  const { totalIncome, totalExpense, remainingBudget } = calculateSummary();

  remainingBudgetEl.textContent = formatRupiah(remainingBudget);
  totalExpenseTextEl.textContent = formatRupiah(totalExpense);
  totalBudgetTextEl.textContent = formatRupiah(state.budget);
  totalIncomeEl.textContent = formatRupiah(totalIncome);
  totalExpenseEl.textContent = formatRupiah(totalExpense);

  // Sinkronkan nilai input budget dengan budget aktif
  if (state.budget > 0) {
    budgetInput.value = state.budget;
  }

  // Hitung persentase penggunaan budget
  let ratio = 0;
  if (state.budget > 0) {
    ratio = (totalExpense / state.budget) * 100;
  } else if (totalExpense > 0) {
    ratio = 100;
  }

  const clampedWidth = Math.min(Math.max(ratio, 0), 100);
  budgetProgressBarEl.style.width = `${clampedWidth}%`;

  // Perbarui warna progress bar & badge status budget
  budgetStatusBadgeEl.classList.remove('safe', 'warning', 'danger');
  if (state.budget === 0 && totalExpense === 0) {
    budgetStatusBadgeEl.textContent = 'Belum Diatur';
    budgetStatusBadgeEl.classList.add('safe');
    budgetProgressBarEl.style.backgroundColor = '#F472B6';
  } else if (remainingBudget < 0 || ratio >= 100) {
    budgetStatusBadgeEl.textContent = 'Melebihi Budget';
    budgetStatusBadgeEl.classList.add('danger');
    budgetProgressBarEl.style.backgroundColor = '#FB7185';
  } else if (ratio >= 75) {
    budgetStatusBadgeEl.textContent = 'Hampir Habis';
    budgetStatusBadgeEl.classList.add('warning');
    budgetProgressBarEl.style.backgroundColor = '#FBBF24';
  } else {
    budgetStatusBadgeEl.textContent = 'Aman';
    budgetStatusBadgeEl.classList.add('safe');
    budgetProgressBarEl.style.backgroundColor = '#F472B6';
  }
}

function renderTransactions() {
  if (!state.transactions.length) {
    transactionListEl.innerHTML = '<li class="empty-state">Belum ada transaksi tercatat.</li>';
    return;
  }

  transactionListEl.innerHTML = state.transactions
    .map((tx) => {
      const isIncome = tx.type === 'income';
      const prefix = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'income' : 'expense';

      return `
        <li class="tx-item">
          <div class="tx-info">
            <span class="tx-note">${escapeHTML(tx.note)}</span>
            <span class="tx-meta">${escapeHTML(tx.category)} • ${escapeHTML(tx.date || '')}</span>
          </div>
          <div class="tx-right">
            <span class="tx-amount ${amountClass}">${prefix}${formatRupiah(tx.amount)}</span>
            <button
              type="button"
              class="btn-delete-tx"
              data-id="${escapeHTML(String(tx.id))}"
              title="Hapus transaksi"
              aria-label="Hapus transaksi"
            >&times;</button>
          </div>
        </li>
      `;
    })
    .join('');
}

function renderAll() {
  renderSummary();
  renderTransactions();
}

/* ==========================================
   6. EVENT LISTENER (INTERAKSI PENGGUNA)
   ========================================== */
btnEnterApp.addEventListener('click', showDashboard);
btnBackIntro.addEventListener('click', showOpeningScreen);

budgetForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newBudget = Number(budgetInput.value);

  if (Number.isNaN(newBudget) || newBudget < 0) {
    alert('Masukkan nominal budget minimal 0.');
    return;
  }

  state.budget = newBudget;
  saveState();
  renderSummary();
});

transactionForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const type = txTypeInput.value;
  const category = txCategoryInput.value;
  const amount = Number(txAmountInput.value);
  const note = txNoteInput.value.trim();

  if (!note || Number.isNaN(amount) || amount <= 0) {
    alert('Lengkapi nominal (lebih dari 0) dan catatan transaksi.');
    return;
  }

  const newTransaction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    category,
    amount,
    note,
    date: formatDateToday()
  };

  // Masukkan di bagian paling atas agar transaksi terbaru muncul duluan
  state.transactions.unshift(newTransaction);
  saveState();
  renderAll();

  // Kosongkan input nominal & catatan agar siap input berikutnya
  txAmountInput.value = '';
  txNoteInput.value = '';
  txAmountInput.focus();
});

transactionListEl.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.btn-delete-tx');
  if (!deleteBtn) return;

  const targetId = deleteBtn.dataset.id;
  state.transactions = state.transactions.filter((tx) => String(tx.id) !== targetId);
  saveState();
  renderAll();
});

btnResetAll.addEventListener('click', () => {
  const confirmed = confirm('Yakin ingin menghapus semua transaksi dan mereset budget ke 0?');
  if (!confirmed) return;

  state.budget = 0;
  state.transactions = [];
  budgetInput.value = '';
  saveState();
  renderAll();
});

/* ==========================================
   7. FITUR INSTALL PWA & SERVICE WORKER
   ========================================== */
window.addEventListener('beforeinstallprompt', (e) => {
  // Simpan event agar bisa dipicu lewat tombol "Install ke Layar Utama HP"
  e.preventDefault();
  deferredInstallPrompt = e;
  btnInstall.classList.remove('hidden');
});

btnInstall.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  btnInstall.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  btnInstall.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.error('Pendaftaran Service Worker gagal:', err);
    });
  });
}

/* ==========================================
   8. INISIALISASI SAAT HALAMAN DIMUAT
   ========================================== */
function init() {
  if (state.hasEnteredApp) {
    openingScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
  } else {
    openingScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');
  }
  renderAll();
}

init();
