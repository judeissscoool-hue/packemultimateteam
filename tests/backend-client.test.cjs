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

function makeContext({ session = null, rpc, storageSeed = {}, withClient = true, href = "https://game.example/index.html?auth=account", invoke, auth = {}, clock } = {}) {
  const storage = makeStorage(storageSeed);
  const calls = [];
  const client = {
    functions: { async invoke(name, args) { return invoke(name, args); } },
    auth: {
      onAuthStateChange() {},
      async getSession() { return { data: { session }, error: null }; },
      ...auth
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
    setTimeout: clock?.setTimeout || setTimeout,
    clearTimeout: clock?.clearTimeout || clearTimeout,
    confirm() { return true; },
    history: { replacedUrl: null, replaceState(_state, _title, url) { this.replacedUrl = url; } },
    document: { getElementById() { return null; }, querySelector() { return null; } },
    cardHTML(id) { return `<div class="card">card-${id}</div>`; },
    challengeCourtHTML(roster = {}, options = {}) { return `<div class="court">${JSON.stringify({roster, options})}</div>`; },
    draftHTML() { return '<div class="court">Classic Draft</div>'; },
    setScreen(screen) { this.currentScreen = screen; },
    render() {}
  };
  const context = vm.createContext({
    window,
    URL,
    URLSearchParams,
    TextEncoder,
    Date: clock?.Date || Date,
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
    assert.ok(rendered.includes('<b>' + result.effectiveRating.toFixed(1) + '</b><span>OVR WITH CHEM</span>'), 'Waiting screen displays the validator effective rating');
    assert.match(rendered,/"hidden":true/);
    assert.doesNotMatch(rendered,/opponent-public|@Friend/);
    assert.ok(!test.calls.some(c=>c.name==='get_async_challenge_result'), 'No opposing roster is requested before completion');
    completed=true;
    await test.api.loadChallengeInvitation(code);
    rendered=test.api.challengeHTML();
    assert.match(rendered,/@Friend/);
    assert.match(rendered,/duel-reveal/);
    assert.equal(rendered.split('<b>' + result.effectiveRating.toFixed(1) + '</b><span>OVR WITH CHEM</span>').length - 1, 2, 'Both revealed rosters display chemistry-adjusted OVR');
    assert.match(rendered, /<b>90<\/b><span>TEAM OVR<\/span>/, 'The saved server OVR is not replaced by the display calculation');
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

  for (const mode of ['signin', 'signup']) {
    let oauth;
    const test = makeContext({auth:{async signInWithOAuth(args){oauth=args;return {data:{}};}}});
    await test.api.init();
    test.api.setAuthMode(mode);
    const view=test.api.accountHTML();
    assert.ok(view.indexOf('Continue with Google') < view.indexOf('atu-auth-email'), 'Google is before the email form in both account modes');
    assert.equal((view.match(/signInWithGoogle\(\)/g)||[]).length,1);
    assert.match(view,/Game password/);
    await test.api.signInWithGoogle();
    assert.equal(oauth.provider,'google');
    assert.equal(oauth.options.redirectTo,'https://game.example/index.html?auth=account');
  }

  {
    const code='A1B2C3D4E5F60708';
    const invitation={status:'open',creator_username:'Challenger',creator_public_id:'challenger-public'};
    let oauth;
    const guest=makeContext({href:'https://game.example/?challenge='+code,
      rpc(){return {data:[invitation]};},
      auth:{async signInWithOAuth(args){oauth=args;return {data:{}};}}});
    await guest.api.init();
    await guest.api.acceptChallenge();
    assert.equal(guest.window.currentScreen,'account');
    assert.ok(!guest.calls.some(c=>c.name==='accept_async_challenge'), 'Setup never claims the invitation');
    guest.api.setAuthMode('signup');
    assert.match(guest.api.accountHTML(),/BACK TO MY CHALLENGE/,'Switching to signup keeps the return link');
    await guest.api.signInWithGoogle();
    const callback=new URL(oauth.options.redirectTo);
    assert.equal(callback.searchParams.get('challenge'),code);
    assert.equal(callback.searchParams.get('next'),'challenge');

    const profile={username:null,public_id:'new-player-public'};
    const signedIn=makeContext({session:{user:{id:'new-player'}},href:callback.toString(),
      storageSeed:{'atu-account-return-v1':guest.storage.getItem('atu-account-return-v1')},
      rpc(name,args){
        if(name==='get_my_profile')return {data:[profile]};
        if(name==='get_async_challenge_invitation')return {data:[invitation]};
        if(name==='set_username')profile.username=args.p_username;
        if(name==='sync_cloud_save')return {data:[{outcome:'created',revision:1}]};
        return {data:[]};
      }});
    await signedIn.api.init();
    assert.match(signedIn.api.challengeHTML(),/CHOOSE MY USERNAME/);
    assert.doesNotMatch(signedIn.api.challengeHTML(),/>ACCEPT CHALLENGE</);
    await signedIn.api.acceptChallenge();
    assert.equal(signedIn.window.currentScreen,'account');
    signedIn.window.document.getElementById=id=>id==='atu-profile-username'?{value:'New_Player'}:null;
    await signedIn.api.saveProfile();
    assert.equal(signedIn.window.currentScreen,'challenge');
    assert.match(signedIn.api.challengeHTML(),/>ACCEPT CHALLENGE</);
    assert.equal(signedIn.storage.getItem('atu-account-return-v1'),null);
    assert.ok(!signedIn.calls.some(c=>c.name==='accept_async_challenge'), 'Saving the username returns to the invitation without starting a draft');
    assert.ok(signedIn.calls.filter(c=>c.name==='get_async_challenge_invitation').every(c=>c.args.p_code===code));
  }

  for(const destination of ['challenge','rankings','friends']) {
    const guest=makeContext();await guest.api.init();
    if(destination==='challenge')await guest.api.createChallenge();
    else if(destination==='rankings') await guest.api.startRankedRun('pack');
    else await guest.api.sendFriendRequest();
    assert.equal(guest.window.currentScreen,'account');
    const returning=makeContext({session:{user:{id:'returning-player'}},
      storageSeed:{'atu-account-return-v1':guest.storage.getItem('atu-account-return-v1')},
      rpc(name){
        if(name==='get_my_profile')return {data:[{username:'Ready_Player'}]};
        if(name==='sync_cloud_save')return {data:[{outcome:'created',revision:1}]};
        return {data:[]};
      }});
    await returning.api.init();
    assert.match(returning.api.accountHTML(),/You're ready to play!|You&#39;re ready to play!/);
    await returning.api.continueAfterSetup();
    assert.equal(returning.window.currentScreen,destination,'Setup survives a reload, including drafts without invite links yet');
    assert.ok(!returning.calls.some(c=>/^create_/.test(c.name)),'Returning from setup does not create an unwanted run');
  }

  {
    let now=100000, nextTimer=0;
    const timers=new Map();
    const clock={
      Date:class extends Date { static now(){return now;} },
      setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,at:now+delay});return id;},
      clearTimeout(id){timers.delete(id);},
      async advance(ms){
        const target=now+ms;
        for(;;){
          const next=[...timers].filter(([,task])=>task.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
          if(!next)break;
          now=next[1].at;timers.delete(next[0]);await next[1].fn();
        }
        now=target;
      }
    };
    const onlineId='11111111-1111-4111-8111-111111111111';
    let friendsResult={data:[
      {friend_public_id:onlineId,username:'Online_Player',relationship:'accepted',is_online:true,email:'private@example.invalid'},
      {friend_public_id:'22222222-2222-4222-8222-222222222222',username:'Offline_Player',relationship:'accepted',is_online:false},
      {friend_public_id:'33333333-3333-4333-8333-333333333333',username:'Incoming_Player',relationship:'incoming',is_online:true},
      {friend_public_id:'44444444-4444-4444-8444-444444444444',username:'Outgoing_Player',relationship:'outgoing',is_online:true},
      {friend_public_id:'55555555-5555-4555-8555-555555555555',username:'<img src=x onerror=alert(1)>',relationship:'outgoing'},
      {friend_public_id:"bad-id');alert(1)",username:'Bad_Id',relationship:'accepted',is_online:true},null
    ]};
    let mutationError=false;
    const test=makeContext({clock,session:{user:{id:'social-player'}},auth:{async signOut(){return {}; }},
      rpc(name,args){
        if(name==='get_my_profile')return {data:[{username:'Social_Player'}]};
        if(name==='sync_cloud_save')return {data:[{outcome:'created',revision:1}]};
        if(name==='get_friends')return friendsResult;
        if(name==='change_friendship'){
          if(mutationError)return {error:{message:'private SQL failure'}};
          friendsResult={data:friendsResult.data.filter(row=>row?.friend_public_id!==args.p_friend_public_id)};
          return {data:args.p_action==='accept'?'accepted':'removed'};
        }
        return {data:[]};
      }});
    const events={},input={value:'Still_typing'},submit={disabled:false};
    const panels=['full','compact'].map(kind=>({innerHTML:'',getAttribute(){return kind;}}));
    let noticeContent='',noticeWrites=0;
    const notice={get innerHTML(){return noticeContent;},set innerHTML(value){noticeContent=value;noticeWrites++;}};
    const badge={textContent:'',hidden:true};
    test.window.document.visibilityState='visible';
    test.window.document.addEventListener=(name,fn)=>{events[name]=fn;};
    test.window.addEventListener=(name,fn)=>{events[name]=fn;};
    test.window.document.querySelectorAll=selector=>selector==='[data-friends-panel]'?panels:selector==='[data-friend-count]'?[badge]:[];
    test.window.document.getElementById=id=>id==='atu-friend-username'?input:id==='atu-friend-submit'?submit:id==='atu-friend-notices'?notice:null;
    let fullRenders=0;
    test.window.render=()=>{fullRenders++;};
    await test.api.init();
    const initialRenders=fullRenders;
    test.api.onScreen('challenge');
    await clock.advance(0);
    const count=name=>test.calls.filter(c=>c.name===name).length;
    assert.equal(count('touch_presence'),1);
    assert.equal(count('get_friends'),1,'Entering 1v1 does not fetch the list twice');
    assert.equal((panels[0].innerHTML.match(/Online now/g)||[]).length,1,'Pending requests never get an online badge, even with unexpected server data');
    assert.match(panels[0].innerHTML,/Offline_Player/);
    assert.match(panels[0].innerHTML,/&lt;img/);
    assert.doesNotMatch(panels[0].innerHTML,/<img|Bad_Id|private@example/);
    assert.match(panels[1].innerHTML,/1 online · 1 friend request/);
    assert.doesNotMatch(panels[1].innerHTML,/Incoming_Player|Outgoing_Player/);
    assert.match(notice.innerHTML,/@Incoming_Player/);
    assert.doesNotMatch(notice.innerHTML,/Online now|private@example|Outgoing_Player/);
    assert.equal(badge.textContent,'1');assert.equal(badge.hidden,false);
    const mountedWrites=noticeWrites;
    await clock.advance(15000);
    assert.equal(noticeWrites,mountedWrites,'Unchanged requests preserve the mounted popup, hover and keyboard focus');
    const beforeDismiss=test.calls.length;
    test.api.dismissFriendInvite('33333333-3333-4333-8333-333333333333');
    assert.equal(notice.innerHTML,'');
    assert.equal(badge.textContent,'1','Later leaves the request available in Friends');
    assert.equal(test.calls.length,beforeDismiss,'Later does not decline or send a server mutation');
    friendsResult={data:[{friend_public_id:onlineId,username:'Online_Player',relationship:'accepted',is_online:false}]};
    await clock.advance(15000);
    assert.equal(count('touch_presence'),2);
    assert.equal(count('get_friends'),3);
    assert.doesNotMatch(panels[0].innerHTML,/Online now/);
    assert.equal(input.value,'Still_typing','Background refresh preserves the form input');
    assert.equal(fullRenders,initialRenders,'Presence updates do not rerender the draft or its picker');
    assert.ok(test.calls.filter(c=>c.name==='touch_presence').every(c=>c.args===undefined),'Presence sends neither an identity nor a client clock');

    test.window.navigator.onLine=false;events.offline();
    assert.equal(timers.size,0);
    assert.match(panels[0].innerHTML,/offline.*Reconnect/);
    assert.doesNotMatch(panels[0].innerHTML,/Online now/);
    assert.equal(submit.disabled,true);
    await test.api.sendFriendRequest();await test.api.loadFriends(true);
    await clock.advance(120000);
    assert.equal(count('touch_presence'),2,'Offline devices stop heartbeats');
    assert.equal(count('get_friends'),3,'Offline devices stop list polling');
    assert.equal(count('request_friend'),0);
    test.window.navigator.onLine=true;events.online();await clock.advance(0);
    assert.equal(count('touch_presence'),3);
    assert.equal(count('get_friends'),4,'Reconnecting reloads once immediately');
    assert.equal(submit.disabled,false);
    test.window.document.visibilityState='hidden';events.visibilitychange();
    await clock.advance(60000);
    assert.equal(count('touch_presence'),3,'Hidden tabs do not keep players online');
    test.window.document.visibilityState='visible';events.visibilitychange();await clock.advance(0);
    assert.equal(count('get_friends'),5);
    test.api.onScreen('draft');await clock.advance(30000);
    assert.equal(count('touch_presence'),5,'Playing solo still marks the signed-in player online');
    assert.equal(count('get_friends'),7,'Friend requests are checked while playing other modes');

    const firstInvite='33333333-3333-4333-8333-333333333333',secondInvite='66666666-6666-4666-8666-666666666666';
    friendsResult={data:[
      {friend_public_id:firstInvite,username:'<img src=x>',relationship:'incoming',is_online:null},
      {friend_public_id:secondInvite,username:'Second_Invite',relationship:'incoming',is_online:null}
    ]};
    await clock.advance(15000);
    assert.match(notice.innerHTML,/&lt;img src=x&gt;/,'New incoming requests surface on the draft page and escape usernames');
    assert.doesNotMatch(notice.innerHTML,/<img|@Second_Invite/);
    assert.equal(badge.textContent,'2');
    test.api.dismissFriendInvite(firstInvite);
    assert.match(notice.innerHTML,/@Second_Invite/,'Multiple requests appear one at a time');
    await test.api.changeFriendship(secondInvite,'accept');
    assert.equal(notice.innerHTML,'');
    assert.equal(badge.textContent,'1');
    assert.equal(fullRenders,initialRenders,'Accepting from the popup leaves the current draft and picker mounted');
    friendsResult={data:[]};await test.api.loadFriends();
    friendsResult={data:[{friend_public_id:firstInvite,username:'Returned_Invite',relationship:'incoming'}]};await test.api.loadFriends();
    assert.match(notice.innerHTML,/@Returned_Invite/,'A new request from a previously dismissed player can appear again');
    mutationError=true;await test.api.changeFriendship(firstInvite,'decline');
    assert.match(notice.innerHTML,/That didn&#39;t work/);
    assert.doesNotMatch(notice.innerHTML,/private SQL/);
    mutationError=false;await test.api.changeFriendship(firstInvite,'decline');
    assert.equal(notice.innerHTML,'');assert.equal(badge.hidden,true);

    friendsResult={error:{message:'JWT private database details'}};
    await test.api.loadFriends(true);
    assert.match(panels[0].innerHTML,/Could not check friends/);
    assert.doesNotMatch(panels[0].innerHTML,/JWT|private database|Online_Player/);
    friendsResult={data:[{friend_public_id:firstInvite,username:'Last_Invite',relationship:'incoming'}]};await test.api.loadFriends();
    assert.match(notice.innerHTML,/@Last_Invite/);
    await test.api.signOut();
    assert.equal(timers.size,0,'Signing out cancels presence polling');
    assert.equal(notice.innerHTML,'','Signing out immediately clears the floating request');
    assert.equal(badge.hidden,true);
    assert.doesNotMatch(test.api.friendsHTML(),/Online_Player|SEND FRIEND REQUEST/);
  }

  {
    const friendId='11111111-1111-4111-8111-111111111111';
    let rows=[],requestResult={data:'sent'},changeResult={data:'accepted'};
    const test=makeContext({session:{user:{id:'request-player'}},rpc(name){
      if(name==='get_my_profile')return {data:[{username:'Request_Player'}]};
      if(name==='sync_cloud_save')return {data:[{outcome:'created',revision:1}]};
      if(name==='get_friends')return {data:rows};
      if(name==='request_friend')return requestResult;
      if(name==='change_friendship')return changeResult;
      return {data:[]};
    }});
    const input={value:'ab'};
    test.window.document.getElementById=id=>id==='atu-friend-username'?input:null;
    await test.api.init();await test.api.loadFriends();
    await test.api.sendFriendRequest();
    assert.ok(!test.calls.some(c=>c.name==='request_friend'),'Invalid usernames stay client-side');
    input.value=' @My_Brother ';
    await test.api.sendFriendRequest();
    assert.equal(test.calls.find(c=>c.name==='request_friend').args.p_username,'My_Brother');
    assert.equal(input.value,'');
    assert.match(test.api.friendsHTML(),/Friend request sent!/);
    for(const [result,message] of [
      [{data:'not_found'},/No player with that username/],
      [{error:{message:'internal SQL details'}},/Could not send that request/],
      [{error:{message:'Friend request rate limit'}},/Try again in an hour/]
    ]){
      input.value='Keep_My_Input';requestResult=result;
      await test.api.sendFriendRequest();
      assert.equal(input.value,'Keep_My_Input');
      assert.match(test.api.friendsHTML(),message);
      assert.doesNotMatch(test.api.friendsHTML(),/internal SQL details|Friend request rate limit/);
    }
    rows=[{friend_public_id:friendId,username:'Renamed_Brother',relationship:'incoming',is_online:null}];
    await test.api.loadFriends();
    await test.api.changeFriendship(friendId,'accept');
    let mutation=test.calls.filter(c=>c.name==='change_friendship').at(-1);
    assert.deepEqual({...mutation.args},{p_friend_public_id:friendId,p_action:'accept'},'Mutations use stable public IDs, not mutable usernames');
    assert.match(test.api.friendsHTML(),/now friends/);
    for(const action of ['decline','cancel','remove']){
      rows=[{friend_public_id:friendId,username:'Renamed_Brother',relationship:action==='decline'?'incoming':action==='cancel'?'outgoing':'accepted'}];
      await test.api.loadFriends();
      changeResult={data:'removed'};
      if(action==='remove'){
        const before=test.calls.length;
        test.window.confirm=()=>false;await test.api.changeFriendship(friendId,action);
        assert.equal(test.calls.length,before,'Cancelling removal leaves the friendship untouched');
        test.window.confirm=()=>true;
      }
      await test.api.changeFriendship(friendId,action);
      mutation=test.calls.filter(c=>c.name==='change_friendship').at(-1);
      assert.equal(mutation.args.p_action,action);
    }
    changeResult={error:{message:'private function failure'}};
    await test.api.changeFriendship(friendId,'remove');
    assert.match(test.api.friendsHTML(),/That didn&#39;t work/);
    assert.doesNotMatch(test.api.friendsHTML(),/private function failure/);
  }

  {
    let finishLoad;
    const test=makeContext({session:{user:{id:'leaving-player'}},auth:{async signOut(){return {}; }},rpc(name){
      if(name==='get_my_profile')return {data:[{username:'Leaving_Player'}]};
      if(name==='sync_cloud_save')return {data:[{outcome:'created',revision:1}]};
      if(name==='get_friends')return new Promise(resolve=>{finishLoad=resolve;});
      return {data:[]};
    }});
    await test.api.init();
    const pending=test.api.loadFriends();
    await test.api.signOut();
    finishLoad({data:[{friend_public_id:'11111111-1111-4111-8111-111111111111',username:'Previous_Account_Friend',relationship:'accepted',is_online:true}]});
    await pending;
    assert.doesNotMatch(test.api.friendsHTML(),/Previous_Account_Friend/,'A late response cannot restore a signed-out account’s friends');
  }

  {
    const test=makeContext({href:'https://game.example/?auth=account&next=https://evil.example',
      storageSeed:{'atu-account-return-v1':JSON.stringify({screen:'https://evil.example',createdAt:Date.now()})}});
    await test.api.init();await test.api.continueAfterSetup();
    assert.equal(test.window.currentScreen,undefined,'Only known in-game destinations may be restored');
    assert.equal(test.storage.getItem('atu-account-return-v1'),null);
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
    assert.match(test.api.challengeHTML(),/CHOOSE MY SAVE/);
    await test.api.createChallenge();
    assert.equal(test.window.currentScreen,'account');
    assert.ok(!test.calls.some(c=>c.name==='create_async_challenge'));
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
