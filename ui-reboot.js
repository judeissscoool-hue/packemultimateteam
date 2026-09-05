(function () {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  let lastScreen = null;
  let frame = null;
  let pointer = null;
  window.ATUVisuals = {
    onRender(screen) {
      const hero = document.querySelector('.modehero h2');
      if (hero) hero.textContent = 'Pick your play.';
      const cards = document.querySelectorAll('.modecard');
      const copy = [
        'Pick your franchise player. Draft your eight. Build a squad that can go all the way.',
        'Crack your packs. Find your stars. Make every pick count on the road to 82–0.',
        'A fresh challenge every day. Same draft for everyone. Keep your streak alive.'
      ];
      cards.forEach((card, index) => {
        if (copy[index]) card.querySelector('p').textContent = copy[index];
      });
      if (lastScreen !== screen && !reducedMotion.matches) {
        const app = document.getElementById('app');
        if (app && typeof app.animate === 'function') {
          app.animate([{opacity:.35,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],
            {duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
        }
      }
      lastScreen = screen;
    }
  };

  // One delegated listener survives the game's full renders. Never touch drag/zipper handling.
  document.addEventListener('pointermove', event => {
    if (!hover.matches || reducedMotion.matches) return;
    const tile = event.target.closest('.modecard');
    if (!tile) return;
    pointer = {tile,x:event.clientX,y:event.clientY};
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const {tile,x,y} = pointer;
      if (!tile.isConnected) return;
      const rect = tile.getBoundingClientRect();
      tile.style.setProperty('--pointer-x', (x - rect.left) + 'px');
      tile.style.setProperty('--pointer-y', (y - rect.top) + 'px');
    });
  }, {passive:true});
})();
