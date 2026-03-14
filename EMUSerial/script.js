const API_BASE = 'https://emu-serial-worker.dwatson-tas.workers.dev';

// --- DOM elements ---
const authSection = document.getElementById('auth-section');
const userSection = document.getElementById('user-section');
const formSection = document.getElementById('form-section');
const pendingSection = document.getElementById('pending-section');
const approvedSection = document.getElementById('approved-section');
const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const serialForm = document.getElementById('serial-form');
const submitBtn = document.getElementById('submit-btn');
const logoutBtn = document.getElementById('logout-btn');
const pendingIssueLink = document.getElementById('pending-issue-link');
const serialDisplay = document.getElementById('serial-display');
const serialsSection = document.getElementById('serials-section');
const serialsList = document.getElementById('serials-list');
const photoFile = document.getElementById('photo-file');
const fileDrop = document.getElementById('file-drop');
const filePreview = document.getElementById('file-preview');
const previewImg = document.getElementById('preview-img');
const clearFileBtn = document.getElementById('clear-file');

// --- State ---
let currentUser = null;
const TOKEN_KEY = 'emu_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

// --- Helpers ---
function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.classList.add('visible');
}

function hideError() {
    errorBanner.classList.remove('visible');
}

function showSection(section) {
    formSection.hidden = true;
    pendingSection.hidden = true;
    approvedSection.hidden = true;
    section.hidden = false;
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
}

// --- Auth ---
async function checkAuth() {
    try {
        const data = await apiFetch('/auth/status');
        if (data.authenticated) {
            currentUser = data;
            showAuthenticated();
            await checkStatus();
        } else {
            showUnauthenticated();
        }
    } catch {
        showUnauthenticated();
    }
}

function showUnauthenticated() {
    authSection.hidden = false;
    userSection.hidden = true;
}

function showAuthenticated() {
    authSection.hidden = true;
    userSection.hidden = false;
    userName.textContent = currentUser.discord_username;

    if (currentUser.discord_avatar) {
        userAvatar.src = `https://cdn.discordapp.com/avatars/${currentUser.discord_id}/${currentUser.discord_avatar}.png?size=80`;
        userAvatar.alt = currentUser.discord_username;
    } else {
        // Default Discord avatar
        const index = (BigInt(currentUser.discord_id) >> 22n) % 6n;
        userAvatar.src = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
        userAvatar.alt = currentUser.discord_username;
    }
}

async function checkStatus() {
    try {
        const data = await apiFetch('/status');

        // Show previously approved serials if any
        if (data.approved && data.approved.length > 0) {
            serialsSection.hidden = false;
            const sorted = [...data.approved].sort((a, b) => a.serial.localeCompare(b.serial));
            serialsList.innerHTML = sorted.map(a =>
                `<div class="serial-chip">${a.serial}</div>`
            ).join('');
        }

        // If there's a pending submission, show pending state
        if (data.pending) {
            showSection(pendingSection);
            if (data.pending.issue_url) {
                pendingIssueLink.href = data.pending.issue_url;
                pendingIssueLink.hidden = false;
            }
        } else {
            // No pending submission — show the form
            showSection(formSection);
        }
    } catch (err) {
        console.error('checkStatus error:', err);
        showSection(formSection);
    }
}

// --- Logout ---
logoutBtn.addEventListener('click', async () => {
    clearToken();
    currentUser = null;
    serialsSection.hidden = true;
    showUnauthenticated();
});

// --- Photo toggle ---
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        document.getElementById('upload-mode').hidden = mode !== 'upload';
        document.getElementById('url-mode').hidden = mode !== 'url';
    });
});

// --- File drop ---
fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.classList.add('dragover'); });
fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('dragover'));
fileDrop.addEventListener('drop', e => {
    e.preventDefault();
    fileDrop.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        photoFile.files = e.dataTransfer.files;
        showPreview(e.dataTransfer.files[0]);
    }
});
photoFile.addEventListener('change', () => {
    if (photoFile.files.length) showPreview(photoFile.files[0]);
});
clearFileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    photoFile.value = '';
    filePreview.hidden = true;
    document.querySelector('.file-drop-content').hidden = false;
});

function showPreview(file) {
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    filePreview.hidden = false;
    document.querySelector('.file-drop-content').hidden = true;
}

// --- Form submission ---
serialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    submitBtn.disabled = true;
    btnText.hidden = true;
    btnLoading.hidden = false;

    try {
        const formData = new FormData(serialForm);

        // Include the correct photo field based on active mode
        const isUpload = document.querySelector('.toggle-btn.active').dataset.mode === 'upload';
        if (isUpload) {
            formData.delete('photo_url');
        } else {
            formData.delete('photo_file');
        }

        const data = await fetch(`${API_BASE}/submit`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: formData,
        }).then(async res => {
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
            return json;
        });

        showSection(pendingSection);
        if (data.issue_url) {
            pendingIssueLink.href = data.issue_url;
            pendingIssueLink.hidden = false;
        }
    } catch (err) {
        showError(err.message);
    } finally {
        submitBtn.disabled = false;
        btnText.hidden = false;
        btnLoading.hidden = true;
    }
});

// --- Error dismiss ---
document.getElementById('error-dismiss').addEventListener('click', hideError);

// --- Handle OAuth redirect errors ---
function handleRedirectParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'no_code') {
        showError('Discord authentication was cancelled or failed.');
    } else if (params.get('error') === 'no_email') {
        showError('Could not retrieve your email from Discord. Please ensure your Discord account has a verified email.');
    }
    // Store token from OAuth callback
    const token = params.get('token');
    if (token) {
        setToken(token);
    }
    // Clean URL
    if (params.has('auth') || params.has('error') || params.has('token')) {
        window.history.replaceState({}, '', window.location.pathname);
    }
}

// --- Init ---
handleRedirectParams();
checkAuth();
