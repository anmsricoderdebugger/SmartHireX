// ══════════ STATE ══════════
let createdJDHtml = '';
let mcqAnswers = {};

// ══════════ MODE SELECTION ══════════
function setJDMode(mode) {
    document.getElementById('jdModeSelector').style.display = 'none';
    document.getElementById('jdUploadFlow').style.display = mode === 'upload' ? 'block' : 'none';
    document.getElementById('jdManualFlow').style.display = mode === 'manual' ? 'block' : 'none';
}

// ══════════ UPLOAD MODE: GENERATE MCQs ══════════
async function generateMCQsFromJD() {
    const fileInput = document.getElementById('jdBaseFileInput');
    if (!fileInput.files[0]) { alert("Please upload a JD file first."); return; }

    // In jd-creator.js — add this at the top of generateMCQsFromJD, after the file check

    const allowedExts = ['.pdf', '.docx', '.doc'];
    if (!allowedExts.some(ext => fileInput.files[0].name.toLowerCase().endsWith(ext))) {
        showModal('❌ Unsupported Format', `"${fileInput.files[0].name}" is not supported. Only PDF, DOCX, and DOC files are accepted.`);
        return;
    }
    
    const loader = document.getElementById('jdUploadLoading');
    const container = document.getElementById('jdMCQContainer');
    loader.style.display = 'flex';
    container.style.display = 'none';

    const fd = new FormData();
    fd.append('jd_file', fileInput.files[0]);

    try {
        const res = await fetch('/api/jd/generate-mcqs', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.success) {
            renderMCQs(data.questions, container);
            container.style.display = 'block';
        } else {
            alert("Failed: " + data.error);
        }
    } catch (e) {
        alert("Server error: " + e.message);
    } finally {
        loader.style.display = 'none';
    }
}

// In jd-creator.js — replace the renderMCQs function

function renderMCQs(questions, container, multiSelect = false, submitFn = 'submitMCQsAndCreateJD') {
    mcqAnswers = {};
    const selectLabel = multiSelect ? '<small style="color:#2563eb;">(Select multiple)</small>' : '';
    let html = `<div class="flow-card"><h3>🎯 Answer these to ${multiSelect ? 'enhance' : 'refine'} your JD</h3>`;
    questions.forEach((q, i) => {
        html += `
            <div class="mcq-card">
                <h4><span class="mcq-number">Q${i + 1}.</span> ${q.question} ${selectLabel}</h4>
                <div class="mcq-options">
                    ${q.options.map((opt, j) => `
                        <div class="mcq-option" onclick="selectMCQ(this, ${i}, ${j}, ${multiSelect})">
                            ${opt}
                        </div>
                    `).join('')}
                </div>
            </div>`;
    });
    html += `
        <div class="mcq-submit-area">
            <button class="btn-primary" onclick="${submitFn}()">${multiSelect ? 'Enhance JD →' : 'Create JD from Answers →'}</button>
            <div id="mcqSubmitLoading" class="loader" style="display:none;justify-content:center;">
                <div class="spinner"></div><span>Processing...</span>
            </div>
        </div></div>`;
    container.innerHTML = html;
}

// In jd-creator.js — replace the selectMCQ function (now supports multi-select)

function selectMCQ(el, qIdx, optIdx, multiSelect = false) {
    if (multiSelect) {
        // Toggle selection for multi-select
        el.classList.toggle('selected');
        if (!mcqAnswers[qIdx]) mcqAnswers[qIdx] = [];
        const val = el.textContent.trim();
        const idx = mcqAnswers[qIdx].indexOf(val);
        if (idx > -1) mcqAnswers[qIdx].splice(idx, 1);
        else mcqAnswers[qIdx].push(val);
    } else {
        // Single select
        el.parentElement.querySelectorAll('.mcq-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        mcqAnswers[qIdx] = el.textContent.trim();
    }
}

async function submitMCQsAndCreateJD() {
    const total = document.querySelectorAll('.mcq-card').length;
    if (Object.keys(mcqAnswers).length < total) {
        alert(`Please answer all ${total} questions.`);
        return;
    }

    const loader = document.getElementById('mcqSubmitLoading');
    loader.style.display = 'flex';

    const fd = new FormData();
    fd.append('jd_file', document.getElementById('jdBaseFileInput').files[0]);
    fd.append('answers', JSON.stringify(mcqAnswers));

    try {
        const res = await fetch('/api/jd/create-from-mcqs', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            showCreatedJD(data.jd_html);
        } else {
            alert("Failed: " + data.error);
        }
    } catch (e) {
        alert("Server error: " + e.message);
    } finally {
        loader.style.display = 'none';
    }
}

// ══════════ MANUAL MODE: CREATE JD ══════════
async function createJDFromManual() {
    const title = document.getElementById('manualJobTitle').value.trim();
    if (!title) { alert("Job Title is required."); return; }

    const loader = document.getElementById('jdManualLoading');
    loader.style.display = 'flex';

    const payload = {
        job_title: title,
        department: document.getElementById('manualDepartment').value.trim(),
        location: document.getElementById('manualLocation').value.trim(),
        experience: document.getElementById('manualExperience').value.trim(),
        responsibilities: document.getElementById('manualResponsibilities').value.trim(),
        skills: document.getElementById('manualSkills').value.trim(),
        notes: document.getElementById('manualNotes').value.trim(),
    };

    try {
        const res = await fetch('/api/jd/create-manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showCreatedJD(data.jd_html);
        } else {
            alert("Failed: " + data.error);
        }
    } catch (e) {
        alert("Server error: " + e.message);
    } finally {
        loader.style.display = 'none';
    }
}

// ══════════ SHOW CREATED JD ══════════
function showCreatedJD(html) {
    createdJDHtml = html;
    document.getElementById('jdCreatedContent').innerHTML = html;
    document.getElementById('jdCreatedView').style.display = 'block';
    document.getElementById('jdUploadFlow').style.display = 'none';
    document.getElementById('jdManualFlow').style.display = 'none';
    document.getElementById('jdModeSelector').style.display = 'none';
}

// ══════════ DOWNLOAD JD ══════════
function toggleJDActions() { document.getElementById('jdActionDropdown').classList.toggle('open'); }
function toggleEnhancedActions() { document.getElementById('enhancedActionDropdown').classList.toggle('open'); }

// In jd-creator.js — replace the downloadJD function

async function downloadJD(format) {
    document.getElementById('jdActionDropdown').classList.remove('open');
    
    const endpoint = format === 'pdf' ? '/api/jd/download-pdf' : '/api/jd/download-docx';
    const filename = format === 'pdf' ? 'Job_Description.pdf' : 'Job_Description.docx';

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: createdJDHtml })
        });
        if (!res.ok) { alert("Download failed."); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Download error: " + e.message);
    }
}

// ══════════ ENHANCE FLOW ══════════
function showEnhanceOptions() {
    document.getElementById('jdEnhanceOptions').style.display = 'block';
}

// In jd-creator.js — replace setEnhanceMode function

async function setEnhanceMode(mode) {
    if (mode === 'options') {
        // Show MCQs for enhancement
        const inputArea = document.getElementById('enhanceInputArea');
        inputArea.innerHTML = '<div class="loader"><div class="spinner"></div><span>Generating enhancement options...</span></div>';
        inputArea.style.display = 'block';

        try {
            const res = await fetch('/api/jd/enhance-mcqs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ original_jd: createdJDHtml })
            });
            const data = await res.json();
            if (data.success) {
                mcqAnswers = {};
                renderMCQs(data.questions, inputArea, true, 'submitEnhanceMCQs');
            } else {
                alert("Failed: " + data.error);
                inputArea.style.display = 'none';
            }
        } catch (e) {
            alert("Server error: " + e.message);
            inputArea.style.display = 'none';
        }
    } else {
        const inputArea = document.getElementById('enhanceInputArea');
        inputArea.innerHTML = `
            <textarea id="enhanceInstructions" rows="3" placeholder="Tell AI exactly what to change..."></textarea>
            <button class="btn-primary" onclick="runEnhancement()">Enhance JD →</button>
            <div id="enhanceLoading" class="loader" style="display:none;">
                <div class="spinner"></div><span>Enhancing your JD...</span>
            </div>`;
        inputArea.style.display = 'block';
        document.getElementById('enhanceInstructions').focus();
    }
}

// In jd-creator.js — add this new function

async function submitEnhanceMCQs() {
    const total = document.querySelectorAll('#enhanceInputArea .mcq-card').length;
    const answered = Object.keys(mcqAnswers).filter(k => {
        const v = mcqAnswers[k];
        return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;
    if (answered < total) { alert(`Please answer all ${total} questions.`); return; }

    const loader = document.getElementById('mcqSubmitLoading');
    if (loader) loader.style.display = 'flex';

    try {
        const res = await fetch('/api/jd/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ original_jd: createdJDHtml, instructions: "Enhance based on these selections: " + JSON.stringify(mcqAnswers) })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('jdEnhancedContent').innerHTML = data.enhanced_html;
            document.getElementById('jdEnhancedView').style.display = 'block';
        } else {
            alert("Enhancement failed: " + data.error);
        }
    } catch (e) {
        alert("Server error: " + e.message);
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

async function runEnhancement() {
    const instructions = document.getElementById('enhanceInstructions').value.trim();
    if (!instructions) { alert("Please add enhancement instructions."); document.getElementById('enhanceInstructions').focus(); return; }

    const loader = document.getElementById('enhanceLoading');
    loader.style.display = 'flex';

    try {
        const res = await fetch('/api/jd/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ original_jd: createdJDHtml, instructions: instructions })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('jdEnhancedContent').innerHTML = data.enhanced_html;
            document.getElementById('jdEnhancedView').style.display = 'block';
        } else {
            alert("Enhancement failed: " + data.error);
        }
    } catch (e) {
        alert("Server error: " + e.message);
    } finally {
        loader.style.display = 'none';
    }
}

async function downloadEnhancedJD(format) {
    document.getElementById('enhancedActionDropdown').classList.remove('open');
    
    const endpoint = format === 'pdf' ? '/api/jd/download-pdf' : '/api/jd/download-docx';
    const filename = format === 'pdf' ? 'Enhanced_JD.pdf' : 'Enhanced_JD.docx';
    const html = document.getElementById('jdEnhancedContent').innerHTML;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: html })
        });
        if (!res.ok) { alert("Download failed."); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Download error: " + e.message);
    }
}