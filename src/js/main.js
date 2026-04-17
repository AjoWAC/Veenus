// Mobile nav toggle
const hamburger = document.getElementById('hamburger');
const drawer    = document.getElementById('drawer');

if (hamburger && drawer) {
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('is-open');
    drawer.style.display = isOpen ? 'flex' : 'none';
    hamburger.setAttribute('aria-expanded', String(isOpen));
    drawer.setAttribute('aria-hidden', String(!isOpen));
  });
}

// Mobile Products accordion
const productsToggle = document.getElementById('products-toggle');
const productsSub    = document.getElementById('products-sub');

if (productsToggle && productsSub) {
  productsToggle.addEventListener('click', () => {
    const isOpen = productsToggle.classList.toggle('is-open');
    productsSub.classList.toggle('is-open', isOpen);
    productsToggle.setAttribute('aria-expanded', String(isOpen));
    productsSub.setAttribute('aria-hidden', String(!isOpen));
  });
}

// Footer column accordions (mobile only — CSS handles visibility)
document.querySelectorAll('.site-footer__col[data-accordion] > button.site-footer__col-title')
  .forEach((btn) => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
    });
  });

// Crafting section stat counters — animate up when scrolled into view
(function craftingCounters() {
  const counters = document.querySelectorAll('.crafting-counter');
  if (!counters.length) return;

  const animate = (el) => {
    const target = Number(el.dataset.target) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    };
    requestAnimationFrame(tick);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach((el) => observer.observe(el));
})();


// Header scroll visibility — runs on every page
(function () {
  const mainNav = document.getElementById('mainNav');
  if (!mainNav) return;
  const onScroll = () => mainNav.classList.toggle('visible-header', window.scrollY > 0);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // apply correct state on load (e.g. page refreshed mid-scroll)
})();


// Home Banner Slider (Embla)

(function () {
  'use strict';

  const root     = document.getElementById('heroSlider');
  if (!root) return;
  const slides   = Array.from(root.querySelectorAll('.embla__slide'));
  const pagItems = Array.from(root.querySelectorAll('.pagination__item'));
  const fills    = pagItems.map(p => p.querySelector('.pagination__fill'));
  const videoEl  = document.getElementById('heroVideo');
  const VIDEO_IDX = slides.findIndex(s => s.dataset.type === 'video');

  const embla = EmblaCarousel(root, { loop: true, dragFree: false });

  // ── Progress state ────────────────────────────────────────
  let currentIdx   = 0;
  let rafId        = null;
  let startTs      = null;   // timestamp when RAF loop last started
  let accMs        = 0;      // ms accumulated before any pause
  let totalMs      = 5000;   // duration for current slide
  let isPaused     = false;

  // ── Helpers ───────────────────────────────────────────────
  function setFillPct(idx, pct) {
    fills[idx].style.width = Math.min(pct, 100).toFixed(3) + '%';
  }

  function setActiveLabel(idx) {
    pagItems.forEach((item, i) =>
      item.classList.toggle('is-active', i === idx)
    );
  }

  function activateSlide(idx) {
    slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
  }

  function markFills(activeIdx) {
    fills.forEach((f, i) => {
      f.style.width = i < activeIdx ? '100%' : '0%';
    });
  }

  // ── RAF progress loop ─────────────────────────────────────
  function stopRAF() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function runRAF() {
    stopRAF();
    isPaused = false;
    startTs  = performance.now();

    function tick(now) {
      const elapsed  = accMs + (now - startTs);
      const fraction = elapsed / totalMs;
      setFillPct(currentIdx, fraction * 100);

      if (fraction < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        // Image slide: advance automatically
        // Video slide: wait for 'ended' event — do nothing here
        if (slides[currentIdx].dataset.type !== 'video') {
          advance();
        }
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function pauseRAF() {
    if (isPaused || !startTs) return;
    isPaused = true;
    accMs   += performance.now() - startTs;
    stopRAF();
  }

  function resumeRAF() {
    if (!isPaused) return;
    runRAF(); // resets isPaused, resets startTs
  }

  // ── Video helpers ─────────────────────────────────────────
  function getVideoDurationMs() {
    const d = videoEl.duration;
    return (isFinite(d) && d > 0) ? d * 1000 : 10000;
  }

  function startVideoSlide() {
    videoEl.currentTime = 0;

    const begin = () => {
      totalMs = getVideoDurationMs();
      accMs   = 0;
      videoEl.play().catch(() => {});
      runRAF();
    };

    if (isFinite(videoEl.duration) && videoEl.duration > 0) {
      begin();
    } else {
      // Metadata not yet loaded — wait for it
      const onMeta = () => {
        videoEl.removeEventListener('loadedmetadata', onMeta);
        begin();
      };
      videoEl.addEventListener('loadedmetadata', onMeta);
    }
  }

  function stopVideoSlide() {
    videoEl.pause();
    videoEl.currentTime = 0;
  }

  // Video finished naturally → advance
  videoEl.addEventListener('ended', () => {
    if (currentIdx === VIDEO_IDX) {
      setFillPct(VIDEO_IDX, 100);
      stopRAF();
      advance();
    }
  });

  // ── Core navigation ───────────────────────────────────────
  function advance() {
    goTo((currentIdx + 1) % slides.length);
  }

  function goTo(idx) {
    // Tear down current slide
    stopRAF();
    if (currentIdx === VIDEO_IDX) stopVideoSlide();

    // Reset fills: past = full, future = empty, target = 0
    markFills(idx);

    currentIdx = idx;
    embla.scrollTo(idx);
    activateSlide(idx);
    setActiveLabel(idx);

    // Start progress for new slide
    accMs = 0;
    if (idx === VIDEO_IDX) {
      startVideoSlide();
    } else {
      totalMs = parseInt(slides[idx].dataset.duration, 10) || 5000;
      runRAF();
    }
  }

  // ── Pagination clicks ─────────────────────────────────────
  pagItems.forEach((item, i) => {
    item.addEventListener('mousedown', (e) => {
      e.stopPropagation(); // Prevent Embla pointer events
    });
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent Embla pointer events
      if (i !== currentIdx) goTo(i);
    });
  });

  // ── Drag / swipe ──────────────────────────────────────────
  // Removed pointerDown pause behavior - clicking slide area no longer pauses
  embla.on('select', () => {
    const snapped = embla.selectedScrollSnap();
    if (snapped !== currentIdx) {
      // User swiped to a new slide
      goTo(snapped);
    } else {
      // Dragged back to same slide — resume
      if (currentIdx === VIDEO_IDX) videoEl.play().catch(() => {});
      resumeRAF();
    }
  });

  // ── Counter Up ─────────────────────────────────────────────
  const statsEl = document.getElementById('statsCounter');
  if (statsEl) {
    let counted = false;
    const counters = statsEl.querySelectorAll('[data-count]');

    function animateCounters() {
      if (counted) return;
      counted = true;
      counters.forEach(el => {
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const duration = 2000;
        const start = performance.now();

        function update(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);
          el.textContent = current + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
      });
    }

    const statsObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateCounters();
        statsObserver.disconnect();
      }
    }, { threshold: 0 });
    statsObserver.observe(statsEl);
  }

  // ── Boot ──────────────────────────────────────────────────
  goTo(0);

})(); 


// Products slider (Embla)
const productsSlider = document.getElementById('products-slider');

if (productsSlider && typeof EmblaCarousel !== 'undefined') {
  const embla = EmblaCarousel(productsSlider, {
    loop: false,
    align: 'start',
    dragFree: false,
  });

  const prevBtn = document.getElementById('products-prev');
  const nextBtn = document.getElementById('products-next');

  if (prevBtn) prevBtn.addEventListener('click', () => embla.scrollPrev());
  if (nextBtn) nextBtn.addEventListener('click', () => embla.scrollNext());
}

// Testimonials slider (Embla)
const testimonialsSlider = document.getElementById('testimonials-slider');

if (testimonialsSlider && typeof EmblaCarousel !== 'undefined') {
  const testimonialsEmbla = EmblaCarousel(testimonialsSlider, {
    loop: true,
    align: 'start',
    dragFree: false,
  });

  const tPrev = document.getElementById('testimonials-prev');
  const tNext = document.getElementById('testimonials-next');
  const tPrevMob = document.getElementById('testimonials-prev-mob');
  const tNextMob = document.getElementById('testimonials-next-mob');

  if (tPrev) tPrev.addEventListener('click', () => testimonialsEmbla.scrollPrev());
  if (tNext) tNext.addEventListener('click', () => testimonialsEmbla.scrollNext());
  if (tPrevMob) tPrevMob.addEventListener('click', () => testimonialsEmbla.scrollPrev());
  if (tNextMob) tNextMob.addEventListener('click', () => testimonialsEmbla.scrollNext());
}

// Projects Lightbox
(function () {
  const lightbox    = document.getElementById('projects-lightbox');
  if (!lightbox) return;

  const emblaRoot   = document.getElementById('lightbox-embla');
  const emblaContainer = document.getElementById('lightbox-embla-container');
  const catEl       = document.getElementById('lightbox-category');
  const titleEl     = document.getElementById('lightbox-title');
  const dotsWrap    = document.getElementById('lightbox-dots');
  const prevBtn     = document.getElementById('lightbox-prev');
  const nextBtn     = document.getElementById('lightbox-next');
  const backdrop    = document.getElementById('lightbox-backdrop');

  let emblaInstance = null;

  function buildSlides(images) {
    emblaContainer.innerHTML = '';
    images.forEach(src => {
      const slide = document.createElement('div');
      slide.className = 'lightbox-embla__slide';
      const img = document.createElement('img');
      img.src = src.trim();
      img.alt = '';
      img.className = 'lightbox__img';
      slide.appendChild(img);
      emblaContainer.appendChild(slide);
    });
  }

  function buildDots(count) {
    dotsWrap.innerHTML = '';
    return Array.from({ length: count }, (_, i) => {
      const btn = document.createElement('button');
      btn.className = 'lightbox__dot';
      btn.setAttribute('aria-label', `Image ${i + 1}`);
      btn.addEventListener('click', () => emblaInstance && emblaInstance.scrollTo(i));
      dotsWrap.appendChild(btn);
      return btn;
    });
  }

  function open(card) {
    const images = (card.dataset.images || '').split(',').filter(Boolean);
    if (!images.length) return;

    const ps = card.querySelectorAll('p');
    catEl.textContent   = ps[0] ? ps[0].textContent : '';
    titleEl.textContent = ps[1] ? ps[1].textContent : '';

    buildSlides(images);
    const dots = buildDots(images.length);

    if (emblaInstance) emblaInstance.destroy();
    emblaInstance = EmblaCarousel(emblaRoot, { loop: true, align: 'start', dragFree: false });

    const updateDots = () => {
      const idx = emblaInstance.selectedScrollSnap();
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    };
    emblaInstance.on('select', updateDots);
    updateDots();

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = scrollbarWidth + 'px';
    document.body.style.overflow = 'hidden';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function close() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (emblaInstance) { emblaInstance.destroy(); emblaInstance = null; }
  }

  document.querySelectorAll('[data-project-idx]').forEach(card => {
    card.addEventListener('click', () => open(card));
  });

  prevBtn.addEventListener('click', () => emblaInstance && emblaInstance.scrollPrev());
  nextBtn.addEventListener('click', () => emblaInstance && emblaInstance.scrollNext());
  backdrop.addEventListener('click', close);

  lightbox.addEventListener('keydown', e => {
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  emblaInstance && emblaInstance.scrollPrev();
    if (e.key === 'ArrowRight') emblaInstance && emblaInstance.scrollNext();
  });
})();

// Projects slider (Embla)
const projectsSlider = document.getElementById('projects-slider');

if (projectsSlider && typeof EmblaCarousel !== 'undefined') {
  const projectsEmbla = EmblaCarousel(projectsSlider, {
    loop: false,
    align: 'start',
    dragFree: false,
  });

  const projectsPrev = document.getElementById('projects-prev');
  const projectsNext = document.getElementById('projects-next');

  if (projectsPrev) projectsPrev.addEventListener('click', () => projectsEmbla.scrollPrev());
  if (projectsNext) projectsNext.addEventListener('click', () => projectsEmbla.scrollNext());
}

// Spaces slider (Embla) — About page mobile
const spacesSlider = document.getElementById('spaces-slider');

if (spacesSlider && typeof EmblaCarousel !== 'undefined') {
  const spacesEmbla = EmblaCarousel(spacesSlider, {
    loop: false,
    align: 'start',
    dragFree: false,
  });

  const spacesPrev = document.getElementById('spaces-prev');
  const spacesNext = document.getElementById('spaces-next');

  if (spacesPrev) spacesPrev.addEventListener('click', () => spacesEmbla.scrollPrev());
  if (spacesNext) spacesNext.addEventListener('click', () => spacesEmbla.scrollNext());
}

// Gallery Masonry — Events page
(function () {
  const grid = document.getElementById('gallery-masonry');
  if (!grid || typeof Masonry === 'undefined' || typeof imagesLoaded === 'undefined') return;

  imagesLoaded(grid, function () {
    new Masonry(grid, {
      itemSelector: '.gallery-masonry__item',
      columnWidth:  '.gallery-masonry__sizer',
      gutter:       '.gallery-masonry__gutter',
      percentPosition: true,
    });
  });
})();

// Gallery Lightbox — Events page
(function () {
  const lightbox  = document.getElementById('gallery-lightbox');
  if (!lightbox) return;

  const lbImg     = document.getElementById('gallery-lightbox-img');
  const lbCounter = document.getElementById('gallery-lightbox-counter');
  const prevBtn   = document.getElementById('gallery-lightbox-prev');
  const nextBtn   = document.getElementById('gallery-lightbox-next');
  const closeBtn  = document.getElementById('gallery-lightbox-close');
  const backdrop  = document.getElementById('gallery-lightbox-backdrop');

  // Build ordered image list from masonry grid (DOM order = display order)
  const images = Array.from(
    document.querySelectorAll('#gallery-masonry .gallery-item img')
  ).map(img => ({ src: img.src, alt: img.alt }));

  if (!images.length) return;

  let current = 0;

  function goTo(idx) {
    current = ((idx % images.length) + images.length) % images.length;
    lbImg.src = images[current].src;
    lbImg.alt = images[current].alt;
    lbCounter.textContent = (current + 1) + ' / ' + images.length;
  }

  function open(idx) {
    goTo(idx);
    const sw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = sw + 'px';
    document.body.style.overflow = 'hidden';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    lightbox.focus();
  }

  function close() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  // Click any gallery item (desktop or mobile — match by src)
  document.querySelectorAll('.gallery-item').forEach(el => {
    el.addEventListener('click', () => {
      const clickedSrc = el.querySelector('img').src;
      const idx = images.findIndex(img => img.src === clickedSrc);
      open(idx >= 0 ? idx : 0);
    });
  });

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  lightbox.addEventListener('keydown', e => {
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });
})();

// Product Series slider — Greenrich page (mobile only)
(function () {
  const root = document.getElementById('gr-series-slider');
  if (!root || typeof EmblaCarousel === 'undefined') return;

  const embla = EmblaCarousel(root, { loop: false, align: 'start', dragFree: false });

  const prev = document.getElementById('gr-series-prev');
  const next = document.getElementById('gr-series-next');

  function updateArrows() {
    if (prev) prev.classList.toggle('is-disabled', !embla.canScrollPrev());
    if (next) next.classList.toggle('is-disabled', !embla.canScrollNext());
  }

  if (prev) prev.addEventListener('click', () => embla.scrollPrev());
  if (next) next.addEventListener('click', () => embla.scrollNext());
  embla.on('select', updateArrows);
  embla.on('init', updateArrows);
  updateArrows();
})();

// Related blogs slider — Insight Detail page
(function () {
  const root = document.getElementById('related-slider');
  if (!root || typeof EmblaCarousel === 'undefined') return;

  const embla = EmblaCarousel(root, { loop: false, align: 'start', dragFree: false });

  const prev = document.getElementById('related-prev');
  const next = document.getElementById('related-next');

  function updateArrows() {
    if (prev) prev.classList.toggle('is-disabled', !embla.canScrollPrev());
    if (next) next.classList.toggle('is-disabled', !embla.canScrollNext());
  }

  if (prev) prev.addEventListener('click', () => embla.scrollPrev());
  if (next) next.addEventListener('click', () => embla.scrollNext());

  embla.on('select', updateArrows);
  embla.on('init', updateArrows);
  updateArrows();
})();

// Insights filter — Insights page
(function () {
  const filterBtns = document.querySelectorAll('[data-filter]');
  if (!filterBtns.length) return;

  const cards = document.querySelectorAll('[data-category]');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Pop animation on clicked button
      btn.classList.remove('is-activating');
      void btn.offsetWidth; // reflow to restart animation
      btn.classList.add('is-activating');
      btn.addEventListener('animationend', () => btn.classList.remove('is-activating'), { once: true });

      // Update button states
      filterBtns.forEach((b) => {
        const active = b === btn;
        b.setAttribute('aria-pressed', String(active));
        b.classList.toggle('insights-filter--active', active);
        b.classList.toggle('bg-black', active);
        b.classList.toggle('text-white', active);
        b.classList.toggle('font-semibold', active);
        b.classList.toggle('border', !active);
        b.classList.toggle('border-[#eaeaea]', !active);
        b.classList.toggle('bg-white', !active);
        b.classList.toggle('text-[#222]', !active);
        b.classList.toggle('font-medium', !active);
      });

      // Animate cards in/out
      let visibleIdx = 0;
      cards.forEach((card) => {
        const match = filter === 'all' || card.dataset.category === filter;

        if (match) {
          // Remove any lingering hide state
          card.classList.remove('is-hiding');
          card.style.display = '';
          // Set entering state, then stagger the fade-in
          card.classList.add('is-entering');
          const delay = visibleIdx * 50;
          setTimeout(() => card.classList.remove('is-entering'), delay + 16);
          visibleIdx++;
        } else {
          card.classList.remove('is-entering');
          card.classList.add('is-hiding');
          card.addEventListener('transitionend', () => {
            if (card.classList.contains('is-hiding')) card.style.display = 'none';
          }, { once: true });
        }
      });
    });
  });
})();

// Product Listing — mobile filter drawer
(function () {
  const openBtn  = document.getElementById('pl-mobile-filter-btn');
  const drawer   = document.getElementById('pl-mobile-filter-drawer');
  if (!openBtn || !drawer) return;

  const panel    = document.getElementById('pl-mobile-filter-panel');
  const closeBtn = document.getElementById('pl-mobile-filter-close');
  const backdrop = document.getElementById('pl-mobile-filter-backdrop');

  function open() {
    drawer.classList.remove('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    // Force reflow before removing translate so the transition animates
    panel.offsetHeight;
    panel.classList.remove('-translate-x-full');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    panel.classList.add('-translate-x-full');
    document.body.style.overflow = '';
    setTimeout(function () {
      drawer.classList.add('hidden');
      drawer.setAttribute('aria-hidden', 'true');
    }, 300);
  }

  openBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    open();
  });
  closeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    close();
  });
  backdrop.addEventListener('click', function (e) {
    e.stopPropagation();
    close();
  });

  // Accordion toggles inside drawer
  drawer.querySelectorAll('[data-mobile-filter-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const list = toggle.nextElementSibling;
      const svg  = toggle.querySelector('svg');
      const isOpen = !list.classList.contains('hidden');
      list.classList.toggle('hidden', isOpen);
      if (svg) svg.classList.toggle('rotate-180', !isOpen);
    });
  });
})();

// Product Listing — filter dropdowns
(function () {
  const dropdowns = document.querySelectorAll('[data-filter-dropdown]');
  if (!dropdowns.length) return;

  function closeAll(except) {
    dropdowns.forEach(d => {
      if (d === except) return;
      const btn   = d.querySelector('.pl-filter-btn');
      const panel = d.querySelector('.pl-filter-panel');
      const svg   = btn && btn.querySelector('svg');
      if (btn)   btn.setAttribute('aria-expanded', 'false');
      if (panel) panel.classList.add('hidden');
      if (svg)   svg.classList.remove('rotate-180');
    });
  }

  dropdowns.forEach(dropdown => {
    const btn   = dropdown.querySelector('.pl-filter-btn');
    const panel = dropdown.querySelector('.pl-filter-panel');
    const label = dropdown.querySelector('.pl-filter-label');
    const svg   = btn && btn.querySelector('svg');
    if (!btn || !panel) return;

    // Toggle open/close
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      closeAll(dropdown);
      btn.setAttribute('aria-expanded', String(!isOpen));
      panel.classList.toggle('hidden', isOpen);
      if (svg) svg.classList.toggle('rotate-180', !isOpen);
    });

    // Select an option
    panel.querySelectorAll('.pl-filter-option').forEach(option => {
      option.addEventListener('click', () => {
        label.textContent = option.textContent.trim();
        panel.querySelectorAll('.pl-filter-option').forEach(o =>
          o.setAttribute('aria-selected', String(o === option))
        );
        btn.setAttribute('aria-expanded', 'false');
        panel.classList.add('hidden');
        if (svg) svg.classList.remove('rotate-180');
      });
    });
  });

  // Close on outside click
  document.addEventListener('click', () => closeAll());

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
  });
})();

// Products Range slider (Embla) — Products page
const productsRangeSlider = document.getElementById('products-range-slider');

if (productsRangeSlider && typeof EmblaCarousel !== 'undefined') {
  const productsRangeEmbla = EmblaCarousel(productsRangeSlider, {
    loop: false,
    align: 'start',
    dragFree: false,
  });

  const rangeP = document.getElementById('products-range-prev');
  const rangeN = document.getElementById('products-range-next');

  if (rangeP) rangeP.addEventListener('click', () => productsRangeEmbla.scrollPrev());
  if (rangeN) rangeN.addEventListener('click', () => productsRangeEmbla.scrollNext());
}
