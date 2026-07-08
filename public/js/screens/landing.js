export function render(ctx) {
  const hasCode = !!ctx.code;
  const myName = (ctx.lastName || "").replace(/"/g, "&quot;");
  if (!hasCode) {
    return `
    <h1>Among Us 🚀</h1>
    <p class="sub">En la vida real</p>
    <div class="card">
      <label for="join-name">Tu nombre</label>
      <input id="join-name" maxlength="24" placeholder="Tu nombre" value="${myName}" />
      <button id="btn-create" class="warn">Crear partida (serás el anfitrión y también jugarás)</button>
    </div>
    <div class="card">
      <label for="join-code">Código de la sala</label>
      <input id="join-code" maxlength="6" placeholder="Ej. 7F3KQ" style="text-transform:uppercase" />
      <button id="btn-join" class="crew">Unirse</button>
    </div>`;
  }
  return `
    <h1>Unirse a la sala</h1>
    <div class="code-badge">${ctx.code}</div>
    <p class="sub">Escribe tu nombre para entrar</p>
    <div class="card">
      <label for="join-name">Tu nombre</label>
      <input id="join-name" maxlength="24" placeholder="Tu nombre" value="${myName}" />
      <button id="btn-join" class="crew">Entrar a la partida</button>
    </div>
    <button class="ghost" id="btn-back">← Otra sala</button>
  `;
}

export function mount(ctx) {
  const nameInput = document.getElementById("join-name");
  if (nameInput) {
    nameInput.focus();
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doJoinOrCreate(ctx);
    });
  }
  const create = document.getElementById("btn-create");
  if (create)
    create.addEventListener("click", () => doJoinOrCreate(ctx));
  const join = document.getElementById("btn-join");
  if (join) join.addEventListener("click", () => doJoinOrCreate(ctx));
  const back = document.getElementById("btn-back");
  if (back)
    back.addEventListener("click", () => {
      ctx.code = null;
      ctx.adminToken = null;
      ctx.isAdmin = false;
      history.replaceState({}, "", "/");
      window.AU.render();
    });
}

function doJoinOrCreate(ctx) {
  const nameEl = document.getElementById("join-name");
  const name = nameEl ? nameEl.value.trim() : "";
  if (!name) return window.AU.toast("Escribe tu nombre.");
  ctx.lastName = name;
  const codeEl = document.getElementById("join-code");
  const code = ctx.code || (codeEl ? codeEl.value.trim() : "");
  if (ctx.code && !codeEl) {
    // joining an existing room via URL: create not relevant
    window.AU.joinRoom(code, name);
  } else if (code) {
    window.AU.joinRoom(code, name);
  } else {
    window.AU.createRoom(name);
  }
}
