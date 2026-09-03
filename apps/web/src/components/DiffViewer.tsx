import React, { useEffect, useMemo, useState } from 'react';
import { FileCode, Plus, Minus, Columns2, AlignJustify } from 'lucide-react';
import { createHighlighter, type Highlighter } from 'shiki';
import { cn } from '../lib/utils';

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
        const pares = await Promise.all(
          parsedLines.map(async (linea) => {
            if (linea.type === 'header' || linea.type === 'meta') return null;
            if (!lang) return [linea.id, escapeHtml(linea.code)] as const;
            try {
              const html = await hl.codeToHtml(linea.code || ' ', { lang, theme: 'github-dark' });
              const inner = html.replace(/^<pre[^>]*>/, '').replace(/<\/pre>$/, '');
              const code = inner.replace(/^<code[^>]*>/, '').replace(/<\/code>$/, '');
              return [linea.id, code] as const;
            } catch {
              return [linea.id, escapeHtml(linea.code)] as const;
            }
          })
        );
        if (cancelado) return;
        const mapa: Record<number, string> = {};
        for (const par of pares) {
          if (par) mapa[par[0]] = par[1];
        }
        setHtmlPorLinea(mapa);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [parsedLines, filePath]);

  const filasSplit = useMemo(() => armarSplit(parsedLines), [parsedLines]);

  return (
    <div className="flex-1 flex flex-col h-full bg-void overflow-hidden font-mono min-w-0">
      <div className="min-h-10 bg-surface-container-low border-b border-outline-variant px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileCode className="w-4 h-4 text-on-surface-variant shrink-0" />
          <span className="text-code-sm font-medium text-on-surface truncate">{filePath}</span>
          <span
            className={cn(
              'text-code-sm px-1.5 py-0.5 rounded font-semibold uppercase shrink-0',
              isStaged
                ? 'bg-primary-container/20 text-primary border border-primary/30'
                : 'bg-ember/20 text-ember border border-ember/30'
            )}
          >
            {isStaged ? 'Staged' : 'Unstaged'}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center bg-surface-container-high rounded border border-outline-variant p-0.5">
            <button
              type="button"
              onClick={() => setModo('unified')}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-code-sm font-semibold transition-colors',
                modo === 'unified' ? 'bg-primary-container/20 text-primary' : 'text-on-surface-variant'
              )}
            >
              <AlignJustify className="w-3 h-3" />
              <span className="hidden sm:inline">Unificado</span>
            </button>
            <button
              type="button"
              onClick={() => setModo('split')}
              className={cn(
                'hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-code-sm font-semibold transition-colors',
                modo === 'split' ? 'bg-primary-container/20 text-primary' : 'text-on-surface-variant'
              )}
            >
              <Columns2 className="w-3 h-3" />
              Lado a lado
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-code-sm">
            <span className="flex items-center text-primary">
              <Plus className="w-3 h-3 mr-0.5" />
              {stats.additions}
            </span>
            <span className="flex items-center text-magma">
              <Minus className="w-3 h-3 mr-0.5" />
              {stats.deletions}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto text-code-sm min-h-0">
        {parsedLines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-on-surface-variant/70 italic">
            Sin diferencias para mostrar en este archivo
          </div>
        ) : modo === 'unified' ? (
          <div className="p-2 space-y-[1px]">
            {parsedLines.map((line) => (
              <FilaUnificada key={line.id} line={line} html={htmlPorLinea[line.id]} />
            ))}
          </div>
        ) : modo === 'split' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant min-w-0">
            {filasSplit.map((fila) => (
              <React.Fragment key={`${fila.izq?.id ?? 'x'}-${fila.der?.id ?? 'y'}`}>
                <CeldaSplit lado={fila.izq} html={fila.izq ? htmlPorLinea[fila.izq.id] : undefined} />
                <CeldaSplit lado={fila.der} html={fila.der ? htmlPorLinea[fila.der.id] : undefined} />
              </React.Fragment>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

function FilaUnificada({ line, html }: { line: LineaDiff; html?: string }) {
  let bgClass = 'hover:bg-white/[0.02] text-on-surface-variant';
  if (line.type === 'header' || line.type === 'meta') bgClass = 'bg-secondary-container/30 text-secondary py-1 font-bold';
  if (line.type === 'addition') bgClass = 'bg-primary-container/10 text-primary';
  if (line.type === 'deletion') bgClass = 'bg-magma/10 text-magma';

  return (
    <div className={`flex items-start px-2 py-0.5 ${bgClass}`}>
      <span className="w-10 shrink-0 text-right pr-2 text-on-surface-variant/50 select-none">{line.oldNo ?? ''}</span>
      <span className="w-10 shrink-0 text-right pr-2 text-on-surface-variant/50 select-none">{line.newNo ?? ''}</span>
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
    return <div className="min-h-[1.4rem] bg-void" />;
  }
  const bg =
    lado.type === 'addition'
      ? 'bg-primary-container/10 text-primary'
      : lado.type === 'deletion'
        ? 'bg-magma/10 text-magma'
        : lado.type === 'header' || lado.type === 'meta'
          ? 'bg-secondary-container/30 text-secondary'
          : 'text-on-surface-variant';
  const num = lado.type === 'addition' ? lado.newNo : lado.oldNo ?? lado.newNo;
  return (
    <div className={`flex items-start px-2 py-0.5 ${bg}`}>
      <span className="w-10 shrink-0 text-right pr-2 text-on-surface-variant/50 select-none">{num ?? ''}</span>
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
