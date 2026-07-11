import { missionLoader } from './loader.js';

let cachedMissions = [];

export async function loadMissions() {
  if (!missionLoader.loaded) {
    await missionLoader.loadAllMissions();
  }
  return missionLoader;
}

export function renderMissionBoxes(missions) {
  cachedMissions = [];
  return missions
    .map((m, i) => {
      const mission = missionLoader.createMission(m.type || "GENERIC", { ...m });
      cachedMissions.push(mission);
      const statusClass = mission.status === "DONE" ? "done" : "pending";
      return `<div class="mission ${statusClass}" data-mission-id="${mission.id}" data-mission-index="${i}">
        <div class="meta">Misión ${i + 1} / ${missions.length}</div>
        <div class="title">${mission.escapeHtml(mission.name)}</div>
      </div>`;
    })
    .join("");
}

export function getInteractiveScreens() {
  return cachedMissions
    .map(m => m.interactiveScreen ? m.interactiveScreen() : '')
    .filter(html => html)
    .join('');
}

export function renderMissionModals() {
  return cachedMissions
    .map((mission, idx) => `
      <div class="modal hidden" id="mission-modal-${mission.id}">
        <div class="card" style="max-width:350px;position:relative">
          <button class="ghost" data-close-mission="${mission.id}" style="
            position:absolute;top:8px;right:8px;
            width:32px;height:32px;
            border-radius:50%;
            background:var(--impostor);
            color:#fff;
            font-weight:800;
            padding:0;
            line-height:32px;
          ">✕</button>
          <h3 style="margin-right:40px">${mission.escapeHtml(mission.name)}</h3>
          <div class="tiny" style="margin-bottom:8px">${mission.escapeHtml(mission.zone || 'Zona no especificada')}</div>
          <p style="font-size:0.9rem;margin:0 0 10px 0">${mission.escapeHtml(mission.desc || '')}</p>
          ${mission.renderPopupContent()}
        </div>
      </div>
    `).join('');
}

export function getCachedMissions() {
  return cachedMissions;
}

export function clearCached() {
  cachedMissions = [];
}