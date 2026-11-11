/**
 * Welcome / Help modal
 *
 * Purpose : Step-by-step welcome window (photo + video per step), "don't show again" preference, keyboard and backdrop close.
 *           Its top shows the ministry logo, the IWWRMP logo and the names of the ministry and the project (TRC review), built here from
 *           WELCOME_BANNER below. The layout of the whole window (banner, step dots, text beside photo and video, buttons) is in
 *           css/umw-enhancements.css, section "Help window".
 * Depends : The `#readme-modal` markup in index.html; help media from the MWS_001 GitHub repo; the two logo files in assets/logos/
 *           (a missing logo file is hidden and the names still show).
 * Exposes : initHelpModal() (runs on window load)
 */

// ---------------------------------------------------------------------------------------------------------------------
// Welcome banner: what it says and which logo files it uses. Edit here to change the wording or the logos.
// ---------------------------------------------------------------------------------------------------------------------
const WELCOME_BANNER = {
    title: 'Welcome to the Upper Mahaweli Database',
    ministry: 'Ministry of Agriculture, Livestock, Land and Irrigation',
    project: 'Integrated Watershed and Water Resources Management Project',
    // Left of the names: the ministry logo. Right of the names: project partner logos.
    ministryLogo: { src: 'assets/logos/ministry-logo.png', alt: 'Emblem of the Ministry of Agriculture, Livestock, Land and Irrigation' },
    projectLogos: [
        { src: 'assets/logos/iwwrmp-logo.png', alt: 'Logo of the Integrated Watershed and Water Resources Management Project (IWWRMP)' },
        { src: 'assets/logos/WorldBank.png', alt: 'World Bank logo' },
        { src: 'assets/logos/IWMI%20logo.png', alt: 'IWMI logo' }
    ]
};

function initHelpModal() {
    const helpModal = document.getElementById('readme-modal');
    const helpModalContent = helpModal.querySelector('.modal-content');
    const flowchart = helpModal.querySelector('.flowchart');
    const prevStepBtn = document.getElementById('prev-step-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const dontShowAgainCheckbox = document.getElementById('dont-show-help-again');
    const helpModalPreferenceKey = 'hide_help_modal_on_load';
    const stepVideoSources = [
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%201.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%202.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%203.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%204.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%205.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%206.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%207.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%208.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%209.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%2010.mp4',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%2011.mp4'
    ];
    const stepPhotoSources = [
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%201.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%202.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%203.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%204.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%205.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%206.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%207.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%208.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%209.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%2010.png',
        'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Step%2011.png'
    ];
    let imagePopup = null;
    function closeImagePopup() {
        if (!imagePopup) return;
        imagePopup.remove();
        imagePopup = null;
    }
    function openImagePopup(src, altText) {
        closeImagePopup();
        imagePopup = document.createElement('div');
        imagePopup.style.position = 'fixed';
        imagePopup.style.inset = '0';
        imagePopup.style.background = 'rgba(0,0,0,0.75)';
        imagePopup.style.display = 'flex';
        imagePopup.style.alignItems = 'center';
        imagePopup.style.justifyContent = 'center';
        imagePopup.style.zIndex = '5000';
        imagePopup.style.padding = '18px';
        const image = document.createElement('img');
        image.src = src;
        image.alt = altText || 'Step image';
        image.style.maxWidth = '90vw';
        image.style.maxHeight = '86vh';
        image.style.border = '2px solid #fff';
        image.style.borderRadius = '4px';
        image.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
        imagePopup.appendChild(image);
        imagePopup.addEventListener('click', closeImagePopup);
        document.body.appendChild(imagePopup);
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Welcome banner: ministry logo | title, ministry and project names | partner logos
    // -----------------------------------------------------------------------------------------------------------------
    function makeBannerLogo(logo) {
        const img = document.createElement('img');
        img.className = 'welcome-logo';
        img.src = logo.src;
        img.alt = logo.alt;
        // A logo file that is not there yet is hidden, so the names still show without a broken-image symbol.
        img.addEventListener('error', function () {
            img.style.display = 'none';
            img.setAttribute('data-missing', 'true');
        });
        return img;
    }
    function addWelcomeBanner() {
        if (!helpModalContent || helpModalContent.querySelector('.welcome-banner')) return;   // once only
        const banner = document.createElement('div');
        banner.className = 'welcome-banner';
        const text = document.createElement('div');
        text.className = 'welcome-text';
        // The window's own heading moves into the banner (same element, new wording); one is made if there is none.
        let heading = helpModalContent.querySelector('h2');
        if (!heading || (flowchart && flowchart.contains(heading))) heading = document.createElement('h2');
        heading.textContent = WELCOME_BANNER.title;
        const ministry = document.createElement('p');
        ministry.className = 'welcome-ministry';
        ministry.textContent = WELCOME_BANNER.ministry;
        const project = document.createElement('p');
        project.className = 'welcome-project';
        project.textContent = WELCOME_BANNER.project;
        text.appendChild(heading);
        text.appendChild(ministry);
        text.appendChild(project);
        banner.appendChild(makeBannerLogo(WELCOME_BANNER.ministryLogo));
        banner.appendChild(text);
        const projectLogos = document.createElement('div');
        projectLogos.className = 'welcome-project-logos';
        WELCOME_BANNER.projectLogos.forEach((logo) => projectLogos.appendChild(makeBannerLogo(logo)));
        banner.appendChild(projectLogos);
        helpModalContent.insertBefore(banner, helpModalContent.firstChild);
    }
    addWelcomeBanner();

    // -----------------------------------------------------------------------------------------------------------------
    // Steps: photo and video of each step go into one media column
    // -----------------------------------------------------------------------------------------------------------------
    document.querySelectorAll('#readme-modal .flow-node').forEach((node, index) => {
        const media = document.createElement('div');
        media.className = 'step-media';
        const photo = document.createElement('img');
        photo.className = 'step-photo';
        photo.alt = `Step ${index + 1} preview`;
        photo.src = stepPhotoSources[index] || '';
        photo.style.cursor = 'zoom-in';
        photo.title = 'Click to enlarge';
        photo.addEventListener('click', function() {
            if (!photo.src) return;
            openImagePopup(photo.src, photo.alt);
        });
        photo.addEventListener('error', function() {
            photo.style.display = 'none';
        });
        media.appendChild(photo);
        const video = document.createElement('video');
        video.className = 'step-video';
        video.controls = true;
        video.preload = 'none';          // only the video of the step on screen is prepared (see renderStepView)
        video.src = stepVideoSources[index] || 'documentary.mp4';
        media.appendChild(video);
        node.appendChild(media);
    });
    const stepNodes = Array.from(document.querySelectorAll('#readme-modal .flow-node'));
    let currentStepIndex = 0;

    // Step dots and "Step 3 of 10" between the banner and the step
    const progress = document.createElement('div');
    progress.className = 'step-progress';
    const dots = document.createElement('div');
    dots.className = 'step-dots';
    const dotButtons = stepNodes.map((node, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'step-dot';
        dot.setAttribute('aria-label', `Go to step ${index + 1}`);
        dot.addEventListener('click', function () {
            currentStepIndex = index;
            renderStepView();
        });
        dots.appendChild(dot);
        return dot;
    });
    const stepCount = document.createElement('span');
    stepCount.className = 'step-count';
    stepCount.setAttribute('role', 'status');
    progress.appendChild(dots);
    progress.appendChild(stepCount);
    if (flowchart && flowchart.parentNode) flowchart.parentNode.insertBefore(progress, flowchart);

    function renderStepView() {
        stepNodes.forEach((node, index) => {
            node.classList.remove('current-step', 'next-step', 'hidden-step');
            if (index === currentStepIndex) {
                node.classList.add('current-step');
            } else if (index === currentStepIndex + 1) {
                node.classList.add('next-step');
            } else {
                node.classList.add('hidden-step');
            }
            const video = node.querySelector('.step-video');
            if (video) {
                if (index === currentStepIndex) {
                    video.preload = 'metadata';
                } else if (!video.paused) {
                    video.pause();
                }
            }
        });
        dotButtons.forEach((dot, index) => {
            dot.classList.toggle('is-current', index === currentStepIndex);
            dot.classList.toggle('is-done', index < currentStepIndex);
            if (index === currentStepIndex) dot.setAttribute('aria-current', 'step'); else dot.removeAttribute('aria-current');
        });
        stepCount.textContent = `Step ${currentStepIndex + 1} of ${stepNodes.length}`;
        if (flowchart) flowchart.scrollTop = 0;
        if (prevStepBtn) {
            prevStepBtn.disabled = currentStepIndex <= 0;
            prevStepBtn.style.opacity = prevStepBtn.disabled ? '0.5' : '1';
            prevStepBtn.style.cursor = prevStepBtn.disabled ? 'not-allowed' : 'pointer';
        }
        if (nextStepBtn) {
            nextStepBtn.disabled = currentStepIndex >= stepNodes.length - 1;
            nextStepBtn.style.opacity = nextStepBtn.disabled ? '0.5' : '1';
            nextStepBtn.style.cursor = nextStepBtn.disabled ? 'not-allowed' : 'pointer';
        }
    }
    function shouldHideHelpModalOnLoad() {
        return localStorage.getItem(helpModalPreferenceKey) === 'true';
    }
    function syncHelpPreferenceCheckbox() {
        if (!dontShowAgainCheckbox) return;
        dontShowAgainCheckbox.checked = shouldHideHelpModalOnLoad();
    }
    function openHelpModal() {
        helpModal.style.display = 'flex';
        currentStepIndex = 0;
        renderStepView();
        syncHelpPreferenceCheckbox();
    }
    if (flowchart) flowchart.classList.add('step-mode');
    renderStepView();
    const closeHelpModal = function() {
        helpModal.style.display = 'none';
        closeImagePopup();
        document.querySelectorAll('#readme-modal .step-video').forEach((video) => {
            video.pause();
            video.currentTime = 0;
        });
    };
    // Show README modal on load
    syncHelpPreferenceCheckbox();
    if (!shouldHideHelpModalOnLoad()) {
        openHelpModal();
    } else {
        helpModal.style.display = 'none';
    }
    if (dontShowAgainCheckbox) {
        dontShowAgainCheckbox.addEventListener('change', function() {
            localStorage.setItem(helpModalPreferenceKey, dontShowAgainCheckbox.checked ? 'true' : 'false');
        });
    }
    // Close README modal
    document.getElementById('close-readme').onclick = function() {
        closeHelpModal();
    };
    // Show README modal when "Help" button is clicked
    document.getElementById('help-button').onclick = function() {
        openHelpModal();
    };
    if (prevStepBtn) {
        prevStepBtn.onclick = function() {
            if (currentStepIndex > 0) {
                currentStepIndex -= 1;
                renderStepView();
            }
        };
    }
    if (nextStepBtn) {
        nextStepBtn.onclick = function() {
            if (currentStepIndex < stepNodes.length - 1) {
                currentStepIndex += 1;
                renderStepView();
            }
        };
    }
    // Close with Esc or Enter when modal is visible; the arrow keys move between the steps
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && imagePopup) {
            closeImagePopup();
            return;
        }
        if (helpModal.style.display !== 'flex') return;
        if (event.key === 'ArrowRight' && nextStepBtn && !nextStepBtn.disabled) {
            nextStepBtn.click();
            return;
        }
        if (event.key === 'ArrowLeft' && prevStepBtn && !prevStepBtn.disabled) {
            prevStepBtn.click();
            return;
        }
        // Enter on a button (a step dot, Previous, Next) or a field does what that control does; it only closes the window from elsewhere
        if (event.key === 'Enter' && event.target && event.target.closest && event.target.closest('button, a, input, select, textarea, video')) {
            return;
        }
        if (event.key === 'Escape' || event.key === 'Enter') {
            closeHelpModal();
        }
    });
    // Close when clicking on modal backdrop
    helpModal.addEventListener('click', function(event) {
        if (event.target === helpModal && !helpModalContent.contains(event.target)) {
            closeHelpModal();
        }
    });
}
window.addEventListener('load', initHelpModal);
