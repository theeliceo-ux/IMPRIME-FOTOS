import { LayoutConfig, PhotoItem, GridCell } from '../types';
import { PAGE_SIZES } from '../constants/presets';

/**
 * Robust print helper:
 * Creates a dedicated isolated print window or iframe to guarantee reliable printing
 * in all modern browsers and embedded environments (like sandboxed preview frames).
 */
export function executePrint(
  photos?: PhotoItem[],
  gridCells?: GridCell[],
  config?: LayoutConfig
): boolean {
  if (!photos || photos.length === 0 || !config || !gridCells) {
    try {
      window.print();
      return true;
    } catch (err) {
      console.error('Direct window.print() failed:', err);
      return false;
    }
  }

  try {
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

    const expandedInstances: {
      photo: PhotoItem;
      cell: GridCell;
    }[] = [];

    const globalCopies = config.globalCopiesPerPhoto || 1;
    gridCells.forEach((c) => {
      const p = photos.find(ph => ph.id === c.photoId);
      if (!p) return;
      for (let i = 0; i < globalCopies; i++) {
        expandedInstances.push({
          photo: p,
          cell: c
        });
      }
    });

    const cellsPerPage = Math.max(1, config.rows * config.columns);
    const totalPages = Math.max(1, Math.ceil(expandedInstances.length / cellsPerPage));
    const { top, bottom, left, right } = config.margins;

    // Build print HTML document
    let pagesHtml = '';
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const start = pageIdx * cellsPerPage;
      const pageInstances = expandedInstances.slice(start, start + cellsPerPage);

      let cellsHtml = '';
      for (let cellIdx = 0; cellIdx < cellsPerPage; cellIdx++) {
        const item = pageInstances[cellIdx];
        let borderCss = 'none';
        if (config.cellBorder === 'solid-thin') borderCss = `1px solid ${config.borderColor}`;
        else if (config.cellBorder === 'solid-medium') borderCss = `2px solid ${config.borderColor}`;
        else if (config.cellBorder === 'dashed') borderCss = `1px dashed ${config.borderColor}`;
        else if (config.cellBorder === 'dotted') borderCss = `1px dotted ${config.borderColor}`;

        let imgHtml = '';
        if (item) {
          const fit = config.fitMode === 'contain' ? 'contain' : config.fitMode === 'cover' ? 'cover' : 'fill';
          const posX = 50 + (item.cell.offsetX || 0);
          const posY = 50 + (item.cell.offsetY || 0);
          const zoom = item.cell.zoom || 1;
          const rot = item.cell.rotation || 0;
          const shiftX = (item.cell.offsetX || 0) * 0.4;
          const shiftY = (item.cell.offsetY || 0) * 0.4;

          let filterCss = 'none';
          if (config.globalFilter === 'grayscale') filterCss = 'grayscale(100%)';
          else if (config.globalFilter === 'contrast') filterCss = 'contrast(130%)';
          else if (config.globalFilter === 'eco') filterCss = 'brightness(115%) saturate(85%)';
          else if (config.globalFilter === 'scanner') filterCss = 'grayscale(100%) contrast(180%) brightness(115%)';

          imgHtml = `
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;background:#ffffff;">
              <img src="${item.photo.url}" alt="${item.photo.name}" style="width:100%;height:100%;object-fit:${fit};object-position:${posX}% ${posY}%;transform:scale(${zoom}) rotate(${rot}deg) translate(${shiftX}%, ${shiftY}%);filter:${filterCss};" />
              ${config.showFileName ? `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(255,255,255,0.9);font-size:7pt;text-align:center;padding:1px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.photo.name}</div>` : ''}
            </div>
          `;
        }

        cellsHtml += `
          <div style="border:${borderCss};background-color:${config.cellBackgroundColor || '#ffffff'};border-radius:${config.cellRadiusMm}mm;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
            ${imgHtml}
          </div>
        `;
      }

      pagesHtml += `
        <div class="print-page" style="width:${pageW}mm;height:${pageH}mm;padding-top:${top}mm;padding-bottom:${bottom}mm;padding-left:${left}mm;padding-right:${right}mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page;overflow:hidden;position:relative;background:#ffffff;">
          ${config.pageHeaderTitle ? `<div style="text-align:center;font-weight:bold;font-size:${config.headerFontSizePt || 10}pt;color:#334155;margin-bottom:2mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${config.pageHeaderTitle}</div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(${config.columns}, minmax(0, 1fr));grid-template-rows:repeat(${config.rows}, minmax(0, 1fr));gap:${config.gapMm}mm;width:100%;height:100%;flex:1;">
            ${cellsHtml}
          </div>
          ${config.showPageNumber ? `<div style="text-align:center;font-size:${config.footerFontSizePt || 8}pt;color:#94a3b8;margin-top:2mm;">Página ${pageIdx + 1} de ${totalPages}</div>` : ''}
        </div>
      `;
    }

    let printIframe = document.getElementById('print-sandbox-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'print-sandbox-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.top = '-9999px';
      printIframe.style.left = '-9999px';
      printIframe.style.width = '0px';
      printIframe.style.height = '0px';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return true;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir - Ordena e Imprime</title>
          <style>
            @page {
              size: ${pageW}mm ${pageH}mm;
              margin: 0mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-page {
              box-sizing: border-box !important;
              page-break-after: always !important;
              break-after: page !important;
              overflow: hidden !important;
              background: #ffffff !important;
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    return true;
  } catch (err) {
    console.error('Safe iframe print error:', err);
    window.print();
    return false;
  }
}
