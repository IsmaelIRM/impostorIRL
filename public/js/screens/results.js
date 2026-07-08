export function render(ctx) {
  const room = ctx.room || {};
  const winner = ctx.winner || { team: room.winner, reason: room.winnerReason };
  const reasonText = {
    tasks: "Toda la tripulación completó sus tareas.",
    voted_out: "Todos los impostores fueron votados.",
    equality: "Los impostores igualaron o superaron a la tripulación.",
    timeout: "Se acabó el tiempo límite.",
  };
  const teamName = winner.team === "CREW" ? "TRIPULACIÓN" : "IMPOSTORES";
  const cls = winner.team === "CREW" ? "crew" : "impostor";

  const rows = (room.players || [])
    .map((p) => {
      const done = (p.missions || []).filter((m) => m.status === "DONE").length;
      const total = (p.missions || []).length;
      const role = p.role === "IMPOSTOR" ? "IMPOSTOR" : "Tripulante";
      const roleCls = p.role === "IMPOSTOR" ? "impostor" : "crew";
      return `
      <li class="${p.alive ? "" : "dead"}">
        <span>${escapeHtml(p.name)} <span class="tag ${p.role === "IMPOSTOR" ? "admin" : ""}" style="${p.role === "IMPOSTOR" ? "background:var(--impostor);color:#fff" : "background:var(--crew);color:#06243a"}">${role}</span></span>
        <span class="tag">${total ? done + "/" + total : "—"}</span>
      </li>`;
    })
    .join("");

  const adminBox = ctx.isAdmin
    ? `<div class="card admin-panel">
         <h3>⚙️ Anfitrión</h3>
         <p class="tiny">Verifica las tareas completadas en persona si hace falta.</p>
         <button class="warn" id="btn-newgame">↻ Nueva partida (mismos jugadores)</button>
       </div>`
    : "";

  return `
    <h1>Fin de la partida</h1>
    <div class="banner ${cls}">🏆 Gana: ${teamName}</div>
    <p class="sub">${reasonText[winner.reason] || ""}</p>
    <div class="card">
      <h3>Resultado</h3>
      <ul class="players">${rows}</ul>
    </div>
    ${adminBox}
    <button class="ghost" id="btn-leave">Salir</button>
  `;
}

export function mount(ctx) {
  const socket = ctx.socket;
  document.getElementById("btn-newgame")?.addEventListener("click", () => {
    if (!confirm("¿Empezar una nueva partida con los mismos jugadores?")) return;
    socket.emit("admin:newgame", { code: ctx.code, adminToken: ctx.adminToken }, () => {
      ctx.winner = null;
      ctx._vote = null;
    });
  });
  document.getElementById("btn-leave")?.addEventListener("click", () => {
    ctx.code = null;
    ctx.sessionToken = null;
    ctx.adminToken = null;
    ctx.isAdmin = false;
    history.replaceState({}, "", "/");
    window.AU.render ? window.AU.render() : location.reload();
  });
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
