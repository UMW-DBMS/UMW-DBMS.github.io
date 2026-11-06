/**
 * Header: Help / User Guide / Map Symbols / Log in beside Explore area
 *
 * Purpose : Shows the four buttons with their names when they fit on the same row as Explore area, and as icons only (the name stays in the tooltip and is
 *           still read out by screen readers) when that is what it takes to keep them on that row. If even the icons do not fit they wrap onto a row of
 *           their own and show their names again. It looks at the real widths, so it is right for any font, any screen width and any language
 *           (a Sinhala or Tamil name is longer than "Help"). On a phone (768 px and narrower) the CSS lays them out as a row of four and this script does nothing.
 * Depends : The elements .header-links and #areaBtn of index.html; css/umw-header.css (the class header-links--icons). If either is missing nothing happens.
 * Exposes : window.HeaderLinks { fit }
 */
(function () {
    'use strict';

    const links = document.querySelector('.header-links');
    const area = document.getElementById('areaBtn');
    if (!links || !area) return;

    const phone = window.matchMedia('(max-width: 768px)');
    let busy = false;

    /** true when the links are not on the same row as Explore area (they are bottom-aligned, so their bottoms differ when they have wrapped) */
    function wrapped() {
        return Math.abs(links.getBoundingClientRect().bottom - area.getBoundingClientRect().bottom) > 6;
    }

    function fit() {
        if (busy) return;
        busy = true;
        try {
            links.classList.remove('header-links--icons');
            if (phone.matches) return;
            if (!wrapped()) return;                           // the names fit
            links.classList.add('header-links--icons');
            if (wrapped()) links.classList.remove('header-links--icons');   // not even the icons fit beside Explore area: own row, with names
        } finally { busy = false; }
    }

    let queued = false;
    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; fit(); });
    }

    window.addEventListener('resize', schedule);
    if (typeof phone.addEventListener === 'function') phone.addEventListener('change', schedule);
    if (typeof ResizeObserver === 'function') {
        const block = links.closest('.location-block');
        if (block) new ResizeObserver(schedule).observe(block);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    window.addEventListener('load', schedule);
    fit();

    window.HeaderLinks = { fit: fit };
})();
