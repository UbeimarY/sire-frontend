import { createClient, type Interceptor } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { AuthService, type User } from "./gen/sire/v1/auth_pb";
import { BenchmarkService } from "./gen/sire/v1/benchmark_pb";
import { FleetService } from "./gen/sire/v1/fleet_pb";
import { HospitalService } from "./gen/sire/v1/hospital_pb";
import { IncidentService } from "./gen/sire/v1/incident_pb";

// Public URL of the backend gateway. A bare host ("sire-backend.onrender.com") gets https:// added.
const rawApiUrl = ((import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8080").trim();
export const API_URL = (/^https?:\/\//.test(rawApiUrl) ? rawApiUrl : `https://${rawApiUrl}`).replace(/\/$/, "");

const SESSION_KEY = "sire.session";

export interface Session {
  token: string;
  user: User;
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

// Adds the bearer token to every gRPC-Web call.
const authInterceptor: Interceptor = (next) => (req) => {
  const token = loadSession()?.token;
  if (token) req.header.set("Authorization", `Bearer ${token}`);
  return next(req);
};

// gRPC-Web: Protobuf binary frames over HTTP, the browser-compatible flavor of gRPC.
export const transport = createGrpcWebTransport({
  baseUrl: API_URL,
  useBinaryFormat: true,
  interceptors: [authInterceptor],
});

export const authApi = createClient(AuthService, transport);
export const incidentApi = createClient(IncidentService, transport);
export const fleetApi = createClient(FleetService, transport);
export const hospitalApi = createClient(HospitalService, transport);
export const benchmarkApi = createClient(BenchmarkService, transport);
