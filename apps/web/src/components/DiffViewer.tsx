import React, { useEffect, useMemo, useState } from 'react';
import { FileCode, Plus, Minus, Columns2, AlignJustify } from 'lucide-react';
import { createHighlighter, type Highlighter } from 'shiki';

interface DiffViewerProps {
  diff: string;
  filePath: string;
  isStaged: boolean;
}

type TipoLinea = 'header' | 'addition' | 'deletion' | 'normal' | 'meta';

type LineaDiff = {
  id: number;
  raw: string;
  type: TipoLinea;
  oldNo?: number;
  newNo?: number;
  code: string;
};

const LANG_POR_EXT: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  md: 'markdown',
  css: 'css',
  html: 'html',
  py: 'python',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  rs: 'rust',
  go: 'go',
};

let highlighterPromise: Promise<Highlighter> | null = null;

function obtenerHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: ['typescript', 'tsx', 'javascript', 'jsx', 'json', 'markdown', 'css', 'html', 'python', 'yaml', 'bash', 'rust', 'go'],
    });
  }
  return highlighterPromise;
}

function langDe(filePath: string): string | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return LANG_POR_EXT[ext];
}

function parsearDiff(diff: string): LineaDiff[] {
  if (!diff) return [];
  const lines = diff.split('\n');
  let oldNo = 0;
  let newNo = 0;
  return lines.map((line, index) => {
    if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      return { id: index, raw: line, type: 'meta' as const, code: line };
    }
    if (line.startsWith('@@')) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldNo = parseInt(m[1], 10);
        newNo = parseInt(m[2], 10);
      }
      return { id: index, raw: line, type: 'header' as const, code: line };
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const row: LineaDiff = { id: index, raw: line, type: 'addition', newNo, code: line.slice(1) };
      newNo += 1;
      return row;
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      const row: LineaDiff = { id: index, raw: line, type: 'deletion', oldNo, code: line.slice(1) };
      oldNo += 1;
      return row;
    }
    const row: LineaDiff = { id: index, raw: line, type: 'normal', oldNo, newNo, code: line.startsWith(' ') ? line.slice(1) : line };
    oldNo += 1;
    newNo += 1;
    return row;
  });
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, filePath, isStaged }) => {
  const [modo, setModo] = useState<'unified' | 'split'>('unified');
  const [htmlPorLinea, setHtmlPorLinea] = useState<Record<number, string>>({});
  const parsedLines = useMemo(() => parsearDiff(diff), [diff]);

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    parsedLines.forEach((l) => {
      if (l.type === 'addition') additions++;
      if (l.type === 'deletion') deletions++;
    });
    return { additions, deletions };
  }, [parsedLines]);

  useEffect(() => {
    let cancelado = false;
    const lang = langDe(filePath);
    obtenerHighlighter()
      .then(async (hl) => {
        const mapa: Record<number, string> = {};
        for (const linea of parsedLines) {
          if (linea.type === 'header' || linea.type === 'meta') continue;
          if (!lang) {
            mapa[linea.id] = escapeHtml(linea.code);
            continue;
          }
          try {
            const html = await hl.codeToHtml(linea.code || ' ', { lang, theme: 'github-dark' });
            const inner = html.replace(/^<pre[^>]*>/, '').replace(/<\/pre>$/, '');
            const code = inner.replace(/^<code[^>]*>/, '').replace(/<\/code>$/, '');
            mapa[linea.id] = code;
          } catch {
            mapa[linea.id] = escapeHtml(linea.code);
          }
        }
        if (!cancelado) setHtmlPorLinea(mapa);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [parsedLines, filePath]);

  const filasSplit = useMemo(() => armarSplit(parsedLines), [parsedLines]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f17] overflow-hidden">
      <div className="h-10 bg-[#141724] border-b border-[#23283b] px-4 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2 truncate">
          <FileCode className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono font-medium text-slate-200 truncate">{filePath}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
              isStaged
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isStaged ? 'Staged' : 'Unstaged'}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-[#1b1f30] rounded-md border border-[#2e354e] p-0.5">
            <button
              onClick={() => setModo('unified')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                modo === 'unified' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
              }`}
            >
              <AlignJustify className="w-3 h-3" />
              <span>Unificado</span>
            </button>
            <button
              onClick={() => setModo('split')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                modo === 'split' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
              }`}
            >
              <Columns2 className="w-3 h-3" />
              <span>Lado a lado</span>
            </button>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center text-emerald-400">
              <Plus className="w-3 h-3 mr-0.5" />
              {stats.additions}
            </span>
            <span className="flex items-center text-rose-400">
              <Minus className="w-3 h-3 mr-0.5" />
              {stats.deletions}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto font-['JetBrains_Mono',monospace] text-xs">
        {parsedLines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 italic">
            Sin diferencias para mostrar en este archivo
          </div>
        ) : modo === 'unified' ? (
          <div className="p-2 space-y-[1px]">
            {parsedLines.map((line) => (
              <FilaUnificada key={line.id} line={line} html={htmlPorLinea[line.id]} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-[#23283b] min-w-[640px]">
            {filasSplit.map((fila, i) => (
              <React.Fragment key={i}>
                <CeldaSplit lado={fila.izq} html={fila.izq ? htmlPorLinea[fila.izq.id] : undefined} />
                <CeldaSplit lado={fila.der} html={fila.der ? htmlPorLinea[fila.der.id] : undefined} />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function FilaUnificada({ line, html }: { line: LineaDiff; html?: string }) {
  let bgClass = 'hover:bg-white/[0.02] text-slate-300';
  if (line.type === 'header' || line.type === 'meta') bgClass = 'bg-sky-950/40 text-sky-300 py-1 font-bold';
  if (line.type === 'addition') bgClass = 'bg-emerald-950/40 text-emerald-300';
  if (line.type === 'deletion') bgClass = 'bg-rose-950/40 text-rose-300';

  return (
    <div className={`flex items-start px-2 py-0.5 ${bgClass}`}>
      <span className="w-10 shrink-0 text-right pr-2 text-slate-600 select-none">{line.oldNo ?? ''}</span>
      <span className="w-10 shrink-0 text-right pr-2 text-slate-600 select-none">{line.newNo ?? ''}</span>
      <span className="w-4 shrink-0 font-bold select-none">
        {line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '}
      </span>
      {html && line.type !== 'header' && line.type !== 'meta' ? (
        <code
          className="flex-1 overflow-x-auto whitespace-pre leading-relaxed [&_span]:bg-transparent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="flex-1 overflow-x-auto whitespace-pre leading-relaxed">{line.code}</pre>
      )}
    </div>
  );
}

function CeldaSplit({ lado, html }: { lado?: LineaDiff; html?: string }) {
  if (!lado) {
    return <div className="min-h-[1.4rem] bg-[#0d0f17]" />;
  }
  const bg =
    lado.type === 'addition'
      ? 'bg-emerald-950/40 text-emerald-300'
      : lado.type === 'deletion'
        ? 'bg-rose-950/40 text-rose-300'
        : lado.type === 'header' || lado.type === 'meta'
          ? 'bg-sky-950/30 text-sky-300'
          : 'text-slate-300';
  const num = lado.type === 'addition' ? lado.newNo : lado.oldNo ?? lado.newNo;
  return (
    <div className={`flex items-start px-2 py-0.5 ${bg}`}>
      <span className="w-10 shrink-0 text-right pr-2 text-slate-600 select-none">{num ?? ''}</span>
      {html && lado.type !== 'header' && lado.type !== 'meta' ? (
        <code
          className="flex-1 overflow-x-auto whitespace-pre leading-relaxed [&_span]:bg-transparent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="flex-1 overflow-x-auto whitespace-pre leading-relaxed">{lado.code}</pre>
      )}
    </div>
  );
}

function armarSplit(lineas: LineaDiff[]): { izq?: LineaDiff; der?: LineaDiff }[] {
  const filas: { izq?: LineaDiff; der?: LineaDiff }[] = [];
  for (const l of lineas) {
    if (l.type === 'deletion') filas.push({ izq: l });
    else if (l.type === 'addition') {
      const ultima = filas[filas.length - 1];
      if (ultima && ultima.izq?.type === 'deletion' && !ultima.der) ultima.der = l;
      else filas.push({ der: l });
    } else {
      filas.push({ izq: l, der: l });
    }
  }
  return filas;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
