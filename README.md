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
