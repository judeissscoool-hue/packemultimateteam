/* Every state machine in the game client, declared in one place.
 *
 * Game code keeps its own state fields; this file names the legal values and
 * moves for each one. Writes go through transition(), which never blocks a move
 * in the live game: an undeclared state or move is recorded in `violations` and
 * logged once, then applied. Tests switch on strict mode so the same move throws.
 *
 * docs/state-machines.md is generated from this file (npm run build:state-docs).
 */
(function bootstrapATUStateMachines(global) {
  "use strict";

  const ANY = "*";
  const registry = {};
  const readers = {};
  const listeners = new Set();
  const violations = [];
  const reported = new Set();
  let strict = false;

  function define(name, spec) {
    const states = {};
    Object.keys(spec.states).forEach(function (id) {
      const state = spec.states[id];
      states[id] = Object.freeze({
        label: state.label || id,
        to: Object.freeze((state.to || []).slice()),
        unreachable: !!state.unreachable
      });
    });
    Object.keys(states).forEach(function (id) {
      states[id].to.forEach(function (target) {
        if (target !== ANY && !states[target]) throw new Error(name + ": " + id + " moves to undeclared state " + target);
      });
    });
    if (!states[spec.initial]) throw new Error(name + ": undeclared initial state " + spec.initial);
    registry[name] = Object.freeze({
      name: name,
      kind: spec.kind || "stored",
      owner: spec.owner,
      field: spec.field,
      summary: spec.summary,
      initial: spec.initial,
      states: Object.freeze(states)
    });
    return registry[name];
  }

  function machine(name) {
    const found = registry[name];
    if (!found) throw new Error("Unknown state machine: " + name);
    return found;
  }

  function has(name, value) {
    return Object.prototype.hasOwnProperty.call(machine(name).states, value);
  }

  function can(name, from, to) {
    if (!has(name, to)) return false;
    if (from === to) return true;
    if (!has(name, from)) return false;
    const moves = machine(name).states[from].to;
    return moves.includes(to) || moves.includes(ANY);
  }

  function report(name, from, to) {
    const problem = has(name, to) ? "undeclared move" : "undeclared state";
    const entry = { machine: name, from: from, to: to, problem: problem, at: Date.now() };
    const message = "State machine " + name + ": " + problem + " " + String(from) + " -> " + String(to);
    if (strict) throw new Error(message);
    if (violations.length < 50) violations.push(entry);
    if (!reported.has(message)) {
      reported.add(message);
      if (global.console && typeof global.console.warn === "function") global.console.warn(message);
    }
  }

  // Moves holder[field] to `to`. The value is always written, so a missing
  // declaration can never strand the player; it only gets reported.
  function transition(name, holder, field, to) {
    const from = holder[field];
    if (!can(name, from, to)) report(name, from, to);
    holder[field] = to;
    if (from !== to) {
      listeners.forEach(function (listener) {
        try { listener({ machine: name, from: from, to: to }); } catch (_) {}
      });
    }
    return to;
  }

  // For values that arrive from outside (a link, a saved file): returns the
  // value when it is a declared state, otherwise the fallback.
  function coerce(name, value, fallback) {
    if (has(name, value)) return value;
    report(name, "(external)", value);
    return fallback;
  }

  function track(name, read) {
    machine(name);
    readers[name] = read;
  }

  function snapshot() {
    const current = {};
    Object.keys(readers).forEach(function (name) {
      try { current[name] = readers[name](); } catch (_) { current[name] = undefined; }
    });
    return current;
  }

  function describe() {
    return Object.keys(registry).map(function (name) {
      const found = registry[name];
      return {
        name: name, kind: found.kind, owner: found.owner, field: found.field, summary: found.summary,
        initial: found.initial,
        states: Object.keys(found.states).map(function (id) {
          const state = found.states[id];
          return { id: id, label: state.label, to: state.to.slice(), unreachable: state.unreachable };
        })
      };
    });
  }

  /* ---------- stored machines: a field holds the state ---------- */

  define("screen", {
    owner: "index.html", field: "screen", initial: "landing",
    summary: "Which page of the game is showing. Any page can open any other; an unknown page name opens Home.",
    states: {
      landing: { label: "Home", to: [ANY] },
      draft: { label: "Classic Draft", to: [ANY] },
      classic: { label: "Pack Mode", to: [ANY] },
      daily: { label: "Daily Challenge", to: [ANY] },
      team: { label: "Deep Team", to: [ANY] },
      rare: { label: "Rare Pull", to: [ANY] },
      challenge: { label: "1v1 Draft Duel", to: [ANY] },
      rankings: { label: "82-0 Club", to: [ANY] },
      collection: { label: "Collection", to: [ANY] },
      rafters: { label: "The Rafters", to: [ANY] },
      trophies: { label: "Trophy Case", to: [ANY] },
      friends: { label: "Friends", to: [ANY] },
      account: { label: "Account & Save", to: [ANY] },
      updates: { label: "Info", to: [ANY] },
      share: { label: "Shared squad (opened from a ?share= link)", to: [ANY] }
    }
  });

  define("duel", {
    owner: "backend.js", field: "state.challenge.phase", initial: "idle",
    summary: "The 1v1 Draft Duel page, from opening a link to the final result. Reset returns to idle from anywhere.",
    states: {
      idle: { label: "Start a duel", to: ["loading", "draft", "start_failed"] },
      loading: { label: "Opening the challenge", to: ["invitation", "draft", "share", "result", "not_found", "load_failed", "idle"] },
      invitation: { label: "Viewing an invitation", to: ["loading", "draft", "share", "result", "not_found", "start_failed", "idle"] },
      draft: { label: "Drafting", to: ["share", "result", "ranked_result", "loading", "start_failed", "idle"] },
      share: { label: "Locked in, waiting for the friend", to: ["loading", "result", "invitation", "not_found", "idle"] },
      result: { label: "Final result", to: ["loading", "idle"] },
      ranked_result: { label: "Ranked run saved", to: ["loading", "idle"] },
      not_found: { label: "Link does not match a duel", to: ["loading", "idle"] },
      load_failed: { label: "Duel could not be loaded", to: ["loading", "idle"] },
      start_failed: { label: "Duel could not be started or accepted", to: ["loading", "idle"] }
    }
  });

  define("duelRun", {
    owner: "backend.js", field: "state.challenge.active.stage", initial: "captain",
    summary: "One player's duel draft, saved on the device under atu-active-challenge-v1.",
    states: {
      captain: { label: "Choosing a captain", to: ["picking", "arrange"] },
      picking: { label: "Drafting the other seven", to: ["arrange"] },
      arrange: { label: "Setting the lineup", to: ["picking", "submitted"] },
      submitted: { label: "Locked in", to: [] }
    }
  });

  define("cloudSave", {
    owner: "backend.js", field: "state.cloudStatus", initial: "offline",
    summary: "Online save status shown on the Account page.",
    states: {
      offline: { label: "Saved on this device", to: ["checking", "syncing", "error"] },
      checking: { label: "Checking your save", to: ["synced", "syncing", "error", "offline"] },
      syncing: { label: "Saving your game", to: ["synced", "error", "offline", "checking"] },
      synced: { label: "Safe & synced", to: ["syncing", "checking", "error", "offline"] },
      error: { label: "Save paused", to: ["checking", "syncing", "synced", "offline"] },
      conflict: { label: "Loading online save", to: ["checking", "offline"], unreachable: true }
    }
  });

  define("rankings", {
    owner: "backend.js", field: "state.rankings.status", initial: "idle",
    summary: "Leaderboard loading. Idle means the next visit to the page reloads it.",
    states: {
      idle: { label: "Not loaded", to: ["loading"] },
      loading: { label: "Loading", to: ["ready", "error", "idle"] },
      ready: { label: "Showing the leaderboard", to: ["loading", "idle"] },
      error: { label: "Could not load", to: ["loading", "idle"] }
    }
  });

  define("friends", {
    owner: "backend.js", field: "state.friends.status", initial: "idle",
    summary: "Friends list loading. A refresh keeps the last list on screen, so ready and error reload in place.",
    states: {
      idle: { label: "Not loaded", to: ["loading"] },
      loading: { label: "First load", to: ["ready", "error", "idle"] },
      ready: { label: "Showing friends", to: ["error", "idle"] },
      error: { label: "Could not check friends", to: ["ready", "idle"] }
    }
  });

  define("authForm", {
    owner: "backend.js", field: "state.authMode", initial: "signin",
    summary: "Which form the signed-out Account page shows.",
    states: {
      signin: { label: "Sign in", to: ["signup", "forgot", "recovery"] },
      signup: { label: "Create account", to: ["signin", "forgot", "recovery"] },
      forgot: { label: "Send reset email", to: ["signin", "signup", "recovery"] },
      recovery: { label: "Choose a new password", to: ["signin"] }
    }
  });

  define("gameRun", {
    owner: "backend.js", field: "atu-game-runs-v1 runs.draft.status", initial: "playing",
    summary: "An online Classic Draft run. Only a perfect 82-0 season is saved, and a better lineup can be saved again.",
    states: {
      playing: { label: "Drafting or rearranging", to: ["saving"] },
      saving: { label: "Saving the result", to: ["submitted", "retry", "playing"] },
      retry: { label: "Result not saved yet", to: ["saving", "submitted"] },
      submitted: { label: "Saved to the 82-0 Club", to: ["saving"] }
    }
  });

  /* ---------- derived machines: several fields imply the state ---------- */

  define("draft", {
    kind: "derived", owner: "index.html", field: "draftPhase(D)", initial: "idle",
    summary: "A Classic Draft board. Derived from D.stage and D.done; the draft engine owns the moves.",
    states: {
      idle: { label: "No draft started", to: ["captain"] },
      captain: { label: "Choosing a captain", to: ["picking", "idle"] },
      picking: { label: "Filling the board", to: ["complete", "captain", "idle"] },
      complete: { label: "All eight picked, lineup can be rearranged", to: ["picking", "captain", "idle"] }
    }
  });

  define("daily", {
    kind: "derived", owner: "index.html", field: "dailyPhase(DD)", initial: "ready",
    summary: "Today's Daily Challenge board. Derived from DD and DD.done; opening the page starts it.",
    states: {
      ready: { label: "Not opened today", to: ["picking"] },
      picking: { label: "Filling the board", to: ["complete", "ready"] },
      complete: { label: "Final board, lineup can be rearranged", to: ["ready"] }
    }
  });

  define("raftersPack", {
    kind: "derived", owner: "index.html", field: "raftersPhase(RF)", initial: "sealed",
    summary: "The Rafters zipper pack. Derived from RF.open, RF.done and RF.pull.",
    states: {
      sealed: { label: "Pack closed", to: ["opening"] },
      opening: { label: "Zipper being pulled", to: ["revealed", "sealed"] },
      revealed: { label: "Cosmetic revealed", to: ["sealed"] }
    }
  });

  function draftPhase(draft) {
    if (!draft || draft.stage === "idle") return "idle";
    if (draft.stage === "captain") return "captain";
    return draft.done ? "complete" : "picking";
  }

  function dailyPhase(daily) {
    if (!daily) return "ready";
    return daily.done ? "complete" : "picking";
  }

  function raftersPhase(pack) {
    if (!pack) return "sealed";
    if (pack.done) return "revealed";
    return pack.open ? "opening" : "sealed";
  }

  const api = Object.freeze({
    ANY: ANY,
    machine: machine,
    has: has,
    can: can,
    transition: transition,
    coerce: coerce,
    track: track,
    snapshot: snapshot,
    describe: describe,
    violations: violations,
    subscribe: function (listener) { listeners.add(listener); return function () { listeners.delete(listener); }; },
    setStrict: function (value) { strict = !!value; },
    draftPhase: draftPhase,
    dailyPhase: dailyPhase,
    raftersPhase: raftersPhase
  });

  global.ATUStateMachines = api;
})(typeof window !== "undefined" ? window : globalThis);
