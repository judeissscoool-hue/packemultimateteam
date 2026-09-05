(function bootstrapATUBackend(global) {
  "use strict";

  const SAVE_SCHEMA_VERSION = 1;
  const MAX_SAVE_BYTES = 1024 * 1024;
  const AUTH_STORAGE_KEY = "atu-auth-v1";
  const CLOUD_META_KEY = "atu-cloud-meta-v1";
  const CLOUD_BACKUP_KEY = "atu-cloud-backup-v1";
  const ACTIVE_CHALLENGE_KEY = "atu-active-challenge-v1";
  const PROGRESS_KEYS = Object.freeze([
    "atu-save-v4",
    "atu-hs-v4",
    "atu-trophies-v1",
    "atu-daily-v1",
    "atu-credits-v1",
    "atu-efx-v1",
    "atu-packno-v2",
    "atu-pullhist-v2",
    "atu-namehist-v2",
    "atu-decks-v2",
    "atu-draft-fair-v1",
    "atu-recent-v1"
  ]);
  const PROGRESS_KEY_SET = new Set(PROGRESS_KEYS);

  const state = {
    visibleScreen: "",
    challengeTimer: null,
    refreshingChallenge: false,
    client: null,
    initialized: false,
    available: false,
    session: null,
    profile: null,
    authMode: "signin",
    recovery: false,
    busy: false,
    message: "",
    messageKind: "",
    cloudStatus: "offline",
    cloudRevision: 0,
    cloudServerUpdatedAt: null,
    cloudConflict: null,
    syncTimer: null,
    engine: null,
    enginePromise: null,
    challenge: {
      phase: "idle",
      code: "",
      invitation: null,
      active: null,
      resultRows: [],
      error: "",
      showPicker: false,
      swapSlot: null
    },
    rankings: {
      status: "idle",
      mode: "draft",
      period: "all_time",
      rows: [],
      error: ""
    }
  };

  function cfg() {
    return global.ATU_BACKEND_CONFIG || {};
  }

  function configured() {
    const c = cfg();
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(c.supabaseUrl || "")
      && /^(sb_publishable_|eyJ)/.test(c.supabasePublishableKey || "");
  }

  function html(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function errorText(error, fallback) {
    const message = error && typeof error.message === "string" ? error.message : fallback;
    if (/invalid login credentials/i.test(message || "")) return "Incorrect email or password.";
    if (/email not confirmed/i.test(message || "")) return "Verify your email before signing in.";
    if (/user already registered/i.test(message || "")) return "An account already exists for this email.";
    if (/username is already taken/i.test(message || "")) return "That username is taken. Try another.";
    if (/rate limit/i.test(message || "")) return "Too many attempts. Wait a moment and try again.";
    return fallback || "Something went wrong. Please try again.";
  }

  function setMessage(message, kind) {
    state.message = message || "";
    state.messageKind = kind || "";
  }

  function rerender() {
    if (typeof global.render === "function") global.render();
  }

  function setBusy(value) {
    state.busy = !!value;
    rerender();
  }

  function currentPageUrl(forceAccount) {
    const override = String(cfg().siteUrl || "").trim();
    const target = new URL(override || global.location.href, global.location.href);
    target.hash = "";
    target.search = "";
    const challengeCode = !forceAccount && state.challenge.code;
    if (challengeCode) target.searchParams.set("challenge", challengeCode);
    else target.searchParams.set("auth", "account");
    return target.toString();
  }

  function readJSON(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    global.localStorage.setItem(key, JSON.stringify(value));
  }

  function removeLocal(key) {
    try { global.localStorage.removeItem(key); } catch (_) {}
  }

  function randomId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  function getCloudMeta() {
    const existing = readJSON(CLOUD_META_KEY, {});
    const meta = existing && typeof existing === "object" ? existing : {};
    if (!meta.deviceId) meta.deviceId = randomId();
    if (!meta.importId) meta.importId = randomId();
    if (!Object.prototype.hasOwnProperty.call(meta, "dirty")) meta.dirty = true;
    try { writeJSON(CLOUD_META_KEY, meta); } catch (_) {}
    return meta;
  }

  function updateCloudMeta(patch) {
    const next = Object.assign({}, getCloudMeta(), patch || {});
    writeJSON(CLOUD_META_KEY, next);
    return next;
  }

  function saveByteLength(value) {
    const serialized = JSON.stringify(value);
    if (global.TextEncoder) return new global.TextEncoder().encode(serialized).length;
    return unescape(encodeURIComponent(serialized)).length;
  }

  function buildSnapshot() {
    const keys = {};
    PROGRESS_KEYS.forEach(function (key) {
      const value = readJSON(key, null);
      if (value !== null) keys[key] = value;
    });
    const meta = getCloudMeta();
    const payload = {
      format: "atu-cloud-save",
      schemaVersion: SAVE_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      sourceDeviceId: meta.deviceId,
      keys: keys
    };
    if (saveByteLength(payload) > MAX_SAVE_BYTES) {
      throw new Error("Your save is larger than the 1 MiB cloud-save limit.");
    }
    return payload;
  }

  function validSnapshot(payload) {
    return !!payload
      && typeof payload === "object"
      && payload.format === "atu-cloud-save"
      && Number.isInteger(payload.schemaVersion)
      && payload.schemaVersion >= 1
      && payload.keys
      && typeof payload.keys === "object"
      && !Array.isArray(payload.keys);
  }

  function backupSnapshot(label, payload) {
    try {
      writeJSON(CLOUD_BACKUP_KEY, {
        savedAt: new Date().toISOString(),
        label: label,
        payload: payload
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function applySnapshot(payload, revision, userId) {
    if (!validSnapshot(payload)) throw new Error("Cloud save uses an unsupported format.");
    PROGRESS_KEYS.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(payload.keys, key)) {
        writeJSON(key, payload.keys[key]);
      } else {
        removeLocal(key);
      }
    });
    updateCloudMeta({
      userId: userId,
      revision: Number(revision) || 0,
      dirty: false,
      updatedAt: payload.generatedAt || new Date().toISOString(),
      lastSyncedAt: new Date().toISOString()
    });
  }

  function hasMeaningfulLocalProgress() {
    const save = readJSON("atu-save-v4", {});
    if (save && typeof save === "object") {
      for (const sideName of ["main", "rare", "classic"]) {
        const side = save[sideName];
        if (!side || typeof side !== "object") continue;
        if (side.coll && Object.values(side.coll).some(function (n) { return Number(n) > 0; })) return true;
        if (side.roster && Object.values(side.roster).some(function (id) { return id !== null && id !== undefined; })) return true;
        if (Number(side.opened) > 0 || side.captainUsed === true) return true;
      }
    }
    const high = readJSON("atu-hs-v4", {});
    if (high && Object.values(high).some(function (entry) {
      return entry && (Number(entry.ovr) > 60 || Number(entry.wins) > 0);
    })) return true;
    const trophies = readJSON("atu-trophies-v1", {});
    if (trophies && (
      Object.keys(trophies.seenCards || {}).length
      || Object.keys(trophies.unlocked || {}).length
      || Number(trophies.stats && trophies.stats.packs) > 0
      || Number(trophies.stats && trophies.stats.drafts) > 0
    )) return true;
    const daily = readJSON("atu-daily-v1", {});
    if (daily && (Number(daily.streak) > 0 || Object.keys(daily.history || {}).length)) return true;
    const credits = readJSON("atu-credits-v1", {});
    if (credits && (Number(credits.bal) > 0 || Number(credits.earned) > 0)) return true;
    const effects = readJSON("atu-efx-v1", {});
    return !!(effects && (Object.keys(effects.owned || {}).length || Number(effects.packs) > 0));
  }

  function firstRow(data) {
    return Array.isArray(data) ? (data[0] || null) : (data || null);
  }

  async function loadProfile() {
    if (!state.client || !state.session) {
      state.profile = null;
      return null;
    }
    const result = await state.client.rpc("get_my_profile");
    if (result.error) throw result.error;
    state.profile = firstRow(result.data);
    return state.profile;
  }

  async function fetchCloudSave() {
    const result = await state.client.rpc("get_cloud_save");
    if (result.error) throw result.error;
    return firstRow(result.data);
  }

  function useCloudResult(row) {
    state.cloudRevision = Number(row && row.revision) || 0;
    state.cloudServerUpdatedAt = row && row.server_updated_at || null;
  }

  async function pushSnapshot(options) {
    if (!state.client || !state.session || state.cloudStatus === "conflict") return null;
    const meta = getCloudMeta();
    const payload = buildSnapshot();
    const expectedRevision = options && Number.isInteger(options.expectedRevision)
      ? options.expectedRevision
      : (Number(meta.revision) || 0);
    const isImport = !!(options && options.isImport);
    state.cloudStatus = "syncing";
    rerender();
    const result = await state.client.rpc("sync_cloud_save", {
      p_expected_revision: expectedRevision,
      p_schema_version: SAVE_SCHEMA_VERSION,
      p_payload: payload,
      p_client_updated_at: payload.generatedAt,
      p_import_id: isImport ? meta.importId : null
    });
    if (result.error) throw result.error;
    const row = firstRow(result.data);
    if (!row) throw new Error("Cloud save returned no result.");
    useCloudResult(row);
    if (row.outcome === "conflict") {
      state.cloudStatus = "conflict";
      state.cloudConflict = row;
      setMessage("This device and the cloud both have progress. Choose which copy to keep.", "warn");
      return row;
    }
    if (row.outcome === "missing") {
      state.cloudStatus = "error";
      throw new Error("The cloud save disappeared. Refresh and try again.");
    }
    updateCloudMeta({
      userId: state.session.user.id,
      revision: Number(row.revision),
      dirty: false,
      updatedAt: payload.generatedAt,
      lastSyncedAt: new Date().toISOString()
    });
    state.cloudStatus = "synced";
    state.cloudConflict = null;
    return row;
  }

  async function prepareCloud() {
    if (!state.session || !state.client) return;
    state.cloudStatus = "checking";
    state.cloudConflict = null;
    rerender();
    try {
      const remote = await fetchCloudSave();
      const userId = state.session.user.id;
      const meta = getCloudMeta();
      const meaningfulLocal = hasMeaningfulLocalProgress();
      if (!remote) {
        await pushSnapshot({ expectedRevision: 0, isImport: true });
        if (meaningfulLocal) setMessage("Your existing device progress is now backed up to the cloud.", "ok");
        return;
      }
      useCloudResult(remote);
      const sameAccount = meta.userId === userId;
      const sameRevision = Number(meta.revision) === Number(remote.revision);
      if (sameAccount && sameRevision) {
        if (meta.dirty) await pushSnapshot({ expectedRevision: Number(remote.revision) });
        else state.cloudStatus = "synced";
        return;
      }
      if (!meaningfulLocal || (sameAccount && !meta.dirty)) {
        backupSnapshot("local-before-cloud-download", buildSnapshot());
        applySnapshot(remote.payload, remote.revision, userId);
        state.cloudStatus = "synced";
        global.location.reload();
        return;
      }
      state.cloudStatus = "conflict";
      state.cloudConflict = remote;
      setMessage("Cloud progress already exists, so this device was not uploaded automatically.", "warn");
    } catch (error) {
      state.cloudStatus = global.navigator && global.navigator.onLine === false ? "offline" : "error";
      setMessage(errorText(error, "Could not check the cloud save."), "error");
    } finally {
      rerender();
    }
  }

  async function resolveCloud(choice) {
    if (!state.cloudConflict || !state.session) return;
    const remote = state.cloudConflict;
    setBusy(true);
    try {
      if (choice === "cloud") {
        if (!backupSnapshot("local-before-cloud-conflict-resolution", buildSnapshot())) {
          throw new Error("Could not create a local backup. Free some browser storage and retry.");
        }
        applySnapshot(remote.payload, remote.revision, state.session.user.id);
        global.location.reload();
        return;
      }
      if (choice === "device") {
        if (!global.confirm("Replace the cloud save with this device's progress? A backup of the cloud copy will remain on this device.")) return;
        if (!backupSnapshot("cloud-before-device-conflict-resolution", remote.payload)) {
          throw new Error("Could not back up the cloud copy. Free some browser storage and retry.");
        }
        state.cloudStatus = "syncing";
        state.cloudConflict = null;
        updateCloudMeta({ revision: Number(remote.revision), userId: state.session.user.id, dirty: true });
        await pushSnapshot({ expectedRevision: Number(remote.revision) });
        setMessage("This device is now the current cloud save.", "ok");
      }
    } catch (error) {
      state.cloudStatus = "error";
      setMessage(errorText(error, "Could not resolve the save conflict."), "error");
    } finally {
      setBusy(false);
    }
  }

  function noteLocalWrite(key) {
    if (!PROGRESS_KEY_SET.has(key)) return;
    let meta;
    try {
      meta = updateCloudMeta({ dirty: true, updatedAt: new Date().toISOString() });
    } catch (_) {
      return;
    }
    if (!state.session || !state.initialized || state.cloudStatus === "conflict") return;
    clearTimeout(state.syncTimer);
    state.syncTimer = global.setTimeout(async function () {
      try {
        await pushSnapshot({ expectedRevision: Number(meta.revision) || state.cloudRevision || 0 });
      } catch (error) {
        state.cloudStatus = global.navigator && global.navigator.onLine === false ? "offline" : "error";
        setMessage(errorText(error, "Progress remains on this device and will sync later."), "error");
        rerender();
      }
    }, 1800);
  }

  function challengeCodeFromUrl() {
    const value = new URL(global.location.href).searchParams.get("challenge") || "";
    return /^[A-F0-9]{16}$/i.test(value) ? value.toUpperCase() : "";
  }

  function readActiveChallenge() {
    const value = readJSON(ACTIVE_CHALLENGE_KEY, null);
    if (!value || typeof value !== "object" || value.version !== 1) return null;
    if (!state.session || (value.userId && value.userId !== state.session.user.id)) return null;
    if (!/^[A-F0-9]{16}$/.test(value.code || "")) return null;
    return value;
  }

  function writeActiveChallenge(active) {
    state.challenge.active = active;
    if (active && active.role === "ranked") return;
    if (active) { active.userId = state.session && state.session.user.id; writeJSON(ACTIVE_CHALLENGE_KEY, active); }
    else removeLocal(ACTIVE_CHALLENGE_KEY);
  }

  async function loadEngine() {
    if (state.engine) return state.engine;
    if (!state.enginePromise) {
      state.enginePromise = import("./supabase/functions/_shared/atu-engine-v1.js")
        .then(function (engine) {
          state.engine = engine;
          return engine;
        })
        .catch(function (error) {
          state.enginePromise = null;
          throw error;
        });
    }
    return state.enginePromise;
  }

  function activeChallengeValid(active) {
    return !!active
      && typeof active.seed === "string"
      && /^[a-f0-9]{64}$/.test(active.seed)
      && typeof active.runId === "string"
      && typeof active.runToken === "string"
      && /^[a-f0-9]{64}$/.test(active.runToken)
      && ["creator", "opponent"].includes(active.role)
      && ["captain", "picking", "arrange"].includes(active.stage);
  }

  async function restoreActiveChallenge(code) {
    const active = readActiveChallenge();
    if (!active || active.code !== code || !activeChallengeValid(active)) return false;
    const engine = await loadEngine();
    active.manifest = engine.createRunManifest(active.seed, "one_v_one");
    if (!active.roster && active.stage !== 'captain') {
      active.roster = { B3: active.captainId };
      active.picks.forEach((id, index) => { active.roster[active.manifest.boards[index].slot] = id; });
    }
    state.challenge.active = active;
    state.challenge.phase = "draft";
    state.challenge.code = code;
    state.challenge.error = "";
    return true;
  }

  async function loadChallengeResult(code) {
    const result = await state.client.rpc("get_async_challenge_result", { p_code: code });
    if (result.error) throw result.error;
    if (code !== state.challenge.code) return [];
    state.challenge.resultRows = Array.isArray(result.data) ? result.data : [];
    return state.challenge.resultRows;
  }

  async function loadChallengeInvitation(code, quiet) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!/^[A-F0-9]{16}$/.test(normalized) || !state.client || state.refreshingChallenge) return;
    state.challenge.code = normalized;
    state.refreshingChallenge = true;
    if (!quiet) { state.challenge.phase = "loading"; rerender(); }
    state.challenge.error = "";
    try {
      const result = await state.client.rpc("get_async_challenge_invitation", { p_code: normalized });
      if (normalized !== state.challenge.code) return;
      if (result.error) throw result.error;
      const invitation = firstRow(result.data);
      state.challenge.invitation = invitation;
      if (invitation && invitation.status === "completed") {
        await loadChallengeResult(normalized);
        if (normalized !== state.challenge.code) return;
        state.challenge.phase = "result";
      } else if (invitation && invitation.status === 'expired') {
        state.challenge.active = null;
        state.challenge.phase = 'invitation';
      } else {
        const stored = readActiveChallenge();
        if (stored && stored.code === normalized && stored.stage === "submitted") {
          state.challenge.active = stored;
          state.challenge.phase = "share";
        } else if (!await restoreActiveChallenge(normalized)) {
          state.challenge.active = null;
          state.challenge.phase = invitation ? "invitation" : "not_found";
        }
      }
    } catch (error) {
      if (normalized !== state.challenge.code) return;
      if (!quiet) state.challenge.phase = "error";
      state.challenge.error = errorText(error, "Could not refresh the duel. Try again.");
    } finally {
      state.refreshingChallenge = false;
      if (normalized === state.challenge.code && !quiet) rerender();
      else if (normalized === state.challenge.code && state.challenge.phase === "result") rerender();
      scheduleChallengeRefresh();
    }
  }

  function scheduleChallengeRefresh() {
    global.clearTimeout(state.challengeTimer);
    state.challengeTimer = null;
    const waiting = state.challenge.phase === 'share' || (state.challenge.phase === 'invitation' && state.challenge.invitation && state.challenge.invitation.status === 'accepted');
    if (state.visibleScreen !== 'challenge' || !waiting) return;
    state.challengeTimer = global.setTimeout(() => {
      if (global.document.hidden) { scheduleChallengeRefresh(); return; }
      loadChallengeInvitation(state.challenge.code, true);
    }, 12000);
  }

  function initializeChallengeRun(row, role) {
    return loadEngine().then(function (engine) {
      const active = {
        version: 1,
        role,
        challengeId: row.challenge_id,
        code: row.challenge_code || state.challenge.code,
        rulesVersion: row.rules_version,
        seed: row.draft_seed,
        runId: row.run_id,
        runToken: row.run_token,
        expiresAt: row.expires_at,
        stage: "captain",
        captainId: null,
        picks: [],
        roster: null,
        localResult: null,
        mode: "one_v_one",
        manifest: engine.createRunManifest(row.draft_seed, "one_v_one")
      };
      state.challenge.code = active.code;
      state.challenge.phase = "draft";
      state.challenge.invitation = null;
      state.challenge.resultRows = [];
      state.challenge.showPicker = true;
      state.challenge.swapSlot = null;
      writeActiveChallenge(active);
      rerender();
      return active;
    });
  }

  async function createChallenge() {
    if (!state.session) {
      setMessage("Sign in before creating a challenge.", "warn");
      if (typeof global.setScreen === "function") global.setScreen("account");
      return;
    }
    if (!state.profile || !state.profile.username) {
      setMessage("Choose a username before creating a challenge.", "warn");
      if (typeof global.setScreen === "function") global.setScreen("account");
      return;
    }
    const existing = readActiveChallenge();
    if (existing && activeChallengeValid(existing)
      && !global.confirm("Start a new challenge and replace the unfinished challenge saved on this device?")) return;
    setBusy(true);
    state.challenge.error = "";
    try {
      const result = await state.client.rpc("create_async_challenge", {
        p_rules_version: cfg().rulesVersion || "atu-v1"
      });
      if (result.error) throw result.error;
      const row = firstRow(result.data);
      if (!row) throw new Error("Challenge could not be created.");
      await initializeChallengeRun(row, "creator");
    } catch (error) {
      state.challenge.phase = "error";
      state.challenge.error = errorText(error, "Could not create a challenge.");
    } finally {
      setBusy(false);
    }
  }

  async function startRankedRun(mode) {
    if (!state.session) {
      setMessage("Sign in before starting a ranked run.", "warn");
      if (typeof global.setScreen === "function") global.setScreen("account");
      return;
    }
    if (!state.profile || !state.profile.username) {
      setMessage("Choose a username before starting a ranked run.", "warn");
      if (typeof global.setScreen === "function") global.setScreen("account");
      return;
    }
    if (!['draft', 'pack'].includes(mode) || state.busy) return;
    setBusy(true);
    state.challenge.error = "";
    try {
      const result = await state.client.rpc("create_ranked_run", {
        p_mode: mode,
        p_rules_version: cfg().rulesVersion || "atu-v1"
      });
      if (result.error) throw result.error;
      const row = firstRow(result.data);
      if (!row) throw new Error("Ranked run could not be created.");
      const engine = await loadEngine();
      const active = {
        version: 1,
        role: "ranked",
        mode: row.mode,
        code: "",
        rulesVersion: row.rules_version,
        seed: row.draft_seed,
        runId: row.run_id,
        runToken: row.run_token,
        expiresAt: row.expires_at,
        stage: "captain",
        captainId: null,
        picks: [],
        roster: null,
        localResult: null,
        manifest: engine.createRunManifest(row.draft_seed, row.mode)
      };
      state.challenge.code = "";
      state.challenge.phase = "draft";
      state.challenge.invitation = null;
      state.challenge.resultRows = [];
      state.challenge.showPicker = true;
      state.challenge.swapSlot = null;
      writeActiveChallenge(active);
      if (typeof global.setScreen === "function") global.setScreen("challenge");
    } catch (error) {
      state.challenge.phase = "error";
      state.challenge.error = errorText(error, "Could not start this ranked run.");
    } finally {
      setBusy(false);
    }
  }

  async function acceptChallenge() {
    const invitation = state.challenge.invitation;
    if (!invitation || !state.challenge.code) return;
    if (!state.session) {
      setMessage("Sign in, then return to this challenge link to accept.", "warn");
      if (typeof global.setScreen === "function") global.setScreen("account");
      return;
    }
    if (!state.profile || !state.profile.username) {
      setMessage("Choose a username before accepting a challenge.", "warn");
      if (typeof global.setScreen === "function") global.setScreen("account");
      return;
    }
    setBusy(true);
    try {
      const result = await state.client.rpc("accept_async_challenge", { p_code: state.challenge.code });
      if (result.error) throw result.error;
      const row = firstRow(result.data);
      if (!row || !row.accepted) throw new Error(row && row.message || "Challenge is no longer available.");
      row.challenge_code = state.challenge.code;
      await initializeChallengeRun(row, "opponent");
    } catch (error) {
      state.challenge.error = errorText(error, "Could not accept this challenge.");
      state.challenge.phase = "error";
    } finally {
      setBusy(false);
    }
  }

  function selectedChallengeCards(active) {
    return [active.captainId, ...(active.picks || [])].filter(Number.isInteger);
  }

  function challengeTierCounts(active) {
    const counts = {};
    if (!state.engine) return counts;
    for (const id of selectedChallengeCards(active)) {
      const card = state.engine.publicCard(id);
      if (card) counts[card.tier] = (counts[card.tier] || 0) + 1;
    }
    return counts;
  }

  function challengeTierBlocked(active, cardId) {
    const card = state.engine.publicCard(cardId);
    const limit = state.engine.TIER_LIMITS[card.tier];
    return !!limit && (challengeTierCounts(active)[card.tier] || 0) >= limit;
  }

  function chooseChallengeCaptain(cardId) {
    const active = state.challenge.active;
    if (!active || active.stage !== "captain" || !active.manifest.captain.includes(cardId)) return;
    active.captainId = cardId;
    active.roster = { B3: cardId };
    state.challenge.showPicker = false;
    active.stage = "picking";
    writeActiveChallenge(active);
    rerender();
  }

  function chooseChallengePick(cardId) {
    const active = state.challenge.active;
    if (!active || active.stage !== "picking" || !state.engine) return;
    const index = active.picks.length;
    const board = active.manifest.boards[index];
    if (!board || !board.cards.includes(cardId) || challengeTierBlocked(active, cardId)) return;
    active.picks.push(cardId);
    active.roster[board.slot] = cardId;
    state.challenge.showPicker = false;
    if (active.picks.length === active.manifest.boards.length) {
      active.localResult = state.engine.calculateResult(active.roster);
      active.stage = "arrange";
    }
    writeActiveChallenge(active);
    rerender();
  }

  function canChallengeCardLand(card, slot) {
    return state.engine.BENCH_SLOTS.includes(slot) || card.positions.includes(slot);
  }

  function selectChallengeSwap(slot) {
    const active = state.challenge.active;
    if (!active || !["picking", "arrange"].includes(active.stage) || !active.roster || !state.engine.ALL_SLOTS.includes(slot) || !Number.isInteger(active.roster[slot])) return;
    if (!state.challenge.swapSlot) {
      state.challenge.swapSlot = slot;
      rerender();
      return;
    }
    const from = state.challenge.swapSlot;
    state.challenge.swapSlot = null;
    if (from === slot) { rerender(); return; }
    const first = state.engine.publicCard(active.roster[from]);
    const second = state.engine.publicCard(active.roster[slot]);
    if (!canChallengeCardLand(first, slot) || !canChallengeCardLand(second, from)) {
      state.challenge.error = "Those two players cannot legally swap positions.";
      rerender();
      return;
    }
    const temporary = active.roster[from];
    active.roster[from] = active.roster[slot];
    active.roster[slot] = temporary;
    if (active.stage === "arrange") active.localResult = state.engine.calculateResult(active.roster);
    state.challenge.error = "";
    writeActiveChallenge(active);
    rerender();
  }

  function challengeTranscript(active) {
    const events = [{ type: "captain", cardId: active.captainId }];
    active.manifest.boards.forEach(function (board, index) {
      events.push({ type: "pick", board: board.slot, cardId: active.picks[index] });
    });
    events.push({ type: "arrange", roster: Object.assign({}, active.roster) });
    return events;
  }

  async function submitChallenge() {
    const active = state.challenge.active;
    if (!active || active.stage !== "arrange" || !state.session || state.busy) return;
    setBusy(true);
    state.challenge.error = "";
    try {
      const transcript = challengeTranscript(active);
      state.engine.validateTranscript(active.seed, transcript, active.mode || "one_v_one");
      const result = await state.client.functions.invoke("validate-run", {
        body: { runId: active.runId, runToken: active.runToken, transcript }
      });
      if (result.error) throw result.error;
      if (!result.data || !result.data.ok) throw new Error(result.data && result.data.error || "Run validation failed.");
      const summary = {
        version: 1,
        role: active.role,
        mode: active.mode || "one_v_one",
        code: active.code,
        stage: "submitted",
        submittedAt: new Date().toISOString(),
        roster: Object.assign({}, active.roster),
        serverResult: result.data.result,
        outcome: result.data.outcome
      };
      writeActiveChallenge(summary);
      state.challenge.active = summary;
      if (active.role === "ranked") {
        state.challenge.phase = "ranked_result";
        state.rankings.status = "idle";
        setMessage("You made the leaderboard!", "ok");
      } else if (active.role === "creator") {
        state.challenge.phase = "share";
        setMessage("Your team is locked in. Send the challenge!", "ok");
      } else {
        await loadChallengeResult(active.code);
        state.challenge.phase = "result";
        setMessage("Final buzzer! Your Draft Duel is complete.", "ok");
      }
    } catch (error) {
      state.challenge.error = errorText(error, "Could not submit this draft.");
    } finally {
      setBusy(false);
    }
  }

  function finishRankedRun() {
    if (state.challenge.active) state.rankings.mode = state.challenge.active.mode;
    state.challenge.active = null;
    state.challenge.phase = "idle";
    state.challenge.error = "";
    state.challenge.swapSlot = null;
    if (typeof global.setScreen === "function") global.setScreen("rankings");
  }

  function challengeShareUrl() {
    const target = new URL(global.location.href);
    target.hash = "";
    target.search = "";
    target.searchParams.set("challenge", state.challenge.code);
    return target.toString();
  }

  async function copyChallengeLink() {
    const url = challengeShareUrl();
    try {
      await global.navigator.clipboard.writeText(url);
      setMessage("Challenge link copied.", "ok");
    } catch (_) {
      global.prompt("Copy this challenge link", url);
    }
    rerender();
  }

  async function loadRankings(mode, period) {
    if (!state.client) return;
    if (mode) state.rankings.mode = mode;
    if (period) state.rankings.period = period;
    state.rankings.status = "loading";
    state.rankings.error = "";
    rerender();
    try {
      const result = await state.client.rpc("get_leaderboard", {
        p_mode: state.rankings.mode,
        p_period: state.rankings.period,
        p_limit: 50
      });
      if (result.error) throw result.error;
      state.rankings.rows = Array.isArray(result.data) ? result.data : [];
      state.rankings.status = "ready";
    } catch (error) {
      state.rankings.status = "error";
      state.rankings.error = errorText(error, "Could not load rankings.");
    } finally {
      rerender();
    }
  }

  function onScreen(screenName) {
    state.visibleScreen = screenName;
    scheduleChallengeRefresh();
    if (screenName === "rankings" && state.rankings.status === "idle") loadRankings();
    if (screenName === "challenge" && state.challenge.phase === "idle") {
      const stored = readActiveChallenge();
      const code = challengeCodeFromUrl() || (stored && stored.code);
      if (code) loadChallengeInvitation(code);
    }
  }

  function resetChallenge() {
    const unfinished = state.challenge.active && activeChallengeValid(state.challenge.active);
    if (unfinished && !global.confirm("Discard the unfinished challenge saved on this device?")) return;
    writeActiveChallenge(null);
    global.clearTimeout(state.challengeTimer);
    state.challenge.showPicker = false;
    state.challenge.phase = "idle";
    state.challenge.code = "";
    state.challenge.invitation = null;
    state.challenge.resultRows = [];
    state.challenge.error = "";
    state.challenge.swapSlot = null;
    if (global.history && challengeCodeFromUrl()) {
      global.history.replaceState(null, "", global.location.pathname);
    }
    rerender();
  }

  async function refreshSignedInState() {
    if (!state.session) {
      state.profile = null;
      state.cloudStatus = "offline";
      return;
    }
    try {
      await loadProfile();
      await prepareCloud();
    } catch (error) {
      setMessage(errorText(error, "Could not load your account."), "error");
    }
  }

  async function returnToPendingChallenge() {
    const code = state.challenge.code || challengeCodeFromUrl();
    if (!code || !state.session || state.cloudStatus === "conflict") return false;
    if (!state.profile || !state.profile.username) return false;
    await loadChallengeInvitation(code);
    if (typeof global.setScreen === "function") global.setScreen("challenge");
    return true;
  }

  async function init() {
    if (state.initialized) return;
    state.initialized = true;
    if (!configured() || !global.supabase || typeof global.supabase.createClient !== "function") {
      state.available = false;
      state.cloudStatus = "offline";
      rerender();
      return;
    }
    state.available = true;
    const callbackUrl = new URL(global.location.href);
    const callbackHash = new URLSearchParams(callbackUrl.hash.slice(1));
    const callbackError = callbackHash.get("error") || callbackHash.get("error_code")
      || callbackUrl.searchParams.get("error") || callbackUrl.searchParams.get("error_code");
    if (callbackError) {
      // Provider failures return in the URL without a session. Never display the raw
      // description: it can contain authorization codes or other provider details.
      for (const key of ["error", "error_code", "error_description"]) {
        callbackUrl.searchParams.delete(key);
        callbackHash.delete(key);
      }
      callbackUrl.hash = callbackHash.toString();
      if (global.history) global.history.replaceState(null, "", callbackUrl.pathname + callbackUrl.search + callbackUrl.hash);
      setMessage(callbackError === "access_denied"
        ? "Sign-in was cancelled or denied. Please try again."
        : "Sign-in could not finish. Please try again. If it keeps happening, contact support.", "error");
      if (typeof global.setScreen === "function") global.setScreen("account");
    }
    state.client = global.supabase.createClient(cfg().supabaseUrl, cfg().supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY
      }
    });
    state.client.auth.onAuthStateChange(function (event, session) {
      state.session = session;
      if (event === "PASSWORD_RECOVERY") {
        state.recovery = true;
        state.authMode = "recovery";
        if (typeof global.setScreen === "function") global.setScreen("account");
      }
      global.setTimeout(async function () {
        if (session) await refreshSignedInState();
        else {
          state.profile = null;
          state.cloudStatus = "offline";
        }
        rerender();
      }, 0);
    });
    const result = await state.client.auth.getSession();
    if (result.error && !callbackError) setMessage(errorText(result.error, "Could not restore your session."), "error");
    state.session = result.data && result.data.session || null;
    if (state.session) await refreshSignedInState();
    const challengeCode = challengeCodeFromUrl();
    if (challengeCode) await loadChallengeInvitation(challengeCode);
    rerender();
  }

  async function submitEmail(event) {
    if (event) event.preventDefault();
    if (!state.client || state.busy) return;
    const emailNode = global.document.getElementById("atu-auth-email");
    const passwordNode = global.document.getElementById("atu-auth-password");
    const email = String(emailNode && emailNode.value || "").trim().toLowerCase();
    const password = String(passwordNode && passwordNode.value || "");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setMessage("Enter a valid email address.", "error");
      rerender();
      return;
    }
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.", "error");
      rerender();
      return;
    }
    setBusy(true);
    setMessage("", "");
    try {
      if (state.authMode === "signup") {
        const result = await state.client.auth.signUp({
          email: email,
          password: password,
          options: { emailRedirectTo: currentPageUrl() }
        });
        if (result.error) throw result.error;
        if (result.data && result.data.session) {
          setMessage("Account created and signed in.", "ok");
        } else {
          setMessage("Account created. Open the verification email before signing in.", "ok");
          state.authMode = "signin";
        }
      } else {
        const result = await state.client.auth.signInWithPassword({ email: email, password: password });
        if (result.error) throw result.error;
        state.session = result.data && result.data.session || state.session;
        if (state.session) await refreshSignedInState();
        setMessage("Signed in.", "ok");
        await returnToPendingChallenge();
      }
    } catch (error) {
      setMessage(errorText(error, "Could not complete authentication."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset(event) {
    if (event) event.preventDefault();
    if (!state.client || state.busy) return;
    const emailNode = global.document.getElementById("atu-auth-email");
    const email = String(emailNode && emailNode.value || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setMessage("Enter the email address for your account.", "error");
      rerender();
      return;
    }
    setBusy(true);
    try {
      const result = await state.client.auth.resetPasswordForEmail(email, { redirectTo: currentPageUrl(true) });
      if (result.error) throw result.error;
      setMessage("Password reset email sent. Check your inbox.", "ok");
    } catch (error) {
      setMessage(errorText(error, "Could not send the reset email."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(event) {
    if (event) event.preventDefault();
    const password = String((global.document.getElementById("atu-new-password") || {}).value || "");
    const confirmPassword = String((global.document.getElementById("atu-confirm-password") || {}).value || "");
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.", "error");
      rerender();
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match.", "error");
      rerender();
      return;
    }
    setBusy(true);
    try {
      const result = await state.client.auth.updateUser({ password: password });
      if (result.error) throw result.error;
      state.recovery = false;
      state.authMode = "signin";
      setMessage("Password updated.", "ok");
      if (global.history && global.location.search.includes("auth=account")) {
        global.history.replaceState(null, "", global.location.pathname);
      }
    } catch (error) {
      setMessage(errorText(error, "Could not update the password."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (!state.client || state.busy) return;
    setBusy(true);
    try {
      const result = await state.client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: currentPageUrl() }
      });
      if (result.error) throw result.error;
    } catch (error) {
      setMessage(errorText(error, "Could not start Google sign-in."), "error");
      setBusy(false);
    }
  }

  async function signOut() {
    if (!state.client || state.busy) return;
    setBusy(true);
    try {
      const result = await state.client.auth.signOut({ scope: "local" });
      if (result.error) throw result.error;
      state.session = null;
      state.profile = null;
      state.cloudStatus = "offline";
      setMessage("Signed out. Your device progress is still available.", "ok");
    } catch (error) {
      setMessage(errorText(error, "Could not sign out."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event) {
    if (event) event.preventDefault();
    if (!state.client || !state.session || state.busy) return;
    const username = String((global.document.getElementById("atu-profile-username") || {}).value || "").trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      setMessage("Username must be 3–20 letters, numbers or underscores.", "error");
      rerender();
      return;
    }
    setBusy(true);
    try {
      if (!state.profile || username !== String(state.profile.username || "")) {
        const usernameResult = await state.client.rpc("set_username", { p_username: username });
        if (usernameResult.error) throw usernameResult.error;
      }
      const profileResult = await state.client.rpc("update_profile", {
        p_display_name: username,
        p_avatar_url: state.profile && state.profile.avatar_url || null
      });
      if (profileResult.error) throw profileResult.error;
      await loadProfile();
      setMessage("Profile saved.", "ok");
      await returnToPendingChallenge();
    } catch (error) {
      setMessage(errorText(error, "Could not save your profile."), "error");
    } finally {
      setBusy(false);
    }
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    state.message = "";
    rerender();
  }

  function challengeCardHTML(cardId, action, disabled) {
    const card = state.engine && state.engine.publicCard(cardId);
    if (!card) return "";
    return '<div class="duel-choice' + (disabled ? ' unavailable' : '') + '">'
      + global.cardHTML(cardId)
      + '<button class="btn ' + (disabled ? '' : 'primary') + '" onclick="' + html(action) + '"'
      + (disabled ? ' disabled' : '') + '>' + (disabled ? 'TIER LIMIT REACHED' : 'DRAFT ' + html(card.name)) + '</button></div>';
  }

  function challengeMessageHTML() {
    return state.challenge.error ? '<div class="accountmsg error">' + html(state.challenge.error) + '</div>' : '';
  }

  function challengeHeaderHTML(kicker, title, copy) {
    return '<div class="duel-heading"><div><span class="eyebrow">' + html(kicker)
      + '</span><h2>' + html(title) + '</h2><p>' + html(copy) + '</p></div>'
      + '<button class="btn" onclick="setScreen(\'rankings\')">82–0 CLUB</button></div>';
  }

  function openChallengePick() {
    const active = state.challenge.active;
    if (!active || !['captain', 'picking'].includes(active.stage)) return;
    state.challenge.showPicker = true;
    rerender();
  }

  function closeChallengePick() {
    state.challenge.showPicker = false;
    rerender();
    const next = global.document.querySelector('.duel-next');
    if (next) next.focus();
  }

  function challengePickerHTML(active) {
    if (!state.challenge.showPicker || !active || !['captain', 'picking'].includes(active.stage)) return '';
    const captain = active.stage === 'captain';
    const board = captain ? null : active.manifest.boards[active.picks.length];
    const cards = captain ? active.manifest.captain : board.cards;
    const title = captain ? 'Choose your Franchise Player' : (active.mode === 'pack' ? 'Open pack · ' : 'Draft · ') + board.slot;
    return '<dialog id="duel-pick-dialog" class="duel-dialog" oncancel="event.preventDefault();ATUBackend.closeChallengePick()" aria-labelledby="duel-pick-title">'
      + '<div class="duel-picker-head"><div><span class="eyebrow">' + (captain ? 'FIRST PICK' : (active.picks.length + 2) + ' OF 8')
      + '</span><h2 id="duel-pick-title">' + html(title) + '</h2></div><button class="btn" onclick="ATUBackend.closeChallengePick()">BACK TO COURT</button></div>'
      + '<p class="duel-picker-note">' + (captain ? 'Your captain starts on the bench. Swap them into the starting five as you draft.' : 'Pick one. Your other choices stay the same if you return to the court.') + '</p>'
      + '<div class="duel-options">' + cards.map(id => challengeCardHTML(id,
        'ATUBackend.' + (captain ? 'chooseChallengeCaptain' : 'chooseChallengePick') + '(' + id + ')', !captain && challengeTierBlocked(active, id))).join('') + '</div></dialog>';
  }

  function duelMetricsHTML(result, count) {
    return '<div class="duel-metrics"><div><b>' + html(result ? result.teamOvr : '—') + '</b><span>TEAM OVR</span></div>'
      + '<div><b>' + html(result ? result.projectedWins + '–' + (82 - result.projectedWins) : count + ' / 8') + '</b><span>' + (result ? 'PROJECTED RECORD' : 'PLAYERS DRAFTED') + '</span></div>'
      + '<div><b>' + html(result ? '+' + result.chemistry : '—') + '</b><span>CHEMISTRY</span></div></div>';
  }

  function duelInviteHTML(ready) {
    return '<div class="duel-invite"><span class="eyebrow">CHALLENGE A FRIEND</span><h3>Who’s taking you on?</h3><p>'
      + (ready ? 'Send the link. Your friend drafts from the same choices, then both teams are revealed.' : 'Lock in your eight to get an invite link. Your friend then takes the same draft.') + '</p>'
      + (ready ? '<button class="btn primary" onclick="ATUBackend.copyChallengeLink()">COPY INVITE LINK</button><span class="duel-code">' + html(state.challenge.code) + '</span>'
        : '<span class="duel-locked-link">INVITE UNLOCKS WHEN YOU FINISH</span>') + '</div>';
  }

  function duelLayoutHTML(left, right, reveal) {
    return '<div class="duel-board' + (reveal ? ' duel-reveal' : '') + '"><section class="duel-side">' + left
      + '</section><div class="duel-versus" aria-label="versus">VS</div><section class="duel-side duel-opponent">' + right + '</section></div>';
  }

  function challengeDraftHTML(active) {
    if (!active || !state.engine || !active.manifest) return challengeHeaderHTML('DRAFT DUEL', 'Building your draft…', 'Get ready to make the first pick.');
    const ranked = active.role === 'ranked';
    const captain = active.stage === 'captain';
    const picking = active.stage === 'picking';
    const count = selectedChallengeCards(active).length;
    const next = picking ? active.manifest.boards[active.picks.length].slot : null;
    const mode = ranked ? (active.mode === 'pack' ? 'PACK MODE · RANKED' : 'CLASSIC DRAFT · RANKED') : 'DRAFT DUEL';
    const left = '<div class="duel-player"><span>YOUR TEAM</span><h3>@' + html(state.profile && state.profile.username || 'You') + '</h3></div>'
      + duelMetricsHTML(active.localResult, count)
      + global.challengeCourtHTML(active.roster || {}, {interactive:!captain, nextSlot:next, selectedSlot:state.challenge.swapSlot})
      + '<div class="duel-controls">' + (captain ? '<button class="btn gold duel-next" onclick="ATUBackend.openChallengePick()">CHOOSE YOUR FRANCHISE PLAYER</button>'
        : picking ? '<button class="btn primary duel-next" onclick="ATUBackend.openChallengePick()">DRAFT ' + html(next) + '</button><small>Tap picked players to swap positions.</small>'
          : '<button class="btn gold" onclick="ATUBackend.submitChallenge()" ' + (state.busy ? 'disabled' : '') + '>' + (state.busy ? 'LOCKING IN…' : 'LOCK IN MY TEAM') + '</button><small>Happy with your lineup? Lock it in.</small>') + '</div>';
    const right = '<div class="duel-player"><span>OPPONENT</span><h3>Your friend’s court</h3></div>'
      + duelInviteHTML(false) + global.challengeCourtHTML({}, {hidden:true});
    return challengeHeaderHTML(mode, ranked ? 'Chase the perfect season.' : 'Your draft. Their draft. Settle it.', 'Pick your squad on the court. Tap two drafted players to swap them.')
      + challengeMessageHTML() + (ranked ? '<div class="ranked-court">' + left + '</div>' : duelLayoutHTML(left, right)) + challengePickerHTML(active);
  }

  function rankedResultHTML() {
    const active = state.challenge.active || {};
    return challengeHeaderHTML('82–0 CLUB', 'You made the leaderboard!', 'Your team is locked in and your score is live.')
      + statusMessageHTML() + '<div class="ranked-court">' + duelMetricsHTML(active.serverResult, 8)
      + global.challengeCourtHTML(active.roster || {}) + '</div>'
      + '<div class="challengeactions"><button class="btn gold" onclick="ATUBackend.finishRankedRun()">SEE MY RANK</button></div>';
  }

  function challengeWaitingHTML() {
    const active = state.challenge.active || {};
    const left = '<div class="duel-player"><span>TEAM LOCKED</span><h3>Your final draft</h3></div>'
      + duelMetricsHTML(active.serverResult, 8) + global.challengeCourtHTML(active.roster || {});
    const right = '<div class="duel-player"><span>OPPONENT</span><h3>Waiting for the final buzzer</h3></div>'
      + duelInviteHTML(true) + global.challengeCourtHTML({}, {hidden:true})
      + '<button class="btn" onclick="ATUBackend.loadChallengeInvitation(\'' + html(state.challenge.code) + '\')">CHECK THEIR DRAFT</button>';
    return challengeHeaderHTML('DRAFT DUEL', 'Your team is locked in.', 'Your friend’s lineup appears here once they finish. This screen checks automatically.')
      + statusMessageHTML() + challengeMessageHTML() + duelLayoutHTML(left, right)
      + '<div class="challengeactions"><button class="btn" onclick="ATUBackend.resetChallenge()">START ANOTHER DUEL</button></div>';
  }

  function challengeResultHTML() {
    const rows = [...state.challenge.resultRows];
    if (rows.length !== 2) return challengeWaitingHTML();
    const mine = rows.findIndex(row => state.profile && row.player_public_id === state.profile.public_id);
    if (mine === 1) rows.reverse();
    const winnerId = rows[0].winner_public_id;
    const sides = rows.map(row => '<div class="duel-player' + (winnerId === row.player_public_id ? ' winner' : '') + '"><span>'
      + (winnerId === row.player_public_id ? 'WINNER' : winnerId ? 'FINAL TEAM' : 'DRAW') + '</span><h3>@' + html(row.username || 'Player') + '</h3></div>'
      + '<div class="duel-metrics"><div><b>' + html(row.team_ovr) + '</b><span>TEAM OVR</span></div><div><b>' + html(row.projected_wins) + '–' + html(82 - row.projected_wins)
      + '</b><span>PROJECTED RECORD</span></div></div>' + global.challengeCourtHTML(row.roster || {}));
    return challengeHeaderHTML('DRAFT DUEL · FINAL', winnerId ? 'The final buzzer.' : 'Dead even!', 'Both teams are locked. Here’s how your drafts stack up.')
      + duelLayoutHTML(sides[0], sides[1], true)
      + '<div class="challengeactions"><button class="btn gold" onclick="ATUBackend.resetChallenge()">RUN IT BACK</button></div>';
  }

  function challengeHTML() {
    if (!state.available) return challengeHeaderHTML('DRAFT DUEL', '1v1 is taking a timeout', 'Try again soon. Your other game modes still work.');
    if (state.challenge.phase === 'loading') return challengeHeaderHTML('DRAFT DUEL', 'Opening the challenge…', 'Get ready to answer the call.');
    if (state.challenge.phase === 'draft') return challengeDraftHTML(state.challenge.active);
    if (state.challenge.phase === 'ranked_result') return rankedResultHTML();
    if (state.challenge.phase === 'result') return challengeResultHTML();
    if (state.challenge.phase === 'share') return challengeWaitingHTML();
    if (state.challenge.phase === 'invitation') {
      const invite = state.challenge.invitation || {};
      const creator = invite.creator_username || invite.creator_display_name || 'Player';
      const isCreator = state.profile && state.profile.public_id === invite.creator_public_id;
      const available = invite.status === 'open' && !isCreator;
      const left = '<div class="duel-player"><span>YOUR TEAM</span><h3>Answer the challenge</h3></div>'
        + (available ? '<button class="btn gold" onclick="ATUBackend.acceptChallenge()" ' + (state.busy ? 'disabled' : '') + '>' + (state.session ? 'ACCEPT CHALLENGE' : 'SIGN IN TO PLAY') + '</button>'
          : isCreator ? duelInviteHTML(true) : '<p class="duel-note">' + (invite.status === 'accepted' ? 'The draft is underway. Both teams appear here when it’s finished.' : 'This challenge is no longer open.') + '</p>')
        + global.challengeCourtHTML({});
      const right = '<div class="duel-player"><span>CHALLENGER</span><h3>@' + html(creator) + '</h3></div><p class="duel-note">Same choices. Their picks stay hidden until you lock in your team.</p>'
        + global.challengeCourtHTML({}, {hidden:true});
      return challengeHeaderHTML('DRAFT DUEL', '@' + creator + ' is calling you out!', 'Think you can build a better squad from the same draft?')
        + statusMessageHTML() + challengeMessageHTML() + duelLayoutHTML(left, right);
    }
    if (['not_found', 'error'].includes(state.challenge.phase)) return challengeHeaderHTML('DRAFT DUEL', 'The challenge could not load', 'The link may have expired. Try again or start a new duel.')
      + challengeMessageHTML() + '<button class="btn" onclick="ATUBackend.resetChallenge()">BACK TO 1V1</button>';
    const left = '<div class="duel-player"><span>YOUR TEAM</span><h3>Classic Draft</h3></div><p class="duel-note">Pick your captain. Build your eight. Set your lineup.</p>'
      + '<button class="btn gold" onclick="ATUBackend.createChallenge()" ' + (state.busy ? 'disabled' : '') + '>START MY DRAFT</button>' + global.challengeCourtHTML({});
    const right = '<div class="duel-player"><span>OPPONENT</span><h3>Your friend’s court</h3></div>' + duelInviteHTML(false) + global.challengeCourtHTML({}, {hidden:true});
    return challengeHeaderHTML('CHALLENGE A FRIEND', 'Draft Duel', 'Classic Draft on your side. A friend on the other. Compare your teams at the final buzzer.')
      + statusMessageHTML() + duelLayoutHTML(left, right);
  }

  function rankingFilterHTML(kind, values, labels, selected) {
    return '<div class="rankingfilters ' + html(kind) + '">' + values.map(function (value) {
      return '<button class="' + (selected === value ? "on" : "") + '" onclick="ATUBackend.loadRankings(\''
        + (kind === "modes" ? value : state.rankings.mode) + "','"
        + (kind === "periods" ? value : state.rankings.period) + "')\">" + html(labels[value]) + "</button>";
    }).join("") + "</div>";
  }

  function rankingsHTML() {
    const modes = { draft: "Draft", pack: "Pack", one_v_one: "1v1" };
    const periods = { all_time: "All time", daily: "Today", weekly: "This week" };
    const rows = state.rankings.rows || [];
    return '<div class="rankingwrap"><div class="challengehero"><div><span class="eyebrow">LEADERBOARD</span><h2>The 82–0 Club</h2><p>Pick your mode. Build your team. Chase the perfect season.</p></div></div>'
      + '<div class="ranking-play"><article><span class="eyebrow">DRAFT</span><h3>Classic Draft</h3><p>Choose your captain and draft your eight.</p><button class="btn gold" onclick="setScreen(\'draft\')">PLAY CLASSIC DRAFT</button><button class="textbtn" onclick="ATUBackend.startRankedRun(\'draft\')">Play for the leaderboard</button></article>'
      + '<article><span class="eyebrow">PACKS</span><h3>Pack Mode</h3><p>Open packs and build your ultimate lineup.</p><button class="btn primary" onclick="setScreen(\'packs\')">PLAY PACK MODE</button><button class="textbtn" onclick="ATUBackend.startRankedRun(\'pack\')">Play for the leaderboard</button></article>'
      + '<article><span class="eyebrow">1V1</span><h3>Draft Duel</h3><p>Same picks. Two courts. Challenge a friend.</p><button class="btn primary" onclick="setScreen(\'challenge\')">CHALLENGE A FRIEND</button></article></div>'
      + rankingFilterHTML("modes", Object.keys(modes), modes, state.rankings.mode)
      + rankingFilterHTML("periods", Object.keys(periods), periods, state.rankings.period)
      + (state.rankings.status === "loading" ? '<div class="rankingempty">Loading the leaderboard…</div>'
        : state.rankings.status === "error" ? '<div class="accountmsg error">' + html(state.rankings.error) + "</div>"
          : !rows.length ? '<div class="rankingempty"><b>The throne is empty</b><span>Be the first player to take the top spot.</span></div>'
            : '<div class="rankingtable"><div class="rankinghead"><span>#</span><span>PLAYER</span><span>GAMES</span><span>' + (state.rankings.mode === "one_v_one" ? "W–L" : "BEST") + "</span><span>POINTS</span></div>"
              + rows.map(function (row) {
                return '<div class="rankingrow"><b>' + html(row.rank) + "</b><span>@" + html(row.username || "Player")
                  + '</span><span>' + html(row.games) + "</span><span>" + (state.rankings.mode === "one_v_one"
                    ? html(row.wins) + "–" + html(row.losses)
                    : html(row.best_team_ovr || "—") + " OVR")
                  + '</span><strong>' + html(row.points) + "</strong></div>";
              }).join("") + "</div>") + "</div>";
  }

  function statusMessageHTML() {
    if (!state.message) return "";
    return '<div class="accountmsg ' + html(state.messageKind) + '">' + html(state.message) + "</div>";
  }

  function cloudStatusHTML() {
    const meta = getCloudMeta();
    const labels = {
      offline: "Saved on this device",
      checking: "Checking your save…",
      syncing: "Saving your game…",
      synced: "Safe & synced",
      conflict: "Choose your save",
      error: "Save paused"
    };
    const detail = state.cloudServerUpdatedAt
      ? "Online save updated " + new Date(state.cloudServerUpdatedAt).toLocaleString()
      : (meta.lastSyncedAt ? "Last saved " + new Date(meta.lastSyncedAt).toLocaleString() : "Not saved online yet");
    return '<div class="cloudstate ' + html(state.cloudStatus) + '"><span></span><div><b>'
      + html(labels[state.cloudStatus] || state.cloudStatus) + "</b><small>" + html(detail) + "</small></div></div>";
  }

  function signedOutHTML() {
    const signup = state.authMode === "signup";
    const forgot = state.authMode === "forgot";
    return '<section class="accountwrap"><div class="accountintro"><div><span class="eyebrow">SAVE YOUR PROGRESS</span><h2>'
      + (forgot ? "Reset password" : signup ? "Create your account" : "Welcome back")
      + '</h2><p>Keep your cards, trophies and records safe—and challenge your friends.</p></div></div>'
      + '<div class="accountcard">' + statusMessageHTML()
      + '<form onsubmit="' + (forgot ? "ATUBackend.sendPasswordReset(event)" : "ATUBackend.submitEmail(event)") + '">'
      + '<label>Email<input id="atu-auth-email" type="email" inputmode="email" autocomplete="email" required maxlength="254"></label>'
      + (forgot ? "" : '<label>Password<input id="atu-auth-password" type="password" autocomplete="' + (signup ? "new-password" : "current-password") + '" required minlength="8" maxlength="128"></label>')
      + '<button class="btn primary accountsubmit" type="submit" ' + (state.busy ? "disabled" : "") + ">"
      + (state.busy ? "PLEASE WAIT…" : forgot ? "SEND RESET EMAIL" : signup ? "CREATE ACCOUNT" : "SIGN IN") + "</button></form>"
      + (forgot ? '<button class="textbtn" onclick="ATUBackend.setAuthMode(\'signin\')">Back to sign in</button>'
        : '<div class="accountor"><span>or</span></div><button class="googlebtn" onclick="ATUBackend.signInWithGoogle()" ' + (state.busy ? "disabled" : "") + '><b>G</b> Continue with Google</button>'
          + '<div class="accountswitch">' + (signup ? "Already have an account? " : "New here? ")
          + '<button onclick="ATUBackend.setAuthMode(\'' + (signup ? "signin" : "signup") + '\')">' + (signup ? "Sign in" : "Create account") + "</button></div>"
          + (!signup ? '<button class="textbtn" onclick="ATUBackend.setAuthMode(\'forgot\')">Forgot password?</button>' : ""))
      + '<p class="accountfine">We will send a quick verification email. Your password stays private.</p></div></section>';
  }

  function recoveryHTML() {
    return '<section class="accountwrap"><div class="accountcard"><span class="eyebrow">PASSWORD RECOVERY</span><h2>Choose a new password</h2>'
      + statusMessageHTML() + '<form onsubmit="ATUBackend.updatePassword(event)">'
      + '<label>New password<input id="atu-new-password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>'
      + '<label>Confirm password<input id="atu-confirm-password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>'
      + '<button class="btn primary accountsubmit" type="submit" ' + (state.busy ? "disabled" : "") + '>UPDATE PASSWORD</button></form></div></section>';
  }

  function signedInHTML() {
    const user = state.session.user;
    const profile = state.profile || {};
    const conflict = state.cloudStatus === "conflict";
    return '<section class="accountwrap"><div class="accountintro"><div><span class="eyebrow">SIGNED IN</span><h2>'
      + html(profile.username ? "@" + profile.username : "Finish your profile")
      + '</h2><p>' + html(user.email || "Google account") + '</p></div>' + cloudStatusHTML() + '</div>'
      + statusMessageHTML()
      + (conflict ? '<div class="saveconflict"><h3>Which save do you want to keep?</h3><p>You have progress on this device and another save online. Nothing changes until you choose.</p><div><button class="btn primary" onclick="ATUBackend.resolveCloud(\'cloud\')" ' + (state.busy ? "disabled" : "") + '>USE ONLINE SAVE</button><button class="btn danger" onclick="ATUBackend.resolveCloud(\'device\')" ' + (state.busy ? "disabled" : "") + '>USE THIS DEVICE</button></div></div>' : "")
      + '<div class="accountgrid"><div class="accountcard"><h3>Your player</h3><p class="accountsub">This is the name friends will see in Draft Duels and The 82-0 Club.</p>'
      + '<form onsubmit="ATUBackend.saveProfile(event)"><label>Username<input id="atu-profile-username" value="' + html(profile.username || "") + '" autocomplete="username" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" placeholder="3–20 letters, numbers or _" required></label>'
      + '<button class="btn primary accountsubmit" type="submit" ' + (state.busy ? "disabled" : "") + '>SAVE PROFILE</button></form></div>'
      + '<div class="accountcard"><h3>Your account</h3><div class="accountfacts"><div><span>Email</span><b>' + html(user.email || "Provided by Google") + '</b></div><div><span>Email ready</span><b>' + (user.email_confirmed_at ? "Yes" : "Not yet") + '</b></div><div><span>Online save</span><b>' + (state.cloudRevision ? "Ready" : "Not saved yet") + '</b></div></div><button class="btn" onclick="ATUBackend.signOut()" ' + (state.busy ? "disabled" : "") + '>Sign out on this device</button></div></div></section>';
  }

  function accountHTML() {
    if (!state.available) {
      return '<section class="accountwrap"><div class="accountcard"><h2>Accounts are taking a timeout</h2><p>The rest of the game still works and your progress stays on this device.</p></div></section>';
    }
    if (state.recovery || state.authMode === "recovery") return recoveryHTML();
    return state.session ? signedInHTML() : signedOutHTML();
  }

  function accountButtonHTML() {
    if (!state.available) return '<button class="accountpill" onclick="setScreen(\'account\')"><span class="accountdot offline"></span>Device save</button>';
    if (!state.session) return '<button class="accountpill" onclick="setScreen(\'account\')"><span class="accountdot"></span>Sign in</button>';
    const name = state.profile && (state.profile.username || state.profile.display_name);
    return '<button class="accountpill" onclick="setScreen(\'account\')"><span class="accountdot ' + (state.cloudStatus === "synced" ? "synced" : "") + '"></span>' + html(name ? "@" + name : "Account") + "</button>";
  }

  global.ATUBackend = Object.freeze({
    init: init,
    accountHTML: accountHTML,
    accountButtonHTML: accountButtonHTML,
    challengeHTML: challengeHTML,
    rankingsHTML: rankingsHTML,
    onScreen: onScreen,
    submitEmail: submitEmail,
    sendPasswordReset: sendPasswordReset,
    updatePassword: updatePassword,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    saveProfile: saveProfile,
    setAuthMode: setAuthMode,
    resolveCloud: resolveCloud,
    noteLocalWrite: noteLocalWrite,
    loadChallengeInvitation: loadChallengeInvitation,
    createChallenge: createChallenge,
    startRankedRun: startRankedRun,
    acceptChallenge: acceptChallenge,
    openChallengePick: openChallengePick,
    closeChallengePick: closeChallengePick,
    chooseChallengeCaptain: chooseChallengeCaptain,
    chooseChallengePick: chooseChallengePick,
    selectChallengeSwap: selectChallengeSwap,
    submitChallenge: submitChallenge,
    copyChallengeLink: copyChallengeLink,
    resetChallenge: resetChallenge,
    finishRankedRun: finishRankedRun,
    loadRankings: loadRankings,
    isSignedIn: function () { return !!state.session; }
  });
})(window);
