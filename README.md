# OBD COOL

**Diagnóstico automotriz OBD-II gratuito, en español y sin cuentas.**

OBD COOL se conecta a un adaptador ELM327 por Bluetooth, lee los códigos de avería (DTC), muestra sensores en vivo, interpreta los fallos según la marca y el modelo, y enlaza cada diagnóstico con manuales y vídeos de [iFixit](https://es.ifixit.com/Device/Car_and_Truck).

![Licencia MIT](https://img.shields.io/badge/licencia-MIT-22d3b6)
![React 19](https://img.shields.io/badge/React-19-61dafb)
![Vite 8](https://img.shields.io/badge/Vite-8-646cff)
![PWA](https://img.shields.io/badge/PWA-instalable-ff7a18)

---

## Qué puedes hacer

- **Leer códigos DTC** almacenados, pendientes y permanentes (`03`, `07`, `0A`).
- **Entender cada código** con descripción, síntomas, causas, comprobaciones y notas específicas por marca y modelo.
- **Ver sensores en vivo** (RPM, temperatura, MAF, MAP, ajustes de combustible, voltaje…) con histórico y valores fuera de rango.
- **Diagnosticar** combinando códigos, sensores, fotograma congelado y síntomas. El motor local de reglas funciona sin internet.
- **Pedir una segunda opinión con IA** usando Gemini a través de un Worker gratuito de Cloudflare.
- **Borrar códigos** con confirmación y advertencias de seguridad.
- **Reparar** con guías paso a paso y búsquedas dirigidas a iFixit para el componente exacto.
- **Configurar el vehículo** por marca, modelo, año y VIN (con decodificador orientativo).
- **Usar la app sin coche** gracias al modo simulador integrado.
- **Instalarla como PWA** en el móvil o el escritorio.

> La IA es opcional. Si el Worker no está configurado, falla o supera su cuota gratuita, OBD COOL muestra automáticamente el análisis local.

---

## Compatibilidad Bluetooth

| Plataforma | Bluetooth Low Energy (BLE) | Bluetooth clásico / SPP | Notas |
| --- | --- | --- | --- |
| Chrome / Edge en Windows, macOS, Linux | Sí (Web Bluetooth) | No | El navegador pide seleccionar el dispositivo. |
| Chrome en Android | Sí (Web Bluetooth) | No | Requiere HTTPS o `localhost`. |
| App Android (Capacitor) | Sí (BLE nativo) | **Sí** | La mayoría de ELM327 baratos usan SPP. |
| iPhone / iPad | Solo en la app nativa | No | Safari no implementa Web Bluetooth. |

La app detecta la plataforma y muestra solo los modos disponibles. En Android nativo conviene probar primero **Bluetooth clásico (SPP)** si el adaptador es un ELM327 genérico.

---

## Inicio rápido

Requisitos: **Node.js 22 o superior** y npm.

```bash
git clone https://github.com/TU-USUARIO/obd-cool.git
cd obd-cool
npm install
npm run dev
```

Abre `http://localhost:5173`. Para probar sin vehículo:

1. Pulsa **Conectar**.
2. Elige **Simulador**.
3. Pulsa **Conectar** y después **Leer códigos**.

El simulador representa un Toyota Corolla 2005 con los códigos `P0300`, `P0171`, `P0301` y `P0420`, además de sensores que cambian con el tiempo.

### Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Typecheck, build de producción, PWA y `404.html`. |
| `npm run preview` | Sirve el build de producción. |
| `npm test` | Ejecuta las pruebas con Vitest. |
| `npm run test:watch` | Pruebas en modo vigilancia. |
| `npm run typecheck` | Comprueba TypeScript del frontend. |
| `npm run typecheck:worker` | Comprueba TypeScript del Worker. |
| `npm run check` | Typecheck + pruebas + build. |
| `npm run lint` | Análisis estático con oxlint. |
| `npm run worker:dev` | Worker de IA en local (`http://127.0.0.1:8787`). |
| `npm run worker:deploy` | Despliega el Worker en Cloudflare. |
| `npm run cap:sync` | Sincroniza el build con los proyectos nativos. |
| `npm run cap:android` | Añade la plataforma Android. |
| `npm run android:open` | Abre el proyecto en Android Studio. |

---

## Variables de entorno

Copia `.env.example` a `.env` para desarrollo local.

### Frontend

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `VITE_AI_ENDPOINT` | `/api/diagnose` | URL del Worker de IA. |
| `VITE_IFIX_BASE_URL` | `https://es.ifixit.com/Device/Car_and_Truck` | Portal de reparación. |
| `VITE_APP_NAME` | `OBD COOL` | Nombre visible. |
| `VITE_BASE` | `/` | Ruta base del build (GitHub Pages usa `/<repo>/`). |

En desarrollo, Vite redirige `/api` a `http://127.0.0.1:8787` automáticamente.

### Worker (solo backend)

| Variable | Uso |
| --- | --- |
| `GEMINI_API_KEY` | Secreto con la clave de Google AI Studio. **Nunca** va en el frontend. |
| `GEMINI_MODEL` | Modelo de Gemini (por defecto `gemini-2.5-flash`). |
| `ALLOWED_ORIGINS` | Orígenes permitidos por CORS, separados por comas. |
| `RATE_LIMIT_PER_MINUTE` | Límite de peticiones por IP y minuto. |

---

## IA gratuita con Gemini

El frontend llama a un Worker que guarda la clave de Gemini y aplica CORS, validación y límite de peticiones. Así la clave nunca llega al navegador.

1. Crea una clave gratuita en [Google AI Studio](https://aistudio.google.com/apikey).
2. Inicia sesión en Cloudflare:

   ```bash
   npx wrangler login
   ```

3. Guarda la clave como secreto:

   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```

4. Ajusta `ALLOWED_ORIGINS` en `wrangler.jsonc` con tu origen real, por ejemplo:

   ```jsonc
   "ALLOWED_ORIGINS": "https://tu-usuario.github.io,http://localhost:5173"
   ```

5. Despliega:

   ```bash
   npm run worker:deploy
   ```

6. Copia la URL del Worker en `.env` y en las variables del build:

   ```env
   VITE_AI_ENDPOINT=https://obd-cool-ai.TU-SUBDOMINIO.workers.dev/api/diagnose
   ```

Comprueba que responde:

```bash
curl https://obd-cool-ai.TU-SUBDOMINIO.workers.dev/api/health
```

**Privacidad:** el VIN completo nunca se envía a la IA. Solo se envían marca, modelo, año, motor, códigos, síntomas, sensores y fotograma congelado.

---

## Despliegue en GitHub Pages

El repositorio incluye dos workflows:

- `.github/workflows/ci.yml`: typecheck, pruebas, lint y build en cada push y pull request.
- `.github/workflows/pages.yml`: publica `dist/` en GitHub Pages al hacer push a `main`.

Pasos:

1. Sube el repositorio a GitHub.
2. Entra en **Settings → Pages** y elige **GitHub Actions** como fuente.
3. En **Settings → Secrets and variables → Actions → Variables**, añade `VITE_AI_ENDPOINT` si vas a usar la IA.
4. Haz push a `main`. El workflow construye con la ruta base correcta y publica la app.

El script `scripts/postbuild.mjs` copia `index.html` a `404.html` para que las rutas de la PWA funcionen al recargar.

> Sin el Worker configurado la web funciona igualmente: el diagnóstico local y las guías de reparación no dependen de la IA.

---

## App Android e iOS con Capacitor

La web se empaqueta con [Capacitor](https://capacitorjs.com/). La app Android añade BLE nativo y **Bluetooth clásico SPP**, imprescindible para muchos ELM327 baratos.

### Android

Requisitos: Android Studio, SDK de Android y un JDK compatible.

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

En el dispositivo, acepta los permisos de **Bluetooth** y **dispositivos cercanos**. Si el adaptador no aparece por BLE, empareja el ELM327 desde los ajustes de Bluetooth de Android y usa el modo **Bluetooth clásico (SPP)**.

### iOS

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

iOS no permite Web Bluetooth en Safari; dentro de la app nativa se usa el plugin BLE de Capacitor. Añade los textos de uso de Bluetooth en `Info.plist` antes de publicar.

---

## Seguridad

OBD COOL muestra advertencias contextuales, pero **el diagnóstico es orientativo** y no sustituye una inspección física ni el manual del fabricante.

- **No borres los códigos antes de diagnosticar.** Puedes ocultar la causa y perder el fotograma congelado.
- **Borrar códigos afecta a la prueba de emisiones.** Los monitores de readiness se reinician y el vehículo puede no pasar la ITV/emisiones hasta completar ciclos de conducción.
- **Si el testigo MIL parpadea, detén el motor.** Un fallo de combustión continuo puede dañar el catalizador.
- **No abras el tapón del refrigerante con el motor caliente.** Espera a que enfríe y usa guantes.
- **No manipules el circuito del airbag con el contacto puesto.** No lo midas con multímetro ni lo alimentes: riesgo de despliegue.
- **El combustible es inflamable.** Trabaja en un lugar ventilado, sin chispas ni cigarrillos.
- **No circules con códigos de correlación** (`P0016`, `P0017`) ni con sobrecalentamiento.
- **No sustituyas piezas a ciegas.** Confirma la causa con pruebas antes de cambiar componentes costosos.

---

## Privacidad

- El vehículo, los ajustes y el historial se guardan solo en `localStorage` de tu navegador.
- No hay cuentas, registro ni servidores de OBD COOL.
- La IA recibe únicamente los datos descritos arriba y se procesa en el Worker de Cloudflare y en la API de Gemini.
- El VIN completo no se envía a la IA.
- Puedes borrar todos los datos locales desde **Ajustes → Datos locales**.
- El Worker aplica CORS, validación de tamaño y límite de peticiones por IP.

---

## Pruebas

```bash
npm test
```

La suite cubre:

- Codificación y decodificación de DTC y respuestas del ELM327.
- Lectura de PID, estado del monitor y PIDs soportados.
- Motor local de diagnóstico (mezcla pobre/rica, fallos de combustión, catalizador, termostato, sobrecalentamiento, síntomas sin códigos).
- Base de datos DTC, notas por marca/modelo y fallback de códigos desconocidos.
- Enlaces a iFixit y decodificación de VIN.

---

## Estructura del proyecto

```text
src/
  App.tsx                 # Shell, navegación y orquestación
  components/             # Vistas: inicio, códigos, sensores, diagnóstico, reparación, vehículo, ajustes
  hooks/useObd.ts         # Conexión, lectura de DTC, polling de sensores y estado global
  lib/obd/                # Cliente ELM327 y transportes (demo, Web BLE, BLE nativo, SPP)
  lib/diagnosis/          # Motor local de reglas y cliente de IA
  lib/storage.ts          # Persistencia local
  data/                   # PIDs, DTC, vehículos, notas, guías, VIN e iFixit
worker/
  src/index.ts            # Proxy de Gemini en Cloudflare Workers
scripts/postbuild.mjs     # 404.html para GitHub Pages
.github/workflows/        # CI y despliegue en Pages
```

---

## Solución de problemas

**El ELM327 no aparece en el navegador.**
Web Bluetooth solo funciona en Chrome/Edge y en contextos seguros (HTTPS o `localhost`). En Android, usa la app nativa si el adaptador es SPP.

**Se conecta pero no responde a los códigos.**
Comprueba que el contacto esté encendido (posición II), que el adaptador esté bien insertado y que no lo esté usando otra app. Prueba primero el simulador para descartar un problema de la interfaz.

**El adaptador se desconecta.**
Los ELM327 clonados baratos pueden caer con motor en marcha o con varios PIDs a la vez. Baja la frecuencia en **Ajustes → Lectura de sensores** y usa un adaptador de calidad.

**La IA no está disponible.**
Es normal si no has desplegado el Worker. El motor local sigue funcionando. Si lo desplegaste, revisa `VITE_AI_ENDPOINT`, `ALLOWED_ORIGINS` y que `GEMINI_API_KEY` exista como secreto.

**La PWA se ve en blanco tras actualizar.**
El service worker puede tener caché antigua. Recarga con `Ctrl + F5` o borra los datos del sitio.

---

## Contribuir

1. Haz un fork y crea una rama: `git checkout -b feature/mi-mejora`.
2. Ejecuta `npm run check` antes de enviar cambios.
3. Abre un pull request describiendo el problema y la solución.

Las guías y notas son orientativas: si encuentras un error técnico, abre un issue con la fuente o el boletín que lo respalde.

---

## Licencia

[MIT](LICENSE) © 2026 OBD COOL

OBD COOL no está afiliado a iFixit, Google, ELM Electronics ni a ningún fabricante de vehículos. Las marcas mencionadas pertenecen a sus respectivos propietarios.
