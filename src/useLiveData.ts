import { useState } from "react";
import { fleetApi, hospitalApi, incidentApi } from "./api";
import type { Ambulance } from "./gen/sire/v1/fleet_pb";
import type { Hospital } from "./gen/sire/v1/hospital_pb";
import type { Incident } from "./gen/sire/v1/incident_pb";
import { useServerStream, type StreamState } from "./hooks";

function upsert<T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<Map<string, T>>>, item?: T) {
  if (!item) return;
  setter((prev) => new Map(prev).set(item.id, item));
}

/** Three gRPC server streams (via gRPC-Web) feeding the live dashboard. */
export function useLiveData() {
  const [incidents, setIncidents] = useState(() => new Map<string, Incident>());
  const [ambulances, setAmbulances] = useState(() => new Map<string, Ambulance>());
  const [hospitals, setHospitals] = useState(() => new Map<string, Hospital>());

  const incidentState = useServerStream(
    (signal) => incidentApi.watchIncidents({}, { signal }),
    (e) => upsert(setIncidents, e.incident),
    [],
  );
  const fleetState = useServerStream(
    (signal) => fleetApi.watchFleet({}, { signal }),
    (e) => upsert(setAmbulances, e.ambulance),
    [],
  );
  const hospitalState = useServerStream(
    (signal) => hospitalApi.watchHospitals({}, { signal }),
    (e) => upsert(setHospitals, e.hospital),
    [],
  );

  const states: StreamState[] = [incidentState, fleetState, hospitalState];
  const connection: StreamState = states.every((s) => s === "live")
    ? "live"
    : states.includes("reconnecting")
      ? "reconnecting"
      : "connecting";

  return {
    incidents: [...incidents.values()].sort((a, b) => Number(b.createdAtMs - a.createdAtMs)),
    ambulances: [...ambulances.values()].sort((a, b) => a.id.localeCompare(b.id)),
    hospitals: [...hospitals.values()],
    connection,
  };
}
