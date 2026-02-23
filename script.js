/* ============================================================
   RETRO MICROWAVE — GSAP Animation Controller
   ============================================================ */

// ── Elements ────────────────────────────────────────────────
const microwave = document.getElementById("microwave");
const body      = document.getElementById("body");
const tray      = document.getElementById("tray");
const glow      = document.getElementById("glow");
const knob      = document.getElementById("knob");
const smoke     = document.getElementById("smoke");
const explosion = document.getElementById("explosion");

// ── State ───────────────────────────────────────────────────
let isOn        = false;
let clickCount  = 0;
let isExploded  = false;
let idleTimeout = null;

// Timers / references we need to kill on reset
let idleTimeline   = null;
let traySpin       = null;
let hoverTween     = null;
let clickTimestamp  = 0;

const IDLE_DELAY   = 5000;   // ms before idle kicks in
const OVERCLICK    = 6;      // clicks to explode
const CLICK_WINDOW = 4000;   // ms window for overclick detection

// ── Bootstrap ───────────────────────────────────────────────
gsap.defaults({ overwrite: "auto" });
resetIdleTimer();

/* ============================================================
   1) IDLE ANIMATION
   ============================================================ */

function startIdle() {
  // Kill any existing idle timeline
  if (idleTimeline) idleTimeline.kill();

  idleTimeline = gsap.timeline();

  // Droop / sigh
  idleTimeline
    .to(microwave, {
      y: 6,
      scaleY: 0.97,
      duration: 1.2,
      ease: "power2.out",
    })
    .to(microwave, {
      y: 0,
      scaleY: 1,
      duration: 0.6,
      ease: "elastic.out(1, 0.4)",
    })
    // Subtle continuous float
    .to(microwave, {
      y: -4,
      duration: 2,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
}

function resetIdleTimer() {
  clearTimeout(idleTimeout);
  // Stop current idle animation & snap back
  if (idleTimeline) {
    idleTimeline.kill();
    gsap.to(microwave, { y: 0, scaleY: 1, duration: 0.4, ease: "power2.out" });
  }
  idleTimeout = setTimeout(() => {
    if (!isOn && !isExploded) startIdle();
  }, IDLE_DELAY);
}

// Reset idle on any interaction
document.addEventListener("mousemove", resetIdleTimer);
document.addEventListener("click", resetIdleTimer);

/* ============================================================
   2) KNOB HOVER WIGGLE
   ============================================================ */

knob.addEventListener("mouseenter", () => {
  if (isExploded) return;
  hoverTween = gsap.to(knob, {
    rotation: 8,
    duration: 0.15,
    ease: "power1.inOut",
    yoyo: true,
    repeat: -1,
    startAt: { rotation: -8 },
  });
});

knob.addEventListener("mouseleave", () => {
  if (hoverTween) hoverTween.kill();
  // Snap back only if microwave isn't on (knob may be rotated)
  if (!isOn) {
    gsap.to(knob, { rotation: 0, duration: 0.3, ease: "power2.out" });
  }
});

/* ============================================================
   3) CLICK KNOB → TURN ON
   ============================================================ */

knob.addEventListener("click", (e) => {
  e.stopPropagation();
  if (isExploded) return;

  const now = Date.now();

  // Reset click tracking if window expired
  if (now - clickTimestamp > CLICK_WINDOW) {
    clickCount = 0;
    clickTimestamp = now;
  }

  clickCount++;

  // Check overclick FIRST
  if (clickCount > OVERCLICK) {
    explode();
    return;
  }

  turnOn();
});

function turnOn() {
  if (hoverTween) hoverTween.kill();
  isOn = true;

  const tl = gsap.timeline();

  // Knob rotate with elastic snap
  tl.to(knob, {
    rotation: `+=${120}`,
    duration: 0.6,
    ease: "elastic.out(1, 0.35)",
  });

  // Microwave jitter / shake
  tl.to(microwave, {
    x: -3,
    duration: 0.05,
    yoyo: true,
    repeat: 5,
    ease: "none",
  }, "<");

  // Glow fade in
  tl.to(glow, {
    opacity: 1,
    duration: 0.5,
    ease: "power2.out",
  }, "<0.1");

  // Start tray spinning (continuous)
  if (traySpin) traySpin.kill();
  traySpin = gsap.to(tray, {
    rotation: "+=360",
    duration: 3,
    ease: "none",
    repeat: -1,
  });
}

/* ============================================================
   4) OVERCLICK → EXPLOSION
   ============================================================ */

function explode() {
  isExploded = true;
  isOn = false;
  if (hoverTween) hoverTween.kill();

  // Stop tray
  if (traySpin) traySpin.kill();

  const tl = gsap.timeline({
    onComplete: () => {
      // Wait 3 seconds then reset
      gsap.delayedCall(3, resetMicrowave);
    },
  });

  // Aggressive shake
  tl.to(microwave, {
    x: -6,
    duration: 0.04,
    yoyo: true,
    repeat: 14,
    ease: "none",
  });

  // Glow turns red
  tl.to(glow, {
    opacity: 1,
    filter: "hue-rotate(-40deg) saturate(3) brightness(1.2)",
    duration: 0.3,
  }, "<");

  // Scale up + squash
  tl.to(microwave, {
    scale: 1.1,
    scaleY: 0.95,
    duration: 0.3,
    ease: "power2.out",
  }, "<0.2");

  // Show explosion image (replaces normal body visually)
  tl.to(explosion, {
    opacity: 1,
    duration: 0.2,
  }, "<0.1");

  // Hide normal body + knob behind explosion
  tl.to([body, knob], {
    opacity: 0,
    duration: 0.2,
  }, "<");

  // Show smoke rising
  tl.to(smoke, {
    opacity: 1,
    y: -30,
    duration: 0.6,
    ease: "power2.out",
  }, "<0.1");

  // Hide glow + tray (they're destroyed)
  tl.to([glow, tray], {
    opacity: 0,
    duration: 0.3,
  }, "<");
}

/* ============================================================
   RESET
   ============================================================ */

function resetMicrowave() {
  const tl = gsap.timeline({
    onComplete: () => {
      isExploded = false;
      isOn = false;
      clickCount = 0;
      clickTimestamp = 0;
      resetIdleTimer();
    },
  });

  // Fade everything out
  tl.to([smoke, explosion], {
    opacity: 0,
    duration: 0.5,
    ease: "power2.out",
  });

  tl.to(glow, { opacity: 0, filter: "none", duration: 0.3 }, "<");

  // Bring body + knob back
  tl.to([body, knob], { opacity: 1, duration: 0.4 }, "<0.2");
  tl.to(tray, { opacity: 1, duration: 0.3 }, "<");

  // Reset transforms
  tl.to(microwave, {
    x: 0,
    y: 0,
    scale: 1,
    scaleY: 1,
    duration: 0.5,
    ease: "elastic.out(1, 0.5)",
  }, "<");

  tl.to(knob, { rotation: 0, duration: 0.4, ease: "power2.out" }, "<");
  tl.to(tray, { rotation: 0, duration: 0.3 }, "<");
  tl.to(smoke, { y: 0, duration: 0.01 }, "<");
}
