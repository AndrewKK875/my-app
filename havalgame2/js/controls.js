import { enqueueMove } from './player.js';

// Haptic feedback (iOS 10+, Android Chrome)
function vibrate() {
  try { navigator.vibrate?.(18); } catch (_) {}
}

export function initControls() {
  // ── Keyboard ────────────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': enqueueMove('forward');  break;
      case 'ArrowDown':  case 's': case 'S': enqueueMove('backward'); break;
      case 'ArrowLeft':  case 'a': case 'A': enqueueMove('left');     break;
      case 'ArrowRight': case 'd': case 'D': enqueueMove('right');    break;
    }
  });

  // ── On-screen buttons ───────────────────────────────────────────────────────
  bindButton('btn-up',    'forward');
  bindButton('btn-down',  'backward');
  bindButton('btn-left',  'left');
  bindButton('btn-right', 'right');

  // ── Swipe + tap (passive: true — required for Android Chrome scroll perf) ──
  let sx = 0, sy = 0, moved = false;
  const MIN_SWIPE = 28;

  document.addEventListener('touchstart', e => {
    // Skip if touch started on a button
    if (e.target.closest('#controls')) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    moved = false;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - sx;
    const dy = e.touches[0].clientY - sy;
    if (Math.hypot(dx, dy) > MIN_SWIPE) moved = true;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (e.target.closest('#controls')) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    const dist = Math.hypot(dx, dy);

    if (dist < MIN_SWIPE) {
      // Tap = move forward
      enqueueMove('forward');
      vibrate();
      return;
    }

    // Swipe direction
    let dir;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'backward' : 'forward';
    }
    enqueueMove(dir);
    vibrate();
  }, { passive: true });
}

function bindButton(id, dir) {
  const btn = document.getElementById(id);
  if (!btn) return;

  // touchstart for instant response (no 300ms delay)
  btn.addEventListener('touchstart', e => {
    e.stopPropagation();
    enqueueMove(dir);
    vibrate();
  }, { passive: true });

  // Fallback for desktop mouse click
  btn.addEventListener('click', () => enqueueMove(dir));
}
