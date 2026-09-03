import React, { useEffect, useState } from 'react';
import { FolderGit2, GitFork, X, KeyRound } from 'lucide-react';
import { httpGitApi, CuentaForja } from '../infrastructure/api/HttpGitApi';
import { ModalCapa } from './ui/modal-capa';
import { ui } from '../lib/diseno';

interface ModalNacimientoRepoProps {
  onClose: () => void;
  onClonado: (repoPath: string) => void;
  onInicializado: (repoPath: string) => void;
  onError: (mensaje: string) => void;
}

export const ModalNacimientoRepo: React.FC<ModalNacimientoRepoProps> = ({
  onClose,
  onClonado,
  onInicializado,
  onError,
}) => {
  const [tab, setTab] = useState<'clone' | 'init'>('clone');
  const [url, setUrl] = useState('');
  const [carpeta, setCarpeta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cuentas, setCuentas] = useState<CuentaForja[]>([]);
  const [githubOk, setGithubOk] = useState(false);
  const [gitlabOk, setGitlabOk] = useState(false);

  useEffect(() => {
    httpGitApi
      .listarForjas()
      .then((d) => {
        setCuentas(d.cuentas);
        setGithubOk(d.githubConfigurado);
        setGitlabOk(d.gitlabConfigurado);
      })
      .catch(() => undefined);
  }, []);

  const conectar = async (proveedor: 'github' | 'gitlab') => {
    try {
      const destino = await httpGitApi.iniciarOAuth(proveedor);
      window.location.href = destino;
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo iniciar OAuth');
    }
  };

  const desconectar = async (proveedor: 'github' | 'gitlab') => {
    try {
      await httpGitApi.desconectarForja(proveedor);
      const d = await httpGitApi.listarForjas();
      setCuentas(d.cuentas);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo desconectar');
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carpeta.trim()) return;
    setCargando(true);
    try {
      if (tab === 'clone') {
        const datos = await httpGitApi.clonarRepositorio(url.trim(), carpeta.trim());
        onClonado(datos.path);
      } else {
        const datos = await httpGitApi.inicializarRepositorio(carpeta.trim());
        onInicializado(datos.path);
      }
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Operación fallida');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ModalCapa ancho="lg" onCerrar={onClose} labelledBy="titulo-nacimiento" className="bg-surface-container select-none">
      <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-high/50">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-5 h-5 text-primary" />
          <h3 id="titulo-nacimiento" className="text-headline-sm text-on-surface">Repository Target</h3>
        </div>
        <button type="button" onClick={onClose} className={ui.btnIcono} aria-label="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex bg-surface-container-lowest p-1 m-4 rounded border border-outline-variant relative">
        <button
          type="button"
          className={`flex-1 py-2 text-label-md font-medium rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'clone' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => setTab('clone')}
        >
          <GitFork className="w-3.5 h-3.5" />
          Clonar repositorio
        </button>
        <button
          type="button"
          className={`flex-1 py-2 text-label-md font-medium rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'init' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => setTab('init')}
        >
          Inicializar nuevo
        </button>
      </div>

      <form onSubmit={enviar} className="px-4 pb-4 space-y-4">
          {tab === 'clone' && (
            <div>
              <label htmlFor="clone-url" className="block text-label-caps text-on-surface-variant mb-1">
                URL del repositorio
              </label>
              <input
                id="clone-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/org/repo.git"
                className={ui.inputUnderline}
              />
            </div>
          )}
          <div>
            <label htmlFor="clone-carpeta" className="block text-label-caps text-on-surface-variant mb-1">
              Ruta de destino (PROJECTS_ROOT)
            </label>
            <input
              id="clone-carpeta"
              value={carpeta}
              onChange={(e) => setCarpeta(e.target.value)}
              placeholder="org/repo_name"
              className={ui.inputUnderline}
            />
            <p className="text-label-md text-on-surface-variant/70 mt-1">Máximo dos niveles de profundidad.</p>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 space-y-2">
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-on-surface-variant uppercase">
              <KeyRound className="w-3.5 h-3.5 text-ember" />
              <span>Cuentas para repos privados</span>
            </div>
            {(['github', 'gitlab'] as const).map((p) => {
              const cuenta = cuentas.find((c) => c.proveedor === p);
              const configurado = p === 'github' ? githubOk : gitlabOk;
              return (
                <div key={p} className="flex items-center justify-between text-xs">
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
                      title={configurado ? `Conectar ${p}` : 'Falta CLIENT_ID en .env'}
                    >
                      {configurado ? 'Conectar' : 'Sin client OAuth'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 border-t border-outline-variant pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-label-md text-on-surface-variant hover:text-on-surface">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || !carpeta.trim() || (tab === 'clone' && !url.trim())}
              className={ui.btnPrimario}
            >
              <GitFork className="w-3.5 h-3.5" />
              {tab === 'clone' ? 'Comenzar clonación' : 'Inicializar'}
            </button>
          </div>
        </form>    </ModalCapa>
  );
};
