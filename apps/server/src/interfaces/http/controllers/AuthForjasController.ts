import { Request, Response } from 'express';
import crypto from 'node:crypto';
import { almacenCredencialesForja } from '../../../infrastructure/credenciales/AlmacenCredencialesForja.js';
import type { ProveedorForja } from '../../../infrastructure/credenciales/inyectarTokenHttps.js';
import { responderExito, responderFallo } from '../respuestaApi.js';

type EstadoOAuth = { proveedor: ProveedorForja; creado: number };
const estados = new Map<string, EstadoOAuth>();
const TTL_MS = 10 * 60 * 1000;

function limpiarEstados(): void {
  const ahora = Date.now();
  for (const [k, v] of estados) {
    if (ahora - v.creado > TTL_MS) estados.delete(k);
  }
}

function origenSpa(): string {
  return process.env.VITE_API_URL
    ? process.env.VITE_API_URL.replace(':3001', ':5174')
    : 'http://localhost:5174';
}

function callbackUrl(): string {
  return process.env.OAUTH_CALLBACK_URL || 'http://localhost:3001/api/auth/callback';
}

export class AuthForjasController {
  listar(_req: Request, res: Response) {
    responderExito(
      res,
      {
        cuentas: almacenCredencialesForja.listarPublico(),
        githubConfigurado: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
        gitlabConfigurado: Boolean(process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET),
      },
      'Cuentas de forja'
    );
  }

  iniciarGithub(_req: Request, res: Response) {
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    if (!clientId) {
      responderFallo(res, 'GITHUB_CLIENT_ID no está configurado en el servidor', 400);
      return;
    }
    limpiarEstados();
    const state = crypto.randomBytes(16).toString('hex');
    estados.set(state, { proveedor: 'github', creado: Date.now() });
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl());
    url.searchParams.set('scope', 'repo');
    url.searchParams.set('state', state);
    responderExito(res, { url: url.toString() }, 'Redirigir a GitHub');
  }

  iniciarGitlab(_req: Request, res: Response) {
    const clientId = process.env.GITLAB_CLIENT_ID?.trim();
    if (!clientId) {
      responderFallo(res, 'GITLAB_CLIENT_ID no está configurado en el servidor', 400);
      return;
    }
    limpiarEstados();
    const state = crypto.randomBytes(16).toString('hex');
    estados.set(state, { proveedor: 'gitlab', creado: Date.now() });
    const url = new URL('https://gitlab.com/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'read_repository write_repository api');
    url.searchParams.set('state', state);
    responderExito(res, { url: url.toString() }, 'Redirigir a GitLab');
  }

  async callback(req: Request, res: Response) {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const registro = estados.get(state);
    estados.delete(state);
    const spa = origenSpa();

    if (!code || !registro) {
      res.redirect(`${spa}/?oauth=error&motivo=estado`);
      return;
    }

    try {
      if (registro.proveedor === 'github') {
        await this.intercambiarGithub(code);
      } else {
        await this.intercambiarGitlab(code);
      }
      res.redirect(`${spa}/?oauth=ok&proveedor=${registro.proveedor}`);
    } catch {
      res.redirect(`${spa}/?oauth=error&motivo=token`);
    }
  }

  desconectar(req: Request, res: Response) {
    const proveedor = req.params.proveedor as ProveedorForja;
    if (proveedor !== 'github' && proveedor !== 'gitlab') {
      responderFallo(res, 'Proveedor no válido', 400);
      return;
    }
    almacenCredencialesForja.borrar(proveedor);
    responderExito(res, {}, `Cuenta ${proveedor} desconectada`);
  }

  private async intercambiarGithub(code: string): Promise<void> {
    const body = {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl(),
    };
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenJson.access_token) {
      throw new Error(tokenJson.error || 'Sin token de GitHub');
    }
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Abyssan',
      },
    });
    const user = (await userRes.json()) as { login?: string };
    almacenCredencialesForja.guardar({
      proveedor: 'github',
      token: tokenJson.access_token,
      usuario: user.login,
    });
  }

  private async intercambiarGitlab(code: string): Promise<void> {
    const params = new URLSearchParams({
      client_id: process.env.GITLAB_CLIENT_ID || '',
      client_secret: process.env.GITLAB_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl(),
    });
    const tokenRes = await fetch('https://gitlab.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenJson.access_token) {
      throw new Error(tokenJson.error || 'Sin token de GitLab');
    }
    const userRes = await fetch('https://gitlab.com/api/v4/user', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const user = (await userRes.json()) as { username?: string };
    almacenCredencialesForja.guardar({
      proveedor: 'gitlab',
      token: tokenJson.access_token,
      usuario: user.username,
    });
  }
}

export const authForjasController = new AuthForjasController();
