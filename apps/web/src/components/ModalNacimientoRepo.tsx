import React, { useEffect, useState } from 'react';
import { FolderGit2, GitFork, KeyRound } from 'lucide-react';
import { httpGitApi, CuentaForja } from '../infrastructure/api/HttpGitApi';
import { ModalCapa } from './ui/modal-capa';
import { ModalEncabezado } from './ui/modal-encabezado';
import { ModalPie } from './ui/modal-pie';
import { CampoEntrada } from './ui/campo-entrada';
import { Pestannas } from './ui/pestannas';

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
      <ModalEncabezado
        id="titulo-nacimiento"
        titulo="Repositorio objetivo"
        subtitulo="Clonar desde remoto o inicializar en PROJECTS_ROOT"
        icono={<FolderGit2 className="w-4 h-4 text-primary" />}
        onCerrar={onClose}
      />

      <div className="px-4 pt-4">
        <Pestannas
          activa={tab}
          onCambiar={(id) => setTab(id as 'clone' | 'init')}
          pestanas={[
            { id: 'clone', etiqueta: 'Clonar repositorio', icono: <GitFork className="w-3.5 h-3.5" /> },
            { id: 'init', etiqueta: 'Inicializar nuevo', icono: <FolderGit2 className="w-3.5 h-3.5" /> },
          ]}
        />
      </div>

      <form onSubmit={enviar} className="px-4 pb-4 pt-4 space-y-4">
          {tab === 'clone' && (
            <CampoEntrada
              id="clone-url"
              etiqueta="URL del repositorio"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/org/repo.git"
              variante="subrayado"
            />
          )}
          <CampoEntrada
            id="clone-carpeta"
            etiqueta="Ruta de destino (PROJECTS_ROOT)"
            value={carpeta}
            onChange={(e) => setCarpeta(e.target.value)}
            placeholder="org/repo_name"
            variante="subrayado"
            ayuda="Máximo dos niveles de profundidad."
          />

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

          <ModalPie
            onCancelar={onClose}
            tipoConfirmar="submit"
            etiquetaConfirmar={tab === 'clone' ? 'Comenzar clonación' : 'Inicializar'}
            deshabilitado={cargando || !carpeta.trim() || (tab === 'clone' && !url.trim())}
            cargando={cargando}
            iconoConfirmar={<GitFork className="w-3.5 h-3.5" />}
          />
        </form>
    </ModalCapa>
  );
};
