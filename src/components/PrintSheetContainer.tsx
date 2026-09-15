import React from 'react';
import { LayoutConfig, PhotoItem } from '../types';
import { PAGE_SIZES } from '../constants/presets';

interface PrintSheetContainerProps {
  photos: PhotoItem[];
  config: LayoutConfig;
  instanceOverrides?: Record<string, { offsetX?: number; offsetY?: number; zoom?: number; rotation?: 0 | 90 | 180 | 270 }>;
}

export const PrintSheetContainer: React.FC<PrintSheetContainerProps> = ({
  photos,
  config,
  instanceOverrides = {},
}) => {
  // Paper dimensions
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

  // Expanded copies with instance overrides
  const expandedInstances: {
    photo: PhotoItem;
    offsetX: number;
    offsetY: number;
    zoom: number;
    rotation: 0 | 90 | 180 | 270;
  }[] = [];

  let globalIndex = 0;
  photos.forEach((p) => {
    const totalCopies = (p.copies || 1) * (config.globalCopiesPerPhoto || 1);
    for (let i = 0; i < totalCopies; i++) {
      const key = `${p.id}-inst-${globalIndex}`;
      const overrides = instanceOverrides[key] || {};
      expandedInstances.push({
        photo: p,
        offsetX: overrides.offsetX !== undefined ? overrides.offsetX : (p.offsetX || 0),
        offsetY: overrides.offsetY !== undefined ? overrides.offsetY : (p.offsetY || 0),
        zoom: overrides.zoom !== undefined ? overrides.zoom : (p.zoom || 1),
        rotation: overrides.rotation !== undefined ? overrides.rotation : (p.rotation || 0),
      });
      globalIndex++;
    }
  });

  const cellsPerPage = Math.max(1, config.rows * config.columns);
  const totalPages = Math.max(1, Math.ceil(expandedInstances.length / cellsPerPage));

  // Margin in mm
  const { top, bottom, left, right } = config.margins;

  return (
    <div id="print-sheet-root" className="hidden print:block print:w-full">
      <style>{`
        @page {
          size: ${pageW}mm ${pageH}mm;
          margin: 0mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #interactive-app-root, .no-print, header, aside, #preview-paper-sheet {
            display: none !important;
          }
          #print-sheet-root {
            display: block !important;
            width: 100% !important;
            background: #ffffff !important;
          }
          .print-page {
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {Array.from({ length: totalPages }).map((_, pageIdx) => {
        const start = pageIdx * cellsPerPage;
        const pageInstances = expandedInstances.slice(start, start + cellsPerPage);

        return (
          <div
            key={pageIdx}
            className="print-page"
            style={{
              width: `${pageW}mm`,
              height: `${pageH}mm`,
              paddingTop: `${top}mm`,
              paddingBottom: `${bottom}mm`,
              paddingLeft: `${left}mm`,
              paddingRight: `${right}mm`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Header */}
            {config.pageHeaderTitle && (
              <div
                style={{ fontSize: `${config.headerFontSizePt || 10}pt` }}
                className="text-center font-bold text-slate-700 mb-2 truncate"
              >
                {config.pageHeaderTitle}
              </div>
            )}

            {/* Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${config.rows}, minmax(0, 1fr))`,
                gap: `${config.gapMm}mm`,
                flex: 1,
                width: '100%',
                height: '100%',
              }}
            >
              {Array.from({ length: cellsPerPage }).map((_, cellIdx) => {
                const item = pageInstances[cellIdx];

                let borderCss = 'none';
                if (config.cellBorder === 'solid-thin') borderCss = `1px solid ${config.borderColor}`;
                else if (config.cellBorder === 'solid-medium') borderCss = `2px solid ${config.borderColor}`;
                else if (config.cellBorder === 'dashed') borderCss = `1px dashed ${config.borderColor}`;
                else if (config.cellBorder === 'dotted') borderCss = `1px dotted ${config.borderColor}`;

                return (
                  <div
                    key={cellIdx}
                    style={{
                      border: borderCss,
                      backgroundColor: config.cellBackgroundColor || '#ffffff',
                      borderRadius: `${config.cellRadiusMm}mm`,
                    }}
                    className="relative flex flex-col items-center justify-center overflow-hidden bg-white"
                  >
                    {item ? (
                      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-white">
                        <img
                          src={item.photo.url}
                          alt={item.photo.name}
                          style={{
                            objectFit:
                              config.fitMode === 'contain'
                                ? 'contain'
                                : config.fitMode === 'cover'
                                ? 'cover'
                                : 'fill',
                            objectPosition: `${50 + item.offsetX}% ${50 + item.offsetY}%`,
                            transform: `scale(${item.zoom}) rotate(${item.rotation}deg) translate(${item.offsetX * 0.4}%, ${item.offsetY * 0.4}%)`,
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
                          className="w-full h-full"
                        />
                        {config.showFileName && (
                          <div
                            style={{ fontSize: '7pt' }}
                            className="absolute bottom-0 inset-x-0 bg-white/90 text-center py-0.5 px-1 truncate text-slate-700"
                          >
                            {item.photo.name}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-white" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {config.showPageNumber && (
              <div
                style={{ fontSize: `${config.footerFontSizePt || 8}pt` }}
                className="text-center font-medium text-slate-400 mt-2"
              >
                Página {pageIdx + 1} de {totalPages}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
