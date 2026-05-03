// ══════════ CV SCREENING ══════════
const listify = (arr) => {
    if (!arr || arr.length === 0) return '';
    const filtered = arr.filter(i => i && i.trim().toLowerCase() !== 'none');
    if (filtered.length === 0) return '';
    return filtered.map(i => {
        const colonIdx = i.indexOf(':');
        if (colonIdx > 0 && colonIdx < 40) {
            const label = i.substring(0, colonIdx).trim();
            const desc = i.substring(colonIdx + 1).trim();
            return `<li><strong>${label}:</strong> ${desc}</li>`;
        }
        return `<li>${i}</li>`;
    }).join('');
};

let allCVResults = [];

function openJDModal(htmlContent) {
    document.getElementById("jdContent").innerHTML = htmlContent;
    document.getElementById("jdModal").style.display = "block";
}

function closeJDModal() {
    document.getElementById("jdModal").style.display = "none";
}

async function runCVScreeningManual() {
    const jdFile = document.getElementById('cvJdFileInput').files[0];
    const cvFiles = Array.from(document.getElementById('cvFilesInput').files);
    const notes = document.getElementById('cvScreeningNotes').value;

    // In cv-parser.js — replace the validation block at the top of runCVScreening

    if (!jdFile || cvFiles.length === 0) { alert("Please upload a JD and at least one CV."); return; }

    // Block unsupported formats
    const allowedExts = ['.pdf', '.docx', '.doc'];
    const blockedCheck = (f) => !allowedExts.some(ext => f.name.toLowerCase().endsWith(ext));

    if (blockedCheck(jdFile)) {
        showModal('❌ Unsupported Format', `"${jdFile.name}" is not supported. Only PDF, DOCX, and DOC files are accepted for JD upload.`);
        return;
    }
    const invalidCVs = cvFiles.filter(blockedCheck);
    if (invalidCVs.length > 0) {
        showModal('❌ Unsupported Format', `These files are not supported:\n${invalidCVs.map(f => f.name).join(', ')}\n\nOnly PDF, DOCX, and DOC files are accepted.`);
        return;
    }

    const container = document.getElementById('cvResultsContainer');
    const loader = document.getElementById('cvResultsLoading');
    const downloadBtn = document.getElementById('cvDownloadBtn');

    // In cv-parser.js — replace the section inside runCVScreening from "document.getElementById('cvScreeningResults')" onwards

    document.getElementById('cvScreeningResults').style.display = 'block';
    loader.style.display = 'flex';
    downloadBtn.style.display = 'none';
    container.innerHTML = '';
    allCVResults = [];

    // Show processing counter
    const totalCount = cvFiles.length;
    let processedCount = 0;
    loader.innerHTML = `<div class="spinner"></div><span id="cvProgressText">Processing 0 of ${totalCount} candidates...</span>`;

    for (const file of cvFiles) {
        const fd = new FormData();
        fd.append('jd', jdFile);
        fd.append('cv', file);
        fd.append('notes', notes);

        let attempts = 0;
        let success = false;

        while (attempts < 2 && !success) {
            try {
                const response = await fetch('/api/screen/manual', { method: 'POST', body: fd });
                const res = await response.json();

                if (res.success) {
                    allCVResults.push(res.data);
                    renderCVCard(res.data, container);
                    success = true;
                } else {
                    if (res.error.includes('blank document') || res.error.includes('only images')) {
                        showModal('⚠️ File Issue', `${file.name}: ${res.error}`);
                        break;
                    }
                    if (res.error.includes('not supported') || res.error.includes('Only PDF')) {
                        showModal('❌ Unsupported Format', res.error);
                        break;
                    }
                    throw new Error(res.error);
                }
            } catch (e) {
                attempts++;
                if (attempts >= 2) {
                    renderCVCard({ candidate_name: file.name, overallScore: 0, recommendation: "Processing Failed", rationale: `Error: ${e.message}`, failed: true, strengths: {}, gaps: {}, proximity_matches: [] }, container);
                } else {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }
        processedCount++;
        document.getElementById('cvProgressText').textContent = `Processed ${processedCount} of ${totalCount} candidates...`;
        await new Promise(r => setTimeout(r, 2000));
    }
    container.innerHTML = '';
    allCVResults.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    allCVResults.forEach(data => renderCVCard(data, container));

    // Hide loader and show download button
    loader.style.display = 'none';
    
    if (allCVResults.length > 0) {
        downloadBtn.style.display = 'block';
        downloadBtn.innerText = `📥 Download Audit Report (${allCVResults.length} Candidates)`;
    }
}

async function runCVScreeningATS() {
    const notes = document.getElementById('atsScreeningNotes').value;
    const jobCode = document.getElementById('jobCodeInput').value.trim();

    if (!jobCode) {
        showModal('⚠️ Missing Job Code', 'Please enter a valid CEIPAL job code.');
        return;
    }

    const resultsBox = document.getElementById('atsScreeningResults');
    const container = document.getElementById('atsResultsContainer');
    const loader = document.getElementById('atsResultsLoading');

    resultsBox.style.display = 'block';
    loader.style.display = 'flex';
    container.innerHTML = '';

    try {
        const response = await fetch('/api/screen/ats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notes: notes,
                job_code: jobCode
            })
        });

        const data = await response.json();
        console.log("ATS Response:", data);

        if (!data.success) {
            showModal('❌ ATS Screening Failed', data.error || 'Something went wrong.');
            return;
        }

        if (data.job_description_html) {
            openJDModal(data.job_description_html);
        }

        const results = data.results || [];

        if (results.length === 0) {
            container.innerHTML = `
                <div class="cv-result-card">
                    <h3>No candidates found</h3>
                    <p>No submissions were returned from CEIPAL for this job code.</p>
                </div>
            `;
            return;
        }

        results.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
        results.forEach(r => renderCVCard(r, container));

    } catch (err) {
        showModal('❌ Error', err.message);
    } finally {
        loader.style.display = 'none';
    }
}

function renderCVCard(d, container) {
    const score = d.overallScore || 0;
    let colorClass = score > 70 ? "score-green" : score >= 50 ? "score-yellow" : "score-red";

    if (d.failed) {
        container.insertAdjacentHTML('beforeend', `
            <div class="cv-result-card" style="border-left: 5px solid #ef4444; opacity: 0.8;">
                <h3>❌ ${d.candidate_name}</h3>
                <p><strong>Status:</strong> ${d.rationale}</p>
            </div>`);
        return;
    }

    container.insertAdjacentHTML('beforeend', `
        <div class="cv-result-card">
            <div class="res-header">
                <div>
                    <h3 style="margin:0;">${d.candidate_name}</h3>
                    <small style="color:#64748b;">${d.recommendation}</small>
                </div>
                <span class="score ${colorClass}">${score}%</span>
            </div>
            <p style="margin-top:15px;"><strong>Rationale:</strong> ${d.rationale}</p>
            <div class="sg-grid-3">
                <div class="sg-box strengths"><strong>Strengths</strong><ul>
                    ${listify(d.strengths?.NIRF_and_Pedigree)}
                    ${listify(d.strengths?.Experience_Alignment)}
                </ul></div>
                <div class="sg-box proximity-box"><strong>Proximity</strong><ul>${listify(d.proximity_matches)}</ul></div>
                <div class="sg-box gaps"><strong>Gaps</strong><ul>
                    ${listify(d.gaps?.Functional_Gaps)}
                    ${listify(d.gaps?.Domain_Mismatch)}
                </ul></div>
            </div>
        </div>`);
}

// In cv-parser.js — replace the entire downloadCVReport function
async function downloadCVReport() {
    const btn = document.getElementById('cvDownloadBtn');
    btn.innerText = "⌛ Generating Report...";
    btn.disabled = true;

    try {
        const res = await fetch('/api/cv/download-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: allCVResults })
        });

        if (!res.ok) {
            const err = await res.json();
            alert("Failed: " + err.error);
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Candidate_Audit_Report_' + new Date().toISOString().slice(0, 10) + '.docx';
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("Download Error: " + err.message);
    } finally {
        btn.innerText = '📥 Download Audit Report (' + allCVResults.length + ' Candidates)';
        btn.disabled = false;
    }
}