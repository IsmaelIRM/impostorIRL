# Among Us Real Life — Plan de Reescritura Arquitectónica

**Decisión del usuario**: migrar a **React + NestJS GraphQL subscriptions**. Los módulos de misión deben ser **descargables** (solo copiar carpeta) y **compilados on-the-fly con ts-node**. Cada módulo TS usa decorador `@Mission()`.

---

## Arquitectura objetivo

```
src/
  missions/
    draw/              # Misión Dibujar
      index.ts         # @Mission() export
    brick/             # Misión Ladrillo
      index.ts
    basket/
      index.ts
    nerf/
      index.ts
    photo/
      index.ts
    pool/
      index.ts
  templates/           # Plantillas predefinidas
    default.json
    horror-mansion.json
  server.ts            # NestJS bootstrap
  app.module.ts
  mission/
    mission.module.ts
    mission.loader.ts  # Escanea src/missions/ y registra resolvers dinámicamente
    mission.resolver.ts # GraphQL resolvers genéricos + union types
public/
  src/
    graphql/
      client.ts
    components/
      MissionPopup.tsx   # Renderiza HTML embebido del manifest
    hooks/
      useMission.ts
```

## Contrato del módulo (TS)

Cada archivo `src/missions/<mod>/index.ts` exporta una clase con:

**Misiones individuales (scope: "individual"):**
```ts
@Mission({ id: "draw", name: "Dibujar", isInteractive: true, scope: "individual" })
export class DrawMission {
  static version = "1.0.0";
  static apiVersion = "1.0.0";
  
  // Metadatos para admin UI
  manifest: {
    description: string;
    schema: JSON;      // para generar formulario de config
    default: any;      // valores por defecto
  }
  
  // Asignar dato único al jugador (ej: timestamp límite, UUID)
  // Llamado durante adminStart para generar `assigned` field
  assign(player: Player, mission: Mission): AssignedMission {
    return {
      playerId: player.id,
      targetId: null,
      deadline: Date.now() + 300000,  // 5 min deadline
      uuid: crypto.randomUUID()         // ID único para validación
    };
  }
  
  // Popup HTML - renderizado en MissionPopup.tsx
  renderPopup(player: Player, assigned: AssignedMission, room: Room): string {
    return `<div>Completa para ${player.name}: <canvas id="draw-${assigned.uuid}"></canvas></div>`;
  }
  
  // Verificar completado (opcional)
  validate?(data: any): boolean { ... }
}
```

**Misiones individuales como sabotaje (scope: "individual", isSabotage: true):**
```ts
@Mission({ id: "poison", isInteractive: true, scope: "individual", endsGame: true, isSabotage: true })
export class PoisonSabotage {
  // onActivate: NO se usa (es individual)
  // Activado vía activateSabotage(targetId) desde impostor
  
  onProgress(ctx: SabotageContext, room: Room, player: Player, data: any): SabotageState {
    // Validar antídoto, actualizar cooldown impostor
    return { active: false, progress: { resolved: true, healed: true } };
  }
  
  // Timeout → playerDied subscription, alive: false
}
```

**Sabotajes globales (scope: "global"):**
- Solo 1 activo a la vez por sala.
- Cooldown compartido entre todos los impostores.
- `endsGame: true` → victoria impostor si timeout sin resolverse.
```ts
@Mission({ id: "sabotage-nfc", isInteractive: true, scope: "global", endsGame: true })
export class SabotageNFC {
  static version = "1.0.0";
  static apiVersion = "1.0.0";
  
  manifest: { description: string; schema: JSON; default: any; }
  
  // Activar sabotaje - devuelve estado inicial
  onActivate?(ctx: SabotageContext, room: Room, mission: Mission): SabotageState {
    return { active: true, endsAt: Date.now() + 300000, progress: {} };
  }
  
  // Validar resolución - data arbitrario desde cliente
  onProgress?(ctx: SabotageContext, room: Room, player: Player, data: any): SabotageState {
    // Cada mod define su lógica (timestamps, fotos, etc.)
    // Actualiza progress y devuelve nuevo estado
    // Si está resuelto: { active: false, progress: { resolved: true } }
  }
  
// Popup HTML para sabotaje (progreso visible a todos)
    renderPopup(assigned: any): string { ... }
    
    // Opcional: notificación personalizada al ganar (llamado una vez al final)
    onWin?(ctx: MissionContext, room: Room, winner: "CREW" | "IMPOSTOR"): string // customMessage
  }
  ```

**MissionContext**: `{ roomCode: string, redis: RedisClient }` disponible en hooks.

**SabotageContext**: `{ cooldowns: Map<string, number>, resolutions: Map<string, any> }` para sincronización entre jugadores. cooldowns guarda timestamp de próximo uso; resolutions almacena datos arbitrarios de resolución.

**Validación**: El admin UI genera formularios a partir del `schema`. Al guardar plantilla, el `config` se valida. Si el módulo falta, el admin UI **bloquea** y muestra el error.

## Modelo de datos GraphQL

```graphql
type Mission {
   id: ID!
   name: String!
   zone: Int                 # ubicación (heredado de template, opcional)
   description: String
   config: JSON
   assigned: JSON          # datos únicos: {targetId?, timestamp?, imageData?}
   status: MissionStatus!
   isSabotage: Boolean     # true = es sabotaje individual
   endsGame: Boolean!      # true = puede terminar partida
   weight: Int!            # puntos de esta misión
  }

type ActiveSabotage {
  missionId: ID!
  missionType: String!
  targetId: ID            # jugador objetivo (solo sabotajes individuales)
  activatedAt: Float!
  endsAt: Float
  progress: JSON
}

type Template {
  id: ID!
  name: String!
  numImpostors: Int
  meetingSec: Int
  initialKillCooldownSec: Int   # cooldown al empezar partida
  killCooldownSec: Int          # cooldown después de cada kill
  timeLimitSec: Int
  sabotageCooldownSec: Int
  missionPointsTarget: Int      # puntos necesarios para ganar (ej: 10)
  mapImageUrl: String
  sabotages: [SabotageType!]
  missions: [MissionTemplateInput!]  # misión + config opcional
}

type MissionTemplateInput {
   missionId: ID!         # referencia a módulo existente
   zone: Int              # ubicación numérica en mapa (1, 2, 3...)
   weight: Int            # override opcional (default: del módulo)
   config: JSON           # override opcional
   metadata: JSON         # datos extra para el admin (ej: {objetos: ["Manzana"]})
  }

## Sistema de puntos y misiones

- Cada misión en template tiene `weight` (1, 2 o 3 puntos)
- `missionPointsTarget` en template: puntos totales necesarios para victoria CREW
- Al completar `toggleTask()`, se suman puntos acumulados
- El server calcula: `sum(weights) >= missionPointsTarget` → victoria CREW
- Misiones asignadas aleatoriamente hasta alcanzar objetivo de puntos

type Room {
  code: String!
  status: RoomStatus!
  templateId: String       # referencia a plantilla usada
  missions: [Mission!]!
  players: [Player!]!
  activeSabotages: [ActiveSabotage!]
  meeting: Meeting
}

type Meeting {
  id: ID!
  startedAt: Float!
  endsAt: Float!
  votes: [Vote!]
}

type Vote {
  playerId: ID!
  targetId: ID
}

type VoteResult {
  ejected: Player
  votes: Int!
  totalPlayers: Int!
}

type GameOver {
  winner: String!        # CREW o IMPOSTOR
  reason: String!        # timeLimit, sabotage, allImpostorsEjected, missionsComplete
  customMessage: String   # desde onWin hook
}

type Player {
  id: ID!
  name: String!
  isAdmin: Boolean!
  sessionToken: String!
  socketId: String
  connected: Boolean!
  alive: Boolean!
  role: Role!
  cardId: Int
  initialKillCooldownUntil: Float   # cooldown inicial al empezar partida
  killCooldownUntil: Float        # cooldown después de cada kill
  missions: [Mission!]!
}

enum Role { CREW IMPOSTOR }
enum MissionStatus { PENDING DONE }
enum RoomStatus { LOBBY RUNNING MEETING ENDED }
enum SabotageType { NFC OXYGEN REACTOR }
```

## Queries/Mutations/Subscriptions

```graphql
type Query {
  me: Player!
  room(code: String!): Room
  missions: [MissionMetadata!]!
  templates: [Template!]!
}

type MissionMetadata {
   id: ID!
   name: String!
   isInteractive: Boolean!
   scope: String!
   endsGame: Boolean!       # true = sabotaje que puede terminar partida
   weight: Int!             # puntos por defecto del módulo
   version: String!
   apiVersion: String!
   description: String
   schema: JSON
 }

type Mutation {
   createRoom(name: String!, templateId: String): Room!
   joinRoom(code: String!, name: String!): Player!
   renamePlayer(name: String!): Player!
   reportBody: Meeting!            # Body report automático → meeting
   endMeeting: Room!               # Finaliza meeting después de votesSec o expulsión
   toggleTask(missionId: ID!): Mission!
   activateSabotage(missionId: ID!, targetId: ID): ActiveSabotage!  # targetId opcional para sabotajes individuales
   resolveSabotage(data: JSON!): Boolean!
   startMeeting: Meeting!
   vote(targetId: ID): VoteResult!
   eliminatePlayer(targetId: ID!): Player!   # Kill manual impostor
   revivePlayer(targetId: ID!): Player!       # Admin: revivir jugador muerto
   adminConfigure(input: AdminConfig!): Room!
   adminStart: Room!
   adminReset: Boolean!
  }

input AdminConfig {
   templateId: String
   numImpostors: Int
   meetingSec: Int
   initialKillCooldownSec: Int   # cooldown al empezar partida
   killCooldownSec: Int          # cooldown después de cada kill
   timeLimitSec: Int
   sabotageCooldownSec: Int
   missionPointsTarget: Int      # puntos objetivo (sobrescribe template)
   mapImageUrl: String
   sabotages: [SabotageType!]
   missions: [MissionTemplateInput!]
 }

type Subscription {
   roomUpdated(code: String!): Room!
   sabotageActivated(code: String!): ActiveSabotage!
   sabotageProgress(code: String!): ActiveSabotage!
   meetingStarted(code: String!): Meeting!
   meetingEnded(code: String!): Room!        # Meeting finalizado, room vuelve a RUNNING
   gameOver(code: String!): GameOver!
   playerDied(code: String!): Player!       # Jugador muerto por sabotaje individual
  }
```

## @Mission() decorator
```ts
export function Mission(options: { 
   id: string; 
   name?: string; 
   isInteractive: boolean; 
   scope?: 'individual'|'global';
   endsGame?: boolean;    // true = puede terminar partida (sabotaje)
   weight?: number;       // default: 1, puntos del módulo
 }) {
   return function(constructor: Function) {
     constructor.prototype._missionMeta = options;
   }
 }
```

## Sistema de puntos detallado

- Módulo define `weight?: number` (default: 1)
- Template override opcional en MissionTemplateInput
- Asignación aleatoria en `adminStart`:
  - Objetivo: sum(weights) >= missionPointsTarget
  - Si template insuficiente: error "No hay suficientes misiones para alcanzar objetivo"
  - Si excede objetivo: reduce última misión (p. ej. weight 3→1) o elimina
- `toggleTask()`: suma weight al completar, emite `roomUpdated`
- Subscription `playerDied` notifica cuando jugador muere por sabotaje individual
- Cada instancia de misión genera `missionId` único: `<moduleId>_<uuid>` (ej: "draw_a1b2c3d4")

## Mutations REST (ZIP upload)

```ts
// POST /api/modules
// Body: multipart form con file: ZIP
// Response: { success: true, metadata: MissionMetadata } | { error: string }
```

## Validación ZIP

```ts
// apps/server/src/mission/mission.loader.ts
@Injectable()
export class MissionLoader {
  private registry = new Map<string, MissionDefinition>();

  async loadAll() {
    const files = await glob("src/missions/*/index.ts");
    for (const file of files) {
      const mod = await import(file);
      const MissionClass = mod.default || Object.values(mod).find(c => c.version);
      if (MissionClass) {
        this.registry.set(MissionClass.id, MissionClass);
      }
    }
  }

  get(id: string): MissionDefinition | undefined { ... }
  list(): MissionMetadata[] { ... }
  register(mod: MissionDefinition) { ... }  // para ZIP upload
}
```

## ZIP upload validation flow

1. Endpoint `POST /api/modules` acepta multipart ZIP.
2. Validador extrae y busca `index.ts`.
3. Compila con `ts-node` en sandbox.
4. Verifica `@Mission()` decorator existe, `apiVersion` compatible.
5. Si OK: registra en registry, persiste a disco, devuelve metadata.
6. Si falla: 400 error detallado.

El `sessionToken` se guarda en localStorage y se envía implícitamente con cada request (via header o context). Permite renombrado y reconexión.

## Lógica de roles y flujo de juego

- **Admin**: único, es quien crea la sala. Se guarda `isAdmin: true` en el player.
- **Admin como jugador**: el admin elige si juega (rol aleatorio) + tiene poderes extra (startMeeting, adminReset).
- **Poderes admin**: expulsar jugador (confirmación), revivir jugador muerto, forzar fin de sabotaje, iniciar reuniones. Botón opcional "Ver spoilers" para ver estado completo si es necesario.
- **Roles**: asignados aleatoriamente al ejecutar `adminStart`, según `numImpostors` de la plantilla.
- **sessionToken**: UUID generado al crear/join, persistido en localStorage, usado para reconexión.
- **Reconexión**: el jugador mantiene estado completo. Sin timeout - siempre disponible para reconectar.
- **Visibilidad**: los impostores ven quién está vivo/muerto; los crewmates solo ven sus compañeros vivos.
- **Body report**: cualquier jugador vivo puede reportar cuerpo → inicia meeting automáticamente.
- **Kill cooldown**: al iniciar partida, impostores tienen `initialKillCooldownSec` antes del primer kill. Después de cada kill, se activa `killCooldownSec`.

## Fase 0 — Setup nuevo monorepo (proyecto limpio)

Proyecto `amongus-next/` desde cero.

### Pasos:

1. **Inicializar**
   - `pnpm init` raíz → workspaces `["apps/*"]`
   - Crear `apps/server/` y `apps/web/`

2. **Server dependencias**
   - `@nestjs/*`, `@nestjs/graphql`, `@nestjs/websockets`, `graphql-ws`, `ioredis`, `fast-glob`, `ts-node`

3. **Web dependencias**
   - `react`, `@apollo/client`, `graphql`, `vite`

4. **Crear archivos base**
   - `apps/server/src/main.ts` → bootstrap
   - `apps/server/src/app.module.ts` → root module
   - `apps/web/src/main.tsx` → React entry
   - `apps/web/src/App.tsx` → router básico

5. **Redis adapter**
    - Configurar `ioredis` para pub/sub de subscriptions
    - Adaptador para rooms state (custom o socket.io-redis adapter)

## Fase 1 — Modloader + scope global

1. `MissionLoader` escanear `src/missions/*/index.ts` con fast-glob.
2. `ts-node/register` para compilar (dev/test).
3. Cada mod exporta `scope: 'individual'|'global'` y `weight?: number`.
4. `mission.resolver.ts`: `missions` query incluye `scope` y `weight`.
5. Admin UI bloquea si módulo falta; muestra `necesita mod draw@1.0.0`.
6. Schema JSON genera formularios automáticamente.
7. `adminStart` mutation:
   - Crea instancias de misiones con `missionId` único
   - Misiones individuales: se asignan a jugadores (1 misión = 1 jugador), jugadores pueden tener múltiples misiones
   - Misiones globales: visibles para todos, `assigned` vacío
   - Llama `mod.assign(player, mission)` para generar datos únicos (timestamps, UUIDs)
   - Guarda en Redis: `rooms:{code}:missions` con estado PENDING
   - Notifica via `roomUpdated` subscription

## Fase 2 — Implementación de módulos (posterior)

NOTA: Las misiones específicas pueden implementarse después del framework. En esta fase se implementan:
- `draw`, `brick`, `basket`, `nerf`, `photo`, `pool` módulos individuales
- `sabotage-nfc`, `sabotage-core` módulos globales

Cada módulo: `src/missions/<id>/index.ts` con `@Mission()` decorator.

`MissionPopup.tsx` maneja ambos scopes. Los globales muestran progreso de sala.

## Fase 3 — Admin UI sections (3.b)

- Pestañas: Plantillas, Misiones, Sabotajes, Tiempos.
- Misión dropdown filtra por `scope`.
- Schema genera inputs automáticos.
- Tiempos configurables sin hardcodeo.

## Fase 4 — Lógica sabotaje + victorias

**Sabotajes globales (scope: "global", endsGame: true):**
- Solo 1 activo a la vez por sala (lock por mutex en Redis).
- Cooldown compartido entre impostores.
- Timeout → victoria IMPOSTOR.
- Resuelto → quita sabotaje activo.

**Sabotajes individuales (scope: "individual", endsGame: true):**
- Cada impostor puede asignar sabotaje a jugador específico.
- No bloquean otros sabotajes.
- Timeout → jugador muere, notifica con `playerDied`, room status queda RUNNING.
- Resuelto → jugador curado (alive: true).

**Time limit timer:**
- Background job cada 30s verifica `timeLimitSec` en Redis.
- Si expira: `endGame("IMPOSTOR", "timeLimit")`.

**onWin hook:**
- Llamado al final de partida con winner determinado.
- Devuelve `customMessage` opcional para GameOver.

- `activateSabotage(targetId?)`: targetId opcional para sabotajes individuales.
- `resolveSabotage(data)`: el mod valida datos arbitrarios.
- `endGame(team, reason)`: centraliza victorias, llama `onWin()` hooks, notifica sonoro + popup + redirección.

## Fase 4.b — Lógica de votación/meeting

- `reportBody`: cualquier jugador vivo reporta cuerpo → status `MEETING`, inicia cronómetro `meetingSec`.
- `vote(targetId)`: jugadores emiten voto durante `meetingSec`.
- Automático `endMeeting` al expirar `meetingSec` o cuando todos voto.
- Mayoría → expulsa; empate → nadie expulsado.
- `endMeeting`: notifica con `meetingEnded`, room status vuelve a `RUNNING`.
- Si jugador expulsado está vivo → `alive: false` (muerto x meeting).

## Riesgos arquitectónicos

- **ts-node in prod**: solución: bundle con esbuild que incluye módulos + metadata estático.
- **Security**: los módulos TS pueden ejecutar código arbitrario. Solución: sandbox (worker thread/vm2) para `onProgress` y `assign`, o limitar a HTML estático.
- **Subscriptions scaling**: room-scoped subscriptions.

## Integración con módulos externos

- Un módulo externo se instala vía endpoint `POST /api/modules` (ZIP upload) o copiando a `src/missions/`.
- El server descomprime el ZIP, compila con ts-node/register y registra el módulo.
- Si una plantilla referencia un módulo faltante, el admin UI **bloquea**.

## Persistencia (Redis inmediata + pub-sub)

```ts
// Keys estructura
// rooms:{code} → hash con status, config básica
// rooms:{code}:players → hash {playerId → serialized Player}
// rooms:{code}:missions → hash {missionId → serialized Mission}
// rooms:{code}:sabotages → hash {sabotageId → serialized ActiveSabotage}

// Pub/Sub para subscriptions multi-server
// channel: room:{code} → roomUpdated
// channel: sabotage:{room}:{sabotageId} → sabotageProgress
```

- Cada mutación actualiza Redis inmediatamente.
- Las subscriptions usan Redis pub/sub para escalado horizontal.
- TTL 24h en rooms borrados (cleanup automático).
- Templates en sistema de archivos (no en Redis).

## Docker Deployment

```
apps/server/
  Dockerfile
  docker-compose.yml
```

**Dockerfile**:
- Base `node:alpine` con ts-node y redis client.
- Volume `./templates:/app/templates` editable.
- Volume `./uploads:/app/public/uploads` para mapas.
- Endpoint `/api/modules` para upload ZIP.

**docker-compose.yml**:
- Servicio `server`, `redis`, `web` (Nginx estático).
- Healthcheck en `/health`.
- Volumen `redis-data` para persistir rooms si se quiere.

## Template JSON Example

```json
{
  "id": "default",
  "name": "Default Game",
  "numImpostors": 1,
  "meetingSec": 60,
  "initialKillCooldownSec": 30,
  "killCooldownSec": 45,
  "timeLimitSec": 600,
  "sabotageCooldownSec": 120,
  "missionPointsTarget": 10,
  "mapImageUrl": "/uploads/default-map.png",
  "sabotages": ["NFC"],
  "missions": [
    {"missionId": "draw", "zone": 1, "weight": 1, "metadata": {"Objetos": ["Manzana", "Pera"]}},
    {"missionId": "brick", "zone": 2, "weight": 2, "metadata": {"Colores": ["Azul"]}},
    {"missionId": "photo", "zone": 2 c, "weight": 1, "metadata": {}}
  ]
}
```

## Validación

- Escaneo de `src/missions/` carga N misiones sin reiniciar (dev mode).
- Plantilla persiste a `templates/<id>.json` editable; al arrancar aparece en selector.
- Cada popup se abre desde Player.tsx con los datos asignados correctos.
- Sabotaje: activa alarma, timer, victoria IMPOSTOR/sabotage.

## Preguntas abiertas

- ~~Zona de la misión Nerf~~ → **Resuelto**: la zona es visual, configurable por admin en el mapa. El mod Nerf no necesita coordenadas técnicas; renderiza popup simple.