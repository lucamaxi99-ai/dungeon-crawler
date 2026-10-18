// Maps keyboard and on-screen buttons to game actions.

const KEYS = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left',
  KeyD: 'right',
  KeyQ: 'turnLeft', ArrowLeft: 'turnLeft',
  KeyE: 'turnRight', ArrowRight: 'turnRight',
  Space: 'interact', Enter: 'interact',
  KeyM: 'map',
  KeyG: 'quality',
};

export function bindInput(onAction, root = document) {
  window.addEventListener('keydown', (e) => {
    const action = KEYS[e.code];
    if (!action) return;
    e.preventDefault();
    onAction(action);
  });

  // Touch/click buttons: <button data-action="forward">.
  root.querySelectorAll('[data-action]').forEach((btn) => {
    const fire = (e) => {
      e.preventDefault();
      onAction(btn.dataset.action);
    };
    btn.addEventListener('pointerdown', fire);
    // Hold to repeat movement, like a held key.
    let timer = null;
    btn.addEventListener('pointerdown', () => {
      clearInterval(timer);
      if (btn.dataset.action === 'interact' || btn.dataset.action === 'map') return;
      timer = setInterval(() => onAction(btn.dataset.action), 200);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
      btn.addEventListener(ev, () => clearInterval(timer));
    }
  });
}
