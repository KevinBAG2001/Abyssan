import React, { useEffect, useState } from 'react';
import { FolderGit2, GitFork, X, KeyRound } from 'lucide-react';
import { httpGitApi, CuentaForja } from '../infrastructure/api/HttpGitApi';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-[#181c2d] border border-[#2e354e] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#23283b] flex items-center justify-between bg-[#141724]">
          <div className="flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Nuevo repositorio</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#23283b] text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-[#23283b]">
          <button
            className={`flex-1 py-2 text-xs font-semibold ${
              tab === 'clone' ? 'text-emerald-300 border-b-2 border-emerald-400' : 'text-slate-400'
            }`}
            onClick={() => setTab('clone')}
          >
            Clonar HTTPS
          </button>
          <button
            className={`flex-1 py-2 text-xs font-semibold ${
              tab === 'init' ? 'text-emerald-300 border-b-2 border-emerald-400' : 'text-slate-400'
            }`}
            onClick={() => setTab('init')}
          >
            Init carpeta vacía
          </button>
        </div>

        <form onSubmit={enviar} className="p-4 space-y-3">
          {tab === 'clone' && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/org/repo.git"
              className="w-full bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          )}
          <input
            value={carpeta}
            onChange={(e) => setCarpeta(e.target.value)}
            placeholder="Nombre de carpeta bajo PROJECTS_ROOT"
            className="w-full bg-[#10131e] border border-[#2e354e] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />

          <div className="rounded-lg border border-[#2e354e] bg-[#141724] p-3 space-y-2">
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400 uppercase">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Cuentas para repos privados</span>
            </div>
            {(['github', 'gitlab'] as const).map((p) => {
              const cuenta = cuentas.find((c) => c.proveedor === p);
              const configurado = p === 'github' ? githubOk : gitlabOk;
              return (
                <div key={p} className="flex items-center justify-between text-xs">
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
                      title={configurado ? `Conectar ${p}` : 'Falta CLIENT_ID en .env'}
                    >
                      {configurado ? 'Conectar' : 'Sin client OAuth'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || !carpeta.trim() || (tab === 'clone' && !url.trim())}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded disabled:opacity-40"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>{tab === 'clone' ? 'Clonar' : 'Inicializar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
