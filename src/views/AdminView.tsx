import { useEffect, useState } from "react";
import { toBinary } from "@bufbuild/protobuf";
import { API_URL, benchmarkApi, incidentApi } from "../api";
import { TriageLevel } from "../gen/sire/v1/common_pb";
import { GetTelemetryResponseSchema } from "../gen/sire/v1/benchmark_pb";
import type { GetMetricsResponse } from "../gen/sire/v1/incident_pb";
import { errorMessage } from "../hooks";
import { triageInfo } from "../labels";

interface BenchResult {
  count: number;
  restBytes: number;
  grpcBytes: number;
  restMs: number;
  grpcMs: number;
}

const RUNS = 8;

async function measure(count: number): Promise<BenchResult> {
  let restBytes = 0;
  let grpcBytes = 0;
  let restTotal = 0;
  let grpcTotal = 0;
  for (let run = 0; run < RUNS; run++) {
    // REST: JSON text, parsed with JSON.parse.
    let t0 = performance.now();
    const res = await fetch(`${API_URL}/api/rest/telemetry?count=${count}`);
    const text = await res.text();
    JSON.parse(text);
    restTotal += performance.now() - t0;
    restBytes = new TextEncoder().encode(text).length;

    // gRPC-Web: Protobuf binary, decoded by the generated schema.
    t0 = performance.now();
    const message = await benchmarkApi.getTelemetry({ count });
    grpcTotal += performance.now() - t0;
    grpcBytes = toBinary(GetTelemetryResponseSchema, message).length + 5; // + gRPC frame header
  }
  return { count, restBytes, grpcBytes, restMs: restTotal / RUNS, grpcMs: grpcTotal / RUNS };
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

export function AdminView() {
  const [metrics, setMetrics] = useState<GetMetricsResponse | null>(null);
  const [results, setResults] = useState<BenchResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      incidentApi
        .getMetrics({})
        .then((m) => alive && setMetrics(m))
        .catch(() => undefined);
    void load();
    const timer = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  async function runBenchmark() {
    setRunning(true);
    setError("");
    setResults([]);
    try {
      for (const count of [100, 1000, 5000]) {
        const r = await measure(count);
        setResults((prev) => [...prev, r]);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  const maxTriage = Math.max(1, ...(metrics?.byTriage.map((t) => t.count) ?? [1]));

  return (
    <div className="admin">
      <section className="card">
        <h2>Indicadores operativos</h2>
        <div className="stats">
          <div className="stat alert"><b>{metrics?.activeIncidents ?? 0}</b><span>Incidentes activos</span></div>
          <div className="stat warn"><b>{metrics?.pendingIncidents ?? 0}</b><span>En espera de recurso</span></div>
          <div className="stat ok"><b>{metrics?.closedIncidents ?? 0}</b><span>Atendidos</span></div>
          <div className="stat info"><b>{metrics?.avgResponseSeconds ? `${metrics.avgResponseSeconds.toFixed(0)} s` : "—"}</b><span>Tiempo medio de respuesta</span></div>
        </div>
        <h3>Incidentes por triage</h3>
        <div className="bars">
          {(metrics?.byTriage ?? []).filter((t) => t.triage !== TriageLevel.UNSPECIFIED).map((t) => (
            <div key={t.triage} className="bar-row">
              <span>{triageInfo[t.triage].label}</span>
              <div className="bar"><i style={{ width: `${(t.count / maxTriage) * 100}%`, background: triageInfo[t.triage].color }} /></div>
              <b>{t.count}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Benchmark: REST/JSON vs gRPC/Protobuf</h2>
          <button className="primary" onClick={runBenchmark} disabled={running}>
            {running ? "Midiendo…" : "Ejecutar prueba"}
          </button>
        </div>
        <p className="hint">
          Se solicitan los mismos registros de telemetría (posición, velocidad, signos vitales) por ambos canales,
          {` ${RUNS}`} veces cada uno. Se mide el tamaño de la respuesta y el tiempo promedio (red + decodificación).
        </p>
        {error && <p className="error">{error}</p>}
        {results.length > 0 && (
          <table className="bench">
            <thead>
              <tr>
                <th>Registros</th>
                <th>Tamaño REST</th>
                <th>Tamaño gRPC</th>
                <th>Ahorro</th>
                <th>Tiempo REST</th>
                <th>Tiempo gRPC</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.count}>
                  <td>{r.count.toLocaleString("es-CO")}</td>
                  <td>{kb(r.restBytes)}</td>
                  <td>{kb(r.grpcBytes)}</td>
                  <td className="good">{(100 - (r.grpcBytes / r.restBytes) * 100).toFixed(0)}% menos</td>
                  <td>{r.restMs.toFixed(1)} ms</td>
                  <td>{r.grpcMs.toFixed(1)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {results.length > 0 && (
          <div className="compare">
            {results.map((r) => (
              <div key={r.count} className="compare-row">
                <span>{r.count.toLocaleString("es-CO")} registros</span>
                <div className="bar rest"><i style={{ width: "100%" }}>JSON {kb(r.restBytes)}</i></div>
                <div className="bar grpc"><i style={{ width: `${(r.grpcBytes / r.restBytes) * 100}%` }}>Protobuf {kb(r.grpcBytes)}</i></div>
              </div>
            ))}
          </div>
        )}
        <p className="hint small">
          Nota: los tamaños son sin compresión HTTP. Con gzip la diferencia se reduce, pero Protobuf sigue evitando el costo de
          parsear texto en CPU.
        </p>
      </section>
    </div>
  );
}
