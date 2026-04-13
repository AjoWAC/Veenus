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


// Home Banner Slider (Embla)
 
(function () {
  'use strict';

  const root     = document.getElementById('heroSlider');
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

  // ── Header visibility ─────────────────────────────────────
  const mainNav = document.getElementById('mainNav');
  if (mainNav) {
    window.addEventListener('scroll', () => {
      mainNav.classList.toggle('visible-header', window.scrollY > 0);
    }, { passive: true });
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
