export function render(ctx) {
  const players = ctx.meetingPlayers || [];
  // For UI: "skip" represents skip vote, playerId for player vote, undefined = no vote yet
  // meetingVote: undefined=none, "skip"=skip, string=playerId
  const sel = ctx._vote || ctx.meetingVote;
  const voting = ctx.meetingPhase === "voting";

  const opts = players
    .map(
      (p) => `
      <div class="vote-option ${sel === p.id ? "sel" : ""}" data-target="${p.id}">
        <span>${escapeHtml(p.name)}</span>
        <span class="vote-tag">✔</span>
      </div>`
    )
    .join("");
  const skip = `
    <div class="vote-option ${sel === "skip" ? "sel" : ""}" data-target="skip">
      <span>Saltar (no votar)</span>
      <span class="vote-tag">↺</span>
    </div>`;

  // Gather phase: meeting is open but the admin hasn't started the timed vote yet.
  if (!voting) {
    return `
      <h1>🚨 Reunión</h1>
      <p class="sub">Todos se reúnen. El anfitrión iniciará la votación.</p>
      ${
        ctx.isAdmin
          ? `<div class="card center">
               <button class="good" id="btn-start-voting">▶ Iniciar votación (empieza la cuenta atrás)</button>
             </div>`
          : `<div class="card center"><p class="countdown">Esperando al anfitrión…</p></div>`
      }
    `;
  }

  return `
    <h1>🚨 Reunión</h1>
    <p class="sub">Debate y vota. El voto se revela al final.</p>
    <div class="card center">
      <div class="countdown" id="cd">--</div>
    </div>
    <div class="card">
      <h3>Vota a un jugador</h3>
      ${opts}
      ${skip}
      <p id="vote-status" class="tiny center"></p>
    </div>
  `;
}

export function mount(ctx) {
  const socket = ctx.socket;
  const voting = ctx.meetingPhase === "voting";

  const startBtn = document.getElementById("btn-start-voting");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      socket.emit("admin:startVoting", { code: ctx.code, adminToken: ctx.adminToken });
    });
    return; // nothing else to wire in gather phase
  }

  if (!voting) return;

  // Restore vote state from server on re-render
  // meetingVote: undefined=none, "skip"=skip, string=playerId
  if (ctx.meetingVote !== undefined) {
    ctx._vote = ctx.meetingVote;
    const sel = ctx.meetingVote;
    const status = document.getElementById("vote-status");
    status.textContent = "Voto registrado. Puedes cambiarlo.";
    document.querySelectorAll(".vote-option").forEach((x) => {
      x.classList.toggle("sel", x.dataset.target === sel);
    });
  }

  document.querySelectorAll(".vote-option").forEach((el) => {
    el.addEventListener("click", () => {
      const t = el.dataset.target === "skip" ? null : el.dataset.target;
      ctx._vote = el.dataset.target;
      document
        .querySelectorAll(".vote-option")
        .forEach((x) => x.classList.toggle("sel", x === el));
      socket.emit("meeting:vote", {
        code: ctx.code,
        sessionToken: ctx.sessionToken,
        targetPlayerId: t,
      });
      document.getElementById("vote-status").textContent = "Voto registrado. Puedes cambiarlo.";
    });
  });

  // Countdown uses the server's absolute endsAt, so late joiners stay in sync.
  const endsAt = ctx.meetingEndsAt || Date.now() + 120000;
  const cd = document.getElementById("cd");
  const update = () => {
    const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    if (cd) cd.textContent = `${left}s restantes`;
  };
  update();
  const t = setInterval(update, 500);
  ctx.timers.push(t);
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
