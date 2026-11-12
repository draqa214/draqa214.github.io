// Refund resolver demo. Sample orders; the approval limit is a demo setting.
const APPROVAL_LIMIT = 500;

const SCENARIOS = {
  small: { order: 'ORD-1042', amount: 40, intent: 'damaged item', policy: 'within 30 days, photo attached, eligible', dup: false },
  large: { order: 'ORD-2217', amount: 1200, intent: 'not delivered', policy: 'carrier shows no delivery scan, eligible', dup: false },
  dup: { order: 'ORD-1042', amount: 40, intent: 'damaged item', policy: 'within 30 days, photo attached, eligible', dup: true },
};

// Allowed transitions. The orchestrator refuses anything not listed here.
const NEXT = {
  received: ['classified'],
  classified: ['policy'],
  policy: ['proposed'],
  proposed: ['approval', 'verified', 'resolved'],
  approval: ['verified', 'resolved'],
  verified: ['resolved'],
  resolved: [],
};
const LABEL = {
  received: 'Received', classified: 'Classified', policy: 'Policy checked', proposed: 'Action proposed',
  approval: 'Human approval', verified: 'Verified', resolved: 'Resolved',
};

function setupResolver() {
  const states = document.getElementById('states');
  if (!states) return;
  const log = document.getElementById('log');
  const stepBtn = document.getElementById('step');
  const skipBtn = document.getElementById('skip');
  const approve = document.getElementById('approve');
  const money = (n) => '$' + n.toLocaleString('en-US');

  let sc, state, visited, done;

  function write(text, kind) {
    const li = document.createElement('li');
    if (kind) li.className = kind;
    li.textContent = text;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
  }

  function render() {
    states.querySelectorAll('li').forEach((li) => {
      const s = li.dataset.s;
      li.className = s === state ? 'now' : visited.has(s) ? 'done' : '';
      if (s === 'approval' && done && !visited.has('approval')) li.className = 'skipped';
      li.setAttribute('aria-current', s === state ? 'step' : 'false');
    });
    const waiting = state === 'approval' && !visited.has('approval-decided');
    approve.hidden = !waiting;
    stepBtn.disabled = done || waiting;
    stepBtn.textContent = done ? 'Done' : 'Next step';
  }

  // A transition needs both an edge and its guard to pass.
  function guard(to) {
    if (state === 'proposed' && to === 'resolved') return sc.dup;
    if (state === 'proposed' && to === 'verified') return sc.amount <= APPROVAL_LIMIT;
    if (state === 'approval') return visited.has('approval-decided');
    return true;
  }

  function go(to) {
    if (!NEXT[state].includes(to) || !guard(to)) {
      write('Blocked: no allowed transition from ' + LABEL[state] + ' to ' + LABEL[to] + '.', 'bad');
      return;
    }
    state = to;
    visited.add(to);
    if (to === 'resolved') done = true;
  }

  function reset() {
    sc = SCENARIOS[document.querySelector('input[name="sc"]:checked').value];
    state = 'received';
    visited = new Set(['received']);
    done = false;
    log.textContent = '';
    write(sc.order + ': refund request for ' + money(sc.amount) + ' received.');
    render();
  }

  function step() {
    if (state === 'received') {
      write('Classifier agent proposes intent "' + sc.intent + '". Schema valid, accepted.');
      go('classified');
    } else if (state === 'classified') {
      write('Policy agent: ' + sc.policy + '.');
      go('policy');
    } else if (state === 'policy') {
      write('Action agent proposes: refund ' + money(sc.amount) + ' to the original card.');
      go('proposed');
    } else if (state === 'proposed') {
      if (sc.dup) {
        write('Idempotency key ' + sc.order + '-refund was already used. No second refund issued.', 'good');
        go('resolved');
      } else if (sc.amount > APPROVAL_LIMIT) {
        write('Over the ' + money(APPROVAL_LIMIT) + ' limit. Waiting for a person to approve.', 'wait');
        go('approval');
      } else {
        write('Under the approval limit. Refund posted once.');
        go('verified');
      }
    } else if (state === 'verified') {
      write('Verifier agent: amount matches the order, one refund on record. Closed.', 'good');
      go('resolved');
    }
    render();
  }

  approve.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-decide]');
    if (!b) return;
    visited.add('approval-decided');
    if (b.dataset.decide === 'yes') {
      write('Approved by a reviewer. Refund posted once.');
      go('verified');
    } else {
      write('Denied by a reviewer. No refund issued.', 'bad');
      go('resolved');
    }
    render();
    stepBtn.focus();
  });

  skipBtn.addEventListener('click', () => {
    if (done) { write('Already resolved. Nothing left to skip.'); return; }
    if (state === 'verified') { write('Nothing to skip: Resolved is already the next step.'); return; }
    write('An agent asks to jump straight to Resolved.');
    go('resolved');
    render();
  });

  stepBtn.addEventListener('click', step);
  document.querySelectorAll('input[name="sc"]').forEach((r) => r.addEventListener('change', reset));
  reset();
}

/* Entrances: each section's parts rise in once, staggered */
function setupReveals() {
  document.querySelectorAll('[data-reveal]').forEach((sec) => {
    sec.querySelectorAll('.r').forEach((n, i) => n.style.setProperty('--i', Math.min(i, 8)));
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  document.querySelectorAll('[data-reveal]').forEach((s) => io.observe(s));
}

setupResolver();
setupReveals();
