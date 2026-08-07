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
    removeItem(key) { values.delete(key); },
    value(key) { return values.get(key); }
  };
}

function makeContext({ session = null, rpc, storageSeed = {}, withClient = true, href = "https://game.example/index.html?auth=account" } = {}) {
  const storage = makeStorage(storageSeed);
  let authCallback = null;
  const calls = [];
  const client = {
    auth: {
      onAuthStateChange(callback) { authCallback = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      async getSession() { return { data: { session }, error: null }; },
      async signUp() { return { data: { session: null }, error: null }; },
      async signInWithPassword() { return { data: { session }, error: null }; },
      async resetPasswordForEmail() { return { data: {}, error: null }; },
      async updateUser() { return { data: {}, error: null }; },
      async signInWithOAuth() { return { data: {}, error: null }; },
      async signOut() { return { error: null }; }
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
    history: { replaceState() {} },
    document: { getElementById() { return null; } },
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
  vm.runInContext(source, context, { filename: "backend.js" });
  return { api: window.ATUBackend, window, storage, calls, client, getAuthCallback: () => authCallback };
}

async function run() {
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
    const hiddenSeed = "a".repeat(64);
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
    assert.doesNotMatch(html, new RegExp(hiddenSeed));
    assert.equal(test.calls[0].name, "get_async_challenge_invitation");
    assert.equal(test.calls[0].args.p_code, "A1B2C3D4E5F60708");
  }

  {
    const session = { user: { id: "user-1", email: "test@example.com", email_confirmed_at: "2026-08-07T00:00:00Z" } };
    const test = makeContext({
      session,
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
    assert.deepEqual(JSON.parse(test.storage.value("atu-hs-v4")), { draft: { ovr: 80, wins: 40 } });
    assert.ok(test.storage.value("atu-cloud-backup-v1"));
  }
}

run().then(() => {
  console.log("backend client tests passed");
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
