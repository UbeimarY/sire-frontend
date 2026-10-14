# SIRE · Frontend

Interfaz web del **Sistema Integrado de Respuesta a Emergencias**. React + TypeScript + Vite, con mapa en vivo (Leaflet + OpenStreetMap).
Se comunica con el backend (`sire-backend`, repositorio separado) mediante **gRPC-Web**: Protobuf binario y server streaming desde el navegador.

> Taller gRPC · Programación Orientada a la Web · Universidad Cooperativa de Colombia

## Vistas

| Vista | Rol | gRPC usado |
|---|---|---|
| Iniciar sesión | Todos | `AuthService.Login` (unaria) |
| Centro de despacho | Operador, Admin | `CreateIncident` (unaria) + `WatchIncidents`, `WatchFleet`, `WatchHospitals` (server streaming) |
| Urgencias | Hospital, Admin | `WatchIncomingPatients` (server streaming) + `UpdateBeds` (unaria) |
| Métricas y benchmark | Admin | `GetMetrics` + comparación REST/JSON vs gRPC/Protobuf |

Los tipos de `src/gen/` se generan desde los mismos contratos `proto/` del backend (contract-first, tipado end-to-end).

## Ejecutar en local

```bash
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:8080
npm run dev               # http://localhost:5173
```

Necesita el backend corriendo. Usuarios (contraseña `sire2026`): `operador`, `admin`, `hospital.central`, `hospital.sur`…

Si cambian los contratos: copia la carpeta `proto/` del backend y ejecuta `npm run generate`.

## Desplegar

Primero despliega el backend y copia su URL pública.

**Render:** New → Blueprint → este repositorio (usa `render.yaml`). Cuando pida `VITE_API_URL`, pega la URL del backend, por ejemplo `https://sire-backend.onrender.com`.

**Railway:** New Project → Deploy from GitHub repo → este repositorio. Agrega la variable `VITE_API_URL` con la URL del backend **antes** de que termine el primer build (si no, vuelve a desplegar). Railway usa el `Dockerfile` (build de Vite + nginx). Luego *Settings → Networking → Generate Domain*.

`VITE_API_URL` se lee al **compilar**: si la cambias, vuelve a desplegar.
