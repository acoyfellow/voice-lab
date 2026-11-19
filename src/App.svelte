<script>
  const TASK = [
    { id: 'e1', t: 0, type: 'started', text: 'task: make widget frames fit their content' },
    { id: 'e2', t: 2, type: 'tool_call', text: 'read ToolResultWidget.svelte' },
    { id: 'e3', t: 5, type: 'tool_call', text: "grep 'height' app.css" },
    { id: 'e6', t: 9, type: 'finding', text: 'cause: every widget frame is pinned at 360px' },
    { id: 'e7', t: 12, type: 'edit', text: 'edit artifact-runtime.ts' },
    { id: 'e8', t: 17, type: 'edit', text: 'edit Chat.svelte' },
    { id: 'e9', t: 21, type: 'test_fail', text: 'build failed: duplicate variable' },
    { id: 'e10', t: 25, type: 'edit', text: 'fix the duplicate variable' },
    { id: 'e11', t: 29, type: 'test_pass', text: '1344 tests passed' },
    { id: 'e13', t: 33, type: 'push', text: 'committed and pushed' },
    { id: 'e14', t: 37, type: 'deploy_cmd', text: 'deploy started' },
    { id: 'e15', t: 47, type: 'deploy_ok', text: 'prod checked: version 92387666 live' },
    { id: 'e16', t: 50, type: 'answer', text: 'I modified src/artifact-runtime.ts to add a ResizeObserver that posts my-ax:artifact-resize with the measured height, throttled with requestAnimationFrame. In src/ui/Chat.svelte I added a handler that finds the frame by contentWindow and sets the CSS variable --artifact-content-h, bounded between 48 and 8000 pixels. The first build failed because raw was declared twice, so I renamed it to incoming. 1344 tests passed. Commit 5eb639d on fix/widget-autosize, deployed with deploy-employee.sh, prod reports version 92387666-c2a7-47ad-9ab3-187cb1a3588c. Let me know if you want any further changes.' }
  ];
  const FLEET = [
    { id: 'w1', t: 0, agent: 'Widgets', type: 'started', text: 'fix widget frame height' },
    { id: 'j1', t: 1, agent: 'Jira', type: 'started', text: 'triage 8 stale tickets' },
    { id: 'v1', t: 2, agent: 'Evals', type: 'started', text: 'run evals' },
    { id: 'w3', t: 9, agent: 'Widgets', type: 'finding', text: 'found the cause' },
    { id: 'j3', t: 12, agent: 'Jira', type: 'progress', text: '3 of 8 tickets checked' },
    { id: 'j4', t: 18, agent: 'Jira', type: 'question', text: 'CFSA-1037: close it, park it, or narrow it?' },
    { id: 'w4', t: 21, agent: 'Widgets', type: 'test_fail', text: 'small build error, fixing it itself' },
    { id: 'v3', t: 24, agent: 'Evals', type: 'test_fail', blocking: true, text: '3 evals failed on the billing row' },
    { id: 'w5', t: 29, agent: 'Widgets', type: 'test_pass', text: 'tests pass' },
    { id: 'j5', t: 33, agent: 'Jira', type: 'progress', text: '6 of 8 tickets checked' },
    { id: 'w6', t: 37, agent: 'Widgets', type: 'deploy_cmd', text: 'deploy started' },
    { id: 'v4', t: 40, agent: 'Evals', type: 'edit', text: 'fixed the billing prompt' },
    { id: 'w7', t: 47, agent: 'Widgets', type: 'deploy_ok', text: 'deployed and checked' },
    { id: 'v5', t: 49, agent: 'Evals', type: 'test_pass', text: 'all evals pass' },
    { id: 'j6', t: 51, agent: 'Jira', type: 'answer', text: 'done' },
    { id: 'w8', t: 52, agent: 'Widgets', type: 'answer', text: 'done' },
    { id: 'v6', t: 53, agent: 'Evals', type: 'answer', text: 'done' }
  ];
  const MODES = [
    { key: 'baseline', name: 'Today (one model)', how: 'One model works and talks. Silent until done, then reads the whole answer.' },
    { key: 'verbalizer', name: 'Verbalizer', how: 'A small model turns the work into short spoken updates. Your questions wait for its next update.' },
    { key: 'talker', name: 'Talker + reasoner', how: 'A fast talker answers you instantly from the worker’s notes. Speaks only at milestones.' },
    { key: 'fgbg', name: 'Background worker', how: 'Like talker + reasoner, but news waits for a pause instead of interrupting.' },
    { key: 'fleet', name: 'One voice, 3 agents', how: 'One voice for three agents. Questions and failures at once, other news in batches. Bigger job, so more to say.' },
    { key: 'think', name: 'Think while listening', how: 'Starts working out your question before you finish, so replies come faster.' },
    { key: 'tandem', name: 'Tandem', how: 'Says a quick “one sec” draft, then the real answer a moment later.' }
  ];
  const SPEED = 2;

  let mode = $state('baseline');
  let running = $state(false);
  let done = $state(false);
  let t = $state(0);
  let fired = $state([]);
  let msgs = $state([]);
  let queued = $state([]);
  let pending = $state([]);
  let batch = $state([]);
  let later = $state([]);
  let showLog = $state(false);
  let showExtras = $state(false);
  let sloppy = $state(false);
  let voiceOn = $state(true);
  let input = $state('');
  let results = $state({});
  let lastBatch = 0, speakEnd = 0, uid = 0, autoIdx = 0;

  const synthOK = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const script = $derived(mode === 'fleet' ? FLEET : TASK);
  const endT = $derived(Math.max(...script.map((e) => e.t)));
  const info = $derived(MODES.find((m) => m.key === mode));
  const AUTO = $derived([
    { t: 14, text: 'What are you doing right now?' },
    { t: 30, text: mode === 'fleet' ? 'Tell Jira to close CFSA-1037.' : 'Also give it a blue border.' }
  ]);

  const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
  const fmt = (x) => { const s = Math.max(0, Math.floor(x)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function reset() {
    running = false; done = false; t = 0; fired = []; msgs = []; queued = []; pending = []; batch = []; later = [];
    lastBatch = 0; speakEnd = 0; uid = 0; autoIdx = 0;
    if (synthOK) speechSynthesis.cancel();
  }
  function pick(k) { mode = k; reset(); }
  function start() { reset(); running = true; }

  function proven(cites, claim) {
    if (!cites.length) return false;
    const evs = cites.map((id) => fired.find((e) => e.id === id));
    if (evs.some((e) => !e)) return false;
    if (claim === 'deployed') return evs.some((e) => e.type === 'deploy_ok');
    return true;
  }
  function say(text, cites = [], o = {}) {
    const start = o.now ? t + (o.lat ?? 0) : Math.max(t, speakEnd);
    const m = { id: ++uid, who: 'voice', at: start, text, ok: o.chat ? null : proven(cites, o.claim), reply: !!o.reply, draft: !!o.draft, cut: false };
    speakEnd = start + words(text) / 2.7;
    msgs.push(m);
    if (voiceOn && synthOK) { const u = new SpeechSynthesisUtterance(text); u.rate = 1.1; speechSynthesis.speak(u); }
  }
  function status() {
    if (mode === 'fleet') {
      const out = [], ids = [];
      for (const a of ['Widgets', 'Jira', 'Evals']) {
        const e = [...fired].reverse().find((x) => x.agent === a);
        if (!e) continue;
        ids.push(e.id);
        out.push(e.type === 'question' ? `${a} is waiting on you` : e.type === 'test_fail' && e.blocking ? `${a} is fixing a failure` : `${a}: ${e.text}`);
      }
      return { text: out.join('. ') + '.', ids };
    }
    const e = [...fired].reverse().find((x) => x.type !== 'tool_call');
    if (!e) return { text: 'It is just getting started.', ids: [] };
    const map = { started: 'It just started reading the code.', finding: 'It found the cause, frames are stuck at 360 pixels, and is about to edit the code.', edit: 'It is editing the code.', test_fail: 'A build failed on a small error. It is fixing that.', test_pass: 'Tests pass. It is about to deploy.', push: 'It pushed the fix and is deploying next.', deploy_cmd: 'It is deploying. Not confirmed yet.', deploy_ok: 'It is deployed and checked.', answer: 'It is done.' };
    return { text: map[e.type] ?? e.text, ids: [e.id] };
  }

  function onEvent(e) {
    const m = mode;
    if (m === 'baseline') {
      if (e.type !== 'answer') return;
      say(e.text, [e.id]);
      for (const q of queued) say(/what|doing/i.test(q) ? 'You asked what I was doing. I could not answer, I was busy. It is done now.' : 'You asked for a change while I was busy. I did not hear it in time, so it is not in this fix.', [e.id], { reply: true });
      queued = [];
      return;
    }
    if (m === 'verbalizer') {
      const L = { started: 'Starting on the widget frames.', finding: 'Found the cause: frames are stuck at 360 pixels.', test_fail: 'A build failed on a small error. Fixing it.', test_pass: 'All tests pass.', push: 'Pushed the fix.', deploy_ok: 'Deployed and checked.', answer: 'Done. Frames fit their content now.' };
      if (e.type === 'edit' && e.id === 'e7') L.edit = 'Now editing the code.';
      if (e.type === 'deploy_cmd') L.deploy_cmd = sloppy ? 'It is deployed.' : 'Deploying now.';
      const line = L[e.type];
      if (!line) return;
      say(line, [e.id], { claim: e.type === 'deploy_cmd' && sloppy ? 'deployed' : undefined });
      for (const q of queued) { if (/what|doing/i.test(q)) { const s = status(); say('About your question: ' + s.text, s.ids, { reply: true }); } else say('I passed your change to the worker.', [], { reply: true, chat: true }); }
      queued = [];
      return;
    }
    if (m === 'fleet') {
      if (e.type === 'question') return say(`${e.agent} needs you: ${e.text}`, [e.id]);
      if (e.type === 'test_fail' && e.blocking) return say(`${e.agent} hit a failure: ${e.text}. It is on it.`, [e.id]);
      if (e.type === 'deploy_cmd' && sloppy) return say('Widgets is deployed.', [e.id], { claim: 'deployed' });
      if (e.type === 'answer') {
        if (fired.filter((x) => x.type === 'answer').length === 3) say('All three agents are done.', ['j6', 'w8', 'v6']);
        return;
      }
      if (e.type !== 'started') batch.push(e);
      return;
    }
    const L = { finding: 'Found it: frames are stuck at 360 pixels.', test_pass: 'Tests pass. Deploying next.', deploy_ok: 'It is live and checked.', answer: 'All done.' };
    if (e.type === 'deploy_cmd' && sloppy) L.deploy_cmd = 'It is deployed.';
    const line = L[e.type];
    if (!line) return;
    const o = { claim: e.type === 'deploy_cmd' ? 'deployed' : undefined };
    if (m === 'fgbg') pending.push({ line, ids: [e.id], o });
    else say(line, [e.id], o);
  }

  function ask(text) {
    if (synthOK) speechSynthesis.cancel();
    for (const x of msgs) if (x.who === 'voice' && x.at <= t && x.at + words(x.text) / 2.7 > t) x.cut = true;
    speakEnd = t;
    msgs.push({ id: ++uid, who: 'you', at: t, text });
    const isStatus = /what|status|doing|how/i.test(text);
    const m = mode;
    if (m === 'baseline' || m === 'verbalizer') { queued.push(text); return; }
    if (m === 'tandem') say(isStatus ? 'Sure, one sec.' : 'Okay.', [], { now: true, lat: 0.3, chat: true, draft: true });
    if (m === 'think') msgs.push({ id: ++uid, who: 'note', at: t, text: 'It started working out your question before you finished speaking.' });
    const lat = m === 'think' ? 0.3 : m === 'tandem' ? 1.5 : 0.6;
    if (isStatus) { const s = status(); return say(s.text, s.ids, { now: true, lat, reply: true }); }
    say(m === 'fleet' ? 'Sent to Jira. I will tell you when it picks it up.' : 'Got it. Passing that to the worker.', [], { now: true, lat, chat: true, reply: true });
    const id = 'x' + uid;
    later.push({ at: t + 5, fire: () => { fired.push({ id, t, type: 'ack', agent: m === 'fleet' ? 'Jira' : undefined, text: 'picked up your note' }); const l = m === 'fleet' ? 'Jira picked up your answer.' : 'The worker picked up your change.'; if (m === 'fgbg') pending.push({ line: l, ids: [id], o: {} }); else say(l, [id]); } });
  }

  function tick() {
    t = +(t + 0.1 * SPEED).toFixed(2);
    for (const e of script) if (e.t <= t && !fired.some((f) => f.id === e.id)) { fired.push(e); onEvent(e); }
    while (autoIdx < AUTO.length && AUTO[autoIdx].t <= t) ask(AUTO[autoIdx++].text);
    for (const l of later) if (!l.done && l.at <= t) { l.done = true; l.fire(); }
    if (mode === 'fleet' && t - lastBatch >= 15 && batch.length) {
      lastBatch = t;
      say('Update. ' + batch.map((e) => `${e.agent}: ${e.text}`).join('. ') + '.', batch.map((e) => e.id));
      batch = [];
    }
    if (mode === 'fgbg' && pending.length && t >= speakEnd + 1.5) { const p = pending.shift(); say(p.line, p.ids, p.o); }
    if (t > endT + 2 && t >= speakEnd + 1 && !pending.length) finish();
  }
  function finish() {
    running = false; done = true;
    const v = msgs.filter((x) => x.who === 'voice');
    let cur = 0, worst = 0;
    for (const x of [...v].sort((a, b) => a.at - b.at)) { worst = Math.max(worst, x.at - cur); cur = Math.max(cur, x.at + words(x.text) / 2.7); }
    const asks = msgs.filter((x) => x.who === 'you');
    const waits = asks.map((a) => { const r = v.find((x) => x.reply && x.at >= a.at); return r ? r.at - a.at : endT - a.at; });
    results[mode] = {
      words: v.reduce((n, x) => n + words(x.text), 0),
      silence: Math.round(worst),
      wait: waits.length ? +(waits.reduce((a, b) => a + b, 0) / waits.length).toFixed(1) : 0,
      unproven: v.filter((x) => x.ok === false).length
    };
  }

  $effect(() => {
    if (!running) return;
    const h = setInterval(tick, 100);
    return () => clearInterval(h);
  });

  const visible = $derived(msgs.filter((x) => x.at <= t + 0.01).sort((a, b) => a.at - b.at || a.id - b.id));
  const progress = $derived(Math.min(100, (t / (endT + 4)) * 100));
  const ranked = $derived(MODES.filter((m) => results[m.key]));
  const best = $derived.by(() => {
    const r = ranked.filter((m) => m.key !== 'fleet').map((m) => results[m.key]);
    if (!r.length) return {};
    return { words: Math.min(...r.map((x) => x.words)), silence: Math.min(...r.map((x) => x.silence)), wait: Math.min(...r.map((x) => x.wait)) };
  });
  const stepThree = $derived(ranked.length === MODES.length ? 'All 7 tried. Compare them below.' : `Scores: ${ranked.length} of 7 tried. Pick another design and run it.`);
</script>

<div class="lab">
  <h1>Voice lab</h1>
  <p class="intro">Every design gets the <b>same recorded coding task</b>. You don’t do anything. Partway through, “you” ask what it’s doing, then ask for a change. Listen to how each design copes, then compare the scores.</p>

  <div class="step">1. Pick a design</div>
  <div class="modes">
    {#each MODES as m}
      <button class="pill" class:on={mode === m.key} onclick={() => pick(m.key)}>
        <span>{m.name}<i hidden></i></span>
        {#if results[m.key]}<span class="tick">✓</span>{/if}
      </button>
    {/each}
  </div>
  <p class="how"><b>{info.name}:<i hidden></i></b> {info.how}<i hidden></i></p>

  <div class="step">2. Press Start and listen (30 to 50 seconds)</div>
  <div class="bar">
    <button class="go" onclick={running ? reset : start}>{running ? '■ Stop' : done ? '↻ Run again' : '▶ Start'}<i hidden></i></button>
    <div class="track">
      <div class="fill" style="width:{progress}%"></div>
      <span class="mark" style="left:{(14 / (endT + 4)) * 100}%">you ask</span>
      <span class="mark" style="left:{(30 / (endT + 4)) * 100}%">you ask for a change</span>
    </div>
    <span class="clock">{fmt(t / SPEED)}<i hidden></i></span>
  </div>
  <div class="toggles">
    <button class="pill small" class:on={voiceOn} disabled={!synthOK} onclick={() => (voiceOn = !voiceOn)}>{synthOK ? (voiceOn ? '🔊 Read aloud: on' : '🔇 Read aloud: off') : 'Read aloud not available here'}<i hidden></i></button>
  </div>

  <div class="chat">
    {#if !visible.length}<p class="empty">{running ? 'Listening… the voice is quiet so far.' : 'Press Start.'}<i hidden></i></p>{/if}
    {#each visible as x (x.id)}
      {#if x.who === 'you'}
        <div class="row you"><div class="bub you">{x.text}<i hidden></i></div></div>
      {:else if x.who === 'note'}
        <div class="note">{x.text}<i hidden></i></div>
      {:else}
        <div class="row"><div class="bub voice" class:cut={x.cut} class:draft={x.draft}>
          {x.text}<i hidden></i>
          {#if x.ok === false}<span class="flag bad">⚠ not proven by the worker yet</span>{/if}
          {#if x.cut}<span class="flag">you interrupted</span>{/if}
        </div></div>
      {/if}
    {/each}
    {#if queued.length && running}<div class="note warn">Your message is waiting. This design can’t answer until {mode === 'baseline' ? 'the task is done' : 'its next update'}.<i hidden></i></div>{/if}
  </div>

  {#if ranked.length}
    <div class="step">3. {stepThree}<i hidden></i></div>
    <table>
      <thead><tr><th>Design</th><th>Words heard</th><th>Longest silence</th><th>Wait for a reply</th><th>Unproven claims</th></tr></thead>
      <tbody>
        {#each ranked as m}
          {@const r = results[m.key]}
          {@const solo = m.key !== 'fleet'}
          <tr class:cur={m.key === mode}>
            <td>{m.name}<i hidden></i>{#if !solo}<span class="sub">3 agents, not comparable</span>{/if}</td>
            <td class:win={solo && r.words === best.words}>{r.words}<i hidden></i></td>
            <td class:win={solo && r.silence === best.silence}>{r.silence}s<i hidden></i></td>
            <td class:win={solo && r.wait === best.wait}>{r.wait}s<i hidden></i></td>
            <td class:bad={r.unproven > 0}>{r.unproven}<i hidden></i></td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="legend">Lower is better in every column. Green is the best of the one-agent designs. Times are on the task’s clock, before the 2× playback speed.</p>
  {/if}

  <div class="extras">
    <button class="link" onclick={() => (showExtras = !showExtras)}>{showExtras ? '▾' : '▸'} Extras: talk to it yourself, see the worker, test overclaiming<i hidden></i></button>
    {#if showExtras}
      <form onsubmit={(e) => { e.preventDefault(); if (input.trim() && running) { ask(input.trim()); input = ''; } }}>
        <input class="text" bind:value={input} placeholder={running ? 'Type something to say to it…' : 'Start a run first'} disabled={!running} />
        <button class="pill" type="submit" disabled={!running}>Say it</button>
      </form>
      <div class="toggles">
        <button class="pill small" class:on={sloppy} onclick={() => (sloppy = !sloppy)}>Sloppy voice: {sloppy ? 'on' : 'off'}<i hidden></i></button>
        <button class="pill small" class:on={showLog} onclick={() => (showLog = !showLog)}>Worker log: {showLog ? 'shown' : 'hidden'}<i hidden></i></button>
      </div>
      <p class="hint">Sloppy voice says “deployed” before the deploy is checked, so you can see it flagged. The worker log is what the voice reads from. You never hear it directly.</p>
      {#if showLog}
        <div class="log">
          {#each fired as e (e.id)}
            <div>{fmt(e.t / SPEED)}<i hidden></i> <b>{e.agent ?? 'worker'}<i hidden></i></b> {e.type === 'answer' && !e.agent ? 'final answer (long)' : e.text}<i hidden></i></div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  :global(body) { padding: 0; margin: 0; background: #0f1115; }
  .lab { padding: 16px 16px 24px; font-family: var(--font-sans, system-ui, sans-serif); color: var(--fg, #e7e9ee); max-width: 780px; margin: 0 auto; }
  h1 { font-size: 1.25rem; margin: 0 0 4px; }
  .intro { margin: 0 0 6px; line-height: 1.5; font-size: .92rem; opacity: .9; }
  .step { font-weight: 700; font-size: .88rem; margin: 18px 0 8px; color: #f6821f; }
  .modes, .toggles { display: flex; flex-wrap: wrap; gap: 6px; }
  .toggles { margin-top: 10px; }
  button { font: inherit; cursor: pointer; color: inherit; }
  .pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.05); padding: 7px 14px; font-size: .86rem; min-height: 0; width: auto; }
  .pill.small { font-size: .8rem; padding: 5px 12px; }
  .pill.on { background: #f6821f; border-color: #f6821f; color: #111; font-weight: 600; }
  .pill:disabled { opacity: .5; cursor: default; }
  .tick { font-size: .78rem; }
  .how { margin: 10px 0 0; font-size: .88rem; opacity: .85; line-height: 1.45; }
  .bar { display: flex; align-items: center; gap: 12px; }
  .go { border-radius: 999px; border: 0; background: #f6821f; color: #111; font-weight: 700; padding: 10px 20px; font-size: .95rem; white-space: nowrap; }
  .track { position: relative; flex: 1; height: 8px; background: rgba(255,255,255,.1); border-radius: 4px; margin-bottom: 16px; }
  .fill { height: 100%; background: #f6821f; border-radius: 4px; }
  .mark { position: absolute; top: 12px; transform: translateX(-50%); font-size: .68rem; opacity: .7; white-space: nowrap; }
  .mark::before { content: ''; position: absolute; left: 50%; top: -14px; width: 2px; height: 10px; background: #60a5fa; }
  .clock { font-variant-numeric: tabular-nums; font-weight: 600; min-width: 40px; text-align: right; }
  .chat { margin-top: 14px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); }
  .empty { opacity: .6; margin: 4px; font-size: .88rem; }
  .row { display: flex; margin: 8px 0; }
  .row.you { justify-content: flex-end; }
  .bub { max-width: 80%; padding: 9px 12px; border-radius: 14px; line-height: 1.45; font-size: .9rem; }
  .bub.voice { background: rgba(246,130,31,.14); border: 1px solid rgba(246,130,31,.35); border-bottom-left-radius: 4px; }
  .bub.you { background: rgba(96,165,250,.2); border: 1px solid rgba(96,165,250,.4); border-bottom-right-radius: 4px; }
  .bub.cut { opacity: .6; }
  .bub.draft { opacity: .7; font-style: italic; }
  .flag { display: block; margin-top: 4px; font-size: .74rem; opacity: .8; }
  .flag.bad { color: #f87171; opacity: 1; font-weight: 600; }
  .note { font-size: .78rem; opacity: .7; text-align: center; margin: 8px 0; font-style: italic; }
  .note.warn { color: #fbbf24; opacity: 1; }
  table { width: 100%; border-collapse: collapse; font-size: .86rem; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,255,255,.08); vertical-align: top; }
  th { font-size: .72rem; text-transform: uppercase; letter-spacing: .03em; opacity: .7; font-weight: 600; }
  tr.cur td:first-child { font-weight: 700; }
  td.win { color: #4ade80; font-weight: 700; }
  td.bad { color: #f87171; font-weight: 700; }
  .sub { display: block; font-size: .72rem; opacity: .6; font-weight: 400; }
  .legend, .hint { font-size: .76rem; opacity: .6; margin: 6px 0 0; line-height: 1.4; }
  .extras { margin-top: 18px; font-size: .86rem; }
  .link { background: none; border: 0; padding: 0; opacity: .8; font-size: .86rem; }
  form { display: flex; gap: 8px; margin: 10px 0 0; align-items: center; }
  .text { flex: 1; width: auto; min-height: 0; font: inherit; padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.18); background: transparent; color: inherit; }
  .log { margin-top: 8px; font-family: ui-monospace, Menlo, monospace; font-size: .76rem; opacity: .8; line-height: 1.6; }
  @media (max-width: 560px) { th:nth-child(2), td:nth-child(2) { display: none; } .mark { font-size: .6rem; } }
</style>
