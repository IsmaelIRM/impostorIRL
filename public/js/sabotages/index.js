export function renderSabotageCards(sabotages) {
  if (!sabotages || sabotages.length === 0) return '';
  return `
    <div class="card sabotage-summary">
      <h3>🚨 Sabotajes activos</h3>
      ${sabotages.map(s => `
        <div class="sabotage-card" data-sabotage-id="${s.id}" data-ends="${s.endsAt}">
          <strong>${s.type}</strong>
          <div class="sabotage-zones">
            ${s.targetZones?.length ? `Zonas: ${s.targetZones.join(', ')}` : 'Sabotaje activo'}
          </div>
          <div class="sabotage-time">
            ⏱ <span class="sab-cd">${s.endsAt ? Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000)) : '--'}</span>s
          </div>
        </div>
      `).join('')}
    </div>`;
}