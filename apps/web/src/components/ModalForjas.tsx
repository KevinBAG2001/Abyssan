import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, GitPullRequest, KeyRound, X } from 'lucide-react';
import {
  CuentaForja,
  httpGitApi,
  SolicitudForja,
  SolicitudForjaCreada,
} from '../infrastructure/api/HttpGitApi';
import { GitBranch } from '../types/git';

interface ModalForjasProps {
  repoPath: string;
  ramaActual: string;
  ramas: GitBranch[];
  onClose: () => void;
  onError: (mensaje: string) => void;
  onExito: (mensaje: string) => void;
  onCheckoutHecho: () => void;
}

function claseLineaDiff(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) {
    return 'text-slate-500';
  }
  if (line.startsWith('+')) return 'text-emerald-400 bg-emerald-500/5';
  if (line.startsWith('-')) return 'text-rose-400 bg-rose-500/5';
  if (line.startsWith('@@')) return 'text-sky-400';
  return 'text-slate-300';
}

export const ModalForjas: React.FC<ModalForjasProps> = ({
  repoPath,
  ramaActual,
  ramas,
  onClose,
  onError,
  onExito,
  onCheckoutHecho,
}) => {
  const [tab, setTab] = useState<'lista' | 'crear'>('lista');
  const [cuentas, setCuentas] = useState<CuentaForja[]>([]);
  const [githubOk, setGithubOk] = useState(false);
  const [gitlabOk, setGitlabOk] = useState(false);
  const [solicitudes, setSolicitudes] = useState<SolicitudForja[]>([]);
  const [proveedor, setProveedor] = useState<'github' | 'gitlab' | null>(null);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [avisoForja, setAvisoForja] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<SolicitudForja | null>(null);
  const [diff, setDiff] = useState('');
  const [cargandoDiff, setCargandoDiff] = useState(false);
  const [checkoutEnCurso, setCheckoutEnCurso] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [base, setBase] = useState('');
  const [creando, setCreando] = useState(false);
  const [creada, setCreada] = useState<SolicitudForjaCreada | null>(null);

  const locales = useMemo(() => ramas.filter((r) => !r.isRemote).map((r) => r.name), [ramas]);
  const basesSugeridas = useMemo(() => {
    const preferidas = ['main', 'master', 'develop'];
    return [...new Set([...preferidas.filter((n) => locales.includes(n)), ...locales])];
  }, [locales]);

  const cargarCuentas = async () => {
    try {
      const d = await httpGitApi.listarForjas();
      setCuentas(d.cuentas);
      setGithubOk(d.githubConfigurado);
      setGitlabOk(d.gitlabConfigurado);
    } catch {
      /* OAuth opcional: no bloquea Git local */
    }
  };

  const cargarSolicitudes = async () => {
    setCargandoLista(true);
    setAvisoForja(null);
    try {
      const d = await httpGitApi.listarSolicitudesForja(repoPath);
      setSolicitudes(d.solicitudes);
      setProveedor(d.origin.proveedor);
      setSeleccion(null);
      setDiff('');
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'La forja no responde.';
      setAvisoForja(mensaje);
      setSolicitudes([]);
      onError(mensaje);
    } finally {
      setCargandoLista(false);
    }
  };

  useEffect(() => {
    void cargarCuentas();
    void cargarSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath]);

  useEffect(() => {
    if (!base) {
      const inicial = basesSugeridas.find((n) => n !== ramaActual) || basesSugeridas[0] || 'main';
      setBase(inicial);
    }
  }, [base, basesSugeridas, ramaActual]);

  const conectar = async (p: 'github' | 'gitlab') => {
    try {
      const destino = await httpGitApi.iniciarOAuth(p);
      window.location.href = destino;
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo iniciar OAuth');
    }
  };

  const desconectar = async (p: 'github' | 'gitlab') => {
    try {
      await httpGitApi.desconectarForja(p);
      await cargarCuentas();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo desconectar');
    }
  };

  const abrirDiff = async (s: SolicitudForja) => {
    setSeleccion(s);
    setCargandoDiff(true);
    setDiff('');
    try {
      const d = await httpGitApi.diffSolicitudForja(repoPath, s.numero);
      setDiff(d.diff);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo cargar el diff.';
      setAvisoForja(mensaje);
      onError(mensaje);
    } finally {
      setCargandoDiff(false);
    }
  };

  const checkout = async () => {
    if (!seleccion) return;
    setCheckoutEnCurso(true);
    try {
      const rama = await httpGitApi.checkoutSolicitudForja(
        repoPath,
        seleccion.numero,
        seleccion.ramaOrigen,
        seleccion.esFork
      );
      onExito(`Checkout en ${rama}`);
      onCheckoutHecho();
      onClose();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo hacer checkout');
    } finally {
      setCheckoutEnCurso(false);
    }
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !base.trim() || !ramaActual) return;
    setCreando(true);
    try {
      const d = await httpGitApi.crearSolicitudForja(repoPath, {
        titulo: titulo.trim(),
        cuerpo: cuerpo.trim() || undefined,
        base: base.trim(),
        cabeza: ramaActual,
      });
      setCreada(d);
      onExito(`${proveedor === 'gitlab' ? 'MR' : 'PR'} #${d.numero} creado`);
      void cargarSolicitudes();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo crear la solicitud');
    } finally {
      setCreando(false);
    }
  };

  const etiqueta = proveedor === 'gitlab' ? 'MRs' : 'PRs';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-[#181c2d] border border-[#2e354e] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-[#23283b] flex items-center justify-between bg-[#141724]">
          <div className="flex items-center space-x-2">
            <GitPullRequest className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm text-white">Forjas — {etiqueta} del origin</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#23283b] text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[#23283b] bg-[#141724]/60 space-y-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400 uppercase">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>OAuth (tokens cifrados en disco, nunca en el repo)</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {(['github', 'gitlab'] as const).map((p) => {
              const cuenta = cuentas.find((c) => c.proveedor === p);
              const configurado = p === 'github' ? githubOk : gitlabOk;
              return (
                <div key={p} className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-300">
                    {p === 'github' ? 'GitHub' : 'GitLab'}
                    {cuenta?.usuario ? ` · ${cuenta.usuario}` : ''}
                  </span>
                  {cuenta ? (
                    <button type="button" onClick={() => desconectar(p)} className="text-rose-400 hover:underline">
                      Desconectar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!configurado}
                      onClick={() => conectar(p)}
                      className="text-emerald-400 hover:underline disabled:text-slate-600 disabled:no-underline"
                    >
                      {configurado ? 'Conectar' : 'Sin client OAuth'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex border-b border-[#23283b]">
          <button
            className={`flex-1 py-2 text-xs font-semibold ${
              tab === 'lista' ? 'text-sky-300 border-b-2 border-sky-400' : 'text-slate-400'
            }`}
            onClick={() => setTab('lista')}
          >
            Listar {etiqueta}
          </button>
          <button
            className={`flex-1 py-2 text-xs font-semibold ${
              tab === 'crear' ? 'text-sky-300 border-b-2 border-sky-400' : 'text-slate-400'
            }`}
            onClick={() => setTab('crear')}
          >
            Crear {proveedor === 'gitlab' ? 'MR' : 'PR'}
          </button>
        </div>

        {tab === 'lista' ? (
          <div className="flex flex-1 min-h-0">
            <div className="w-72 border-r border-[#23283b] overflow-y-auto">
              {cargandoLista && <p className="p-3 text-xs text-slate-500">Consultando la forja…</p>}
              {avisoForja && (
                <p className="p-3 text-[11px] text-amber-300 border-b border-[#23283b]">{avisoForja}</p>
              )}
              {!cargandoLista && solicitudes.length === 0 && !avisoForja && (
                <p className="p-3 text-xs text-slate-500">No hay solicitudes abiertas.</p>
              )}
              {solicitudes.map((s) => (
                <button
                  key={`${s.proveedor}-${s.numero}`}
                  onClick={() => void abrirDiff(s)}
                  className={`w-full text-left px-3 py-2.5 border-b border-[#23283b] hover:bg-[#23283b] ${
                    seleccion?.numero === s.numero ? 'bg-[#23283b]' : ''
                  }`}
                >
                  <div className="text-[11px] font-semibold text-slate-200 truncate">
                    #{s.numero} {s.titulo}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {s.ramaOrigen} → {s.ramaDestino}
                    {s.esFork ? ' · fork' : ''}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              {seleccion ? (
                <>
                  <div className="px-3 py-2 border-b border-[#23283b] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{seleccion.titulo}</p>
                      <p className="text-[10px] text-slate-500">
                        {seleccion.autor} · {seleccion.ramaOrigen} → {seleccion.ramaDestino}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={seleccion.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-white"
                        title="Abrir en la forja"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        disabled={checkoutEnCurso}
                        onClick={() => void checkout()}
                        className="px-2.5 py-1 text-[11px] font-bold bg-sky-500 hover:bg-sky-600 text-slate-950 rounded disabled:opacity-40"
                      >
                        Checkout rama
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-[#10131e] p-2">
                    {cargandoDiff ? (
                      <p className="text-xs text-slate-500 px-2">Cargando diff…</p>
                    ) : (
                      <pre className="text-[11px] font-mono leading-5">
                        {(diff || 'Sin diff.').split('\n').map((line, i) => (
                          <div key={i} className={`px-2 whitespace-pre-wrap ${claseLineaDiff(line)}`}>
                            {line || ' '}
                          </div>
                        ))}
                      </pre>
                    )}
                  </div>
                </>
              ) : (
                <p className="p-4 text-xs text-slate-500">Selecciona una solicitud para ver el diff.</p>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={crear} className="p-4 space-y-3 overflow-y-auto">
            <p className="text-[11px] text-slate-400">
              La rama <span className="text-emerald-300 font-semibold">{ramaActual}</span> debe existir en el
              remoto (push previo). Si la forja no responde, commit y push locales siguen disponibles.
            </p>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título"
              className="w-full bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              placeholder="Descripción (opcional)"
              rows={4}
              className="w-full bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
            />
            <label className="block text-[11px] text-slate-400">
              Rama destino (base)
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="mt-1 w-full bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                {basesSugeridas.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {creada && (
              <a
                href={creada.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 text-xs text-sky-300 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>
                  Abierta #{creada.numero}: {creada.titulo}
                </span>
              </a>
            )}
            <div className="flex justify-end space-x-2 pt-1">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400">
                Cerrar
              </button>
              <button
                type="submit"
                disabled={creando || !titulo.trim() || ramaActual === base}
                className="px-3 py-1.5 text-xs font-bold bg-sky-500 hover:bg-sky-600 text-slate-950 rounded disabled:opacity-40"
              >
                Crear {proveedor === 'gitlab' ? 'MR' : 'PR'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
