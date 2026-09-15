import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Layers,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Hand,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { PhotoItem, LayoutConfig, GridCell } from '../types';
import { PAGE_SIZES } from '../constants/presets';

export interface DisplayPhotoInstance {
  instanceKey: string;
  photo: PhotoItem;
  offsetX: number;
  offsetY: number;
  zoom: number;
  rotation: number;
}

interface PageViewerProps {
  photos: PhotoItem[];
  gridCells: GridCell[];
  config: LayoutConfig;
  activePageIndex: number;
  onChangePage: (page: number) => void;
  onUpdateCell: (cellId: string, updates: Partial<GridCell>) => void;
  onRemoveCell: (cellId: string) => void;
  onReorderCells: (newCells: GridCell[]) => void;
  onUploadClick: () => void;
}

export const PageViewer: React.FC<PageViewerProps> = ({
  photos,
  gridCells,
  config,
  activePageIndex,
  onChangePage,
  onUpdateCell,
  onRemoveCell,
  onReorderCells,
  onUploadClick,
}) => {
  // Canvas zoom and pan state
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const canvasDragStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null);

  // Direct pan state on a single unique instance slot
  const [draggingCellId, setDraggingCellId] = useState<string | null>(null);
  const photoDragStartRef = useRef<{ x: number; y: number; startOffsetX: number; startOffsetY: number } | null>(null);

  // Paper dimensions in mm
  const baseDim = PAGE_SIZES[config.pageSize] || PAGE_SIZES.letter;
  let pageW = config.pageSize === 'custom' ? config.customWidthMm : baseDim.widthMm;
  let pageH = config.pageSize === 'custom' ? config.customHeightMm : baseDim.heightMm;

  if (config.orientation === 'landscape') {
    const temp = pageW;
    pageW = Math.max(temp, pageH);
    pageH = Math.min(temp, pageH);
  } else {
    const temp = pageW;
    pageW = Math.min(temp, pageH);
    pageH = Math.max(temp, pageH);
  }

  // Generate expanded instances list with unique keys for every single copy
  const expandedInstances = useMemo(() => {
    const list: DisplayPhotoInstance[] = [];
    const globalCopies = config.globalCopiesPerPhoto || 1;
    
    gridCells.forEach((cell) => {
      const p = photos.find(ph => ph.id === cell.photoId);
      if (!p) return;
      for (let i = 0; i < globalCopies; i++) {
        list.push({
          instanceKey: globalCopies > 1 ? `${cell.id}-${i}` : cell.id,
          photo: p,
          offsetX: cell.offsetX || 0,
          offsetY: cell.offsetY || 0,
          zoom: cell.zoom || 1,
          rotation: cell.rotation || 0,
        });
      }
    });
    return list;
  }, [photos, gridCells, config.globalCopiesPerPhoto]);

  const cellsPerPage = Math.max(1, config.rows * config.columns);
  const totalPages = Math.max(1, Math.ceil(expandedInstances.length / cellsPerPage));

  // Safe page index: clamps to valid range to completely eliminate blank screen errors
  const safePageIndex = Math.min(Math.max(0, activePageIndex), Math.max(0, totalPages - 1));

  // Current page's slice of photo instances
  const currentPageInstances = useMemo(() => {
    const start = safePageIndex * cellsPerPage;
    return expandedInstances.slice(start, start + cellsPerPage);
  }, [expandedInstances, safePageIndex, cellsPerPage]);

  // Pixel scaling (1 mm ≈ 2.8px at 100% zoom)
  const scale = 2.8 * zoomScale;
  const sheetWidthPx = Math.round(pageW * scale);
  const sheetHeightPx = Math.round(pageH * scale);

  const marginTopPx = Math.round(config.margins.top * scale);
  const marginBottomPx = Math.round(config.margins.bottom * scale);
  const marginLeftPx = Math.round(config.margins.left * scale);
  const marginRightPx = Math.round(config.margins.right * scale);
  const gapPx = Math.max(0, Math.round(config.gapMm * scale));

  // Printable area & cell calculation
  const printableAreaWidthPx = Math.max(10, sheetWidthPx - marginLeftPx - marginRightPx);
  const printableAreaHeightPx = Math.max(10, sheetHeightPx - marginTopPx - marginBottomPx);
  const totalGapXPx = Math.max(0, (config.columns - 1) * gapPx);
  const totalGapYPx = Math.max(0, (config.rows - 1) * gapPx);
  const cellWidthPx = Math.max(1, (printableAreaWidthPx - totalGapXPx) / config.columns);
  const cellHeightPx = Math.max(1, (printableAreaHeightPx - totalGapYPx) / config.rows);

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      
      if (e.key === 'ArrowLeft') {
        onChangePage(Math.max(0, activePageIndex - 1));
      } else if (e.key === 'ArrowRight') {
        onChangePage(Math.min(totalPages - 1, activePageIndex + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePageIndex, totalPages, onChangePage]);

  // Global window mouse move and mouse up handlers so dragging NEVER slips or gets stuck outside
  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingCanvas && canvasDragStartRef.current) {
      const dx = e.clientX - canvasDragStartRef.current.mouseX;
      const dy = e.clientY - canvasDragStartRef.current.mouseY;
      setCanvasPan({
        x: canvasDragStartRef.current.panX + dx,
        y: canvasDragStartRef.current.panY + dy,
      });
    } else if (draggingCellId && photoDragStartRef.current) {
      const dx = e.clientX - photoDragStartRef.current.x;
      const dy = e.clientY - photoDragStartRef.current.y;

      // Calculate percentage shift relative to cell size
      const deltaPercentX = Math.round((dx / cellWidthPx) * 100);
      const deltaPercentY = Math.round((dy / cellHeightPx) * 100);

      const nextOffsetX = Math.max(-100, Math.min(100, photoDragStartRef.current.startOffsetX + deltaPercentX));
      const nextOffsetY = Math.max(-100, Math.min(100, photoDragStartRef.current.startOffsetY + deltaPercentY));

      const actualCellId = draggingCellId.split('-')[0];
      onUpdateCell(actualCellId, {
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      });
    }
  }, [isDraggingCanvas, draggingCellId, cellWidthPx, cellHeightPx, onUpdateCell]);

  const handleWindowMouseUp = useCallback(() => {
    setIsDraggingCanvas(false);
    setDraggingCellId(null);
    canvasDragStartRef.current = null;
    photoDragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDraggingCanvas || draggingCellId) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
      };
    }
  }, [isDraggingCanvas, draggingCellId, handleWindowMouseMove, handleWindowMouseUp]);

  // Pan Canvas Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isPanMode || e.button === 1 || (e.target as HTMLElement).id === 'sheet-canvas-container') {
      setIsDraggingCanvas(true);
      canvasDragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panX: canvasPan.x,
        panY: canvasPan.y,
      };
    }
  };

  // Direct Mouse Drag on Photo Instance
  const handlePhotoMouseDown = (e: React.MouseEvent, inst: DisplayPhotoInstance) => {
    if (isPanMode) return;
    e.stopPropagation();
    setDraggingCellId(inst.instanceKey);
    photoDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: inst.offsetX,
      startOffsetY: inst.offsetY,
    };
  };

  // Zoom controls
  const handleZoomIn = () => setZoomScale((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.35, Math.round((prev - 0.15) * 100) / 100));
  const handleResetView = () => {
    setZoomScale(0.85);
    setCanvasPan({ x: 0, y: 0 });
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  return (
    <div
      id="sheet-canvas-container"
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
      className={`relative flex-1 flex flex-col items-center justify-center bg-slate-200/60 overflow-hidden select-none ${
        isPanMode || isDraggingCanvas ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    >
      {/* Floating Canvas Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-lg p-1 shadow-xs text-xs">
        <button
          type="button"
          onClick={handleZoomOut}
          title="Alejar (Ctrl + Scroll)"
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="font-mono text-xs font-semibold text-slate-700 px-1 min-w-[42px] text-center">
          {Math.round(zoomScale * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          title="Acercar (Ctrl + Scroll)"
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        <button
          type="button"
          onClick={handleResetView}
          title="Restablecer tamaño y posición"
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsPanMode(!isPanMode)}
          title="Modo mano para mover lienzo"
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isPanMode ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <Hand className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Page Navigation */}
      {totalPages > 1 && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-lg p-1 shadow-xs text-xs">
          <button
            type="button"
            disabled={safePageIndex === 0}
            onClick={() => onChangePage(Math.max(0, safePageIndex - 1))}
            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-medium text-xs text-slate-700 px-2 min-w-[70px] text-center">
            {safePageIndex + 1} de {totalPages}
          </span>

          <button
            type="button"
            disabled={safePageIndex >= totalPages - 1}
            onClick={() => onChangePage(Math.min(totalPages - 1, safePageIndex + 1))}
            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Sheet Container */}
      <div
        style={{
          transform: `translate(${canvasPan.x}px, ${canvasPan.y}px)`,
          transition: isDraggingCanvas ? 'none' : 'transform 0.08s ease-out',
        }}
        className="relative flex items-center justify-center p-8 min-h-0"
      >
        {/* Printable Paper Sheet representation */}
        <div
          id="preview-paper-sheet"
          style={{
            width: `${sheetWidthPx}px`,
            height: `${sheetHeightPx}px`,
            paddingTop: `${marginTopPx}px`,
            paddingBottom: `${marginBottomPx}px`,
            paddingLeft: `${marginLeftPx}px`,
            paddingRight: `${marginRightPx}px`,
          }}
          className="relative bg-white shadow-md border border-slate-300 flex flex-col justify-between box-border transition-all duration-150"
        >
          {/* Page Header (Optional) */}
          {config.pageHeaderTitle && (
            <div className="text-center font-semibold text-slate-700 mb-2 truncate text-xs">
              {config.pageHeaderTitle}
            </div>
          )}

          {/* Grid Container */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${config.rows}, minmax(0, 1fr))`,
              gap: `${gapPx}px`,
              width: '100%',
              height: '100%',
              minHeight: 0,
            }}
            className="flex-1 min-h-0"
          >
            {Array.from({ length: cellsPerPage }).map((_, cellIdx) => {
              const inst = currentPageInstances[cellIdx];

              // Cell border styling
              let borderStyleCss = 'none';
              if (config.cellBorder === 'solid-thin') borderStyleCss = `1px solid ${config.borderColor}`;
              else if (config.cellBorder === 'solid-medium') borderStyleCss = `2px solid ${config.borderColor}`;
              else if (config.cellBorder === 'dashed') borderStyleCss = `1px dashed ${config.borderColor}`;
              else if (config.cellBorder === 'dotted') borderStyleCss = `1px dotted ${config.borderColor}`;

              return (
                <div
                  key={cellIdx}
                  style={{
                    border: borderStyleCss,
                    backgroundColor: config.cellBackgroundColor || '#ffffff',
                    borderRadius: `${config.cellRadiusMm}mm`,
                  }}
                  className="relative flex flex-col items-center justify-center overflow-hidden group/cell select-none bg-white"
                >
                  {inst ? (
                    <div
                      onMouseDown={(e) => handlePhotoMouseDown(e, inst)}
                      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-white ${
                        isPanMode
                          ? 'cursor-grab active:cursor-grabbing'
                          : 'cursor-move active:cursor-grabbing'
                      } ${draggingCellId === inst.instanceKey ? 'ring-2 ring-slate-800' : ''}`}
                    >
                      {/* Scaled & Positioned Photo with fluid movement support */}
                      <img
                        src={inst.photo.url}
                        alt={inst.photo.name}
                        draggable={false}
                        style={{
                          objectFit:
                            config.fitMode === 'contain'
                              ? 'contain'
                              : config.fitMode === 'cover'
                              ? 'cover'
                              : 'fill',
                          objectPosition: `${50 + inst.offsetX}% ${50 + inst.offsetY}%`,
                          transform: `scale(${inst.zoom}) rotate(${inst.rotation}deg) translate(${inst.offsetX * 0.4}%, ${inst.offsetY * 0.4}%)`,
                          filter:
                            config.globalFilter === 'grayscale'
                              ? 'grayscale(100%)'
                              : config.globalFilter === 'contrast'
                              ? 'contrast(130%)'
                              : config.globalFilter === 'eco'
                              ? 'brightness(115%) saturate(85%)'
                              : config.globalFilter === 'scanner'
                              ? 'contrast(150%) brightness(112%) grayscale(70%)'
                              : config.globalFilter === 'text-enhance'
                              ? 'grayscale(100%) contrast(190%) brightness(105%)'
                              : config.globalFilter === 'binary'
                              ? 'grayscale(100%) contrast(300%) brightness(110%)'
                              : 'none',
                        }}
                        className="w-full h-full pointer-events-none select-none transition-transform duration-75"
                      />

                      {/* Floating Adjuster Toolbar - Compact and clean */}
                      <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity z-30 pointer-events-auto">
                        <div className="flex items-center gap-0.5 bg-slate-900/90 backdrop-blur-xs text-white p-0.5 rounded shadow">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentId = inst.instanceKey.split('-')[0];
                              const cellIndex = gridCells.findIndex(c => c.id === currentId);
                              if (cellIndex > 0) {
                                const newCells = [...gridCells];
                                const temp = newCells[cellIndex];
                                newCells[cellIndex] = newCells[cellIndex - 1];
                                newCells[cellIndex - 1] = temp;
                                onReorderCells(newCells);
                              }
                            }}
                            title="Mover foto atrás"
                            className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentId = inst.instanceKey.split('-')[0];
                              const cellIndex = gridCells.findIndex(c => c.id === currentId);
                              if (cellIndex >= 0 && cellIndex < gridCells.length - 1) {
                                const newCells = [...gridCells];
                                const temp = newCells[cellIndex];
                                newCells[cellIndex] = newCells[cellIndex + 1];
                                newCells[cellIndex + 1] = temp;
                                onReorderCells(newCells);
                              }
                            }}
                            title="Mover foto adelante"
                            className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <div className="w-px h-3 bg-white/20 mx-0.5" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateCell(inst.instanceKey.split('-')[0], {
                                zoom: Math.min(3.0, inst.zoom + 0.1),
                              });
                            }}
                            title="Acercar (+)"
                            className="p-1 font-bold hover:bg-white/20 rounded transition-colors cursor-pointer"
                          >
                            <ZoomIn className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateCell(inst.instanceKey.split('-')[0], {
                                zoom: Math.max(0.5, inst.zoom - 0.1),
                              });
                            }}
                            title="Alejar (-)"
                            className="p-1 font-bold hover:bg-white/20 rounded transition-colors cursor-pointer"
                          >
                            <ZoomOut className="w-3 h-3" />
                          </button>
                          <div className="w-px h-3 bg-white/20 mx-0.5" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextRot = (inst.rotation === 0 ? 90 : inst.rotation === 90 ? 180 : inst.rotation === 180 ? 270 : 0) as 0 | 90 | 180 | 270;
                              onUpdateCell(inst.instanceKey.split('-')[0], { rotation: nextRot });
                            }}
                            title="Rotar 90°"
                            className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <div className="w-px h-3 bg-white/20 mx-0.5" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveCell(inst.instanceKey.split('-')[0]);
                            }}
                            title="Eliminar esta copia"
                            className="p-1 hover:bg-red-500/80 rounded transition-colors cursor-pointer text-red-300 hover:text-white"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Optional File Name Display */}
                      {config.showFileName && (
                        <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xs text-[8px] text-slate-600 text-center py-0.5 px-1 truncate border-t border-slate-200">
                          {inst.photo.name}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Clean Empty Slot */
                    <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-200 text-slate-300 p-2 bg-white">
                      <span className="text-[10px] font-mono text-slate-300">
                        #{safePageIndex * cellsPerPage + cellIdx + 1}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Page Footer (Optional) */}
          {config.showPageNumber && (
            <div className="text-center font-medium text-slate-400 mt-2 text-[10px]">
              Página {safePageIndex + 1} de {totalPages}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
