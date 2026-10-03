/* Exact-card Classic Draft rarity cycle v1. Earlier selectors remain frozen for replay.
   Rarity is rolled first. Each remaining eligible card has one ticket; protection
   tracks exact card IDs and releases independently within each rarity. */
(function (root) {
  const ALL_SLOTS = ["PG", "SG", "SF", "PF", "C", "B1", "B2", "B3"];
  const TIERS = ["Bronze", "Silver", "Gold", "Elite", "Icon"];
  const LIMITS = { Icon: 2, Elite: 4 };
  const ODDS = { Bronze: .14, Silver: .40, Gold: .40, Elite: .04, Icon: .02 };
  const DEFAULT_RELEASE_FRACTIONS = Object.freeze({ Bronze: .85, Silver: .85, Gold: .85, Elite: .85, Icon: .60 });
  const require = (condition, message) => { if (!condition) throw new Error(message); };

  function cloneReleaseFractions(value) {
    require(value && typeof value === "object" && !Array.isArray(value), "Invalid card cycle release fractions");
    const keys = Reflect.ownKeys(value);
    require(keys.length === TIERS.length && keys.every(key => TIERS.includes(key)), "Invalid card cycle release fractions");
    const entries = TIERS.map(tier => [tier, value[tier]]);
    require(entries.every(([tier, fraction]) => Object.prototype.hasOwnProperty.call(value, tier) && typeof fraction === "number" && Number.isFinite(fraction) && fraction > 0 && fraction <= 1), "Invalid card cycle release fractions");
    return Object.freeze(Object.fromEntries(entries));
  }

  function create({ cards, pool, random = Math.random, protection = { shown: [] }, releaseFractions = DEFAULT_RELEASE_FRACTIONS } = {}) {
    require(Array.isArray(cards), "Invalid draft cards");
    require(typeof random === "function", "Invalid draft random source");
    const fractions = cloneReleaseFractions(releaseFractions);
    require(protection && typeof protection === "object" && !Array.isArray(protection) && Array.isArray(protection.shown), "Invalid card cycle protection");
    const byId = new Map(cards.filter(Boolean).map(card => [card.id, card]));
    const tierPool = pool || (tier => cards.filter(card => card && card.tier === tier));
    const pools = Object.fromEntries(TIERS.map(tier => [tier, [...new Map(tierPool(tier).filter(card => card && card.tier === tier).map(card => [card.id, card])).values()].sort((a, b) => a.id - b.id)]));
    const poolTierById = new Map(TIERS.flatMap(tier => pools[tier].map(card => [card.id, tier])));
    const eligible = (card, slot) => !!card && (slot.startsWith("B") || card.positions.includes(slot));
    const threshold = tier => Math.ceil(pools[tier].length * fractions[tier]);
    const index = size => typeof random.int === "function" ? random.int(size) : Math.floor(random() * size);

    function initialCycle() {
      const shown = Object.fromEntries(TIERS.map(tier => [tier, []])), seen = new Set();
      for (const id of protection.shown) {
        require(Number.isSafeInteger(id) && id >= 0, "Invalid protected card ID");
        const tier = poolTierById.get(id);
        if (tier && !seen.has(id)) { shown[tier].push(id); seen.add(id); }
      }
      return { shown, events: [] };
    }

    function rollTier() {
      const roll = random(); let accumulated = 0;
      for (const tier of TIERS) { accumulated += ODDS[tier]; if (roll < accumulated) return tier; }
      return "Icon";
    }

    function downgrade(tier, counts) {
      const order = ["Icon", "Elite", "Gold"]; let i = order.indexOf(tier);
      while (i > -1 && i < 2 && LIMITS[order[i]] && (counts[order[i]] || 0) >= LIMITS[order[i]]) i++;
      return i === -1 ? tier : order[i] || tier;
    }

    function pick(d, tier, slot, blockedNames) {
      // An absent era/position tier retains the established retry behavior. A
      // protection cycle itself never substitutes or rerolls the chosen rarity.
      const candidates = pools[tier].filter(card => !blockedNames.has(card.name) && (!slot || eligible(card, slot)));
      if (!candidates.length) return null;
      const cycle = d.cardCycle;
      require(cycle && cycle.shown && Array.isArray(cycle.shown[tier]) && Array.isArray(cycle.events), "Invalid card cycle state");
      let shown = cycle.shown[tier];
      if (shown.length >= threshold(tier)) {
        shown = cycle.shown[tier] = [];
        cycle.events.push({ type: "reset", tier });
      }
      const protectedIds = new Set(shown);
      let available = candidates.filter(card => !protectedIds.has(card.id));
      if (!available.length) {
        // A scarce position can run out before its rarity reaches its threshold.
        // Release only its oldest usable card, keeping every other ID protected.
        const eligibleIds = new Set(candidates.map(card => card.id));
        const oldest = shown.find(id => eligibleIds.has(id));
        require(oldest !== undefined, "Card cycle pool exhausted");
        shown.splice(shown.indexOf(oldest), 1);
        cycle.events.push({ type: "release", cardId: oldest, tier });
        available = candidates.filter(card => card.id === oldest);
      }
      const card = available[index(available.length)];
      require(card, "Invalid draft random selection");
      shown.push(card.id);
      cycle.events.push({ type: "offer", cardId: card.id, tier });
      return card;
    }

    function captain(d) {
      const out = [], blocked = new Set(); let guard = 0;
      let anchorTiers = ["Icon", "Elite"].filter(tier => pools[tier].length);
      if (!anchorTiers.length) anchorTiers = TIERS.slice().reverse().filter(tier => pools[tier].length).slice(0, 2);
      require(anchorTiers.length > 0, "Draft pool exhausted");
      while (out.length < 3 && guard++ < 400) {
        const card = pick(d, anchorTiers[index(anchorTiers.length)], null, blocked);
        if (card) { out.push(card); blocked.add(card.name); }
      }
      return out;
    }

    function options(d, slot) {
      const out = [], blocked = new Set(d.taken.map(id => byId.get(id).name)); let guard = 0;
      while (out.length < 5 && guard++ < 500) {
        const card = pick(d, downgrade(rollTier(), d.tierCounts), slot, blocked);
        if (card) { out.push(card); blocked.add(card.name); }
      }
      return out;
    }

    function start() {
      const d = { stage: "captain", captain: [], roster: Object.fromEntries(ALL_SLOTS.map(slot => [slot, null])), taken: [], opts: null, slotOpts: {}, activeSlot: null, lastSlot: null, done: false, tierCounts: {}, offeredNames: [], cardCycle: initialCycle() };
      d.captain = captain(d); d.offeredNames = d.captain.map(card => card.name);
      return d;
    }

    function pending(d) { return ALL_SLOTS.find(slot => d.slotOpts[slot] && d.roster[slot] == null) || null; }

    function apply(d, event) {
      require(d && event, "Invalid draft action"); const card = byId.get(event.cardId);
      if (event.type === "captain") {
        require(d.stage === "captain" && card && d.captain.some(offered => offered.id === card.id), "Captain was not offered");
        d.roster[card.pos] = card.id; d.taken.push(card.id); d.tierCounts[card.tier] = 1; d.lastSlot = card.pos; d.stage = "picking";
      } else if (event.type === "open") {
        const slot = event.slot;
        require(d.stage === "picking" && ALL_SLOTS.includes(slot) && d.roster[slot] == null, "Invalid draft slot");
        require(!pending(d) || pending(d) === slot, "Finish the open pick first");
        if (!d.slotOpts[slot]) {
          d.slotOpts[slot] = options(d, slot);
          d.offeredNames = [...new Set([...d.offeredNames, ...d.slotOpts[slot].map(offered => offered.name)])];
        }
        d.activeSlot = slot; d.opts = d.slotOpts[slot];
      } else if (event.type === "pick") {
        const slot = d.activeSlot;
        require(slot && d.roster[slot] == null && card && d.opts.some(offered => offered.id === card.id), "Selected card was not offered");
        require(!d.taken.some(id => byId.get(id).name === card.name), "Player already drafted");
        require(!LIMITS[card.tier] || (d.tierCounts[card.tier] || 0) < LIMITS[card.tier], "Tier limit reached");
        require(eligible(card, slot), "Player cannot fill this position");
        d.roster[slot] = card.id; d.taken.push(card.id); d.tierCounts[card.tier] = (d.tierCounts[card.tier] || 0) + 1;
        d.lastSlot = slot; d.activeSlot = null; d.opts = null; d.done = ALL_SLOTS.every(position => d.roster[position] != null);
      } else if (event.type === "swap") {
        const a = event.from, b = event.to;
        require(d.stage === "picking" && a !== b && ALL_SLOTS.includes(a) && ALL_SLOTS.includes(b), "Invalid swap");
        require(Number.isInteger(d.roster[a]) && Number.isInteger(d.roster[b]) && eligible(byId.get(d.roster[a]), b) && eligible(byId.get(d.roster[b]), a), "Those positions don't fit");
        [d.roster[a], d.roster[b]] = [d.roster[b], d.roster[a]]; d.lastSlot = b;
      } else throw new Error("Unknown draft action");
      return d;
    }

    return { start, apply, pending };
  }

  root.ATUCardCycleRarityDraftRules = Object.freeze({ create, cloneReleaseFractions, DEFAULT_RELEASE_FRACTIONS });
})(globalThis);
