import { useState, type FormEvent } from "react";
import { incidentApi } from "../api";
import { LiveMap } from "../components/LiveMap";
import { AmbulanceStatus, IncidentStatus, TriageLevel } from "../gen/sire/v1/common_pb";
import type { Incident } from "../gen/sire/v1/incident_pb";
import { errorMessage } from "../hooks";
import {
  ambulanceColor,
  ambulanceStatusLabel,
  formatEta,
  formatTime,
  incidentStatusLabel,
  triageInfo,
} from "../labels";
import type { useLiveData } from "../useLiveData";

type LiveData = ReturnType<typeof useLiveData>;

const emptyForm = { description: "", address: "", callerName: "", callerPhone: "", triage: TriageLevel.II };

const samples = [
  { description: "Accidente de tránsito, motociclista con trauma en pierna", address: "Av. Boyacá con Calle 80", triage: TriageLevel.II },
  { description: "Adulto mayor con dolor torácico y dificultad para respirar", address: "Carrera 7 # 45-10", triage: TriageLevel.I },
  { description: "Niño con fiebre alta y convulsión", address: "Calle 13 # 68-20", triage: TriageLevel.II },
  { description: "Caída en casa, posible fractura de muñeca", address: "Carrera 30 # 63-15", triage: TriageLevel.IV },
];

export function DispatchView({ data, canCreate }: { data: LiveData; canCreate: boolean }) {
  const { incidents, ambulances, hospitals } = data;
  const [form, setForm] = useState(emptyForm);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const selected = incidents.find((i) => i.id === selectedId) ?? null;
  const visible = incidents.filter((i) => showClosed || i.status !== IncidentStatus.CLOSED);
  const available = ambulances.filter((a) => a.status === AmbulanceStatus.AVAILABLE).length;
  const busy = ambulances.filter((a) => a.status !== AmbulanceStatus.AVAILABLE && a.status !== AmbulanceStatus.OFFLINE).length;

  function fillSample() {
    const s = samples[Math.floor(Math.random() * samples.length)];
    setForm({ ...emptyForm, ...s, callerName: "Ciudadano reportante", callerPhone: "300 555 0101" });
    setPicked({ lat: 4.651 + (Math.random() - 0.5) * 0.09, lng: -74.083 + (Math.random() - 0.5) * 0.08 });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!picked) {
      setError("Haga clic en el mapa para ubicar la emergencia");
      return;
    }
    setSending(true);
    setError("");
    try {
      const { incident } = await incidentApi.createIncident({ ...form, location: picked });
      setForm(emptyForm);
      setPicked(null);
      if (incident) setSelectedId(incident.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="dispatch">
      <section className="panel side">
        {canCreate && (
          <form className="card form" onSubmit={submit}>
            <div className="card-head">
              <h2>Nueva emergencia</h2>
              <button type="button" className="link" onClick={fillSample}>
                Llenar ejemplo
              </button>
            </div>
            <label>
              Descripción
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="¿Qué está pasando?"
              />
            </label>
            <label>
              Dirección
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <div className="row">
              <label>
                Reportante
                <input value={form.callerName} onChange={(e) => setForm({ ...form, callerName: e.target.value })} />
              </label>
              <label>
                Teléfono
                <input value={form.callerPhone} onChange={(e) => setForm({ ...form, callerPhone: e.target.value })} />
              </label>
            </div>
            <fieldset className="triage">
              <legend>Clasificación de triage</legend>
              {[TriageLevel.I, TriageLevel.II, TriageLevel.III, TriageLevel.IV, TriageLevel.V].map((t) => (
                <button
                  type="button"
                  key={t}
                  title={`${triageInfo[t].label}: ${triageInfo[t].hint}`}
                  className={form.triage === t ? "on" : ""}
                  style={{ "--c": triageInfo[t].color } as React.CSSProperties}
                  onClick={() => setForm({ ...form, triage: t })}
                >
                  {triageInfo[t].short}
                </button>
              ))}
            </fieldset>
            <p className="hint">
              {picked ? `Ubicación: ${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}` : "Haga clic en el mapa para ubicar la emergencia"}
            </p>
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={sending}>
              {sending ? "Despachando…" : "Registrar y despachar"}
            </button>
          </form>
        )}

        <div className="card list-card">
          <div className="card-head">
            <h2>Incidentes</h2>
            <label className="toggle">
              <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Ver cerrados
            </label>
          </div>
          {visible.length === 0 && <p className="empty">Sin incidentes activos.</p>}
          <ul className="incidents">
            {visible.map((i) => (
              <IncidentRow key={i.id} incident={i} active={i.id === selectedId} onClick={() => setSelectedId(i.id === selectedId ? null : i.id)} />
            ))}
          </ul>
        </div>
      </section>

      <section className="panel main">
        <div className="stats">
          <Stat label="Ambulancias disponibles" value={available} tone="ok" />
          <Stat label="En servicio" value={busy} tone="warn" />
          <Stat label="Incidentes activos" value={incidents.filter((i) => i.status !== IncidentStatus.CLOSED).length} tone="alert" />
          <Stat label="Camas libres en red" value={hospitals.reduce((s, h) => s + h.availableBeds, 0)} tone="info" />
        </div>
        <LiveMap ambulances={ambulances} hospitals={hospitals} incidents={incidents} picked={picked} onPick={canCreate ? (lat, lng) => setPicked({ lat, lng }) : undefined} />
        {selected ? <IncidentDetail incident={selected} /> : <FleetStrip data={data} />}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`stat ${tone}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function IncidentRow({ incident: i, active, onClick }: { incident: Incident; active: boolean; onClick: () => void }) {
  const t = triageInfo[i.triage];
  return (
    <li className={`incident ${active ? "active" : ""}`} onClick={onClick}>
      <span className="badge" style={{ background: t.color }}>{t.short}</span>
      <div>
        <div className="incident-top">
          <strong>{i.id}</strong>
          <span className={`status s${i.status}`}>{incidentStatusLabel[i.status]}</span>
        </div>
        <p>{i.description}</p>
        <small>
          {i.address} · {formatTime(i.createdAtMs)}
          {i.etaSeconds > 0 && <> · ETA {formatEta(i.etaSeconds)}</>}
        </small>
      </div>
    </li>
  );
}

function IncidentDetail({ incident: i }: { incident: Incident }) {
  return (
    <div className="card detail">
      <div className="card-head">
        <h2>
          {i.id} · <span style={{ color: triageInfo[i.triage].color }}>{triageInfo[i.triage].label}</span>
        </h2>
        <span className={`status s${i.status}`}>{incidentStatusLabel[i.status]}</span>
      </div>
      <div className="detail-grid">
        <div>
          <p><b>Descripción:</b> {i.description}</p>
          <p><b>Dirección:</b> {i.address}</p>
          <p><b>Reportante:</b> {i.callerName || "—"} {i.callerPhone && `· ${i.callerPhone}`}</p>
          <p><b>Ambulancia:</b> {i.ambulanceId || "Pendiente"} · <b>Hospital:</b> {i.hospitalName || "Pendiente"}</p>
          <p><b>ETA:</b> {formatEta(i.etaSeconds)}</p>
        </div>
        <ol className="timeline">
          {i.timeline.map((t, idx) => (
            <li key={idx}>
              <time>{formatTime(t.atMs)}</time>
              <span>{incidentStatusLabel[t.status]}</span>
              {t.note && <small>{t.note}</small>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function FleetStrip({ data }: { data: LiveData }) {
  return (
    <div className="card fleet">
      <h2>Flota en tiempo real</h2>
      <div className="fleet-grid">
        {data.ambulances.map((a) => (
          <div key={a.id} className="unit">
            <i style={{ background: ambulanceColor[a.status] }} />
            <div>
              <strong>{a.plate}</strong>
              <small>{ambulanceStatusLabel[a.status]}{a.incidentId && ` · ${a.incidentId}`}</small>
            </div>
            <span>{a.speedKmh > 0 ? `${Math.round(a.speedKmh)} km/h` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
