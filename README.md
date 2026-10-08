# TrainUP Check-in QR · prototipo

> **Prototipo con datos ficticios. No contiene información real.**
> Nombres, gimnasios, correos (`@example.com`) y tokens son inventados para la demo.

Prototipo web 100 % estático (sin backend) del check-in de clientes de un gimnasio con código QR:
el cliente muestra su QR, y el admin lo escanea con la cámara del celular y ve al instante si
puede entrar.

- **Stack:** Vite + Vue 3 (`<script setup>`, JavaScript), Tailwind CSS 3, vue-router (hash),
  [`qrcode`](https://www.npmjs.com/package/qrcode) para generar y
  [`qr-scanner`](https://github.com/nimiq/qr-scanner) para leer.
- **Datos:** un seed fijo (`src/data/seed.js`) compartido por todos los dispositivos. Los
  ingresos se guardan en `localStorage` **de cada navegador**: el celular del admin solo ve
  lo que él mismo escaneó.

## Correr en local

Requiere Node 22.12+ (probado con Node 24).

```bash
npm install
npm run dev        # http://localhost:5173/trainup-checkin-prototype/
npm test           # tests de la lógica de check-in (Vitest)
npm run build      # genera dist/
```

### Probar la cámara desde un celular

Los navegadores solo permiten usar la cámara en un **contexto seguro**: `https://` o
`localhost`. Si abres `http://192.168.x.x:5173` desde el celular, `getUserMedia` no existe y
la app muestra «La cámara necesita HTTPS». Hay dos opciones:

**A. HTTPS en la red local (`@vitejs/plugin-basic-ssl`, ya incluido):**

```bash
npm run dev:https
```

Abre en el celular la URL `https://<IP-de-tu-PC>:5173/trainup-checkin-prototype/` que muestra
la terminal. El certificado es autofirmado: acepta la advertencia (en iPhone, «Mostrar
detalles» → «visitar este sitio web»; en Android, «Avanzado» → «Continuar»). La PC y el
celular deben estar en la misma red.

**B. Túnel HTTPS con Cloudflare (sin advertencias de certificado):**

```bash
npm run dev
```

```bash
cloudflared tunnel --url http://localhost:5173
```

Abre `https://<algo>.trycloudflare.com/trainup-checkin-prototype/` en el celular.
`vite.config.js` ya permite los hosts `.trycloudflare.com`.

## Desplegar

### GitHub Pages (principal)

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Haz push a `main`. El workflow `.github/workflows/deploy.yml` instala, corre los tests,
   compila y publica `dist/`.
3. La URL queda en `https://<usuario>.github.io/trainup-checkin-prototype/`.

Se usa `createWebHashHistory` (`/#/admin/105`), así que recargar cualquier ruta nunca da 404.

### Cloudflare Pages (alternativa)

Conecta el repositorio en Cloudflare Pages con esta configuración:

| Opción                 | Valor           |
| ---------------------- | --------------- |
| Build command          | `npm run build` |
| Build output directory | `dist`          |
| Variable de entorno    | `VITE_BASE=/`   |

`base` se lee de `VITE_BASE` en `vite.config.js`. Si no está definida, vale
`/trainup-checkin-prototype/`.

## Guion de demo (2 minutos)

Hacen falta dos celulares: **A** (admin) y **B** (cliente). También sirve una laptop como B.

1. **A:** abrir el link → «Soy admin» → Iron Gym / Mariana Torres → «Abrir escáner» →
   «Iniciar escáner» → permitir la cámara.
2. **B:** abrir el link → «Soy cliente» → Iron Gym / **Valentina Rojas** → «Generar mi QR».
   A lo escanea: **verde**, «Vence en 20 días».
3. Esperar más de 5 s y volver a escanear a Valentina: **ámbar**, «Ya registrado a las 7:42».
4. **B:** ir a **Ajustes → Casos de prueba** (ahí están los QR de todos) y tocar cada QR para
   agrandarlo:
   - **Andrés Pérez**: verde, «Vence hoy».
   - **Camila Méndez**: rojo, «Membresía vencida el 05/10».
   - **Luis Herrera**: rojo, «Cuenta desactivada por el gimnasio» (aunque su membresía tenga
     fecha futura).
   - **Mariana Torres** (admin): rojo, «no es cliente».
   - **Gabriel Suárez** y **Paula Ortega** (CrossBox): rojo, «no pertenece a este gimnasio».
     No se muestra ningún dato del otro gimnasio.
   - **QR ajeno** (una URL): rojo, «Código no reconocido». No se registra.
5. **A:** pestaña **Manual** → buscar «andres» → «Registrar» (respaldo sin cámara).
6. **A:** pestaña **Hoy** → lista de ingresos con hora, resultado y contadores.
7. **Ajustes → Reiniciar demo** para empezar de cero.

## Estructura

```
src/
├── api/mockApi.js            # API simulada (latencia 150–300 ms). Las vistas solo usan esto.
├── data/seed.js              # Gimnasios y usuarios ficticios (tokens fijos)
├── domain/
│   ├── checkin.js            # Lógica pura de check-in: formato QR, reglas y antirrebote
│   └── time.js               # "Hoy" y fin de día en America/Caracas
├── scanner/createScanner.js  # Adaptador: único archivo que importa qr-scanner
├── composables/              # useWakeLock, useFeedback (beep + vibración)
├── components/               # QrImage, ResultOverlay, CameraProblem, TodayPanel, ManualCheckin…
├── lib/                      # Formato de fechas/textos y helpers de QR (SVG/PNG)
├── views/                    # Home, ClientSelect, ClientPass, AdminSelect, AdminScanner, Settings
└── router.js                 # Hash history
tests/                        # Vitest: dominio y mockApi
.github/workflows/deploy.yml  # Tests + build + GitHub Pages
```

### Contrato principal

- **QR:** contiene exactamente `TU1.{checkin_token}` (token de 40 alfanuméricos). Nunca una
  URL ni el id del usuario. Cualquier otro texto da `unknown_token`.
- **`checkIn({ gymId, code, scannerId, method })`** devuelve
  `{ result, reason, member, membership_ends_at, days_left, checked_in_at, first_checkin_at }`.
  Para el respaldo manual se envía `userId` en lugar de `code` (`method: 'manual'`).
- **Reglas, en orden:** `unknown_token` (no se registra) → `not_member` (`member: null`) →
  `not_client` → `user_inactive` → `membership_expired` → `duplicate` (ventana configurable,
  60 min por defecto) → `granted`.
- **Fechas:** se guardan en ISO/UTC y se muestran en `America/Caracas`. `ends_in_days` del
  seed se convierte en el fin de ese día en Caracas: «vence hoy» permite entrar hasta las
  23:59.
- **Registro `not_member`:** se guarda con `user_id: null`, para que la tabla de un gimnasio
  nunca apunte a usuarios de otro tenant.

## Cómo portarlo a TrainUP

| Prototipo | App real (Laravel 13 + Inertia + Vue 3) |
| --- | --- |
| `mockApi.getClientQr(userId)` | `GET /{gym}/my-qr` → página Inertia del pase (props: `payload`, `user`, `membership`) |
| `mockApi.checkIn(...)` | `POST /{gym}/admin/checkin` → JSON con la misma forma de respuesta |
| `mockApi.listTodayCheckins(gymId)` | `GET /{gym}/admin/checkin` → página del escáner con los ingresos de hoy como props |
| `mockApi.searchMembers(gymId, q)` | `GET /{gym}/admin/checkin/members?q=` (o un prop parcial de Inertia) |
| `domain/checkin.js` (`evaluateCheckIn`) | `App\Services\CheckInService::check(Gym $gym, string $code, User $scanner, string $method)`, con las mismas reglas y en el mismo orden |
| `domain/time.js` | `Carbon::now('America/Caracas')` / `endOfDay()`. Idealmente, la zona sale del gimnasio |
| `parseQrPayload` / `buildQrPayload` | Métodos del servicio o un value object `CheckinCode` |
| `localStorage['trainup-demo:attendances']` | Tabla `attendances` (`gym_id`, `user_id`, `scanned_by`, `checked_in_at`, `result`, `reason`, `method`, `membership_ends_at`) con el trait `BelongsToGym` |
| `checkin_token` del seed | Columna `users.checkin_token` (40 caracteres, `Str::random(40)`, única, rotable desde el admin) |
| Ajuste «antirrebote» | `config('checkin.debounce_minutes')` o un ajuste por gimnasio |
| `tests/checkin.test.js` | Tests de Pest/PHPUnit de `CheckInService`, caso por caso |

Las vistas y componentes Vue se pueden copiar casi tal cual: solo cambian las llamadas a
`mockApi` por `router.post(...)` / `axios` y las props de Inertia. `scanner/createScanner.js`
no cambia. Para cambiar `qr-scanner` por el polyfill `barcode-detector`, basta con
reimplementar ese archivo.

En la app real, además: autorizar con policies que el admin pertenece al `{gym}`, limitar la
tasa de `POST /checkin` y no exponer nunca `checkin_token` fuera del pase del propio cliente.

## Limitaciones conocidas

- **iOS / Safari:**
  - `navigator.vibrate` no existe: en iPhone no hay vibración, solo beep.
  - La linterna (`torch`) en general no está disponible desde la web. El botón solo aparece
    si `hasFlash()` devuelve `true` (lo normal es que solo pase en Android/Chrome).
  - El audio solo suena después de un toque. Por eso el escáner arranca con el botón
    «Iniciar escáner».
  - Safari puede volver a pedir el permiso de cámara en cada visita, salvo que se marque
    «Permitir» en la configuración del sitio.
  - Screen Wake Lock requiere iOS 16.4 o posterior. En versiones anteriores, la pantalla del
    pase puede apagarse.
  - «Descargar PNG» guarda el archivo en Descargas/Archivos, no en Fotos.
- Los datos viven en el `localStorage` de cada navegador: no hay sincronización entre
  dispositivos y la ventana de antirrebote solo aplica a lo que escaneó ese mismo celular.
- El QR es estático: quien tenga una foto del QR puede usarlo. Esto se resuelve en la app
  real (fuera de alcance aquí).
