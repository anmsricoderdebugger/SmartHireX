// ══════════ SECTION ROUTING ══════════
function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section'));
    const target = document.getElementById('section-' + sectionId);
    if (target) target.classList.add('active-section');
    // Close dropdown
    document.getElementById('navDropdown').classList.remove('open');
    window.scrollTo(0, 0);
}

// ══════════ NAV DROPDOWN ══════════
function toggleNavMenu() {
    document.getElementById('navDropdown').classList.toggle('open');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-right')) {
        document.getElementById('navDropdown').classList.remove('open');
    }
    if (!e.target.closest('.result-actions')) {
        document.querySelectorAll('.action-dropdown').forEach(d => d.classList.remove('open'));
    }
});

// Add to app.js

function validateFileOnUpload(fileInput, label) {
    const file = fileInput.files[0];
    if (!file) return false;

    const name = file.name.toLowerCase();
    const allowedExts = ['.pdf', '.docx', '.doc'];

    // Check unsupported format
    if (!allowedExts.some(ext => name.endsWith(ext))) {
        showModal('❌ Unsupported Format', `"${file.name}" is not supported.\n\nOnly PDF, DOCX, and DOC files are accepted for ${label}.`);
        fileInput.value = '';
        return false;
    }

    // Check blank/empty file (0 bytes or near-zero)
    if (file.size === 0) {
        showModal('📄 Blank Document', `"${file.name}" appears to be a blank document with no content.`);
        fileInput.value = '';
        return false;
    }

    return true;
}

function validateMultipleFiles(fileInput, label) {
    const files = Array.from(fileInput.files);
    const allowedExts = ['.pdf', '.docx', '.doc'];
    
    const unsupported = files.filter(f => !allowedExts.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (unsupported.length > 0) {
        showModal('❌ Unsupported Format', `These files are not supported:\n\n${unsupported.map(f => '• ' + f.name).join('\n')}\n\nOnly PDF, DOCX, and DOC files are accepted.`);
        fileInput.value = '';
        return false;
    }

    const blank = files.filter(f => f.size === 0);
    if (blank.length > 0) {
        showModal('📄 Blank Document', `These files are blank:\n\n${blank.map(f => '• ' + f.name).join('\n')}`);
        fileInput.value = '';
        return false;
    }

    return true;
}

function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = message;
    document.getElementById('globalModal').style.display = 'flex';
}

function closeModal(event) {
    if (event.target === document.getElementById('globalModal')) {
        document.getElementById('globalModal').style.display = 'none';
    }
}