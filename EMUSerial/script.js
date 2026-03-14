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
const mediaList = document.getElementById('media-list');
const hiddenFileInput = document.getElementById('hidden-file-input');
const addPhotoBtn = document.getElementById('add-photo-btn');
const addUrlBtn = document.getElementById('add-url-btn');

// --- State ---
let currentUser = null;
const TOKEN_KEY = 'emu_token';
const mediaItems = []; // { type: 'file'|'url', file?: File, url?: string, id: number }
let mediaIdCounter = 0;

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
            serialsList.innerHTML = '';
            sorted.forEach(a => {
                const chip = document.createElement('div');
                chip.className = 'serial-chip';
                chip.textContent = a.serial;
                serialsList.appendChild(chip);
            });
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

// --- Media management ---
const MAX_MEDIA = 10;

function addFileItems(files) {
    for (const file of files) {
        if (mediaItems.length >= MAX_MEDIA) { showError(`Maximum ${MAX_MEDIA} media items allowed.`); break; }
        const id = ++mediaIdCounter;
        mediaItems.push({ type: 'file', file, id });
    }
    renderMediaList();
}

function addUrlItem() {
    if (mediaItems.length >= MAX_MEDIA) { showError(`Maximum ${MAX_MEDIA} media items allowed.`); return; }
    const id = ++mediaIdCounter;
    mediaItems.push({ type: 'url', url: '', id });
    renderMediaList();
    const input = document.querySelector(`.media-url-input[data-id="${id}"]`);
    if (input) input.focus();
}

function removeMediaItem(id) {
    const idx = mediaItems.findIndex(m => m.id === id);
    if (idx !== -1) mediaItems.splice(idx, 1);
    renderMediaList();
}

function renderMediaList() {
    mediaList.innerHTML = '';
    for (const item of mediaItems) {
        const row = document.createElement('div');
        row.className = 'media-item';

        if (item.type === 'file') {
            const img = document.createElement('img');
            img.className = 'media-item-preview';
            img.src = URL.createObjectURL(item.file);
            img.alt = 'Preview';
            row.appendChild(img);

            const info = document.createElement('div');
            info.className = 'media-item-info';
            const name = document.createElement('span');
            name.className = 'media-item-name';
            name.textContent = item.file.name;
            const size = document.createElement('span');
            size.className = 'media-item-size';
            size.textContent = formatSize(item.file.size);
            info.appendChild(name);
            info.appendChild(size);
            row.appendChild(info);
        } else {
            const icon = document.createElement('div');
            icon.className = 'media-item-icon';
            icon.textContent = '\uD83D\uDD17';
            row.appendChild(icon);

            const input = document.createElement('input');
            input.type = 'url';
            input.className = 'media-url-input';
            input.placeholder = 'https://youtube.com/... or image URL';
            input.value = item.url || '';
            input.dataset.id = item.id;
            input.addEventListener('input', () => {
                item.url = input.value;
                input.classList.remove('invalid');
                const err = urlWrap.querySelector('.media-url-error');
                if (err) err.style.display = 'none';
            });
            input.addEventListener('blur', () => {
                if (!input.value.trim()) return;
                const check = validateUrl(input.value.trim());
                const errEl = urlWrap.querySelector('.media-url-error');
                if (!check.valid) {
                    input.classList.add('invalid');
                    if (errEl) { errEl.textContent = check.reason; errEl.style.display = 'block'; }
                } else {
                    input.classList.remove('invalid');
                    if (errEl) errEl.style.display = 'none';
                }
            });

            const urlWrap = document.createElement('div');
            urlWrap.style.cssText = 'flex:1;min-width:0;';
            urlWrap.appendChild(input);
            const errSpan = document.createElement('div');
            errSpan.className = 'media-url-error';
            urlWrap.appendChild(errSpan);
            row.appendChild(urlWrap);
        }

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'media-item-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => removeMediaItem(item.id));
        row.appendChild(removeBtn);

        mediaList.appendChild(row);
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// --- URL validation ---
const ALLOWED_URL_PATTERNS = [
    /^https:\/\/(www\.)?youtube\.com\/watch/i,
    /^https:\/\/youtu\.be\//i,
    /^https:\/\/(www\.)?youtube\.com\/shorts\//i,
    /^https?:\/\/.+\.(jpe?g|png|gif|webp)(\?.*)?$/i,
    /^https?:\/\/(www\.)?imgur\.com\//i,
    /^https?:\/\/i\.imgur\.com\//i,
    /^https?:\/\/(www\.)?flickr\.com\//i,
    /^https?:\/\/drive\.google\.com\//i,
    /^https?:\/\/photos\.google\.com\//i,
    /^https?:\/\/emuimages\.dwtas\.net\//i,
];

function validateUrl(url) {
    if (!url) return { valid: false, reason: 'URL is required' };
    let parsed;
    try { parsed = new URL(url); } catch { return { valid: false, reason: 'Invalid URL format' }; }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, reason: 'URL must start with https:// or http://' };
    }
    if (url.length > 2048) return { valid: false, reason: 'URL is too long' };
    const matched = ALLOWED_URL_PATTERNS.some(p => p.test(url));
    if (!matched) return { valid: false, reason: 'Only image links (jpg/png/gif/webp), YouTube, Imgur, Flickr, or Google Photos/Drive URLs are accepted' };
    return { valid: true };
}

addPhotoBtn.addEventListener('click', () => hiddenFileInput.click());
hiddenFileInput.addEventListener('change', () => {
    if (hiddenFileInput.files.length) addFileItems(hiddenFileInput.files);
    hiddenFileInput.value = '';
});
addUrlBtn.addEventListener('click', addUrlItem);

// --- Page-level drag & drop ---
const dropOverlay = document.getElementById('drop-overlay');
let dragCounter = 0;

document.addEventListener('dragenter', e => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragCounter++;
    dropOverlay.hidden = false;
});
document.addEventListener('dragover', e => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
});
document.addEventListener('dragleave', e => {
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; dropOverlay.hidden = true; }
});
document.addEventListener('drop', e => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.hidden = true;
    if (e.dataTransfer.files.length) {
        const images = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (images.length) addFileItems(images);
        else showError('Only image files can be dropped here.');
    }
});

// --- Form submission ---
serialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    if (mediaItems.length === 0) {
        showError('Please add at least one photo or URL.');
        return;
    }

    const urls = mediaItems.filter(m => m.type === 'url');
    for (const u of urls) {
        if (!u.url || !u.url.trim()) {
            showError('Please fill in all URL fields or remove empty ones.');
            return;
        }
        const check = validateUrl(u.url.trim());
        if (!check.valid) {
            showError(check.reason);
            return;
        }
    }

    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    submitBtn.disabled = true;
    btnText.hidden = true;
    btnLoading.hidden = false;

    try {
        const formData = new FormData(serialForm);

        // Append media items
        for (const item of mediaItems) {
            if (item.type === 'file') {
                formData.append('media_files', item.file);
            }
        }
        const mediaUrls = mediaItems.filter(m => m.type === 'url').map(m => m.url);
        if (mediaUrls.length > 0) {
            formData.append('media_urls', JSON.stringify(mediaUrls));
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
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const error = params.get('error');
    if (error === 'no_code') {
        showError('Discord authentication was cancelled or failed.');
    } else if (error === 'no_email') {
        showError('Could not retrieve your email from Discord. Please ensure your Discord account has a verified email.');
    } else if (error === 'invalid_state') {
        showError('Authentication session expired. Please try signing in again.');
    }
    const token = params.get('token');
    if (token) {
        setToken(token);
    }
    // Clean URL fragment immediately
    window.history.replaceState({}, '', window.location.pathname);
}

// --- Init ---
handleRedirectParams();
checkAuth();
