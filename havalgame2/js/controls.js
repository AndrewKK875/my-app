import { enqueueMove } from './player.js';

export function initControls() {
  document.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': enqueueMove('forward');  break;
      case 'ArrowDown':  case 's': case 'S': enqueueMove('backward'); break;
      case 'ArrowLeft':  case 'a': case 'A': enqueueMove('left');     break;
      case 'ArrowRight': case 'd': case 'D': enqueueMove('right');    break;
    }
  });

  bindButton('btn-up',    'forward');
  bindButton('btn-down',  'backward');
  bindButton('btn-left',  'left');
  bindButton('btn-right', 'right');

  // Swipe support
  let sx = 0, sy = 0;
  document.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    const minSwipe = 30;
    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
      enqueueMove('forward');
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      enqueueMove(dx > 0 ? 'right' : 'left');
    } else {
      enqueueMove(dy > 0 ? 'backward' : 'forward');
    }
  }, { passive: true });
}

function bindButton(id, dir) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('touchstart', e => { e.stopPropagation(); enqueueMove(dir); }, { passive: true });
  btn.addEventListener('click', () => enqueueMove(dir));
}
