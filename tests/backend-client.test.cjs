const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const source = fs.readFileSync(require("node:path").join(__dirname, "..", "backend.js"), "utf8");

function makeStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function makeContext({ session = null, rpc, storageSeed = {}, withClient = true, href = "https://game.example/index.html?auth=account", invoke } = {}) {
  const storage = makeStorage(storageSeed);
  const calls = [];
  const client = {
    functions: { async invoke(name, args) { return invoke(name, args); } },
    auth: {
      onAuthStateChange() {},
      async getSession() { return { data: { session }, error: null }; }
    },
    async rpc(name, args) {
      calls.push({ name, args });
      return rpc ? rpc(name, args, calls) : { data: [], error: null };
    }
  };
  const parsedLocation = new URL(href);
  const location = {
    href,
    search: parsedLocation.search,
    pathname: parsedLocation.pathname,
    reloadCalled: false,
    reload() { this.reloadCalled = true; }
  };
  const window = {
    ATU_BACKEND_CONFIG: {
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_test",
      siteUrl: "",
      rulesVersion: "atu-v1"
    },
    supabase: withClient ? { createClient() { return client; } } : undefined,
    localStorage: storage,
    location,
    navigator: { onLine: true },
    crypto: webcrypto,
    TextEncoder,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    confirm() { return true; },
    history: { replacedUrl: null, replaceState(_state, _title, url) { this.replacedUrl = url; } },
    document: { getElementById() { return null; }, querySelector() { return null; } },
    cardHTML(id) { return `<div class="card">card-${id}</div>`; },
    challengeCourtHTML(roster = {}, options = {}) { return `<div class="court">${JSON.stringify({roster, options})}</div>`; },
    draftHTML() { return '<div class="court">Classic Draft</div>'; },
    render() {}
  };
  const context = vm.createContext({
    window,
    URL,
    URLSearchParams,
    TextEncoder,
    Date,
    Math,
    Object,
    Array,
    Number,
    String,
    Boolean,
    RegExp,
    JSON,
    Set,
    Promise,
    Error,
    unescape,
    encodeURIComponent,
    console
  });
  vm.runInContext(source, context, { filename: require("node:path").join(__dirname, "..", "backend.js"), importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER });
  return { api: window.ATUBackend, window, storage, calls };
}

async function run() {
  for (const rulesVersion of ["atu-v1", "atu-classic-v2"]) {
    const engine = await import('../supabase/functions/_shared/atu-engine-v1.js');
    const seed = '0123456789abcdef'.repeat(4), code = 'A1B2C3D4E5F60708';
    let completed = false, finalRoster, result, submissions = 0;
    const test = makeContext({
      session: {user: {id: 'duel-owner'}},
      rpc(name) {
        if (name === 'get_my_profile') return {data: [{username: 'Owner', public_id: 'owner-public'}]};
        if (name === 'create_async_challenge') return {data: [{challenge_code: code, draft_seed: seed, run_id: 'run-id', run_token: 'a'.repeat(64), rules_version:rulesVersion}]};
        if (name === 'get_async_challenge_invitation') return {data: [{status:completed?'completed':'open', creator_public_id:'owner-public'}]};
        if (name === 'get_async_challenge_result') return {data: [
          {player_public_id:'owner-public', username:'Owner', roster:finalRoster, team_ovr:90, projected_wins:70},
          {player_public_id:'opponent-public', username:'Friend', roster:finalRoster, team_ovr:91, projected_wins:71}
        ]};
        return {data:[]};
      },
      invoke(name, args) {
        assert.equal(name, 'validate-run');
        if(!submissions++)return {error:new Error('Internal transport details')};
        const validated = engine.validateTranscript(seed, args.body.transcript, 'one_v_one', rulesVersion);
        finalRoster = JSON.parse(JSON.stringify(validated.roster));
        result = validated.result;
        return {data: {ok:true, result, outcome:'creator_completed'}};
      }
    });
    await test.api.init();
    await test.api.createChallenge();
    const active = () => JSON.parse(test.storage.getItem('atu-active-challenge-v1'));
    if(rulesVersion===engine.CLASSIC_RULES_VERSION){
      let d=test.api.classicDraftState();
      test.api.applyClassicDraftAction({type:'captain',cardId:d.captain[0].id});
      for(const slot of [...engine.ALL_SLOTS].reverse())if(d.roster[slot]==null){
        test.api.applyClassicDraftAction({type:'open',slot});
        test.api.applyClassicDraftAction({type:'pick',cardId:d.opts[0].id});
      }
      const copy=JSON.parse(JSON.stringify(d.roster));
      await test.api.loadChallengeInvitation(code);
      assert.deepEqual(JSON.parse(JSON.stringify(test.api.classicDraftState().roster)),copy,'Saved Classic Draft restores through the online flow');
    }else{
    const manifest = engine.createDraftManifest(seed);
    test.api.chooseChallengeCaptain(manifest.captain[0]);
    const captain = engine.publicCard(manifest.captain[0]);
    const counts = {[captain.tier]:1};
    for (const board of manifest.boards) {
      const id = board.cards.find(id => { const c=engine.publicCard(id); return !engine.TIER_LIMITS[c.tier] || (counts[c.tier]||0)<engine.TIER_LIMITS[c.tier]; });
      const card = engine.publicCard(id);counts[card.tier]=(counts[card.tier]||0)+1;
      test.api.chooseChallengePick(id);
      if (captain.positions.includes(board.slot)) {
        test.api.selectChallengeSwap('B3');test.api.selectChallengeSwap(board.slot);
        assert.equal(active().roster[board.slot], captain.id, 'Captain can move into an occupied eligible starter slot while drafting');
        break;
      }
    }
    const saved = active();
    const emptySlot = manifest.boards.find(board=>!Number.isInteger(saved.roster[board.slot])).slot;
    test.api.selectChallengeSwap(emptySlot);
    assert.deepEqual(active().roster, saved.roster, 'Empty future slots cannot be opened by swapping');
    for (const board of manifest.boards.slice(active().picks.length)) {
      const id=board.cards.find(id=>{const c=engine.publicCard(id);return !engine.TIER_LIMITS[c.tier]||(counts[c.tier]||0)<engine.TIER_LIMITS[c.tier];});
      const card=engine.publicCard(id);counts[card.tier]=(counts[card.tier]||0)+1;
      test.api.chooseChallengePick(id);
    }
    }
    assert.equal(active().stage,'arrange');
    const unsent=JSON.stringify(active().roster);
    await test.api.submitChallenge();
    assert.equal(active().stage,'arrange','A failed request must keep the draft ready to retry');
    assert.equal(JSON.stringify(active().roster),unsent);
    assert.doesNotMatch(test.api.challengeHTML(),/Internal transport details/);
    assert.match(test.api.challengeHTML(),/Could not submit this draft/);
    await test.api.submitChallenge();
    assert.ok(result, 'Submission is accepted by the unchanged trusted scoring engine');
    assert.deepEqual(active().roster, finalRoster, 'Submitted team remains on the left court');
    let rendered=test.api.challengeHTML();
    assert.match(rendered,/Your team is locked in/);
    assert.match(rendered,/"hidden":true/);
    assert.doesNotMatch(rendered,/opponent-public|Friend/);
    assert.ok(!test.calls.some(c=>c.name==='get_async_challenge_result'), 'No opposing roster is requested before completion');
    completed=true;
    await test.api.loadChallengeInvitation(code);
    rendered=test.api.challengeHTML();
    assert.match(rendered,/@Friend/);
    assert.match(rendered,/duel-reveal/);
    assert.doesNotMatch(rendered,/"hidden":true/);
    assert.equal(test.calls.filter(c=>c.name==='get_async_challenge_result').length,1,'Refresh must check server completion even with a submitted local save');
    const other = makeContext({storageSeed:{'atu-active-challenge-v1':test.storage.getItem('atu-active-challenge-v1')}, href:'https://game.example/?challenge='+code,
      rpc(){return {data:[{status:'open',creator_username:'Owner',creator_public_id:'owner-public'}]};}});
    await other.api.init();
    assert.match(other.api.challengeHTML(), /SIGN IN TO PLAY/, 'Another account must not inherit the saved creator draft');
    const links=test.api.rankingsHTML();
    for(const route of ['draft','classic','challenge']) assert.ok(links.includes("setScreen('"+route+"')"));
  }

  {
    const profile = { username: null, display_name: "Google Name", avatar_url: "https://example.com/photo.png" };
    const test = makeContext({
      session: { user: { id: "profile-test" } },
      rpc(name, args) {
        if (name === "get_my_profile") return { data: [profile], error: null };
        if (name === "set_username") profile.username = args.p_username;
        if (name === "update_profile") profile.display_name = args.p_display_name;
        if (name === "sync_cloud_save") return { data: [{ outcome: "created", revision: 1 }], error: null };
        return { data: [], error: null };
      }
    });
    await test.api.init();
    assert.match(test.api.accountHTML(), /atu-profile-username/);
    assert.doesNotMatch(test.api.accountHTML(), /atu-profile-display|atu-profile-avatar/);
    test.window.document.getElementById = id => id === "atu-profile-username" ? { value: " Player_One " } : null;
    await test.api.saveProfile();
    const update = test.calls.find(call => call.name === "update_profile");
    assert.equal(profile.username, "Player_One");
    assert.equal(update.args.p_display_name, profile.username);
    assert.equal(update.args.p_avatar_url, "https://example.com/photo.png");
    assert.match(test.api.accountHTML(), /Profile saved/);
  }

  {
    const test = makeContext({
      session: { user: { id: "error-test" } },
      rpc() { return { data: null, error: { message: "JWT issued at future" } }; }
    });
    await test.api.init();
    assert.match(test.api.accountHTML(), /Could not load your account/);
    assert.doesNotMatch(test.api.accountHTML(), /JWT issued at future/);
    await test.api.loadRankings();
    assert.match(test.api.rankingsHTML(), /Could not load rankings/);
    assert.doesNotMatch(test.api.rankingsHTML(), /JWT issued at future/);
  }

  for (const separator of ["&", "#"]) {
    const test = makeContext({
      href: "https://game.example/index.html?auth=account" + separator
        + "error=server_error&error_code=unexpected_failure&error_description=private-provider-details"
    });
    await test.api.init();
    assert.match(test.api.accountHTML(), /Sign-in could not finish/);
    assert.doesNotMatch(test.api.accountHTML(), /private-provider-details/);
    assert.equal(test.window.history.replacedUrl, "/index.html?auth=account");
    assert.equal(test.api.isSignedIn(), false);
  }

  {
    const test = makeContext({ href: "https://game.example/index.html?auth=account#error=access_denied" });
    await test.api.init();
    assert.match(test.api.accountHTML(), /Sign-in was cancelled or denied/);
  }

  {
    const test = makeContext({ withClient: false });
    await test.api.init();
    assert.match(test.api.accountHTML(), /Accounts are taking a timeout/);
    assert.equal(test.api.isSignedIn(), false);
  }

  {
    const test = makeContext();
    await test.api.init();
    const html = test.api.accountHTML();
    assert.match(html, /Welcome back/);
    assert.match(html, /Continue with Google/);
    assert.match(html, /Forgot password/);
    assert.doesNotMatch(html, />"/);
  }

  {
    const test = makeContext({
      href: "https://game.example/index.html?challenge=A1B2C3D4E5F60708",
      rpc(name) {
        if (name === "get_async_challenge_invitation") {
          return {
            data: [{
              challenge_code: "A1B2C3D4E5F60708",
              status: "open",
              creator_public_id: "public-creator",
              creator_username: "challenger",
              creator_display_name: null,
              creator_avatar_url: null,
              rules_version: "atu-v1",
              expires_at: "2026-08-08T00:00:00Z"
            }],
            error: null
          };
        }
        throw new Error(`Unexpected RPC ${name}`);
      }
    });
    await test.api.init();
    const html = test.api.challengeHTML();
    assert.match(html, /@challenger is calling you out!/);
    assert.match(html, /SIGN IN TO PLAY/);
    assert.equal(test.calls.length, 1, "Opening an invitation must not accept it or request a run");
    assert.equal(test.calls[0].name, "get_async_challenge_invitation");
    assert.equal(test.calls[0].args.p_code, "A1B2C3D4E5F60708");
  }

  {
    const session = { user: { id: "user-1", email: "test@example.com", email_confirmed_at: "2026-08-07T00:00:00Z" } };
    const test = makeContext({
      session,
      href: "https://game.example/index.html?auth=account#access_token=test-access&refresh_token=test-refresh",
      rpc(name) {
        if (name === "get_my_profile") return { data: [{ public_id: "public-1", username: "tester", display_name: "Test", avatar_url: null }], error: null };
        if (name === "get_cloud_save") return { data: [], error: null };
        if (name === "sync_cloud_save") return { data: [{ outcome: "created", revision: 1, schema_version: 1, payload: {}, client_updated_at: "2026-08-07T00:00:00Z", server_updated_at: "2026-08-07T00:00:00Z" }], error: null };
        throw new Error(`Unexpected RPC ${name}`);
      }
    });
    await test.api.init();
    const html = test.api.accountHTML();
    assert.match(html, /@tester/);
    assert.match(html, /Safe &amp; synced/);
    assert.equal(test.window.history.replacedUrl, null, "Leave successful callback tokens for the Auth client to consume");
    const sync = test.calls.find(call => call.name === "sync_cloud_save");
    assert.equal(sync.args.p_expected_revision, 0);
    assert.equal(sync.args.p_schema_version, 1);
    assert.equal(sync.args.p_payload.format, "atu-cloud-save");
    assert.equal(sync.args.p_import_id.length, 36);
  }

  {
    const remotePayload = {
      format: "atu-cloud-save",
      schemaVersion: 1,
      generatedAt: "2026-08-06T00:00:00Z",
      sourceDeviceId: "remote-device",
      keys: { "atu-hs-v4": { draft: { ovr: 80, wins: 40 } } }
    };
    const session = { user: { id: "user-2", email: "conflict@example.com", email_confirmed_at: "2026-08-07T00:00:00Z" } };
    const test = makeContext({
      session,
      storageSeed: { "atu-hs-v4": JSON.stringify({ draft: { ovr: 90, wins: 70 } }) },
      rpc(name) {
        if (name === "get_my_profile") return { data: [{ public_id: "public-2", username: "conflict", display_name: null, avatar_url: null }], error: null };
        if (name === "get_cloud_save") return { data: [{ revision: 4, schema_version: 1, payload: remotePayload, client_updated_at: "2026-08-06T00:00:00Z", server_updated_at: "2026-08-06T00:00:00Z" }], error: null };
        throw new Error(`Unexpected RPC ${name}`);
      }
    });
    await test.api.init();
    assert.match(test.api.accountHTML(), /Which save do you want to keep\?/);
    assert.equal(test.calls.some(call => call.name === "sync_cloud_save"), false);
    await test.api.resolveCloud("cloud");
    assert.equal(test.window.location.reloadCalled, true);
    assert.deepEqual(JSON.parse(test.storage.getItem("atu-hs-v4")), { draft: { ovr: 80, wins: 40 } });
    assert.ok(test.storage.getItem("atu-cloud-backup-v1"));
  }
}

run().then(() => {
  console.log("backend client tests passed");
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
