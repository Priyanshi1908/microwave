/* ============================================================
   RETRO MICROWAVE — GSAP Animation Controller
   ============================================================ */

// ── Elements ────────────────────────────────────────────────
const microwave = document.getElementById("microwave");
const body = document.getElementById("body");
const tray = document.getElementById("tray");
const trayShadow = document.getElementById("trayShadow");
const trayLight = document.getElementById("trayLight");
const innerGlow = document.getElementById("innerGlow");
const knob = document.getElementById("knob");
const fireContainer = document.getElementById("fireContainer");
const smokeContainer = document.getElementById("smokeContainer");
const explosion = document.getElementById("explosion");
const knobHint = document.getElementById("knobHint");
const windowHint = document.getElementById("windowHint");

const windowArrow = document.getElementById("windowArrow");
const arrowTail1 = document.getElementById("arrowTail1");
const arrowTail2 = document.getElementById("arrowTail2");
const arrowHead = document.getElementById("arrowHead");

// ── State ───────────────────────────────────────────────────
let isOn = false;
let clickCount = 0;
let isExploded = false;
let idleTimeout = null;

let smokeActive = false;
let fireActive = false;

let idleTimeline = null;
let traySpin = null;
let shadowSweep = null;
let lightSweep = null;
let trayPulse = null;
let hoverTween = null;

const IDLE_DELAY = 5000;
const MAX_LEVEL = 3; // clicks before explosion

// ── Bootstrap ───────────────────────────────────────────────
gsap.defaults({ overwrite: "auto" });
resetIdleTimer();

// Initialize knob hint
gsap.to(knobHint, { opacity: 1, duration: 1, delay: 0.5 });
addFloatingHint(knobHint);

function addFloatingHint(el) {
  gsap.to(el, {
    y: -8,
    duration: 1.5,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });
}

/* ============================================================
   1) IDLE ANIMATION
   ============================================================ */

function startIdle() {
  if (idleTimeline) idleTimeline.kill();

  idleTimeline = gsap.timeline();

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
  if (idleTimeline) {
    idleTimeline.kill();
    gsap.to(microwave, { y: 0, scaleY: 1, duration: 0.4, ease: "power2.out" });
  }
  idleTimeout = setTimeout(() => {
    if (!isOn && !isExploded) startIdle();
  }, IDLE_DELAY);
}

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
  if (!isOn) {
    gsap.to(knob, { rotation: 0, duration: 0.3, ease: "power2.out" });
  }
});

/* ============================================================
   3) CLICK KNOB → PROGRESSIVE TURN ON
   ============================================================ */

knob.addEventListener("click", (e) => {
  e.stopPropagation();
  if (isExploded) return;

  clickCount++;

  // Max level reached → explode
  if (clickCount >= MAX_LEVEL) {
    explode();
    return;
  }

  // Hide knob hint on first click
  if (clickCount === 1) {
    gsap.to(knobHint, { opacity: 0, duration: 0.4 });
  }

  turnOn();
});

function turnOn() {
  if (hoverTween) hoverTween.kill();
  isOn = true;

  // Progress from 0 → 1 based on click level
  const progress = clickCount / MAX_LEVEL;

  const tl = gsap.timeline();

  // Knob rotate — fixed increment per click
  tl.to(knob, {
    rotation: `+=${120}`,
    duration: 0.6,
    ease: "elastic.out(1, 0.35)",
  });

  // Microwave jitter — gets stronger with each click
  const shakeIntensity = 2 + progress * 5;
  tl.to(microwave, {
    x: -shakeIntensity,
    duration: 0.05,
    yoyo: true,
    repeat: 3 + Math.floor(progress * 6),
    ease: "none",
  }, "<");

  // Increased initial intensity: ~0.45 at level 1 → 0.95 at level 6
  const glowOpacity = 0.35 + progress * 0.6;

  // Hue shifts from warm yellow (0deg) toward red (-30deg) at max
  const hueShift = -progress * 35;
  const saturation = 1.3 + progress * 1.5;

  tl.to(innerGlow, {
    opacity: glowOpacity,
    filter: `hue-rotate(${hueShift}deg) saturate(${saturation})`,
    duration: 0.5,
    ease: "power2.out",
  }, "<0.1");

  // Start simulated rotation — moving shadows and light changes
  if (shadowSweep) shadowSweep.kill();
  if (lightSweep) lightSweep.kill();
  if (trayPulse) trayPulse.kill();

  const spinDuration = 5 - progress * 3; // 5s → 2s

  // Shadow sweep — dark gradient slides across the plate
  gsap.set(trayShadow, { opacity: 0.8 + progress * 0.2 });
  shadowSweep = gsap.to(trayShadow, {
    backgroundPosition: "100% 0",
    duration: spinDuration,
    ease: "none",
    repeat: -1,
    startAt: { backgroundPosition: "-100% 0" },
  });

  // Light sweep — white gradient sweep
  gsap.set(trayLight, { opacity: 0.5 + progress * 0.3 });
  lightSweep = gsap.to(trayLight, {
    backgroundPosition: "100% 0",
    duration: spinDuration,
    ease: "none",
    repeat: -1,
    startAt: { backgroundPosition: "-100% 0" },
    delay: spinDuration * 0.5, // Offset from shadow sweep
  });
}

/* ============================================================
   4) EXPLOSION (auto-triggers at max level)
   ============================================================ */

function explode() {
  isExploded = true;
  isOn = false;
  if (hoverTween) hoverTween.kill();
  if (shadowSweep) shadowSweep.kill();
  if (lightSweep) lightSweep.kill();
  if (trayPulse) trayPulse.kill();

  const tl = gsap.timeline();

  // New interaction: Click window to open it after explosion
  const backgroundOpen = document.getElementById("backgroundOpen");
  const windowTrigger = document.getElementById("windowTrigger");

  windowTrigger.addEventListener("click", () => {
    if (isExploded) {
      // Hide arrow hint
      gsap.to(windowArrow, { opacity: 0, duration: 0.4 });

      gsap.to(backgroundOpen, {
        opacity: 1,
        duration: 1.0,
        ease: "power2.inOut"
      });
      // Smoke dissipates towards the window opening
      gsap.delayedCall(1.0, () => {
        smokeActive = false; // Stop generating new smoke
        const scaleRatio = microwave.getBoundingClientRect().width / 700;
        gsap.to(smokeContainer, {
          opacity: 0,
          x: 200 * scaleRatio, // Drift out window
          y: -150 * scaleRatio, // Drifts up
          duration: 5,
          ease: "sine.out",
          onComplete: () => {
            smokeContainer.innerHTML = ''; // clean up existing particles
          }
        });
      });
    }
  });

  // Aggressive shake
  tl.to(microwave, {
    x: -6,
    duration: 0.04,
    yoyo: true,
    repeat: 14,
    ease: "none",
  });

  // Inner glow turns red hot
  tl.to(innerGlow, {
    opacity: 1,
    background: "radial-gradient(ellipse at center, rgba(255,60,20,0.6) 0%, rgba(255,30,0,0.3) 40%, transparent 75%)",
    duration: 0.3,
  }, "<");

  // Show animated arrow hint after explosion
  const arrowTl = gsap.timeline({ delay: 1 });
  arrowTl.to(arrowTail1, { opacity: 1, duration: 0.3 })
    .to(arrowTail2, { opacity: 1, duration: 0.3 })
    .to(arrowHead, { opacity: 1, duration: 0.4 });

  // Floating effect for the entire arrow
  gsap.to(windowArrow, {
    y: -5,
    duration: 1.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  // Scale up + squash
  tl.to(microwave, {
    scale: 1.02,
    scaleY: 0.95,
    duration: 0.3,
    ease: "power2.out",
  }, "<0.2");

  // Show explosion image
  tl.to(explosion, {
    opacity: 1,
    duration: 0.2,
  }, "<0.1");

  // Hide normal body + knob
  tl.to([body, knob], {
    opacity: 0,
    duration: 0.2,
  }, "<");

  // Trigger Smoke & Fire Particles
  tl.add(() => {
    smokeActive = true;
    fireActive = true;
    gsap.set(smokeContainer, { opacity: 1, x: 0, y: 0 }); // reset container
    gsap.set(fireContainer, { opacity: 1, x: 0, y: 0 }); // reset container
    explodeSmokeBurst();
    spawnContinuousSmoke();
    spawnContinuousFire();
  }, "<0.1");

  // Hide glow + tray
  tl.to([innerGlow, trayWrapper], {
    opacity: 0,
    duration: 0.3,
  }, "<");
}

/* ============================================================
   RESET
   ============================================================ */

function resetMicrowave() {
  smokeActive = false;
  fireActive = false;
  const tl = gsap.timeline({
    onComplete: () => {
      isExploded = false;
      isOn = false;
      clickCount = 0;
      smokeContainer.innerHTML = '';
      fireContainer.innerHTML = '';
      resetIdleTimer();
    },
  });

  tl.to([smokeContainer, fireContainer, explosion], {
    opacity: 0,
    duration: 0.5,
    ease: "power2.out",
  });

  tl.to(innerGlow, { opacity: 0, filter: "none", duration: 0.3 }, "<");

  tl.to([body, knob], { opacity: 1, duration: 0.4 }, "<0.2");

  tl.to(microwave, {
    x: 0,
    y: 0,
    scale: 1,
    scaleY: 1,
    duration: 0.5,
    ease: "elastic.out(1, 0.5)",
  }, "<");

  tl.to(knob, { rotation: 0, duration: 0.4, ease: "power2.out" }, "<");

  // Kill simulation tweens
  if (shadowSweep) shadowSweep.kill();
  if (lightSweep) lightSweep.kill();
  if (trayPulse) trayPulse.kill();

  tl.set([trayShadow, trayLight], { opacity: 0 }, "<");
  tl.set(tray, { filter: "brightness(1)" }, "<");
  tl.set([smokeContainer, fireContainer], { x: 0, y: 0 }, "<");
}

/* ============================================================
   5) SMOKE PARTICLE SYSTEM
   ============================================================ */

function explodeSmokeBurst() {
  for (let i = 0; i < 35; i++) {
    createSmokeParticle(true);
  }
}

function spawnContinuousSmoke() {
  if (!smokeActive) return;
  createSmokeParticle(false);
  // Random delay between 0.05 and 0.15 for thick smoke
  gsap.delayedCall(0.05 + Math.random() * 0.1, spawnContinuousSmoke);
}

function createSmokeParticle(isBurst = false) {
  const scaleRatio = microwave.getBoundingClientRect().width / 700;

  const particle = document.createElement("div");
  particle.classList.add("smoke-particle");
  smokeContainer.appendChild(particle);

  // Spawn near the explosion origin (around door) scaled by container size
  const centerX = 350 * scaleRatio;
  const centerY = 200 * scaleRatio;

  // Spread
  const spread = (isBurst ? 80 : 40) * scaleRatio;
  const startX = centerX + (Math.random() - 0.5) * spread;
  const startY = centerY + (Math.random() - 0.5) * spread;

  // Visuals: Mix of dark gray, charcoal, and fire-ish at start
  let bg = "";
  if (isBurst && Math.random() > 0.6) {
    // Fiery blast: warm colors
    const r = 255;
    const g = 100 + Math.floor(Math.random() * 100);
    const b = 20;
    bg = `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.9) 0%, rgba(${r - 50}, ${g - 50}, 0, 0.4) 40%, rgba(0, 0, 0, 0) 70%)`;
  } else {
    // Thick Smoke
    const shade = 20 + Math.random() * 60; // Dark grey
    const alpha = 0.6 + Math.random() * 0.4;
    bg = `radial-gradient(circle, rgba(${shade}, ${shade}, ${shade}, ${alpha}) 0%, rgba(${shade}, ${shade}, ${shade}, ${alpha * 0.5}) 40%, rgba(0, 0, 0, 0) 70%)`;
  }

  particle.style.background = bg;

  // 150px width/height offset (particle center relative)
  const offset = 75 * scaleRatio;

  gsap.set(particle, {
    x: startX - offset,
    y: startY - offset,
    scale: 0.2 + Math.random() * 0.4,
    opacity: 0,
    rotation: Math.random() * 360
  });

  const duration = isBurst ? 2 + Math.random() * 2 : 4 + Math.random() * 3;

  // Phase 1: Fade In, Phase 2: Fade Out
  const tl = gsap.timeline({
    onComplete: () => particle.remove()
  });

  tl.to(particle, {
    opacity: 1,
    duration: duration * 0.2,
    ease: "power2.out"
  }).to(particle, {
    opacity: 0,
    duration: duration * 0.8,
    ease: "power1.inOut"
  });

  // Calculate destination (physics)
  let targetX, targetY;
  if (isBurst) {
    // Explode outwards and mostly up
    const angleRad = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5; // Wider arc
    const distance = (150 + Math.random() * 250) * scaleRatio;
    targetX = startX - offset + Math.cos(angleRad) * distance;
    targetY = startY - offset + Math.sin(angleRad) * distance;

    // Add some gravity/rise to burst particles
    gsap.to(particle, {
      x: targetX,
      duration: duration,
      ease: "power3.out"
    });
    gsap.to(particle, {
      y: targetY,
      duration: duration,
      ease: "power3.out"
    });
    // Secondary drift upward after burst slow down
    gsap.to(particle, {
      y: targetY - ((100 + Math.random() * 100) * scaleRatio),
      duration: duration * 0.5,
      delay: duration * 0.5,
      ease: "power1.in"
    });

  } else {
    // Plume rising
    targetX = startX - offset + ((Math.random() - 0.5) * 150 * scaleRatio);
    targetY = startY - offset - ((300 + Math.random() * 300) * scaleRatio); // Rise high

    gsap.to(particle, {
      x: targetX,
      y: targetY,
      duration: duration,
      ease: "sine.inOut"
    });
  }

  // Expansion and Rotation
  gsap.to(particle, {
    scale: isBurst ? 2 + Math.random() * 3 : 3 + Math.random() * 4,
    rotation: `+=${(Math.random() - 0.5) * 180}`,
    duration: duration,
    ease: isBurst ? "power2.out" : "sine.inOut"
  });
}

/* ============================================================
   6) FIRE PARTICLE SYSTEM
   ============================================================ */

function spawnContinuousFire() {
  if (!fireActive) return;

  // Create 1-3 particles per frame for dense fire
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    createFireParticle();
  }

  gsap.delayedCall(0.03 + Math.random() * 0.05, spawnContinuousFire);
}

function createFireParticle() {
  const scaleRatio = microwave.getBoundingClientRect().width / 700;

  const particle = document.createElement("div");
  particle.classList.add("fire-particle");
  fireContainer.appendChild(particle);

  // Position based on the door window bounds (12% left, 25% top, 45% width, 50% height)
  const doorLeft = 84 * scaleRatio;
  const doorTop = 95 * scaleRatio;
  const doorWidth = 315 * scaleRatio;
  const doorHeight = 190 * scaleRatio;

  const centerX = doorLeft + doorWidth / 2;
  const centerY = doorTop + doorHeight / 2;

  const type = Math.random();
  let size, r, g, b, duration, startX, startY;

  if (type > 0.8) {
    // Spark
    size = (4 + Math.random() * 8) * scaleRatio;
    r = 255; g = 220 + Math.random() * 35; b = 150;
    duration = 0.5 + Math.random() * 0.7;
    startX = centerX + (Math.random() - 0.5) * doorWidth * 0.45;
    startY = doorTop + doorHeight - Math.random() * (doorHeight * 0.4);
  } else if (type > 0.4) {
    // Base/Core flame (Bright Yellow/White)
    size = (40 + Math.random() * 50) * scaleRatio;
    r = 255; g = 200 + Math.random() * 55; b = 50 + Math.random() * 100;
    duration = 0.6 + Math.random() * 0.8;
    startX = centerX + (Math.random() - 0.5) * doorWidth * 0.35;
    startY = doorTop + doorHeight - Math.random() * (doorHeight * 0.2);
  } else {
    // Outer/Upper flame (Orange/Red)
    size = (60 + Math.random() * 70) * scaleRatio;
    r = 255; g = 80 + Math.random() * 80; b = 0;
    duration = 1.0 + Math.random() * 1.0;
    startX = centerX + (Math.random() - 0.5) * doorWidth * 0.45;
    startY = doorTop + doorHeight - Math.random() * (doorHeight * 0.6);
  }

  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;

  if (type > 0.8) {
    particle.style.background = `rgba(${r}, ${g}, ${b}, 1)`;
    particle.style.filter = `blur(${2 * scaleRatio}px)`;
  } else {
    particle.style.background = `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 1) 0%, rgba(${r}, ${Math.max(0, g - 60)}, 0, 0.6) 30%, rgba(0, 0, 0, 0) 70%)`;
    particle.style.filter = `blur(${type > 0.4 ? 4 : 8}px)`;
    const stretch = 1.2 + Math.random() * 0.8;
    particle.style.borderRadius = "50% 50% 20% 20%";
    gsap.set(particle, { scaleY: stretch });
  }

  gsap.set(particle, {
    x: startX - size / 2,
    y: startY - size / 2,
    scaleX: type > 0.8 ? 1 : 0.2,
    scaleY: type > 0.8 ? 1 : 0.2,
    opacity: 0,
    rotation: (Math.random() - 0.5) * 40
  });

  const tl = gsap.timeline({
    onComplete: () => particle.remove()
  });

  tl.to(particle, {
    opacity: type > 0.8 ? 1 : (type > 0.4 ? 0.9 : 0.7),
    scaleX: 1 + Math.random() * 0.6,
    scaleY: 1 + (type > 0.8 ? 0 : Math.random() * 1.5),
    duration: duration * 0.3,
    ease: "power2.out"
  }).to(particle, {
    opacity: 0,
    scaleX: type > 0.8 ? 0 : 0.5,
    scaleY: type > 0.8 ? 0 : 2.0,
    duration: duration * 0.7,
    ease: "power1.in"
  });

  let targetY = startY - size / 2 - (60 + Math.random() * 80) * scaleRatio;
  if (type <= 0.4) {
    targetY -= (80 + Math.random() * 120) * scaleRatio;
  } else if (type > 0.8) {
    targetY -= (150 + Math.random() * 200) * scaleRatio;
  }

  const targetX = startX - size / 2 + (Math.random() - 0.5) * 20 * scaleRatio;

  if (type <= 0.8) {
    gsap.to(particle, {
      x: targetX,
      duration: duration,
      ease: "power1.inOut"
    });
  } else {
    gsap.to(particle, {
      x: targetX,
      duration: duration,
      ease: "power2.out"
    });
  }

  gsap.to(particle, {
    y: targetY,
    rotation: type > 0.8 ? 0 : `+=${(Math.random() - 0.5) * 40}`,
    duration: duration,
    ease: type > 0.8 ? "power2.out" : "power1.in"
  });
}
