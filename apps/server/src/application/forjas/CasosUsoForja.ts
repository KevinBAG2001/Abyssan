import type { IGitRepository } from '../../domain/repositories/IGitRepository.js';
import { almacenCredencialesForja } from '../../infrastructure/credenciales/AlmacenCredencialesForja.js';
import type { ProveedorForja } from '../../infrastructure/credenciales/inyectarTokenHttps.js';
import { ClienteForjaHttp } from '../../infrastructure/forjas/ClienteForjaHttp.js';
import {
  elegirUrlOrigin,
  parsearOriginForja,
  type OriginForja,
} from '../../infrastructure/forjas/parsearOriginForja.js';
import type { SolicitudCreada, SolicitudForja } from '../../domain/entities/ForjaEntities.js';
import { ErrorForja } from './ErrorForja.js';

const NOMBRE_RAMA = /^(?!.*\.\.)[A-Za-z0-9._\-/]+$/;

export type LectorCredencialesForja = {
  obtener(proveedor: ProveedorForja): { token: string } | undefined;
};

function exigirRama(nombre: string): string {
  const recortada = nombre.trim();
  if (!recortada || recortada.startsWith('-') || !NOMBRE_RAMA.test(recortada)) {
    throw new ErrorForja('Nombre de rama no válido.', 400);
  }
  return recortada;
}

export class CasosUsoForja {
  constructor(
    private readonly git: IGitRepository,
    private readonly cliente: ClienteForjaHttp = new ClienteForjaHttp(),
    private readonly credenciales: LectorCredencialesForja = almacenCredencialesForja
  ) {}

  async listarSolicitudes(repoPath: string): Promise<{ origin: OriginForja; solicitudes: SolicitudForja[] }> {
    const origin = await this.resolverOrigin(repoPath);
    const token = this.exigirToken(origin.proveedor);
    const solicitudes = await this.cliente.listar(origin, token);
    return { origin, solicitudes };
  }

  async obtenerDiff(repoPath: string, numero: number): Promise<{ origin: OriginForja; diff: string }> {
    if (!Number.isInteger(numero) || numero <= 0) {
      throw new ErrorForja('Número de solicitud no válido.', 400);
    }
    const origin = await this.resolverOrigin(repoPath);
    const token = this.exigirToken(origin.proveedor);
    const diff = await this.cliente.obtenerDiff(origin, numero, token);
    return { origin, diff };
  }

  async checkoutSolicitud(repoPath: string, numero: number, ramaOrigen: string, esFork: boolean): Promise<string> {
    if (!Number.isInteger(numero) || numero <= 0) {
      throw new ErrorForja('Número de solicitud no válido.', 400);
    }
    const origin = await this.resolverOrigin(repoPath);
    const remoto = await this.nombreRemoto(repoPath);
    const origen = exigirRama(ramaOrigen);
    const ramaLocal = esFork
      ? `abyssan-${origin.proveedor === 'github' ? 'pr' : 'mr'}-${numero}`
      : origen;

    const refspec = esFork
      ? origin.proveedor === 'github'
        ? `+pull/${numero}/head:${ramaLocal}`
        : `+merge-requests/${numero}/head:${ramaLocal}`
      : origen;

    await this.git.fetchRefspec(repoPath, remoto, refspec);
    await this.git.checkout(repoPath, ramaLocal);
    return ramaLocal;
  }

  async crearSolicitud(
    repoPath: string,
    entrada: { titulo: string; cuerpo?: string; base: string; cabeza: string }
  ): Promise<SolicitudCreada> {
    const titulo = entrada.titulo?.trim();
    if (!titulo) throw new ErrorForja('El título es obligatorio.', 400);
    const origin = await this.resolverOrigin(repoPath);
    const token = this.exigirToken(origin.proveedor);
    return this.cliente.crear(origin, token, {
      titulo,
      cuerpo: entrada.cuerpo,
      base: exigirRama(entrada.base),
      cabeza: exigirRama(entrada.cabeza),
    });
  }

  private async resolverOrigin(repoPath: string): Promise<OriginForja> {
    const remotes = await this.git.getRemotes(repoPath);
    const url = elegirUrlOrigin(remotes);
    if (!url) {
      throw new ErrorForja('Este repositorio no tiene remoto origin. El Git local sigue disponible.', 400);
    }
    const origin = parsearOriginForja(url);
    if (!origin) {
      throw new ErrorForja(
        'El origin no es GitHub ni GitLab.com. Solo esas forjas están soportadas en esta fase.',
        400
      );
    }
    return origin;
  }

  private async nombreRemoto(repoPath: string): Promise<string> {
    const remotes = await this.git.getRemotes(repoPath);
    return remotes.some((r) => r.name === 'origin') ? 'origin' : remotes[0]?.name || 'origin';
  }

  private exigirToken(proveedor: OriginForja['proveedor']): string {
    const cred = this.credenciales.obtener(proveedor);
    if (!cred?.token) {
      throw new ErrorForja(
        `Conecta la cuenta ${proveedor === 'github' ? 'GitHub' : 'GitLab'} (OAuth). El Git local no se ve afectado.`,
        401
      );
    }
    return cred.token;
  }
}
