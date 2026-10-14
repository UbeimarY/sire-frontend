import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AmbulanceStatus, IncidentStatus } from "../gen/sire/v1/common_pb";
import type { Ambulance } from "../gen/sire/v1/fleet_pb";
import type { Hospital } from "../gen/sire/v1/hospital_pb";
import type { Incident } from "../gen/sire/v1/incident_pb";
import { ambulanceColor, ambulanceStatusLabel, incidentStatusLabel, triageInfo } from "../labels";

const DEFAULT_CENTER: [number, number] = [4.651, -74.083];

function divIcon(html: string, size: number) {
  return L.divIcon({ html, className: "map-icon", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

const ambulanceIcon = (a: Ambulance) =>
  divIcon(
    `<div class="pin pin-amb" style="--c:${ambulanceColor[a.status]}"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 6h11v4h3l3 3v4h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3zM7 8v2H5v1h2v2h1v-2h2v-1H8V8z"/></svg></div>`,
    30,
  );
const hospitalIcon = (h: Hospital) =>
  divIcon(`<div class="pin pin-hosp"><span>H</span><b>${h.availableBeds}</b></div>`, 34);
const incidentIcon = (i: Incident) =>
  divIcon(`<div class="pin pin-inc" style="--c:${triageInfo[i.triage].color}"><span>${triageInfo[i.triage].short}</span></div>`, 30);
const pickIcon = divIcon(`<div class="pin pin-pick"></div>`, 22);

function ClickPicker({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

interface Props {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  incidents: Incident[];
  picked?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  focusHospitalId?: string;
}

export function LiveMap({ ambulances, hospitals, incidents, picked, onPick, focusHospitalId }: Props) {
  const center = useMemo<[number, number]>(() => {
    const h = hospitals.find((x) => x.id === focusHospitalId);
    return h?.location ? [h.location.lat, h.location.lng] : DEFAULT_CENTER;
  }, [hospitals, focusHospitalId]);

  const active = incidents.filter((i) => i.status !== IncidentStatus.CLOSED);
  const hospitalById = new Map(hospitals.map((h) => [h.id, h]));
  const ambulanceById = new Map(ambulances.map((a) => [a.id, a]));

  return (
    <MapContainer center={center} zoom={12} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickPicker onPick={onPick} />

      {active.map((i) => {
        const amb = ambulanceById.get(i.ambulanceId);
        const hosp = hospitalById.get(i.hospitalId);
        if (!amb?.location || !i.location) return null;
        const toHospital = i.status === IncidentStatus.TRANSPORTING || i.status === IncidentStatus.AT_HOSPITAL;
        const target = toHospital ? hosp?.location : i.location;
        if (!target) return null;
        return (
          <Polyline
            key={`route-${i.id}`}
            positions={[
              [amb.location.lat, amb.location.lng],
              [target.lat, target.lng],
            ]}
            pathOptions={{ color: toHospital ? "#7b2cbf" : "#f46036", weight: 3, dashArray: "6 8" }}
          />
        );
      })}

      {hospitals.map((h) =>
        h.location ? (
          <Marker key={h.id} position={[h.location.lat, h.location.lng]} icon={hospitalIcon(h)}>
            <Tooltip direction="top" offset={[0, -14]}>
              <strong>{h.name}</strong>
              <br />
              Camas libres: {h.availableBeds}/{h.totalBeds}
            </Tooltip>
          </Marker>
        ) : null,
      )}

      {active.map((i) =>
        i.location ? (
          <Marker key={i.id} position={[i.location.lat, i.location.lng]} icon={incidentIcon(i)}>
            <Popup>
              <strong>{i.id}</strong> · {triageInfo[i.triage].label}
              <br />
              {i.description}
              <br />
              Estado: {incidentStatusLabel[i.status]}
            </Popup>
          </Marker>
        ) : null,
      )}

      {ambulances
        .filter((a) => a.location && a.status !== AmbulanceStatus.OFFLINE)
        .map((a) => (
          <Marker key={a.id} position={[a.location!.lat, a.location!.lng]} icon={ambulanceIcon(a)} zIndexOffset={500}>
            <Tooltip direction="top" offset={[0, -14]}>
              <strong>{a.plate}</strong> · {ambulanceStatusLabel[a.status]}
              {a.speedKmh > 0 && <> · {Math.round(a.speedKmh)} km/h</>}
            </Tooltip>
          </Marker>
        ))}

      {picked && <Marker position={[picked.lat, picked.lng]} icon={pickIcon} />}
    </MapContainer>
  );
}
