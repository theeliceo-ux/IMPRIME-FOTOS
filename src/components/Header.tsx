import React from 'react';
import {
  Printer,
  FileText,
  FileSpreadsheet,
  Upload,
  LayoutGrid,
  Trash2,
} from 'lucide-react';

interface HeaderProps {
  photoCount: number;
  totalPages: number;
  totalCopies: number;
  onUploadClick: () => void;
  onClearAll: () => void;
  onPrint: () => void;
  onExportPdf: () => void;
  onExportWord: () => void;
  isExporting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  photoCount,
  totalPages,
  totalCopies,
  onUploadClick,
  onClearAll,
  onPrint,
  onExportPdf,
  onExportWord,
  isExporting,
}) => {
  return (
    <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-3 sm:px-6 py-2 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
        {/* Brand & Stats (Scales down gracefully on small devices) */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-xs sm:text-sm tracking-tight text-slate-900 truncate">
              Ordena e Imprime
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap">
              <span>{photoCount} fotos</span>
              <span>•</span>
              <span>{totalPages} {totalPages === 1 ? 'pág' : 'págs'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls - Responsive with icons on mobile and text on larger screens */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
          {/* Main CTA: Subir Fotos */}
          <button
            id="header-upload-btn"
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer hover:shadow active:scale-95"
            title="Subir fotos desde tu equipo"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">Subir fotos</span>
          </button>

          {/* Clear photos */}
          {photoCount > 0 && (
            <button
              id="header-clear-btn"
              type="button"
              onClick={onClearAll}
              title="Borrar todas las fotos"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 mx-0.5 sm:mx-1" />

          {/* Print Directly */}
          <button
            id="header-print-btn"
            type="button"
            disabled={photoCount === 0 || isExporting}
            onClick={onPrint}
            title="Imprimir directamente desde el navegador"
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {/* PDF Export */}
          <button
            id="header-export-pdf-btn"
            type="button"
            disabled={photoCount === 0 || isExporting}
            onClick={onExportPdf}
            title="Descargar archivo PDF listo para imprimir"
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>PDF</span>
          </button>

          {/* Word Export */}
          <button
            id="header-export-word-btn"
            type="button"
            disabled={photoCount === 0 || isExporting}
            onClick={onExportWord}
            title="Descargar documento Word (.docx)"
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="hidden sm:inline">Word</span>
          </button>
        </div>
      </div>
    </header>
  );
};
