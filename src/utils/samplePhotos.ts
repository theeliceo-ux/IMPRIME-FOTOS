import { PhotoItem } from '../types';

export function createSamplePhotos(): PhotoItem[] {
  // Generate sample SVG/canvas photos that represent typical use cases:
  // credentials, school homework, landscapes, certificates
  const samples = [
    {
      name: 'Foto_Infantil_Credencial.jpg',
      w: 800,
      h: 1000,
      bg: '#3b82f6',
      text: 'Foto Infantil / Credencial',
      accent: '#60a5fa',
      icon: '👤',
    },
    {
      name: 'Tarea_Biologia_Celula.png',
      w: 1200,
      h: 900,
      bg: '#10b981',
      text: 'Biología: Célula Vegetal',
      accent: '#34d399',
      icon: '🔬',
    },
    {
      name: 'Historia_Revolucion.jpg',
      w: 1200,
      h: 800,
      bg: '#f59e0b',
      text: 'Historia: Personajes 1910',
      accent: '#fbbf24',
      icon: '📜',
    },
    {
      name: 'Geografia_Mapa_Relieve.jpg',
      w: 1100,
      h: 850,
      bg: '#8b5cf6',
      text: 'Geografía: Relieve y Climas',
      accent: '#a78bfa',
      icon: '🗺️',
    },
    {
      name: 'Arte_Pintura_Acuarela.webp',
      w: 900,
      h: 1200,
      bg: '#ec4899',
      text: 'Proyecto Arte: Acuarelas',
      accent: '#f472b6',
      icon: '🎨',
    },
    {
      name: 'Credencial_Escolar_Alumno.png',
      w: 800,
      h: 1000,
      bg: '#06b6d4',
      text: 'Credencial Estudiante 2026',
      accent: '#22d3ee',
      icon: '🎓',
    },
  ];

  return samples.map((item, idx) => {
    const canvas = document.createElement('canvas');
    canvas.width = item.w;
    canvas.height = item.h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, item.w, item.h);
      grad.addColorStop(0, item.bg);
      grad.addColorStop(1, item.accent);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, item.w, item.h);

      // Inner frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 12;
      ctx.strokeRect(24, 24, item.w - 48, item.h - 48);

      // Icon & text
      ctx.font = 'bold 90px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(item.icon, item.w / 2, item.h / 2 - 60);

      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(item.text, item.w / 2, item.h / 2 + 50);

      ctx.font = 'normal 26px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(`Muestra #${idx + 1} (${item.w}×${item.h}px)`, item.w / 2, item.h / 2 + 105);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    // Create a mock File object
    const blobBin = atob(dataUrl.split(',')[1]);
    const array = [];
    for (let i = 0; i < blobBin.length; i++) {
      array.push(blobBin.charCodeAt(i));
    }
    const file = new File([new Uint8Array(array)], item.name, { type: 'image/jpeg' });

    return {
      id: `sample-${idx + 1}-${Date.now()}`,
      file,
      name: item.name,
      size: file.size,
      url: dataUrl,
      width: item.w,
      height: item.h,
      rotation: 0,
      copies: 1,
      filter: 'none',
    };
  });
}
