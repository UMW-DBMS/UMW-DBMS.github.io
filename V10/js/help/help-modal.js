/**
 * Welcome / Help modal
 *
 * Purpose : Step-by-step welcome modal (photo + video per step), "don't show again" preference, keyboard and backdrop close.
 *           Its top shows the ministry logo, the IWWRMP logo and the names of the ministry and the project (TRC review),
 *           built here from WELCOME_BANNER below, so index.html needs no change.
 * Depends : The `#readme-modal` markup in index.html; help media from the MWS_001 GitHub repo; the two logo files in assets/logos/
 *           (see WELCOME_BANNER). A missing logo file is hidden and the names still show.
 * Exposes : initHelpModal() (runs on window load)
 */

// ---------------------------------------------------------------------------------------------------------------------
// Welcome banner: what it says and which logo files it uses. Edit here to change the wording or the logos.
// ---------------------------------------------------------------------------------------------------------------------
const WELCOME_BANNER = {
    title: 'Welcome to the Upper Mahaweli Database',
    ministry: 'Ministry of Agriculture, Livestock, Land and Irrigation',
    project: 'Integrated Watershed and Water Resources Management Project',
    // Left of the names: the ministry logo. Right of the names: the IWWRMP logo.
    ministryLogo: { src: 'assets/logos/ministry-logo.png', alt: 'Emblem of the Ministry of Agriculture, Livestock, Land and Irrigation' },
    projectLogo: { src: 'assets/logos/iwwrmp-logo.png', alt: 'Logo of the Integrated Watershed and Water Resources Management Project (IWWRMP)' }
};

// Styles of the banner (kept here with the banner so the whole feature is in this one file). Class names start with "welcome-"
// and do not clash with any rule in css/. Colours use the theme variables when they exist. This style element is added after
// the linked stylesheets, so these rules win where they overlap.
const WELCOME_BANNER_CSS = `
/* The welcome window must be above the page header (the header is z-index 1100, the window 1000), or the header hides the top of it. */
#readme-modal { z-index: 2000; }
/* The banner takes about 160 px, so the window may use more of the screen height (css/help-modal.css gives 80vh). */
#readme-modal .modal-content { max-height: 92vh; }
/* In step mode the step box is a fixed 360 px and a card with its photo and video can be taller, so its top and bottom were cut off
   (the "Step N" label with them). The card now scrolls inside the box instead. */
#readme-modal .flowchart.step-mode .flow-node.current-step { max-height: calc(100% - 16px); overflow-y: auto; }
.welcome-banner { display: flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 14px; margin: 0 0 8px; padding: 2px 4px 10px; text-align: center; border-bottom: 2px solid var(--c-border, #c9d3cd); }
.welcome-banner .welcome-text { flex: 1 1 auto; min-width: 0; }
.welcome-banner h2 { margin: 0 0 4px; }
.welcome-banner .welcome-ministry, .welcome-banner .welcome-project { margin: 2px 0; line-height: 1.3; }
.welcome-banner .welcome-ministry { font-weight: 700; color: var(--c-primary, #1d5c3a); }
.welcome-banner .welcome-project { font-size: 0.95em; color: var(--c-muted, #4f5f56); }
.welcome-banner .welcome-logo { flex: 0 0 auto; width: auto; height: auto; max-height: 72px; max-width: 30%; object-fit: contain; }
@media (max-height: 700px) {
    #readme-modal .modal-content { max-height: 96vh; }
    .welcome-banner { gap: 10px; margin-bottom: 4px; padding-bottom: 4px; }
    .welcome-banner .welcome-logo { max-height: 40px; }
    .welcome-banner h2 { font-size: 1.15rem; }
    .welcome-banner .welcome-project { font-size: 0.88em; }
}
@media (max-width: 600px) {
    .welcome-banner { flex-wrap: wrap; gap: 6px 10px; }
    .welcome-banner .welcome-text { order: 3; flex-basis: 100%; }
    .welcome-banner .welcome-logo { max-height: 52px; max-width: 40%; }
}
`;

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
        image.style.maxWidth = '50vw';
        image.style.maxHeight = '50vh';
        image.style.border = '2px solid #fff';
        image.style.borderRadius = '4px';
        image.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
        imagePopup.appendChild(image);

        imagePopup.addEventListener('click', closeImagePopup);
        document.body.appendChild(imagePopup);
    }
    // -----------------------------------------------------------------------------------------------------------------
    // Welcome banner: ministry logo | title, ministry and project names | IWWRMP logo
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
        if (!document.getElementById('welcome-banner-styles')) {
            const style = document.createElement('style');
            style.id = 'welcome-banner-styles';
            style.textContent = WELCOME_BANNER_CSS;
            document.head.appendChild(style);
        }
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
        banner.appendChild(makeBannerLogo(WELCOME_BANNER.projectLogo));
        helpModalContent.insertBefore(banner, helpModalContent.firstChild);
    }
    addWelcomeBanner();

    //const videoBaseUrl = 'https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/';

    document.querySelectorAll('#readme-modal .flow-node').forEach((node, index) => {
        const photo = document.createElement('img');
        photo.className = 'step-photo';
        photo.alt = `Step ${index + 1} preview`;
        photo.src = stepPhotoSources[index] || '';
        photo.style.cursor = 'zoom-in';
        photo.addEventListener('click', function() {
            if (!photo.src) return;
            openImagePopup(photo.src, photo.alt);
        });
        photo.addEventListener('error', function() {
            photo.style.display = 'none';
        });
        node.appendChild(photo);

        const video = document.createElement('video');
        video.className = 'step-video';
        video.controls = true;
        //video.playsInline = true;
        video.src = stepVideoSources[index] || 'documentary.mp4';
        //video.preload = 'metadata';
        //const fileName = `Step ${index + 1}.mp4`;
        //video.src = `${videoBaseUrl}${encodeURIComponent(fileName)}`;
        //video.addEventListener('error', function() {
            //console.warn(`Help video not found or not playable: ${fileName}`);
        //});
        node.appendChild(video);
    });
    const stepNodes = Array.from(document.querySelectorAll('#readme-modal .flow-node'));
    let currentStepIndex = 0;

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
        });
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

    // Close with Esc or Enter when modal is visible
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && imagePopup) {
            closeImagePopup();
            return;
        }
        if (helpModal.style.display !== 'flex') return;
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
