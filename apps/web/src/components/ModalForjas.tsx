import React, { useEffect, useMemo, useState } from 'react';
import { GitPullRequest, KeyRound } from 'lucide-react';
import {
  CuentaForja,
  httpGitApi,
  SolicitudForja,
  SolicitudForjaCreada,
} from '../infrastructure/api/HttpGitApi';
import { GitBranch } from '../types/git';

import { PanelListaForjas } from './PanelListaForjas';
import { FormularioCrearForja } from './FormularioCrearForja';
import { ModalCapa } from './ui/modal-capa';
import { ModalEncabezado } from './ui/modal-encabezado';
import { Pestannas } from './ui/pestannas';
import { ui } from '../lib/diseno';

interface ModalForjasProps {
  repoPath: string;
  ramaActual: string;
  ramas: GitBranch[];
  onClose: () => void;
  onError: (mensaje: string) => void;
  onExito: (mensaje: string) => void;
  onCheckoutHecho: () => void;
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

  const locales = useMemo(() => {
    const nombres: string[] = [];
    for (const r of ramas) {
      if (!r.isRemote) nombres.push(r.name);
    }
    return nombres;
  }, [ramas]);
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
    let vivo = true;
    void (async () => {
      try {
        const d = await httpGitApi.listarForjas();
        if (vivo) {
          setCuentas(d.cuentas);
          setGithubOk(d.githubConfigurado);
          setGitlabOk(d.gitlabConfigurado);
        }
      } catch {
        /* OAuth opcional */
      }
    })();
    void (async () => {
      setCargandoLista(true);
      setAvisoForja(null);
      try {
        const d = await httpGitApi.listarSolicitudesForja(repoPath);
        if (vivo) {
          setSolicitudes(d.solicitudes);
          setProveedor(d.origin.proveedor);
          setSeleccion(null);
          setDiff('');
        }
      } catch (err: unknown) {
        if (vivo) {
          const mensaje = err instanceof Error ? err.message : 'La forja no responde.';
          setAvisoForja(mensaje);
          setSolicitudes([]);
          onError(mensaje);
        }
      } finally {
        if (vivo) setCargandoLista(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [repoPath, onError]);

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
    <ModalCapa ancho="wide" onCerrar={onClose} labelledBy="titulo-forjas" className="bg-surface-container select-none max-h-[85vh] flex flex-col">
        <ModalEncabezado
          id="titulo-forjas"
          titulo={`Forjas — ${etiqueta} del origin`}
          subtitulo="OAuth, listado y creación de solicitudes"
          icono={<GitPullRequest className="w-4 h-4 text-secondary" />}
          onCerrar={onClose}
        />

        <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low/60 space-y-2">
          <div className="flex items-center gap-1.5 text-code-sm font-semibold text-on-surface-variant">
            <KeyRound className="w-3.5 h-3.5 text-ember shrink-0" />
            <span className={ui.labelCaps}>OAuth (tokens cifrados en disco)</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {(['github', 'gitlab'] as const).map((p) => {
              const cuenta = cuentas.find((c) => c.proveedor === p);
              const configurado = p === 'github' ? githubOk : gitlabOk;
              return (
                <div key={p} className="flex items-center space-x-2 text-xs">
                  <span className="text-on-surface-variant">
                    {p === 'github' ? 'GitHub' : 'GitLab'}
                    {cuenta?.usuario ? ` · ${cuenta.usuario}` : ''}
                  </span>
                  {cuenta ? (
                    <button type="button" onClick={() => desconectar(p)} className="text-error hover:underline">
                      Desconectar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!configurado}
                      onClick={() => conectar(p)}
                      className="text-primary hover:underline disabled:text-on-surface-variant/50 disabled:no-underline"
                    >
                      {configurado ? 'Conectar' : 'Sin client OAuth'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 pt-3 border-b border-outline-variant">
          <Pestannas
            activa={tab}
            onCambiar={(id) => setTab(id as 'lista' | 'crear')}
            pestanas={[
              { id: 'lista', etiqueta: `Listar ${etiqueta}` },
              { id: 'crear', etiqueta: `Crear ${proveedor === 'gitlab' ? 'MR' : 'PR'}` },
            ]}
          />
        </div>

        {tab === 'lista' ? (
          <PanelListaForjas
            cargandoLista={cargandoLista}
            avisoForja={avisoForja}
            solicitudes={solicitudes}
            seleccion={seleccion}
            diff={diff}
            cargandoDiff={cargandoDiff}
            checkoutEnCurso={checkoutEnCurso}
            onAbrir={(s) => void abrirDiff(s)}
            onCheckout={() => void checkout()}
          />
        ) : (
          <FormularioCrearForja
            ramaActual={ramaActual}
            titulo={titulo}
            cuerpo={cuerpo}
            base={base}
            basesSugeridas={basesSugeridas}
            creando={creando}
            creada={creada}
            etiquetaCrear={`Crear ${proveedor === 'gitlab' ? 'MR' : 'PR'}`}
            onTitulo={setTitulo}
            onCuerpo={setCuerpo}
            onBase={setBase}
            onSubmit={crear}
            onClose={onClose}
          />
        )}
    </ModalCapa>
  );
};
