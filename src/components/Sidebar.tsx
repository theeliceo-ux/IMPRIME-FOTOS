import React, { useState } from 'react';
import {
  Grid,
  Layout,
  Sliders,
  ChevronDown,
  Type,
  Crop,
  RotateCcw,
} from 'lucide-react';
import { LayoutConfig, PageSizeId, BorderStyle, FitMode, ColorFilter, PhotoItem } from '../types';
import { PAGE_SIZES, GRID_PRESETS, MARGIN_PRESETS } from '../constants/presets';

interface SidebarProps {
  config: LayoutConfig;
  onChangeConfig: (newConfig: Partial<LayoutConfig>) => void;
  cellDimensionsMm: { width: number; height: number };
  totalPhotos: number;
  totalCopies: number;
  photos?: PhotoItem[];
  onOpenCropModal?: (photo: PhotoItem) => void;
  onResetAllFraming?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  onChangeConfig,
  cellDimensionsMm,
  totalPhotos,
  totalCopies,
  photos = [],
  onOpenCropModal,
  onResetAllFraming,
}) => {
  // All accordions start collapsed by default
  const [openSections, setOpenSections] = useState<{
    grid: boolean;
    paper: boolean;
    fit: boolean;
    text: boolean;
    crop: boolean;
  }>({
    grid: false,
    paper: false,
    fit: false,
    text: false,
    crop: false,
  });

  const [showCustomMargins, setShowCustomMargins] = useState(false);
  const [showCustomGap, setShowCustomGap] = useState(false);

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalCells = config.columns * config.rows;

  return (
    <aside className="w-full lg:w-80 xl:w-88 bg-white border-r border-slate-200 flex flex-col h-full min-h-0 shrink-0 text-slate-700 select-none">
      {/* Mini Top Bar: Photo Size Overview */}
      <div className="p-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
            Tamaño por foto
          </span>
          <span className="text-xs font-mono font-bold text-slate-800">
            {cellDimensionsMm.width.toFixed(1)} × {cellDimensionsMm.height.toFixed(1)} mm
          </span>
        </div>
        <div className="text-right">
          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-700 font-mono">
            {totalCells} por hoja
          </span>
        </div>
      </div>

      {/* Accordion List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {/* =========================================================
            SECTION 1: CUADRÍCULA (GRID & REPETICIONES) - DESPLEGABLE
           ========================================================= */}
        <div className="rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('grid')}
            className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-slate-500" />
              <span>Cuadrícula</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>{config.columns} × {config.rows}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  openSections.grid ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {openSections.grid && (
            <div className="px-3 pb-3 pt-1 space-y-3">
              {/* Presets Rápidos */}
              <div className="grid grid-cols-3 gap-1.5">
                {GRID_PRESETS.slice(0, 6).map((preset) => {
                  const isSelected = config.rows === preset.rows && config.columns === preset.cols;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => onChangeConfig({ rows: preset.rows, columns: preset.cols })}
                      className={`py-1.5 px-2 rounded-md border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white font-medium shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-medium">{preset.name}</div>
                    </button>
                  );
                })}
              </div>

              {/* Sliders: Columnas y Filas */}
              <div className="space-y-2 bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/60">
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                    <span>Columnas:</span>
                    <span className="font-mono font-bold text-slate-900">{config.columns}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={config.columns}
                    onChange={(e) => onChangeConfig({ columns: parseInt(e.target.value) || 1 })}
                    className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded appearance-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                    <span>Filas:</span>
                    <span className="font-mono font-bold text-slate-900">{config.rows}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={config.rows}
                    onChange={(e) => onChangeConfig({ rows: parseInt(e.target.value) || 1 })}
                    className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded appearance-none"
                  />
                </div>
              </div>

              {/* Separación (Gap) Personalizable */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Separación:</span>
                  <div className="flex items-center gap-1">
                    {[0, 2, 4, 8].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setShowCustomGap(false);
                          onChangeConfig({ gapMm: g });
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                          config.gapMm === g && !showCustomGap
                            ? 'border-slate-900 bg-slate-900 text-white font-medium'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {g} mm
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowCustomGap(!showCustomGap)}
                      className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                        showCustomGap
                          ? 'border-slate-900 bg-slate-900 text-white font-medium'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      Ajustar
                    </button>
                  </div>
                </div>

                {/* Custom Gap Input */}
                {showCustomGap && (
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                    <span className="text-[11px] text-slate-600">Separación exacta:</span>
                    <div className="flex items-center gap-1 border border-slate-300 rounded bg-white px-2 py-0.5">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={config.gapMm}
                        onChange={(e) => onChangeConfig({ gapMm: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-14 text-xs outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400">mm</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Copias por foto */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span className="font-medium text-slate-600">Copias x foto:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 4, 6, 8].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onChangeConfig({ globalCopiesPerPhoto: c })}
                      className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                        config.globalCopiesPerPhoto === c
                          ? 'border-slate-900 bg-slate-900 text-white font-medium'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      ×{c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            SECTION 2: PAPEL Y ORIENTACIÓN - DESPLEGABLE CON MÁRGENES
           ========================================================= */}
        <div className="rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('paper')}
            className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-slate-500" />
              <span>Papel & Márgenes</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="capitalize">{PAGE_SIZES[config.pageSize]?.name || config.pageSize}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  openSections.paper ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {openSections.paper && (
            <div className="px-3 pb-3 pt-1 space-y-3">
              {/* Paper Selector */}
              <div>
                <select
                  value={config.pageSize}
                  onChange={(e) => onChangeConfig({ pageSize: e.target.value as PageSizeId })}
                  className="w-full py-1.5 px-2.5 rounded-md border border-slate-300 bg-white text-slate-800 text-xs font-medium focus:outline-hidden focus:border-slate-500 cursor-pointer"
                >
                  {Object.values(PAGE_SIZES).map((ps) => (
                    <option key={ps.id} value={ps.id}>
                      {ps.name} ({ps.widthMm} × {ps.heightMm} mm)
                    </option>
                  ))}
                </select>
              </div>

              {/* Orientation Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeConfig({ orientation: 'portrait' })}
                  className={`py-1.5 px-2 rounded-md border text-center font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    config.orientation === 'portrait'
                      ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-2.5 h-3.5 border border-current rounded-2xs" />
                  <span>Vertical</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeConfig({ orientation: 'landscape' })}
                  className={`py-1.5 px-2 rounded-md border text-center font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    config.orientation === 'landscape'
                      ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-3.5 h-2.5 border border-current rounded-2xs" />
                  <span>Horizontal</span>
                </button>
              </div>

              {/* Margin Presets */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Margen:</span>
                <div className="flex items-center gap-1">
                  {MARGIN_PRESETS.slice(0, 4).map((mp) => {
                    const isCurrent =
                      config.margins.top === mp.margins.top &&
                      config.margins.bottom === mp.margins.bottom &&
                      config.margins.left === mp.margins.left &&
                      config.margins.right === mp.margins.right;

                    const label = mp.margins.top === 0 ? '0 mm' : `${mp.margins.top} mm`;

                    return (
                      <button
                        key={mp.name}
                        type="button"
                        onClick={() => {
                          setShowCustomMargins(false);
                          onChangeConfig({ margins: mp.margins });
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                          isCurrent && !showCustomMargins
                            ? 'border-slate-900 bg-slate-900 text-white font-medium'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowCustomMargins(!showCustomMargins)}
                    className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                      showCustomMargins
                        ? 'border-slate-900 bg-slate-900 text-white font-medium'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Personalizar
                  </button>
                </div>
              </div>

              {/* Custom Margins Input (mm) */}
              {showCustomMargins && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <span className="font-semibold text-slate-700 block text-[11px]">
                    Márgenes en milímetros (mm):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Arriba</label>
                      <div className="flex items-center border border-slate-300 rounded bg-white px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          max="80"
                          value={config.margins.top}
                          onChange={(e) =>
                            onChangeConfig({
                              margins: { ...config.margins, top: Math.max(0, parseInt(e.target.value) || 0) },
                            })
                          }
                          className="w-full text-xs outline-hidden"
                        />
                        <span className="text-[10px] text-slate-400">mm</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Abajo</label>
                      <div className="flex items-center border border-slate-300 rounded bg-white px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          max="80"
                          value={config.margins.bottom}
                          onChange={(e) =>
                            onChangeConfig({
                              margins: { ...config.margins, bottom: Math.max(0, parseInt(e.target.value) || 0) },
                            })
                          }
                          className="w-full text-xs outline-hidden"
                        />
                        <span className="text-[10px] text-slate-400">mm</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Izquierda</label>
                      <div className="flex items-center border border-slate-300 rounded bg-white px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          max="80"
                          value={config.margins.left}
                          onChange={(e) =>
                            onChangeConfig({
                              margins: { ...config.margins, left: Math.max(0, parseInt(e.target.value) || 0) },
                            })
                          }
                          className="w-full text-xs outline-hidden"
                        />
                        <span className="text-[10px] text-slate-400">mm</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Derecha</label>
                      <div className="flex items-center border border-slate-300 rounded bg-white px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          max="80"
                          value={config.margins.right}
                          onChange={(e) =>
                            onChangeConfig({
                              margins: { ...config.margins, right: Math.max(0, parseInt(e.target.value) || 0) },
                            })
                          }
                          className="w-full text-xs outline-hidden"
                        />
                        <span className="text-[10px] text-slate-400">mm</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================
            SECTION 3: AJUSTES Y BORDES - DESPLEGABLE
           ========================================================= */}
        <div className="rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('fit')}
            className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Ajuste & Bordes</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="capitalize">{config.fitMode}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  openSections.fit ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {openSections.fit && (
            <div className="px-3 pb-3 pt-1 space-y-3">
              {/* Fit Mode */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'contain' as FitMode, name: 'Encajar' },
                  { id: 'cover' as FitMode, name: 'Llenar' },
                  { id: 'stretch' as FitMode, name: 'Estirar' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeConfig({ fitMode: m.id })}
                    className={`py-1.5 px-2 rounded-md border text-center text-xs transition-colors cursor-pointer ${
                      config.fitMode === m.id
                        ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>

              {/* Cell Border */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Borde celda:</span>
                <select
                  value={config.cellBorder}
                  onChange={(e) => onChangeConfig({ cellBorder: e.target.value as BorderStyle })}
                  className="py-1 px-2 rounded border border-slate-300 text-[11px] bg-white cursor-pointer"
                >
                  <option value="none">Sin borde</option>
                  <option value="solid-thin">Fino (1 pt)</option>
                  <option value="solid-medium">Medio (2 pt)</option>
                  <option value="dashed">Guiones</option>
                  <option value="dotted">Puntos</option>
                </select>
              </div>

              {/* Color Filter */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Filtro:</span>
                <select
                  value={config.globalFilter}
                  onChange={(e) => onChangeConfig({ globalFilter: e.target.value as ColorFilter })}
                  className="py-1 px-2 rounded border border-slate-300 text-[11px] bg-white cursor-pointer"
                >
                  <option value="none">Color original (Sin filtro)</option>
                  <option value="scanner">📄 Documento Escaneado (Escáner nítido)</option>
                  <option value="grayscale">Blanco y negro estándar</option>
                  <option value="contrast">Alto contraste</option>
                  <option value="eco">Ahorro de tinta</option>
                </select>
              </div>

              {/* Reset Framing Button */}
              {onResetAllFraming && (
                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onResetAllFraming}
                    className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[11px] font-medium rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Devuelve todas las fotos al zoom 100% y posición centrada"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer todos los encuadres</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================
            SECTION 4: TEXTOS Y ENCABEZADOS - DESPLEGABLE
           ========================================================= */}
        <div className="rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('text')}
            className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-slate-500" />
              <span>Encabezado & Textos</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                openSections.text ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.text && (
            <div className="px-3 pb-3 pt-1 space-y-2.5">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Título de página:</label>
                <input
                  type="text"
                  placeholder="Ej. Fotos Escolares"
                  value={config.pageHeaderTitle}
                  onChange={(e) => onChangeConfig({ pageHeaderTitle: e.target.value })}
                  className="w-full py-1 px-2 border border-slate-300 rounded text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.showPageNumber}
                    onChange={(e) => onChangeConfig({ showPageNumber: e.target.checked })}
                    className="rounded text-slate-900 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Número de página al pie</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.showFileName}
                    onChange={(e) => onChangeConfig({ showFileName: e.target.checked })}
                    className="rounded text-slate-900 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Nombre de archivo en fotos</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            SECTION 5: RECORTE DE FOTOS - DESPLEGABLE
           ========================================================= */}
        <div className="rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('crop')}
            className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Crop className="w-4 h-4 text-slate-500" />
              <span>Recorte de Fotos</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  openSections.crop ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {openSections.crop && (
            <div className="px-3 pb-3 pt-1 space-y-3">
              {photos.length === 0 ? (
                <div className="text-[10px] text-slate-400 text-center py-2">
                  No hay fotos cargadas.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => onOpenCropModal?.(photo)}
                      className="relative aspect-square rounded overflow-hidden border border-slate-200 hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer group"
                      title={`Recortar ${photo.name}`}
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Crop className="w-3.5 h-3.5 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
