import { useState } from "react";
import { hospitalApi } from "../api";
import { IncidentStatus } from "../gen/sire/v1/common_pb";
import type { IncomingPatient } from "../gen/sire/v1/hospital_pb";
import { errorMessage, useServerStream } from "../hooks";
import { formatEta, formatTime, incidentStatusLabel, triageInfo } from "../labels";
import type { useLiveData } from "../useLiveData";

type LiveData = ReturnType<typeof useLiveData>;

export function HospitalView({ data, hospitalId, canSwitch }: { data: LiveData; hospitalId: string; canSwitch: boolean }) {
  const [currentId, setCurrentId] = useState(hospitalId || "h1");
  const [patients, setPatients] = useState(() => new Map<string, IncomingPatient>());
  const [error, setError] = useState("");
  const hospital = data.hospitals.find((h) => h.id === currentId);

  // Server streaming: patients heading to this hospital.
  const state = useServerStream(
    (signal) => {
      setPatients(new Map());
      return hospitalApi.watchIncomingPatients({ hospitalId: currentId }, { signal });
    },
    (e) => {
      if (!e.patient) return;
      const patient = e.patient;
      setPatients((prev) => {
        const next = new Map(prev);
        if (e.removed) next.delete(patient.incidentId);
        else next.set(patient.incidentId, patient);
        return next;
      });
    },
    [currentId],
  );

  async function changeBeds(delta: number) {
    if (!hospital) return;
    setError("");
    try {
      await hospitalApi.updateBeds({ hospitalId: hospital.id, availableBeds: hospital.availableBeds + delta });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const list = [...patients.values()].sort((a, b) => a.triage - b.triage);
  const arriving = list.filter((p) => p.status !== IncidentStatus.AT_HOSPITAL);
  const arrived = list.filter((p) => p.status === IncidentStatus.AT_HOSPITAL);

  return (
    <div className="hospital">
      <section className="card hospital-head">
        <div>
          {canSwitch ? (
            <select value={currentId} onChange={(e) => setCurrentId(e.target.value)}>
              {data.hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          ) : (
            <h2>{hospital?.name ?? "Hospital"}</h2>
          )}
          <p className="hint">{hospital?.address} · Canal en vivo: {state === "live" ? "conectado" : "reconectando…"}</p>
        </div>
        <div className="beds">
          <button onClick={() => changeBeds(-1)} disabled={!hospital || hospital.availableBeds <= 0} aria-label="Restar cama">−</button>
          <div>
            <b>{hospital?.availableBeds ?? "–"}</b>
            <span>camas libres de {hospital?.totalBeds ?? "–"}</span>
          </div>
          <button onClick={() => changeBeds(1)} disabled={!hospital || hospital.availableBeds >= hospital.totalBeds} aria-label="Sumar cama">+</button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="patients">
        <div>
          <h3>En camino ({arriving.length})</h3>
          {arriving.length === 0 && <p className="empty">No hay pacientes en camino.</p>}
          {arriving.map((p) => <PatientCard key={p.incidentId} patient={p} />)}
        </div>
        <div>
          <h3>Recibidos en urgencias ({arrived.length})</h3>
          {arrived.length === 0 && <p className="empty">Aún no llegan pacientes.</p>}
          {arrived.map((p) => <PatientCard key={p.incidentId} patient={p} />)}
        </div>
      </section>
    </div>
  );
}

function PatientCard({ patient: p }: { patient: IncomingPatient }) {
  const t = triageInfo[p.triage];
  return (
    <article className="card patient" style={{ borderLeftColor: t.color }}>
      <div className="incident-top">
        <strong>{p.incidentId}</strong>
        <span className={`status s${p.status}`}>{incidentStatusLabel[p.status]}</span>
      </div>
      <p className="triage-label" style={{ color: t.color }}>{t.label}</p>
      <p>{p.description}</p>
      <div className="patient-foot">
        <span>Ambulancia {p.ambulancePlate}</span>
        <span className="eta">ETA {formatEta(p.etaSeconds)}</span>
        <small>Actualizado {formatTime(p.updatedAtMs)}</small>
      </div>
    </article>
  );
}
