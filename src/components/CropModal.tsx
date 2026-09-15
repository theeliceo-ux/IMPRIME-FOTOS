import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  Check,
  X,
  RotateCw,
  Maximize2,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { PhotoItem } from '../types';

interface CropModalProps {
  photo: PhotoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyCrop: (photoId: string, croppedDataUrl: string, newWidth: number, newHeight: number) => void;
}

export const CropModal: React.FC<CropModalProps> = ({
  photo,
  isOpen,
  onClose,
  onApplyCrop,
}) => {
  if (!isOpen || !photo) return null;

  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '4:3' | '3:4' | '16:9' | 'custom_carnet'>('free');
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [isDragging, setIsDragging] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startRect: typeof cropRect } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgNaturalDim, setImgNaturalDim] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [previewRotation, setPreviewRotation] = useState<0 | 90 | 180 | 270>(0);

  // Initialize or reset crop rect when photo opens
  useEffect(() => {
    if (photo) {
      setPreviewRotation(0);
      const img = new Image();
      img.onload = () => {
        setImgNaturalDim({ width: img.naturalWidth, height: img.naturalHeight });
        setCropRect({ x: 10, y: 10, width: 80, height: 80 });
      };
      img.src = photo.url;
    }
  }, [photo]);

  // Adjust aspect ratio presets
  const handleSetAspectRatio = (ratio: typeof aspectRatio) => {
    setAspectRatio(ratio);
    if (ratio === 'free') return;

    let targetRatio = 1;
    if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '4:3') targetRatio = 4 / 3;
    else if (ratio === '3:4') targetRatio = 3 / 4;
    else if (ratio === '16:9') targetRatio = 16 / 9;
    else if (ratio === 'custom_carnet') targetRatio = 2.5 / 3.0; // 2.5x3cm / infantil

    // Center the crop with the new aspect ratio inside available percentage space
    const imgAspect = imgNaturalDim.width / imgNaturalDim.height;
    // ratio in normalized percentage: (targetRatio / imgAspect)
    const normalizedH = 70;
    const normalizedW = Math.min(85, Math.max(20, (normalizedH * (targetRatio / imgAspect))));

    setCropRect({
      x: Math.max(5, (100 - normalizedW) / 2),
      y: Math.max(5, (100 - normalizedH) / 2),
      width: Math.min(90, normalizedW),
      height: Math.min(90, normalizedH),
    });
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'nw' | 'ne' | 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startRect: { ...cropRect },
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;

    const bounds = containerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStartRef.current.clientX) / bounds.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartRef.current.clientY) / bounds.height) * 100;
    const start = dragStartRef.current.startRect;

    if (isDragging === 'move') {
      const nextX = Math.max(0, Math.min(100 - start.width, start.x + deltaXPercent));
      const nextY = Math.max(0, Math.min(100 - start.height, start.y + deltaYPercent));
      setCropRect((prev) => ({ ...prev, x: nextX, y: nextY }));
    } else if (isDragging === 'se') {
      const nextW = Math.max(10, Math.min(100 - start.x, start.width + deltaXPercent));
      const nextH = Math.max(10, Math.min(100 - start.y, start.height + deltaYPercent));
      setCropRect((prev) => ({ ...prev, width: nextW, height: nextH }));
    } else if (isDragging === 'sw') {
      const nextX = Math.max(0, Math.min(start.x + start.width - 10, start.x + deltaXPercent));
      const nextW = start.width - (nextX - start.x);
      const nextH = Math.max(10, Math.min(100 - start.y, start.height + deltaYPercent));
      setCropRect((prev) => ({ ...prev, x: nextX, width: nextW, height: nextH }));
    } else if (isDragging === 'ne') {
      const nextY = Math.max(0, Math.min(start.y + start.height - 10, start.y + deltaYPercent));
      const nextH = start.height - (nextY - start.y);
      const nextW = Math.max(10, Math.min(100 - start.x, start.width + deltaXPercent));
      setCropRect((prev) => ({ ...prev, y: nextY, width: nextW, height: nextH }));
    } else if (isDragging === 'nw') {
      const nextX = Math.max(0, Math.min(start.x + start.width - 10, start.x + deltaXPercent));
      const nextY = Math.max(0, Math.min(start.y + start.height - 10, start.y + deltaYPercent));
      const nextW = start.width - (nextX - start.x);
      const nextH = start.height - (nextY - start.y);
      setCropRect({ x: nextX, y: nextY, width: nextW, height: nextH });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Execute the Crop
  const handleSaveCrop = async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photo.url;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const cropPxX = Math.round((cropRect.x / 100) * img.naturalWidth);
    const cropPxY = Math.round((cropRect.y / 100) * img.naturalHeight);
    const cropPxW = Math.max(10, Math.round((cropRect.width / 100) * img.naturalWidth));
    const cropPxH = Math.max(10, Math.round((cropRect.height / 100) * img.naturalHeight));

    const canvas = document.createElement('canvas');
    canvas.width = cropPxW;
    canvas.height = cropPxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Solid white background for PNG transparencies
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropPxW, cropPxH);

    ctx.drawImage(img, cropPxX, cropPxY, cropPxW, cropPxH, 0, 0, cropPxW, cropPxH);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onApplyCrop(photo.id, croppedDataUrl, cropPxW, cropPxH);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Recortar Foto</h2>
              <p className="text-[11px] text-slate-500 truncate max-w-xs">{photo.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Aspect Ratio Presets & Crop Stage */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-4 bg-slate-100/60">
          {/* Preset buttons */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Sliders className="w-3 h-3" /> Proporción:
            </span>
            {[
              { id: 'free', label: 'Libre' },
              { id: '1:1', label: '1:1 Cuadrado' },
              { id: '3:4', label: '3:4 Infantil / Carnet' },
              { id: '4:3', label: '4:3 Estándar' },
              { id: '16:9', label: '16:9 Panorámica' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSetAspectRatio(p.id as any)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  aspectRatio === p.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Interactive Crop Stage */}
          <div className="relative max-w-full max-h-[58vh] flex items-center justify-center select-none">
            <div
              ref={containerRef}
              className="relative inline-block overflow-hidden shadow-lg rounded border border-slate-300 bg-white"
            >
              <img
                src={photo.url}
                alt={photo.name}
                className="max-h-[55vh] max-w-full block object-contain pointer-events-none select-none"
              />

              {/* Dimmed Overlay outside crop rectangle */}
              {/* Top */}
              <div
                className="absolute top-0 inset-x-0 bg-slate-950/60 pointer-events-none"
                style={{ height: `${cropRect.y}%` }}
              />
              {/* Bottom */}
              <div
                className="absolute bottom-0 inset-x-0 bg-slate-950/60 pointer-events-none"
                style={{ height: `${100 - cropRect.y - cropRect.height}%` }}
              />
              {/* Left */}
              <div
                className="absolute bg-slate-950/60 pointer-events-none"
                style={{
                  top: `${cropRect.y}%`,
                  bottom: `${100 - cropRect.y - cropRect.height}%`,
                  left: 0,
                  width: `${cropRect.x}%`,
                }}
              />
              {/* Right */}
              <div
                className="absolute bg-slate-950/60 pointer-events-none"
                style={{
                  top: `${cropRect.y}%`,
                  bottom: `${100 - cropRect.y - cropRect.height}%`,
                  right: 0,
                  width: `${100 - cropRect.x - cropRect.width}%`,
                }}
              />

              {/* Interactive Crop Box */}
              <div
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                style={{
                  top: `${cropRect.y}%`,
                  left: `${cropRect.x}%`,
                  width: `${cropRect.width}%`,
                  height: `${cropRect.height}%`,
                }}
                className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move flex items-center justify-center group"
              >
                {/* 3x3 Rule of Thirds grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* Resize corner handles */}
                {/* Top-Left */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'nw')}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs cursor-nwse-resize shadow"
                />
                {/* Top-Right */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'ne')}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs cursor-nesw-resize shadow"
                />
                {/* Bottom-Right */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs cursor-nwse-resize shadow"
                />
                {/* Bottom-Left */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'sw')}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs cursor-nesw-resize shadow"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCropRect({ x: 5, y: 5, width: 90, height: 90 })}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restablecer área</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Aplicar recorte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
