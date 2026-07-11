// Re-export from game.js to maintain backward compatibility
import * as game from "./game.js";

export async function render(ctx) {
  return game.render(ctx);
}

export function mount(ctx) {
  return game.mount(ctx);
}

export function clearRendered() {
  return game.clearRendered();
}