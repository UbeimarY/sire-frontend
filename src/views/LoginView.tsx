import { useState, type FormEvent } from "react";
import { authApi, type Session } from "../api";
import { errorMessage } from "../hooks";

const demoUsers = [
  { username: "operador", label: "Operador de despacho" },
  { username: "hospital.central", label: "Urgencias · Hospital Central" },
  { username: "admin", label: "Administrador" },
];

export function LoginView({ onLogin }: { onLogin: (session: Session) => void }) {
  const [username, setUsername] = useState("operador");
  const [password, setPassword] = useState("sire2026");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login({ username, password });
      if (res.user) onLogin({ token: res.token, user: res.user });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-brand">
        <div className="logo">
          <span>+</span>
        </div>
        <h1>SIRE</h1>
        <p>Sistema Integrado de Respuesta a Emergencias</p>
        <ul>
          <li>Despacho de ambulancias en tiempo real</li>
          <li>Microservicios comunicados con gRPC</li>
          <li>Navegador conectado por gRPC-Web</li>
        </ul>
      </div>
      <form className="card login-form" onSubmit={submit}>
        <h2>Iniciar sesión</h2>
        <label>
          Usuario
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={loading}>
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
        <div className="demo">
          <span>Usuarios de prueba (contraseña: sire2026)</span>
          {demoUsers.map((u) => (
            <button type="button" key={u.username} className={username === u.username ? "on" : ""} onClick={() => setUsername(u.username)}>
              {u.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
