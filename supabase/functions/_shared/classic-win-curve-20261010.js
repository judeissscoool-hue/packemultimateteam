/* Versioned Classic-only win projection. Earlier engines keep their own curve.
   The 104.1 upper anchor restores the historical ~3% strong-play target;
   rarity and chemistry are not
   inputs to this helper and remain in their existing selectors/score code. */
(function (root) {
  const UPPER_ANCHOR = 104.1;
  const POINTS = [[60,15],[70,26],[75,31],[80,38],[84,46],[87,54],[90,65],[92,70],[95,76],[97,78],[100,80],[UPPER_ANCHOR,82]];

  function projectWins(effectiveRating) {
    const rating = Math.max(60, Math.min(UPPER_ANCHOR, effectiveRating));
    let wins = POINTS[POINTS.length - 1][1];
    for (let i = 0; i < POINTS.length - 1; i++) {
      const [a, winsA] = POINTS[i], [b, winsB] = POINTS[i + 1];
      if (rating <= b) {
        const progress = (rating - a) / (b - a);
        const eased = b <= 100 ? progress : (1 - Math.cos(Math.PI * progress)) / 2;
        wins = Math.round(winsA + (winsB - winsA) * eased);
        break;
      }
    }
    return Math.max(12, Math.min(82, wins));
  }

  // Preserve the real floating-point transition. The non-winning value is
  // used by the existing all-eight-at-least-85 gate, never a rounded constant.
  let nonWinning = 60, winning = UPPER_ANCHOR;
  for (let i = 0; i < 80; i++) {
    const midpoint = (nonWinning + winning) / 2;
    if (projectWins(midpoint) >= 82) winning = midpoint;
    else nonWinning = midpoint;
  }
  const boundary = Object.freeze({ winning, nonWinning });
  root.ATUClassicWinCurveV1 = Object.freeze({
    upperAnchor: UPPER_ANCHOR,
    projectWins,
    boundary,
    gateCap: nonWinning
  });
})(globalThis);
