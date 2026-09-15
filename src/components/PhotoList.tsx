import React, { useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  RotateCw,
  Plus,
  Minus,
  Layers,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { PhotoItem, GridCell } from '../types';

interface PhotoListProps {
  photos: PhotoItem[];
  gridCells: GridCell[];
  onAddFiles: (files: FileList | File[]) => void;
  onAddSingleCopy: (photo: PhotoItem) => void;
  onRemovePhoto: (id: string) => void;
  onRotatePhoto: (id: string) => void;
  onResetPhoto: (id: string) => void;
  onUpdateCopies: (id: string, delta: number) => void;
  onFillGridWithPhoto: (photo: PhotoItem) => void;
  onClearAll: () => void;
  cellsPerPage: number;
  isUploading?: boolean;
}

export const PhotoList: React.FC<PhotoListProps> = ({
  photos,
  gridCells,
  onAddFiles,
  onAddSingleCopy,
  onRemovePhoto,
  onRotatePhoto,
  onResetPhoto,
  onUpdateCopies,
  onFillGridWithPhoto,
  onClearAll,
  isUploading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white border-t border-slate-200 p-2.5 sm:p-3 shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif,.heic,.heif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* When no photos are uploaded: Only the single big upload zone is shown */}
      {photos.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl py-10 px-4 text-center transition-all ${
            isUploading ? 'cursor-wait opacity-75 border-slate-400 bg-slate-50' : 'cursor-pointer'
          } ${
            isDragging
              ? 'border-slate-800 bg-slate-100/80 scale-[0.99]'
              : 'border-slate-300 hover:border-slate-500 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs">
            {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> : <Upload className="w-6 h-6" />}
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">
            {isUploading ? 'Subiendo fotos, por favor espera...' : 'Arrastra tus fotos aquí o haz clic para seleccionarlas'}
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            {isUploading ? 'Procesando imágenes de alta calidad...' : 'Compatible con JPG, PNG con fondo blanco automático, WebP y fotos de iPhone (HEIC / HEIF).'}
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              disabled={isUploading}
              onClick={(e) => {
                e.stopPropagation();
                if (!isUploading) fileInputRef.current?.click();
              }}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors active:scale-95"
            >
              Seleccionar fotos
            </button>
          </div>
        </div>
      ) : (
        /* Horizontal Carousel with compact thumbnails and "+1 Copia" action */
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-slate-700">
              Fotos subidas ({photos.length})
            </span>
            <div className="flex items-center gap-2">
              {isUploading && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...
                </span>
              )}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-800 hover:text-black disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir más fotos</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
              >
                Limpiar todo
              </button>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 px-0.5 scrollbar-thin scrollbar-thumb-slate-300 ${
              isDragging ? 'ring-2 ring-slate-400 bg-slate-50 rounded-lg' : ''
            }`}
          >
            {/* Quick Add Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-20 w-16 rounded-lg border border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-700 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-medium">Subir</span>
            </button>

            {/* Photo Cards */}
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative h-20 w-28 bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden flex flex-col shrink-0 hover:border-slate-400 transition-all"
              >
                {/* Image Container with pure white background */}
                <div className="relative flex-1 bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="max-h-full max-w-full object-contain select-none"
                    style={{
                      transform: `scale(${photo.zoom || 1}) rotate(${photo.rotation}deg)`,
                      objectPosition: `${50 + (photo.offsetX || 0)}% ${50 + (photo.offsetY || 0)}%`,
                    }}
                  />

                  {/* Index badge */}
                  <span className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] font-mono px-1 rounded-2xs">
                    #{index + 1}
                  </span>

                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-slate-900/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                    {/* Add one more copy button to canvas */}
                    <button
                      type="button"
                      onClick={() => onAddSingleCopy(photo)}
                      title="Agregar otra copia a la hoja"
                      className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Reset position */}
                    <button
                      type="button"
                      onClick={() => onResetPhoto(photo.id)}
                      title="Devolver a la posición original centrada"
                      className="p-1 rounded bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Fill Page */}
                    <button
                      type="button"
                      onClick={() => onFillGridWithPhoto(photo)}
                      title="Llenar toda la hoja con esta foto"
                      className="p-1 rounded bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>

                    {/* Rotate */}
                    <button
                      type="button"
                      onClick={() => onRotatePhoto(photo.id)}
                      title="Rotar 90°"
                      className="p-1 rounded bg-white/90 hover:bg-white text-slate-700 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(photo.id)}
                      title="Eliminar foto"
                      className="p-1 rounded bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Copies counter and name */}
                <div className="px-1.5 py-0.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="truncate text-slate-500 max-w-[50px] font-mono text-[9px]" title={photo.name}>
                    {photo.name}
                  </span>

                  <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded px-1">
                    <button
                      type="button"
                      onClick={() => onUpdateCopies(photo.id, -1)}
                      disabled={gridCells.filter(c => c.photoId === photo.id).length <= 0}
                      title="Quitar una copia"
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="font-semibold text-slate-700 min-w-[12px] text-center text-[10px]">
                      {gridCells.filter(c => c.photoId === photo.id).length}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateCopies(photo.id, 1)}
                      title="Agregar una copia"
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
