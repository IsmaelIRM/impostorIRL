# Among Us en la vida real 🚀

Web app para jugar a *Among Us en la vida real* en una fiesta (cumpleaños). **No comercial, no persistente**: todo el estado de la partida vive en la memoria del servidor. Los jugadores usan el móvil como "carta" digital: leen misiones, las marcan hechas e (impostores) eliminan/votan.

## Cómo funciona

- Un **anfitrión** crea la sala y recibe un rol y misiones como cualquier otro jugador.
- El resto se **une** con el código o el enlace.
- El anfitrión configura misiones, nº de impostores, tiempo de reunión, enfriamiento y mapa, y pulsa **Comenzar**.
- Cada jugador ve su rol (botón "Ver mi rol", se oculta solo), sus misiones y botones de **Mapa** y **Reportar cuerpo**.
- Las **reuniones** permiten votar simultáneamente; el voto se revela al final.

### Condiciones de victoria

- **Tripulación gana** si: (a) todos los tripulantes completan sus tareas, **o** (b) *todos* los impostores son votados (hay que echarlos a todos, no solo a uno).
- **Impostores ganan** si: el nº de impostores vivos ≥ tripulantes vivos, o se acaba el tiempo límite.

> Nota: un tripulante votado se vuelve **fantasma** (sigue haciendo tareas en silencio, no habla). Un impostor votado queda fuera de la partida.

## Puesta en marcha (día del evento)

### Opción A — Docker (recomendado)

```bash
docker compose up -d --build
```

El servidor escucha en el puerto `3000`.

### Opción B — Node directo

```bash
npm install
npm start
```

### Exponerlo a invitados por Internet

Los enlaces de unión y de anfitrión se generan **automáticamente** a partir de la URL por la que entran los jugadores, así que funciona igual con **ngrok**, **Duck DNS** o **Cloudflare Tunnel** sin tocar código.

- **ngrok** (más simple, URL cambia al reiniciar):
  ```bash
  ngrok http 3000
  ```
  Comparte la URL `https://xxxx.ngrok.io` que te da ngrok.
- **Duck DNS + redirección de puerto** (URL estable, gratis): apunta un subdominio `*.duckdns.org` a tu IP pública y abre el puerto 80/443 → 3000 en el router. Opcionalmente, pon tu URL en `PUBLIC_BASE_URL` en `docker-compose.yml` si tu proxy no reenvía bien el `Host`.
- **Cloudflare Tunnel** (recomendado: sin IP pública ni abrir puertos en el router): ver abajo.

### Exponerlo con Cloudflare Tunnel

`docker-compose.yml` ya incluye un contenedor `cloudflared` que crea un túnel hacia tu app. Hay dos modos:

**Modo rápido (sin configurar nada):** simplemente
```bash
docker compose up -d
docker compose logs -f cloudflared
```
y copia la URL `https://xxxx.trycloudflare.com` que aparece en los logs. Listo para compartir. (La URL cambia si reinicias.)

**Modo estable con tu propio dominio:** crea un túnel en Cloudflare y usa su token. Pasos para obtener el token:

1. **Ten un dominio gestionado por Cloudflare** (puedes usar un dominio que ya tengas; el túnel solo necesita un subdominio).
2. **Instala `cloudflared`** en tu ordenador (desde https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
3. **Inicia sesión** (abre el navegador y elige tu dominio):
   ```bash
   cloudflared login
   ```
4. **Crea el túnel** (el nombre es el que quieras, p.ej. `amongus`):
   ```bash
   cloudflared tunnel create amongus
   ```
   Esto registra el túnel en tu cuenta y te muestra su ID.
5. **Consigue el token** que usa el contenedor. Ejecuta:
   ```bash
   cloudflared tunnel token amongus
   ```
   Imprime una cadena larga (JWT). **Cópiala.**
6. **Enlaza un subdominio al túnel** (una sola vez), por ejemplo `amongus.tudominio.com`:
   ```bash
   cloudflared tunnel route dns amongus amongus.tudominio.com
   ```
   (O créalo manualmente en el panel de Cloudflare: un registro CNAME `amongus` → `<ID-del-túnel>.cfargotunnel.com`.)
 7. **Usa el token en `docker-compose.yml`.** El servicio `cloudflared` trae por defecto el *quick tunnel*. Para usar tu dominio:
    - Comenta la línea `command: ["tunnel", "--url", ...]` (quick tunnel).
    - Descomenta la línea `command: ["tunnel", "run", "--token", "${CF_TOKEN}"]`.
    - Pon el token en un archivo `.env` (copia `.env.example`): `CF_TOKEN=aqui-el-token-largo`
      o pásalo al arrancar: `CF_TOKEN=aqui-el-token-largo docker compose up -d`.
 8. Arranca:
    ```bash
    docker compose up -d
    ```
    Con el token activo, tu URL estable será `https://amongus.tudominio.com`.

> Nota: el contenedor `amongus` sigue publicando el puerto `3000` para acceso local/LAN; es opcional cuando usas el túnel.

## Subir el mapa

El anfitrión puede subir un PNG (máx. 5 MB) o pegar una URL en el panel de anfitrión. Hay un `public/maps/placeholder.png` por defecto que puedes sustituir.

## Notas / límites

- Si reinicias el contenedor/servidor **se pierden las partidas en curso** (todo en memoria). No reinicies a mitad de juego.
- Si el móvil se queda sin batería o se pierde la conexión, el jugador se restaura al volver (el `sessionToken` va en la URL y en `localStorage`).
- El sonido de alarma necesita un toque en pantalla la primera vez (política de autoplay móvil): toca la pantalla al unirte.
- Confianza: los roles solo se envían al socket del dueño; pensado para una fiesta tranquila, no es a prueba de trampas.

## Documentación técnica

Ver [ROADMAP_AND_ARCHITECTURE.md](ROADMAP_AND_ARCHITECTURE.md) para detalles de arquitectura y plan de desarrollo.

### Estructura del proyecto

```
amongus/
├── server.js           # Servidor Express + Socket.IO
├── src/
│   ├── rooms.js        # Gestión de salas, jugadores y vistas
│   ├── cards.js        # Asignación de roles y misiones
│   └── win.js          # Condiciones de victoria
├── public/
│   ├── index.html      # Entrada HTML
│   ├── css/styles.css  # Estilos
│   ├── js/
│   │   ├── app.js      # App principal, sockets, router
│   │   ├── qrcode.min.js  # Librería QRCode.js
│   │   └── screens/    # Vistas: landing, lobby, player, meeting, results
│   └── maps/           # Imágenes de mapa
├── Dockerfile
└── docker-compose.yml
```

### Eventos Socket.IO (API)

| Evento | Dirección | Payload |
|--------|-----------|---------|
| `room:create` | cliente → servidor | `{hostName}` |
| `room:join` | cliente → servidor | `{code, name, sessionToken?}` |
| `lobby:update` | servidor → sala | Estado lobby (sin roles) |
| `game:started` | servidor → jugador (privado) | Rol, misiones, cardId |
| `room:state` | servidor → jugador (privado) | Estado personalizado con misiones |
| `task:toggle` | cliente → servidor | `{missionId}` |
| `task:progress` | servidor → admin | `{playerId, done, total}` |
| `impostor:kill` | cliente → servidor | `{targetPlayerId}` |
| `meeting:report` | cliente → servidor | `{sessionToken}` |
| `meeting:start` | servidor → sala | `{alivePlayers, phase, endsAt}` |
| `admin:startVoting` | admin → servidor | Inicia votación |
| `meeting:vote` | cliente → servidor | `{targetPlayerId}` |
| `meeting:resolve` | servidor → sala | Resultado de votación |
| `game:won` | servidor → sala | `{team, reason}` |
| `game:alarm` | servidor → sala | Sonido alarma (victoria tripulación) |
| `player:killed` | servidor → sala | `{victimId, victimName}` |
| `admin:reset` | admin → servidor | Reinicia sala |
| `admin:newgame` | admin → servidor | Nueva partida misma sala |

### Reglas de juego

- **Misiones**: Cada tripulante recibe 5 misiones consecutivas (wrap-around) de la lista compartida.
- **Impostores**: Reciben un subconjunto aleatorio de misiones como cobertura.
- **Eliminación**: Tripulante votado → fantasma (puede seguir misiones). Impostor votado → eliminado.
- **Victoria tripulación**: (a) todas las misiones completadas, o (b) todos los impostores eliminados.
- **Victoria impostores**: impostores vivos ≥ tripulantes vivos, o timeout.
- **Umbral de votación**: necesario >40% de votos para eliminar.

## Características recientes

### Botón QR para compartir
En la sala, el botón **"📱 QR para compartir"** genera un código QR con el enlace de unión. El QR se muestra en un modal oscuro con borde blanco para facilitar la lectura en móviles.

### Alarma al iniciar reunión
Cuando un jugador reporta un cuerpo, suena una alarma sonora para alertar a todos los jugadores antes de que el anfitrión inicie la votación. Esto indica que hay una reunión pendiente.
