import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ProveedorForja } from './inyectarTokenHttps.js';

export type CredencialForja = {
  proveedor: ProveedorForja;
  token: string;
  usuario?: string;
};

type AlmacenPlano = {
  credenciales: CredencialForja[];
};

const ALGORITMO = 'aes-256-gcm';

function directorioConfig(): string {
  return path.join(os.homedir(), '.abyssan');
}

function rutaArchivo(): string {
  return path.join(directorioConfig(), 'credenciales.enc');
}

function rutaClave(): string {
  return path.join(directorioConfig(), 'clave');
}

function obtenerClave(): Buffer {
  const desdeEnv = process.env.ABYSSAN_SECRETO_CIFRADO?.trim();
  if (desdeEnv) {
    return crypto.createHash('sha256').update(desdeEnv).digest();
  }
  const dir = directorioConfig();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.existsSync(rutaClave())) {
    return Buffer.from(fs.readFileSync(rutaClave(), 'utf8').trim(), 'hex');
  }
  const clave = crypto.randomBytes(32);
  fs.writeFileSync(rutaClave(), clave.toString('hex'), { mode: 0o600 });
  return clave;
}

function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerClave(), iv);
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${cifrado.toString('base64')}`;
}

function descifrar(paquete: string): string {
  const [ivB64, tagB64, dataB64] = paquete.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Almacén de credenciales corrupto');
  const decipher = crypto.createDecipheriv(ALGORITMO, obtenerClave(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString(
    'utf8'
  );
}

function leer(): AlmacenPlano {
  if (!fs.existsSync(rutaArchivo())) return { credenciales: [] };
  try {
    const plano = descifrar(fs.readFileSync(rutaArchivo(), 'utf8'));
    return JSON.parse(plano) as AlmacenPlano;
  } catch {
    return { credenciales: [] };
  }
}

function escribir(almacen: AlmacenPlano): void {
  const dir = directorioConfig();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(rutaArchivo(), cifrar(JSON.stringify(almacen)), { mode: 0o600 });
}

export class AlmacenCredencialesForja {
  listarPublico(): { proveedor: ProveedorForja; usuario?: string }[] {
    return leer().credenciales.map((c) => ({ proveedor: c.proveedor, usuario: c.usuario }));
  }

  obtener(proveedor: ProveedorForja): CredencialForja | undefined {
    return leer().credenciales.find((c) => c.proveedor === proveedor);
  }

  guardar(credencial: CredencialForja): void {
    const actual = leer();
    const resto = actual.credenciales.filter((c) => c.proveedor !== credencial.proveedor);
    escribir({ credenciales: [...resto, credencial] });
  }

  borrar(proveedor: ProveedorForja): void {
    const actual = leer();
    escribir({ credenciales: actual.credenciales.filter((c) => c.proveedor !== proveedor) });
  }
}

export const almacenCredencialesForja = new AlmacenCredencialesForja();
