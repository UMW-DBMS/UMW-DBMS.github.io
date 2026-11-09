/**
 * Guide: navigation, image preview and language switching
 *
 * Purpose : Sidebar navigation, click-to-enlarge images, and the English / Sinhala / Tamil switcher for workthrough.html.
 * Depends : guide-translations.js (const translations) loaded first.
 * Exposes : (page script)
 */

// Navigation
const navItems = document.querySelectorAll('.nav-item');

const panels = document.querySelectorAll('.section-panel');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.target;
    navItems.forEach(n => n.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(target).classList.add('active');
    document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Image modal
const modal = document.getElementById('imgModal');

const modalImg = document.getElementById('imgModalImg');

const modalTitle = document.getElementById('imgModalTitle');

const modalClose = document.getElementById('imgModalClose');

document.querySelectorAll('.content-area img').forEach(img => {
  img.addEventListener('click', () => {
    modalImg.src = img.src;
    modalImg.alt = img.alt;
    modalTitle.textContent = img.alt || 'Image Preview';
    modal.classList.add('open');
  });
});

modalClose.addEventListener('click', () => modal.classList.remove('open'));

modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });

function setSectionTitle(sectionId, text) {
  const title = document.querySelector(`#${sectionId} .section-title`);
  if (!title) return;
  const icon = title.querySelector('.title-icon');
  title.innerHTML = `${icon ? icon.outerHTML : ''} ${text}`;
}

function setNodeArrayHtml(nodes, values) {
  if (!nodes || !values) return;
  nodes.forEach((node, index) => {
    if (values[index] !== undefined) node.innerHTML = values[index];
  });
}

function setNodeArrayText(nodes, values) {
  if (!nodes || !values) return;
  nodes.forEach((node, index) => {
    if (values[index] !== undefined) node.textContent = values[index];
  });
}

function setListItems(sectionId, values, listIndex = 0) {
  const lists = document.querySelectorAll(`#${sectionId} ul.cat-list`);
  const list = lists[listIndex];
  if (!list || !Array.isArray(values)) return;
  list.innerHTML = values.map((item) => `<li>${item}</li>`).join('');
}

function setNote(sectionId, html, noteIndex = 0) {
  const notes = document.querySelectorAll(`#${sectionId} .note-box span:last-child`);
  const note = notes[noteIndex];
  if (!note || html === undefined) return;
  note.innerHTML = html;
}

function applyLanguage(lang) {
  const t = translations[lang] || translations.en;
  document.documentElement.lang = lang;
  document.title = t.pageTitle;

  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const langLabel = document.getElementById('langLabel');
  const sidebarLabel = document.getElementById('sidebarLabel') || document.querySelector('.sidebar-label');

  if (pageTitle) pageTitle.textContent = t.pageTitle;
  if (pageSubtitle) pageSubtitle.textContent = t.pageSubtitle;
  if (langLabel) langLabel.textContent = t.langLabel;
  if (sidebarLabel) sidebarLabel.textContent = t.sidebarLabel;
  const loginGroupLabel = document.getElementById('loginGroupLabel');
  if (loginGroupLabel) loginGroupLabel.textContent = t.loginGroupLabel || loginGroupLabel.textContent;

  document.querySelectorAll('.nav-item').forEach((item) => {
    const icon = item.querySelector('.nav-icon');
    const iconHtml = icon ? icon.outerHTML : '';
    const currentLabelNode = item.querySelector('.nav-label');
    const currentLabelText = currentLabelNode ? currentLabelNode.textContent : item.textContent.trim();
    // Look the label up by data-target (not by position); fall back to English, then to the current text.
        const key = item.dataset.target;
        const labelText = t.nav[key] !== undefined ? t.nav[key]
            : (translations.en.nav[key] !== undefined ? translations.en.nav[key] : currentLabelText);
    item.innerHTML = `${iconHtml}<span class="nav-label">${labelText}</span>`;
  });
  Object.keys(t.sectionTitles).forEach((sectionId) => setSectionTitle(sectionId, t.sectionTitles[sectionId]));

  const step1 = t.sections.step1;
  setNodeArrayText(document.querySelectorAll('#step1 h4'), step1.h4);
  setNodeArrayHtml(document.querySelectorAll('#step1 p'), step1.p);

  const step2 = t.sections.step2;
  setNodeArrayText(document.querySelectorAll('#step2 h4'), step2.h4);
  setNodeArrayHtml(document.querySelectorAll('#step2 p'), step2.p);
  setListItems('step2', step2.list);

  const step3 = t.sections.step3;
  setNodeArrayText(document.querySelectorAll('#step3 h4'), step3.h4);
  setNodeArrayHtml(document.querySelectorAll('#step3 p'), step3.p);
  setListItems('step3', step3.list);

  const step4 = t.sections.step4;
  setNodeArrayText(document.querySelectorAll('#step4 h4'), step4.h4);
  setNodeArrayHtml(document.querySelectorAll('#step4 p'), step4.p);
  setListItems('step4', step4.list);

  const step5 = t.sections.step5;
  setNodeArrayText(document.querySelectorAll('#step5 h4'), step5.h4);
  setNodeArrayHtml(document.querySelectorAll('#step5 p'), step5.p);
  setListItems('step5', step5.list);

  const step6 = t.sections.step6;
  setNodeArrayText(document.querySelectorAll('#step6 h4'), step6.h4);
  setNodeArrayHtml(document.querySelectorAll('#step6 p'), step6.p);
  setNote('step6', step6.note);

  const step7 = t.sections.step7;
  setNodeArrayHtml(document.querySelectorAll('#step7 p'), step7.p);

  const step8 = t.sections.step8;
  setNodeArrayText(document.querySelectorAll('#step8 h4'), step8.h4);
  setNodeArrayHtml(document.querySelectorAll('#step8 p'), step8.p);
  setListItems('step8', step8.list);

  const step9 = t.sections.step9;
  setNodeArrayText(document.querySelectorAll('#step9 h4'), step9.h4);
  setNodeArrayHtml(document.querySelectorAll('#step9 p'), step9.p);
  setNote('step9', step9.note);

  const step10 = t.sections.step10;
  setNodeArrayHtml(document.querySelectorAll('#step10 p'), step10.p);
  setNote('step10', step10.note);

  const step11 = t.sections.step11;
  setNodeArrayText(document.querySelectorAll('#step11 h4'), step11.h4);
  setNodeArrayHtml(document.querySelectorAll('#step11 p'), step11.p);
  setListItems('step11', step11.list);
  setNote('step11', step11.notes[0], 0);
  setNote('step11', step11.notes[1], 1);

  if (t.sections.step11wq) {
    const step11wq = t.sections.step11wq;
    setNodeArrayText(document.querySelectorAll('#step11wq h4'), step11wq.h4);
    setNodeArrayHtml(document.querySelectorAll('#step11wq p'), step11wq.p);
    setListItems('step11wq', step11wq.list);
    setNote('step11wq', step11wq.note);
  }

  if (t.sections.step11lulc) {
    const step11lulc = t.sections.step11lulc;
    setNodeArrayText(document.querySelectorAll('#step11lulc h4'), step11lulc.h4);
    setNodeArrayHtml(document.querySelectorAll('#step11lulc p'), step11lulc.p);
    setNote('step11lulc', step11lulc.note);
  }

  const videoTextNode = document.querySelector('#step12 video').nextSibling;
  if (videoTextNode) videoTextNode.textContent = `\n          ${t.sections.step12.videoFallback}\n        `;

  if (modalTitle) modalTitle.textContent = t.modalTitle;
  if (modalClose) modalClose.textContent = t.modalClose;
}

document.getElementById('langSel').addEventListener('change', function () {
  const lang = this.value || 'en';
  localStorage.setItem('gwlang', lang);
  applyLanguage(lang);
});

const saved = localStorage.getItem('gwlang') || 'en';

document.getElementById('langSel').value = saved;

applyLanguage(saved);
