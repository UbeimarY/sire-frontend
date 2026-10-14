import { useState } from "react";
import { loadSession, saveSession, type Session } from "./api";
import { Role } from "./gen/sire/v1/auth_pb";
import { roleLabel } from "./labels";
import { useLiveData } from "./useLiveData";
import { AdminView } from "./views/AdminView";
import { DispatchView } from "./views/DispatchView";
import { HospitalView } from "./views/HospitalView";
import { LoginView } from "./views/LoginView";

type Tab = "dispatch" | "hospital" | "admin";

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  if (!session) {
    return (
      <LoginView
        onLogin={(s) => {
          saveSession(s);
          setSession(s);
        }}
      />
    );
  }
  return (
    <Shell
      session={session}
      onLogout={() => {
        saveSession(null);
        setSession(null);
      }}
    />
  );
}

function Shell({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const role = session.user.role;
  const tabs: { id: Tab; label: string }[] =
    role === Role.ADMIN
      ? [
          { id: "dispatch", label: "Centro de despacho" },
          { id: "hospital", label: "Urgencias" },
          { id: "admin", label: "Métricas y benchmark" },
        ]
      : role === Role.HOSPITAL
        ? [{ id: "hospital", label: "Urgencias" }, { id: "dispatch", label: "Mapa de la red" }]
        : [{ id: "dispatch", label: "Centro de despacho" }];
  const [tab, setTab] = useState<Tab>(tabs[0].id);
  const data = useLiveData();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo small"><span>+</span></div>
          <div>
            <strong>SIRE</strong>
            <small>Respuesta a Emergencias</small>
          </div>
        </div>
        <nav>
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="user">
          <span className={`live ${data.connection}`}>
            {data.connection === "live" ? "En vivo · gRPC-Web" : data.connection === "connecting" ? "Conectando…" : "Reconectando…"}
          </span>
          <div>
            <strong>{session.user.displayName}</strong>
            <small>{roleLabel[role]}</small>
          </div>
          <button className="ghost" onClick={onLogout}>Salir</button>
        </div>
      </header>
      <main>
        {tab === "dispatch" && <DispatchView data={data} canCreate={role === Role.OPERATOR || role === Role.ADMIN} />}
        {tab === "hospital" && <HospitalView data={data} hospitalId={session.user.hospitalId} canSwitch={role === Role.ADMIN} />}
        {tab === "admin" && <AdminView />}
      </main>
    </div>
  );
}
