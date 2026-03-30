window.onload = function() {
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
};
