export type SolicitudForja = {
  proveedor: 'github' | 'gitlab';
  numero: number;
  titulo: string;
  estado: string;
  ramaOrigen: string;
  ramaDestino: string;
  autor: string;
  url: string;
  esFork: boolean;
  shaCabeza: string;
};

export type SolicitudCreada = {
  numero: number;
  url: string;
  titulo: string;
};
