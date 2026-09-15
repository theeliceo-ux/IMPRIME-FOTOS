import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Download, ExternalLink, X } from 'lucide-react';
import { ExportProgress } from '../types';
import { downloadBlob } from '../utils/downloadHelper';

interface ExportModalProps {
  progress: ExportProgress;
  type: 'pdf' | 'docx' | null;
  downloadUrl: string | null;
  blob: Blob | null;
  fileName: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  progress,
  type,
  downloadUrl,
  blob,
  fileName,
  onClose,
}) => {
  if (!progress.active && !downloadUrl && !progress.error) return null;

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const handleManualDownload = () => {
    if (blob) {
      downloadBlob(blob, fileName);
    } else if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleOpenInNewTab = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Cerrar ventana"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Error State */}
        {progress.error ? (
          <div className="text-center space-y-4 pt-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">
                No se pudo generar el documento
              </h3>
              <p className="text-xs text-rose-600 mt-1.5 font-medium px-2 py-1.5 bg-rose-50 rounded-lg">
                {progress.error}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Asegúrate de que las fotos cargadas sean válidas o intenta reducir la cantidad de fotos por página.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        ) : progress.active ? (
          /* Progress State */
          <div className="text-center space-y-4 pt-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shadow-inner">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">
                {type === 'pdf' ? 'Generando Documento PDF...' : 'Generando Documento Word (.docx)...'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{progress.stage}</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-slate-900 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>
                  {progress.current} de {progress.total} páginas
                </span>
                <span>{percent}%</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Procesamiento de alta resolución directamente en tu navegador.
            </p>
          </div>
        ) : (
          /* Ready / Complete State */
          downloadUrl && (
            <div className="text-center space-y-4 pt-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-800">¡Documento Listo para Guardar!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tu archivo <strong className="text-slate-800 font-mono">{fileName}</strong> se ha generado exitosamente.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleManualDownload}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo Ahora</span>
                </button>

                {type === 'pdf' && (
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir en Nueva Pestaña</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
