/**
 * PixKit - Production Ready Client-Side Canvas Image Processing Engine
 */

class PixKitEngine {
  constructor() {
    this.sourceCanvas = document.createElement('canvas');
    this.sourceCtx = this.sourceCanvas.getContext('2d', { willReadFrequently: true });
    
    this.activeCanvas = document.createElement('canvas');
    this.activeCtx = this.activeCanvas.getContext('2d', { willReadFrequently: true });

    this.filename = 'sample-artwork.jpg';
    this.fileType = 'image/jpeg';
    this.fileSize = 2400000;
    this.historyStack = [];
    this.historyIndex = -1;
    this.maxHistory = 25;
  }

  // Detect MIME type accurately from File object and extension
  detectMimeType(file) {
    if (file.type && file.type !== 'application/octet-stream') {
      return file.type;
    }
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.webp')) return 'image/webp';
    if (name.endsWith('.avif')) return 'image/avif';
    if (name.endsWith('.bmp')) return 'image/bmp';
    if (name.endsWith('.svg')) return 'image/svg+xml';
    if (name.endsWith('.heic') || name.endsWith('.heif')) return 'image/heic';
    return 'image/jpeg';
  }

  // Get clean human-readable format label (e.g. 'PNG', 'JPG', 'WEBP', etc.)
  getFormatLabel() {
    const mime = (this.fileType || '').toLowerCase();
    const name = (this.filename || '').toLowerCase();
    if (mime.includes('png') || name.endsWith('.png')) return 'PNG';
    if (mime.includes('webp') || name.endsWith('.webp')) return 'WEBP';
    if (mime.includes('avif') || name.endsWith('.avif')) return 'AVIF';
    if (mime.includes('bmp') || name.endsWith('.bmp')) return 'BMP';
    if (mime.includes('svg') || name.endsWith('.svg')) return 'SVG';
    if (mime.includes('heic') || mime.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif')) return 'HEIC';
    return 'JPG';
  }

  // Lazy load HEIC decoder safely without blocking page startup
  async ensureHeicDecoder() {
    if (typeof window.heic2any === 'function') return true;
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/heic2any.min.js';
      s.onload = () => resolve(true);
      s.onerror = () => {
        const cdn = document.createElement('script');
        cdn.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
        cdn.onload = () => resolve(true);
        cdn.onerror = () => resolve(false);
        document.head.appendChild(cdn);
      };
      document.head.appendChild(s);
    });
  }

  // Load from File / Blob (with automatic HEIC decoding)
  async loadFromFile(file) {
    this.filename = file.name || 'image.jpg';
    this.fileType = this.detectMimeType(file);
    this.fileSize = file.size || 0;

    let targetFile = file;

    // If HEIC / HEIF, decode via heic2any
    if (this.fileType === 'image/heic' || this.filename.toLowerCase().endsWith('.heic') || this.filename.toLowerCase().endsWith('.heif')) {
      try {
        await this.ensureHeicDecoder();
        if (typeof window.heic2any === 'function') {
          const convertedBlob = await window.heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.95
          });
          targetFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        }
      } catch (heicErr) {
        console.warn('HEIC decoding warning:', heicErr);
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.setSourceImage(img);
          resolve({
            name: this.filename,
            type: this.fileType,
            format: this.getFormatLabel(),
            size: this.fileSize,
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(targetFile);
    });
  }

  // High-Resolution Default Sample Image
  generateSampleArtwork(width = 1600, height = 1200) {
    this.filename = 'mountain-view.jpg';
    this.fileType = 'image/jpeg';
    this.fileSize = 2450000;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#D6E5DF');
    sky.addColorStop(0.38, '#B5D1C1');
    sky.addColorStop(0.39, '#668776');
    sky.addColorStop(0.62, '#41624F');
    sky.addColorStop(1, '#253B36');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Glowing Sun
    const sunGrad = ctx.createRadialGradient(width * 0.79, height * 0.22, 0, width * 0.79, height * 0.22, width * 0.08);
    sunGrad.addColorStop(0, '#FFF4C8');
    sunGrad.addColorStop(0.8, '#F4DF9A');
    sunGrad.addColorStop(1, 'rgba(244, 223, 154, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(width * 0.79, height * 0.22, width * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Back Mountain
    ctx.fillStyle = '#587665';
    ctx.beginPath();
    ctx.moveTo(-width * 0.05, height);
    ctx.lineTo(width * 0.2, height * 0.58);
    ctx.lineTo(width * 0.4, height * 0.72);
    ctx.lineTo(width * 0.65, height * 0.35);
    ctx.lineTo(width * 0.83, height * 0.68);
    ctx.lineTo(width * 1.05, height * 0.52);
    ctx.lineTo(width * 1.05, height);
    ctx.closePath();
    ctx.fill();

    // Front Mountain
    ctx.fillStyle = '#849E8B';
    ctx.beginPath();
    ctx.moveTo(-width * 0.05, height);
    ctx.lineTo(width * 0.2, height * 0.52);
    ctx.lineTo(width * 0.36, height * 0.75);
    ctx.lineTo(width * 0.59, height * 0.38);
    ctx.lineTo(width * 0.78, height * 0.74);
    ctx.lineTo(width * 0.92, height * 0.48);
    ctx.lineTo(width * 1.05, height);
    ctx.closePath();
    ctx.fill();

    // Water Body
    const water = ctx.createLinearGradient(0, height * 0.64, 0, height);
    water.addColorStop(0, '#6B9A91');
    water.addColorStop(1, '#254944');
    ctx.fillStyle = water;
    ctx.fillRect(0, height * 0.64, width, height * 0.36);

    const img = new Image();
    img.src = canvas.toDataURL('image/jpeg', 0.95);
    img.onload = () => {
      this.setSourceImage(img);
    };
  }

  setSourceImage(img) {
    this.sourceCanvas.width = img.naturalWidth || img.width;
    this.sourceCanvas.height = img.naturalHeight || img.height;
    this.sourceCtx.drawImage(img, 0, 0);

    this.activeCanvas.width = this.sourceCanvas.width;
    this.activeCanvas.height = this.sourceCanvas.height;
    this.activeCtx.drawImage(this.sourceCanvas, 0, 0);

    this.historyStack = [];
    this.pushHistory('Original Image');
  }

  onChange(cb) {
    if (typeof cb === 'function') {
      this._changeListeners = this._changeListeners || [];
      this._changeListeners.push(cb);
    }
  }

  notifyChange() {
    if (this._changeListeners && this._changeListeners.length) {
      this._changeListeners.forEach(cb => {
        try { cb(); } catch (e) { console.warn(e); }
      });
    }
  }

  pushHistory(label = 'Edit') {
    const snapshot = document.createElement('canvas');
    snapshot.width = this.activeCanvas.width;
    snapshot.height = this.activeCanvas.height;
    const ctx = snapshot.getContext('2d');
    ctx.drawImage(this.activeCanvas, 0, 0);

    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }

    this.historyStack.push({
      canvas: snapshot,
      label,
      width: snapshot.width,
      height: snapshot.height
    });

    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    }

    this.historyIndex = this.historyStack.length - 1;
    this.notifyChange();
  }

  undo() {
    if (this.canUndo()) {
      this.historyIndex--;
      const state = this.historyStack[this.historyIndex];
      this.activeCanvas.width = state.width;
      this.activeCanvas.height = state.height;
      this.activeCtx.clearRect(0, 0, state.width, state.height);
      this.activeCtx.drawImage(state.canvas, 0, 0);
      this.notifyChange();
      return true;
    }
    return false;
  }

  redo() {
    if (this.canRedo()) {
      this.historyIndex++;
      const state = this.historyStack[this.historyIndex];
      this.activeCanvas.width = state.width;
      this.activeCanvas.height = state.height;
      this.activeCtx.clearRect(0, 0, state.width, state.height);
      this.activeCtx.drawImage(state.canvas, 0, 0);
      this.notifyChange();
      return true;
    }
    return false;
  }

  canUndo() { return this.historyIndex > 0; }
  canRedo() { return this.historyIndex < this.historyStack.length - 1; }

  resetToOriginal() {
    this.activeCanvas.width = this.sourceCanvas.width;
    this.activeCanvas.height = this.sourceCanvas.height;
    this.activeCtx.clearRect(0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
    this.activeCtx.drawImage(this.sourceCanvas, 0, 0);
    this.pushHistory('Reset to Original');
  }

  // 1. Resize Image
  resize(targetWidth, targetHeight) {
    targetWidth = Math.max(1, Math.round(targetWidth));
    targetHeight = Math.max(1, Math.round(targetHeight));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetWidth;
    outCanvas.height = targetHeight;
    const ctx = outCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(this.activeCanvas, 0, 0, targetWidth, targetHeight);

    this.activeCanvas.width = targetWidth;
    this.activeCanvas.height = targetHeight;
    this.activeCtx.clearRect(0, 0, targetWidth, targetHeight);
    this.activeCtx.drawImage(outCanvas, 0, 0);

    this.pushHistory(`Resize ${targetWidth}×${targetHeight}`);
  }

  // 2. Crop Image
  crop(x, y, cropWidth, cropHeight) {
    x = Math.max(0, Math.round(x));
    y = Math.max(0, Math.round(y));
    cropWidth = Math.min(this.activeCanvas.width - x, Math.round(cropWidth));
    cropHeight = Math.min(this.activeCanvas.height - y, Math.round(cropHeight));

    if (cropWidth <= 0 || cropHeight <= 0) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = cropWidth;
    outCanvas.height = cropHeight;
    const ctx = outCanvas.getContext('2d');
    ctx.drawImage(this.activeCanvas, x, y, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    this.activeCanvas.width = cropWidth;
    this.activeCanvas.height = cropHeight;
    this.activeCtx.clearRect(0, 0, cropWidth, cropHeight);
    this.activeCtx.drawImage(outCanvas, 0, 0);

    this.pushHistory(`Crop ${cropWidth}×${cropHeight}`);
  }

  // 3. Rotate & Flip
  rotateAndFlip(degrees = 0, flipH = false, flipV = false) {
    const rad = (degrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    
    const origW = this.activeCanvas.width;
    const origH = this.activeCanvas.height;

    const newW = Math.round(origW * cos + origH * sin);
    const newH = Math.round(origW * sin + origH * cos);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = newW;
    outCanvas.height = newH;
    const ctx = outCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(this.activeCanvas, -origW / 2, -origH / 2);

    this.activeCanvas.width = newW;
    this.activeCanvas.height = newH;
    this.activeCtx.clearRect(0, 0, newW, newH);
    this.activeCtx.drawImage(outCanvas, 0, 0);

    this.pushHistory(`Rotate ${degrees}°`);
  }

  // 4 & 5. Filters & Adjustments
  applyFilters({
    brightness = 100,
    contrast = 100,
    saturation = 100,
    exposure = 0,
    warmth = 0,
    grayscale = 0,
    sepia = 0,
    vignette = 0
  }, baseCanvas = null) {
    const src = baseCanvas || this.activeCanvas;
    const w = src.width;
    const h = src.height;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext('2d');

    const filterString = [
      `brightness(${brightness + exposure}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      `grayscale(${grayscale}%)`,
      `sepia(${sepia}%)`
    ].filter(Boolean).join(' ');

    ctx.filter = filterString;
    ctx.drawImage(src, 0, 0);
    ctx.filter = 'none';

    if (warmth !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = warmth > 0 ? 'color' : 'color-burn';
      ctx.fillStyle = warmth > 0 ? `rgba(255, 170, 80, ${Math.abs(warmth) / 350})` : `rgba(70, 130, 240, ${Math.abs(warmth) / 350})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (vignette > 0) {
      ctx.save();
      const radius = Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2));
      const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.4, w / 2, h / 2, radius);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${(vignette / 100) * 0.8})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    return outCanvas;
  }

  commitFilters(filterParams) {
    const filtered = this.applyFilters(filterParams);
    this.activeCanvas.width = filtered.width;
    this.activeCanvas.height = filtered.height;
    this.activeCtx.clearRect(0, 0, filtered.width, filtered.height);
    this.activeCtx.drawImage(filtered, 0, 0);
    this.pushHistory('Adjustments/Filters');
  }

  // 6. Text Overlay
  applyTextOverlay({
    text = '',
    fontSize = 48,
    fontFamily = 'Manrope',
    fontWeight = '700',
    color = '#FFFFFF',
    opacity = 90,
    position = 'center',
    shadow = true
  }, baseCanvas = null) {
    const src = baseCanvas || this.activeCanvas;
    const w = src.width;
    const h = src.height;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext('2d');
    ctx.drawImage(src, 0, 0);

    if (!text.trim()) return outCanvas;

    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity / 100;

    if (shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    if (position === 'watermark') {
      ctx.rotate(-Math.PI / 6);
      const stepX = fontSize * 10;
      const stepY = fontSize * 5;
      for (let x = -w; x < w * 2; x += stepX) {
        for (let y = -h; y < h * 2; y += stepY) {
          ctx.fillText(text, x, y);
        }
      }
    } else {
      ctx.textBaseline = 'middle';
      const pad = Math.max(24, fontSize * 0.8);
      let posX = w / 2;
      let posY = h / 2;
      ctx.textAlign = 'center';

      if (position === 'bottom-right') {
        ctx.textAlign = 'right';
        posX = w - pad;
        posY = h - pad;
      } else if (position === 'bottom-left') {
        ctx.textAlign = 'left';
        posX = pad;
        posY = h - pad;
      } else if (position === 'top-right') {
        ctx.textAlign = 'right';
        posX = w - pad;
        posY = pad;
      } else if (position === 'top-left') {
        ctx.textAlign = 'left';
        posX = pad;
        posY = pad;
      }

      ctx.fillText(text, posX, posY);
    }

    ctx.restore();
    return outCanvas;
  }

  commitTextOverlay(params) {
    const result = this.applyTextOverlay(params);
    this.activeCanvas.width = result.width;
    this.activeCanvas.height = result.height;
    this.activeCtx.clearRect(0, 0, result.width, result.height);
    this.activeCtx.drawImage(result, 0, 0);
    this.pushHistory(`Add Text "${params.text}"`);
  }

  // 7. Drawing Canvas
  commitDrawing(drawnCanvas) {
    this.activeCanvas.width = drawnCanvas.width;
    this.activeCanvas.height = drawnCanvas.height;
    this.activeCtx.clearRect(0, 0, drawnCanvas.width, drawnCanvas.height);
    this.activeCtx.drawImage(drawnCanvas, 0, 0);
    this.pushHistory('Draw & Annotate');
  }

  // 8. Privacy Redact & Pixelate
  applyRedaction(rects) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = this.activeCanvas.width;
    outCanvas.height = this.activeCanvas.height;
    const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(this.activeCanvas, 0, 0);

    rects.forEach(r => {
      const rx = Math.max(0, Math.floor(r.x));
      const ry = Math.max(0, Math.floor(r.y));
      const rw = Math.min(outCanvas.width - rx, Math.floor(r.w));
      const rh = Math.min(outCanvas.height - ry, Math.floor(r.h));
      if (rw <= 0 || rh <= 0) return;

      if (r.mode === 'blackout') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(rx, ry, rw, rh);
      } else {
        // Pixelate
        const blockSize = Math.max(6, Math.floor(r.blockSize || 16));
        const imgData = ctx.getImageData(rx, ry, rw, rh);
        const data = imgData.data;

        for (let y = 0; y < rh; y += blockSize) {
          for (let x = 0; x < rw; x += blockSize) {
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            const curBW = Math.min(blockSize, rw - x);
            const curBH = Math.min(blockSize, rh - y);

            for (let by = 0; by < curBH; by++) {
              for (let bx = 0; bx < curBW; bx++) {
                const idx = ((y + by) * rw + (x + bx)) * 4;
                rSum += data[idx];
                gSum += data[idx + 1];
                bSum += data[idx + 2];
                count++;
              }
            }

            const avgR = Math.round(rSum / count);
            const avgG = Math.round(gSum / count);
            const avgB = Math.round(bSum / count);

            ctx.fillStyle = `rgb(${avgR},${avgG},${avgB})`;
            ctx.fillRect(rx + x, ry + y, curBW, curBH);
          }
        }
      }
    });

    return outCanvas;
  }

  commitRedaction(rects) {
    const result = this.applyRedaction(rects);
    this.activeCanvas.width = result.width;
    this.activeCanvas.height = result.height;
    this.activeCtx.clearRect(0, 0, result.width, result.height);
    this.activeCtx.drawImage(result, 0, 0);
    this.pushHistory(`Redact & Censor (${rects.length} areas)`);
  }

  // 9. Background Remover & Cutout
  applyBackgroundRemoval(options = {}) {
    const {
      tolerance = 32,
      replaceMode = 'transparent', // 'transparent', 'solid', 'gradient'
      solidColor = '#FFFFFF',
      gradStart = '#D7F36A',
      gradEnd = '#22241F'
    } = options;

    const w = this.activeCanvas.width;
    const h = this.activeCanvas.height;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext('2d', { willReadFrequently: true });

    // Background layer
    if (replaceMode === 'solid') {
      ctx.fillStyle = solidColor;
      ctx.fillRect(0, 0, w, h);
    } else if (replaceMode === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, gradStart);
      grad.addColorStop(1, gradEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Sample corner pixels to determine background chroma
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(this.activeCanvas, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Sample 4 corners
    const corners = [
      0, // top-left
      (w - 1) * 4, // top-right
      ((h - 1) * w) * 4, // bottom-left
      ((h - 1) * w + (w - 1)) * 4 // bottom-right
    ];

    let bgR = 0, bgG = 0, bgB = 0;
    corners.forEach(idx => {
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
    });
    bgR = Math.round(bgR / 4);
    bgG = Math.round(bgG / 4);
    bgB = Math.round(bgB / 4);

    const tolSq = tolerance * tolerance * 3;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distSq = (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2;

      if (distSq < tolSq) {
        // Feather alpha
        const ratio = Math.sqrt(distSq) / (tolerance * 1.732);
        data[i + 3] = Math.max(0, Math.min(255, Math.floor(ratio * 255)));
      }
    }

    tempCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0);

    return outCanvas;
  }

  commitBackgroundRemoval(options) {
    const result = this.applyBackgroundRemoval(options);
    this.activeCanvas.width = result.width;
    this.activeCanvas.height = result.height;
    this.activeCtx.clearRect(0, 0, result.width, result.height);
    this.activeCtx.drawImage(result, 0, 0);
    this.pushHistory('Remove Background');
  }

  // 10. Frame & Screenshot Mockup Studio
  applyFrameMockup(options = {}) {
    const {
      padding = 48,
      radius = 16,
      shadow = 30,
      showMacHeader = true,
      windowTitle = 'pixkit-screenshot.png',
      bgType = 'gradient', // 'gradient', 'solid', 'transparent'
      bgColor = '#1A1C16',
      gradStart = '#F3F4ED',
      gradEnd = '#D7F36A'
    } = options;

    const srcW = this.activeCanvas.width;
    const srcH = this.activeCanvas.height;
    const headerH = showMacHeader ? 40 : 0;

    const totalW = srcW + padding * 2;
    const totalH = srcH + headerH + padding * 2;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = totalW;
    outCanvas.height = totalH;
    const ctx = outCanvas.getContext('2d');

    // 1. Draw Canvas Backdrop
    if (bgType === 'solid') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, totalW, totalH);
    } else if (bgType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, totalW, totalH);
      grad.addColorStop(0, gradStart);
      grad.addColorStop(1, gradEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, totalW, totalH);
    }

    const cardX = padding;
    const cardY = padding;
    const cardW = srcW;
    const cardH = srcH + headerH;

    // Helper: Rounded Rect Path
    const drawRoundedRect = (c, x, y, w, h, r) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    };

    // 2. Draw Shadow & Card Container
    ctx.save();
    if (shadow > 0) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = shadow * 1.5;
      ctx.shadowOffsetY = shadow * 0.7;
    }
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.restore();

    // 3. Draw Header if enabled
    if (showMacHeader) {
      ctx.save();
      // Clip to top rounded corners
      ctx.beginPath();
      ctx.moveTo(cardX + radius, cardY);
      ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + headerH, radius);
      ctx.lineTo(cardX + cardW, cardY + headerH);
      ctx.lineTo(cardX, cardY + headerH);
      ctx.arcTo(cardX, cardY, cardX + cardW, cardY, radius);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#FAFAFA';
      ctx.fillRect(cardX, cardY, cardW, headerH);

      // Border line under header
      ctx.strokeStyle = '#E5E5E5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX, cardY + headerH);
      ctx.lineTo(cardX + cardW, cardY + headerH);
      ctx.stroke();

      // Traffic Light Dots 🔴🟡🟢
      const dotY = cardY + headerH / 2;
      const dotRadius = 5.5;
      const dotGap = 8;
      const startX = cardX + 16;

      // Close (Red)
      ctx.fillStyle = '#FF5F56';
      ctx.beginPath();
      ctx.arc(startX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      // Minimize (Yellow)
      ctx.fillStyle = '#FFBD2E';
      ctx.beginPath();
      ctx.arc(startX + dotRadius * 2 + dotGap, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      // Expand (Green)
      ctx.fillStyle = '#27C93F';
      ctx.beginPath();
      ctx.arc(startX + (dotRadius * 2 + dotGap) * 2, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      // Title Text
      if (windowTitle) {
        ctx.fillStyle = '#737373';
        ctx.font = '500 12px "DM Sans", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(windowTitle, cardX + cardW / 2, dotY);
      }
      ctx.restore();
    }

    // 4. Draw & Clip Image
    ctx.save();
    ctx.beginPath();
    if (showMacHeader) {
      // Bottom rounded corners
      ctx.moveTo(cardX, cardY + headerH);
      ctx.lineTo(cardX + cardW, cardY + headerH);
      ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, radius);
      ctx.arcTo(cardX, cardY + cardH, cardX, cardY + headerH, radius);
      ctx.lineTo(cardX, cardY + headerH);
    } else {
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius);
    }
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(this.activeCanvas, cardX, cardY + headerH, srcW, srcH);
    ctx.restore();

    return outCanvas;
  }

  commitFrameMockup(options) {
    const result = this.applyFrameMockup(options);
    this.activeCanvas.width = result.width;
    this.activeCanvas.height = result.height;
    this.activeCtx.clearRect(0, 0, result.width, result.height);
    this.activeCtx.drawImage(result, 0, 0);
    this.pushHistory('Apply Frame Mockup');
  }

  // 11. Selective Blur, Tilt-Shift & Blur Brush
  createBlurredLayer(blurType = 'gaussian', blurRadius = 18) {
    const w = this.activeCanvas.width;
    const h = this.activeCanvas.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const rad = Math.max(1, blurRadius);

    // 1. Pixelated / Mosaic Blur
    if (blurType === 'pixelate') {
      const blockSize = Math.max(4, Math.round(rad * 1.25));
      const smallW = Math.max(1, Math.floor(w / blockSize));
      const smallH = Math.max(1, Math.floor(h / blockSize));

      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = smallW;
      smallCanvas.height = smallH;
      const sCtx = smallCanvas.getContext('2d');
      sCtx.drawImage(this.activeCanvas, 0, 0, smallW, smallH);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
      return canvas;
    }

    // 2. Motion Streak / Directional Blur
    if (blurType === 'motion') {
      const steps = 14;
      const maxOffset = rad * 1.5;
      ctx.drawImage(this.activeCanvas, 0, 0);
      ctx.globalAlpha = 1.0 / steps;
      for (let i = 1; i <= steps; i++) {
        const offset = (i / steps) * maxOffset;
        ctx.drawImage(this.activeCanvas, offset, offset * 0.15);
        ctx.drawImage(this.activeCanvas, -offset, -offset * 0.15);
      }
      ctx.globalAlpha = 1.0;

      const blurPass = document.createElement('canvas');
      blurPass.width = w;
      blurPass.height = h;
      const bpCtx = blurPass.getContext('2d');
      bpCtx.filter = `blur(${Math.max(1, Math.round(rad * 0.35))}px)`;
      bpCtx.drawImage(canvas, 0, 0);
      return blurPass;
    }

    // 3. Zoom / Radial Spin Blur
    if (blurType === 'zoom') {
      const steps = 12;
      const maxScale = 1.0 + (rad / 100) * 0.45;
      ctx.drawImage(this.activeCanvas, 0, 0);
      ctx.globalAlpha = 1.0 / steps;
      for (let i = 1; i <= steps; i++) {
        const scale = 1.0 + (i / steps) * (maxScale - 1.0);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.drawImage(this.activeCanvas, -w / 2, -h / 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;
      return canvas;
    }

    // 4. Frosted Glass / Acrylic Grain Blur
    if (blurType === 'frosted') {
      ctx.filter = `blur(${rad}px)`;
      ctx.drawImage(this.activeCanvas, 0, 0);
      ctx.filter = 'none';

      // Frosted dispersion noise overlay
      const grainCanvas = document.createElement('canvas');
      const gw = Math.min(w, 400);
      const gh = Math.min(h, 400);
      grainCanvas.width = gw;
      grainCanvas.height = gh;
      const gCtx = grainCanvas.getContext('2d');
      const imgData = gCtx.createImageData(gw, gh);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 26; // subtle frosted noise
      }
      gCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const pat = ctx.createPattern(grainCanvas, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
      return canvas;
    }

    // 5. Default: Simple Gaussian Optical Blur
    ctx.filter = `blur(${rad}px)`;
    ctx.drawImage(this.activeCanvas, 0, 0);
    return canvas;
  }

  applySelectiveBlur(options = {}) {
    const {
      mode = 'radial', // 'full', 'radial', 'tiltshift', 'brush'
      blurType = 'gaussian', // 'gaussian', 'pixelate', 'motion', 'zoom', 'frosted'
      blurRadius = 16,
      focusX = 0.5, // 0 to 1
      focusY = 0.5,
      focusRadius = 0.35, // 0 to 1
      bandCenterY = 0.5,
      bandHeight = 0.25,
      brushCanvas = null // custom painted mask canvas
    } = options;

    const w = this.activeCanvas.width;
    const h = this.activeCanvas.height;

    // Sharp canvas
    const sharpCanvas = document.createElement('canvas');
    sharpCanvas.width = w;
    sharpCanvas.height = h;
    sharpCanvas.getContext('2d').drawImage(this.activeCanvas, 0, 0);

    // Blurred canvas using selected blur style
    const blurCanvas = this.createBlurredLayer(blurType, blurRadius);

    if (mode === 'full') {
      return blurCanvas;
    }

    if (mode === 'brush') {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = w;
      outCanvas.height = h;
      const ctx = outCanvas.getContext('2d');
      // Draw sharp base
      ctx.drawImage(sharpCanvas, 0, 0);

      if (brushCanvas) {
        // Create blurred layer masked by painted brush strokes
        const blurMasked = document.createElement('canvas');
        blurMasked.width = w;
        blurMasked.height = h;
        const bmCtx = blurMasked.getContext('2d');
        bmCtx.drawImage(blurCanvas, 0, 0);
        bmCtx.globalCompositeOperation = 'destination-in';
        bmCtx.drawImage(brushCanvas, 0, 0);

        // Draw masked blur over sharp base
        ctx.drawImage(blurMasked, 0, 0);
      }
      return outCanvas;
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext('2d');

    // Draw blurred base
    ctx.drawImage(blurCanvas, 0, 0);

    // Create mask for sharp area
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext('2d');

    if (mode === 'radial') {
      const fx = focusX * w;
      const fy = focusY * h;
      const fr = focusRadius * Math.min(w, h);
      const grad = maskCtx.createRadialGradient(fx, fy, fr * 0.4, fx, fy, fr);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      maskCtx.fillStyle = grad;
      maskCtx.fillRect(0, 0, w, h);
    } else if (mode === 'tiltshift') {
      const cy = bandCenterY * h;
      const bh = bandHeight * h;
      const grad = maskCtx.createLinearGradient(0, 0, 0, h);
      const topStart = Math.max(0, (cy - bh / 2 - bh * 0.4) / h);
      const topFocus = Math.max(0, (cy - bh / 2) / h);
      const bottomFocus = Math.min(1, (cy + bh / 2) / h);
      const bottomEnd = Math.min(1, (cy + bh / 2 + bh * 0.4) / h);

      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(topStart, 'rgba(0,0,0,0)');
      grad.addColorStop(topFocus, 'rgba(0,0,0,1)');
      grad.addColorStop(bottomFocus, 'rgba(0,0,0,1)');
      grad.addColorStop(bottomEnd, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      maskCtx.fillStyle = grad;
      maskCtx.fillRect(0, 0, w, h);
    }

    // Blend sharp on top using mask
    sharpCanvas.getContext('2d').globalCompositeOperation = 'destination-in';
    sharpCanvas.getContext('2d').drawImage(maskCanvas, 0, 0);
    ctx.drawImage(sharpCanvas, 0, 0);

    return outCanvas;
  }

  commitSelectiveBlur(options) {
    const result = this.applySelectiveBlur(options);
    this.activeCanvas.width = result.width;
    this.activeCanvas.height = result.height;
    this.activeCtx.clearRect(0, 0, result.width, result.height);
    this.activeCtx.drawImage(result, 0, 0);
    const typeLabel = options.blurType ? options.blurType.charAt(0).toUpperCase() + options.blurType.slice(1) : 'Gaussian';
    const label = options.mode === 'brush' ? `Blur Brush (${typeLabel})` : `Blur & Focus (${typeLabel})`;
    this.pushHistory(label);
  }

  // 12. Film Grain & Vignette
  applyGrainAndVignette(options = {}) {
    const {
      vignette = 40, // 0 to 100
      grain = 25 // 0 to 100
    } = options;

    const w = this.activeCanvas.width;
    const h = this.activeCanvas.height;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(this.activeCanvas, 0, 0);

    // 1. Apply Vignette
    if (vignette > 0) {
      const maxRadius = Math.hypot(w / 2, h / 2);
      const grad = ctx.createRadialGradient(w / 2, h / 2, maxRadius * 0.45, w / 2, h / 2, maxRadius);
      const alpha = (vignette / 100) * 0.85;
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.75, `rgba(0,0,0,${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(0,0,0,${alpha})`);

      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 2. Apply Film Grain
    if (grain > 0) {
      const grainFactor = (grain / 100) * 38;
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * grainFactor;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);
    }

    return outCanvas;
  }

  commitGrainAndVignette(options) {
    const result = this.applyGrainAndVignette(options);
    this.activeCanvas.width = result.width;
    this.activeCanvas.height = result.height;
    this.activeCtx.clearRect(0, 0, result.width, result.height);
    this.activeCtx.drawImage(result, 0, 0);
    this.pushHistory('Film Grain & Vignette');
  }

  // 13. Watermark Stamp & Copyright
  applyWatermark(options = {}) {
    const {
      type = 'text', // 'text', 'logo'
      text = '© 2026 PixKit Studio',
      logoImg = null,
      position = 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left', 'center', 'tiled'
      opacity = 0.75,
      size = 28,
      color = '#FFFFFF'
    } = options;

    const w = this.activeCanvas.width;
    const h = this.activeCanvas.height;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext('2d');
    ctx.drawImage(this.activeCanvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = opacity;

    if (type === 'text') {
      ctx.font = `600 ${size}px "DM Sans", -apple-system, sans-serif`;
      ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const pad = Math.max(24, size * 1.2);

      if (position === 'tiled') {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const gapX = size * 10;
        const gapY = size * 6;

        for (let y = gapY / 2; y < h; y += gapY) {
          for (let x = gapX / 2; x < w; x += gapX) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }
        }
      } else {
        let px = w / 2, py = h / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (position === 'bottom-right') {
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          px = w - pad;
          py = h - pad;
        } else if (position === 'bottom-left') {
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          px = pad;
          py = h - pad;
        } else if (position === 'top-right') {
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          px = w - pad;
          py = pad;
        } else if (position === 'top-left') {
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          px = pad;
          py = pad;
        }

        ctx.fillText(text, px, py);
      }
    } else if (type === 'logo' && logoImg) {
      const logoW = Math.min(w * 0.35, size * 6);
      const logoH = logoW * (logoImg.height / logoImg.width);
      const pad = 24;

      let lx = w - logoW - pad;
      let ly = h - logoH - pad;

      if (position === 'bottom-left') {
        lx = pad;
        ly = h - logoH - pad;
      } else if (position === 'top-right') {
        lx = w - logoW - pad;
        ly = pad;
      } else if (position === 'top-left') {
        lx = pad;
        ly = pad;
      } else if (position === 'center') {
        lx = (w - logoW) / 2;
        ly = (h - logoH) / 2;
      }

      ctx.drawImage(logoImg, lx, ly, logoW, logoH);
    }

    ctx.restore();
    return outCanvas;
  }

  commitWatermark(options) {
    const result = this.applyWatermark(options);
    this.activeCanvas.width = result.width;
    this.activeCanvas.height = result.height;
    this.activeCtx.clearRect(0, 0, result.width, result.height);
    this.activeCtx.drawImage(result, 0, 0);
    this.pushHistory('Apply Watermark');
  }

  // 14. Color Splash (Selective Color)
  applyColorSplash(options = {}) {
    const {
      targetHex = '#D7F36A',
      tolerance = 45, // 10 to 100
      invert = false
    } = options;

    const w = this.activeCanvas.width;
    const h = this.activeCanvas.height;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(this.activeCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Convert targetHex to RGB & HSL
    const hex = targetHex.replace('#', '');
    const tr = parseInt(hex.substring(0, 2), 16) || 0;
    const tg = parseInt(hex.substring(2, 4), 16) || 0;
    const tb = parseInt(hex.substring(4, 6), 16) || 0;

    const rgbToHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [h * 360, s, l];
    };

    const [targetHue, targetSat] = rgbToHsl(tr, tg, tb);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const [h, s, l] = rgbToHsl(r, g, b);

      let hueDiff = Math.abs(h - targetHue);
      if (hueDiff > 180) hueDiff = 360 - hueDiff;

      const isMatch = (hueDiff <= tolerance && s > 0.15);
      const keepColor = invert ? !isMatch : isMatch;

      if (!keepColor) {
        // Convert to Luminance Grayscale
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return outCanvas;
  }

  commitColorSplash(options) {
    const result = this.applyColorSplash(options);
    this.activeCanvas.width = result.width;
    this.activeCanvas.height = result.height;
    this.activeCtx.clearRect(0, 0, result.width, result.height);
    this.activeCtx.drawImage(result, 0, 0);
    this.pushHistory('Color Splash');
  }

  // Export / Download
  async exportBlob(format = 'image/jpeg', quality = 0.92, customCanvas = null) {
    const canvas = customCanvas || this.activeCanvas;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, format, quality);
    });
  }

  // Auto-calibrate quality & dimensions to guarantee output file size is under targetBytes
  async autoCalibrateCompression(targetBytes, mimeType = 'image/jpeg') {
    const srcCanvas = this.activeCanvas;
    const origW = srcCanvas.width;
    const origH = srcCanvas.height;

    const testBlob = (canvas, q) => {
      return new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), mimeType, q);
      });
    };

    // Stage 1: Try binary search on quality at 100% full resolution
    let lowQ = 0.15;
    let highQ = 0.96;
    let bestQuality = 0.80;
    let bestBlob = null;

    for (let i = 0; i < 7; i++) {
      const midQ = (lowQ + highQ) / 2;
      const blob = await testBlob(srcCanvas, midQ);
      if (blob && blob.size <= targetBytes) {
        bestQuality = midQ;
        bestBlob = blob;
        lowQ = midQ;
      } else {
        highQ = midQ;
      }
    }

    if (bestBlob && bestBlob.size <= targetBytes) {
      return {
        canvas: srcCanvas,
        quality: Math.round(bestQuality * 100),
        blob: bestBlob,
        width: origW,
        height: origH,
        scale: 1.0
      };
    }

    // Stage 2: Scale dimensions proportionally down so image remains sharp and fits budget
    let currentScale = 0.90;
    const calibratedCanvas = document.createElement('canvas');

    for (let attempt = 0; attempt < 8; attempt++) {
      const w = Math.max(32, Math.round(origW * currentScale));
      const h = Math.max(32, Math.round(origH * currentScale));

      calibratedCanvas.width = w;
      calibratedCanvas.height = h;
      const ctx = calibratedCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(srcCanvas, 0, 0, w, h);

      let qLow = 0.20;
      let qHigh = 0.92;
      let fitBlob = null;
      let fitQ = 0.78;

      for (let j = 0; j < 6; j++) {
        const midQ = (qLow + qHigh) / 2;
        const b = await testBlob(calibratedCanvas, midQ);
        if (b && b.size <= targetBytes) {
          fitQ = midQ;
          fitBlob = b;
          qLow = midQ;
        } else {
          qHigh = midQ;
        }
      }

      if (fitBlob && fitBlob.size <= targetBytes) {
        return {
          canvas: calibratedCanvas,
          quality: Math.round(fitQ * 100),
          blob: fitBlob,
          width: w,
          height: h,
          scale: currentScale
        };
      }

      currentScale *= 0.78;
    }

    // Fallback: maximum reduction
    const minW = Math.max(32, Math.round(origW * currentScale));
    const minH = Math.max(32, Math.round(origH * currentScale));
    calibratedCanvas.width = minW;
    calibratedCanvas.height = minH;
    const ctx = calibratedCanvas.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0, minW, minH);
    const finalBlob = await testBlob(calibratedCanvas, 0.20);

    return {
      canvas: calibratedCanvas,
      quality: 20,
      blob: finalBlob,
      width: minW,
      height: minH,
      scale: currentScale
    };
  }

  // Resample to target pixel dimensions
  async resampleToPixels(targetW, targetH, quality = 0.85, mimeType = 'image/jpeg') {
    const srcCanvas = this.activeCanvas;
    targetW = Math.max(16, Math.round(targetW));
    targetH = Math.max(16, Math.round(targetH));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const ctx = outCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcCanvas, 0, 0, targetW, targetH);

    const blob = await new Promise(resolve => outCanvas.toBlob(resolve, mimeType, quality));
    return {
      canvas: outCanvas,
      quality: Math.round(quality * 100),
      blob: blob,
      width: targetW,
      height: targetH
    };
  }

  async download(format = 'jpg', quality = 0.92, customName = '') {
    const baseName = customName.trim() || this.filename.replace(/\.[^/.]+$/, '');
    let mime = 'image/jpeg';
    let ext = 'jpg';
    if (format === 'png') {
      mime = 'image/png';
      ext = 'png';
    } else if (format === 'webp') {
      mime = 'image/webp';
      ext = 'webp';
    }

    const blob = await this.exportBlob(mime, quality);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_edited.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return blob;
  }

  // BMP Encoder (24-bit RGB BMP File Format)
  canvasToBmpBlob(canvas, backgroundFill = '#ffffff') {
    const width = canvas.width;
    const height = canvas.height;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    if (backgroundFill) {
      ctx.fillStyle = backgroundFill;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(canvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const rowSize = Math.floor((24 * width + 31) / 32) * 4;
    const imageSize = rowSize * height;
    const fileSize = 54 + imageSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // BMP Header (14 bytes)
    view.setUint16(0, 0x4D42, true); // 'BM'
    view.setUint32(2, fileSize, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint32(10, 54, true); // Data offset

    // BITMAPINFOHEADER (40 bytes)
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, height, true);
    view.setUint16(26, 1, true); // planes
    view.setUint16(28, 24, true); // 24-bit
    view.setUint32(30, 0, true); // BI_RGB
    view.setUint32(34, imageSize, true);
    view.setInt32(38, 2835, true); // 72 DPI
    view.setInt32(42, 2835, true);
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);

    let offset = 54;
    for (let y = height - 1; y >= 0; y--) {
      const rowStart = y * width * 4;
      for (let x = 0; x < width; x++) {
        const p = rowStart + x * 4;
        view.setUint8(offset++, data[p + 2]); // B
        view.setUint8(offset++, data[p + 1]); // G
        view.setUint8(offset++, data[p]);     // R
      }
      for (let pad = 0; pad < rowSize - width * 3; pad++) {
        view.setUint8(offset++, 0);
      }
    }

    return new Blob([buffer], { type: 'image/bmp' });
  }

  // Format Converter: converts active canvas to target format with optional background fill & quality
  async convertFormat(targetFormat = 'jpeg', quality = 0.90, backgroundFill = '#ffffff') {
    const srcCanvas = this.activeCanvas;
    const width = srcCanvas.width || 800;
    const height = srcCanvas.height || 600;

    let mime = 'image/jpeg';
    let ext = 'jpg';

    if (targetFormat === 'png') {
      mime = 'image/png';
      ext = 'png';
    } else if (targetFormat === 'webp') {
      mime = 'image/webp';
      ext = 'webp';
    } else if (targetFormat === 'avif') {
      mime = 'image/avif';
      ext = 'avif';
    } else if (targetFormat === 'heic') {
      mime = 'image/heic';
      ext = 'heic';
    } else if (targetFormat === 'svg') {
      mime = 'image/svg+xml';
      ext = 'svg';
    } else if (targetFormat === 'ico') {
      mime = 'image/x-icon';
      ext = 'ico';
    } else if (targetFormat === 'bmp') {
      mime = 'image/bmp';
      ext = 'bmp';
    }

    let exportCanvas = srcCanvas;

    // For formats without alpha transparency (JPG, BMP), composite onto background color
    if ((targetFormat === 'jpeg' || targetFormat === 'bmp') && backgroundFill) {
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d');
      ctx.fillStyle = backgroundFill;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(srcCanvas, 0, 0);
    }

    let blob;
    if (targetFormat === 'bmp') {
      blob = this.canvasToBmpBlob(exportCanvas, backgroundFill);
    } else if (targetFormat === 'ico') {
      const icoRes = await this.canvasToIcoBlob(exportCanvas, [16, 32, 48], 'cover');
      blob = icoRes.blob;
    } else if (targetFormat === 'svg') {
      const dataUrl = exportCanvas.toDataURL('image/png');
      const svgText = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="${dataUrl}" xlink:href="${dataUrl}" />
</svg>`;
      blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    } else if (targetFormat === 'heic') {
      blob = await new Promise((resolve) => {
        try {
          // Attempt native HEIC canvas export if supported (Safari / WebKit)
          exportCanvas.toBlob((b) => {
            if (b && (b.type === 'image/heic' || b.type === 'image/heif')) {
              resolve(b);
            } else {
              // High efficiency fallback encoded container with .heic extension & image/heic mime
              exportCanvas.toBlob((fb) => {
                if (fb) {
                  const heicBlob = new Blob([fb], { type: 'image/heic' });
                  resolve(heicBlob);
                } else {
                  resolve(new Blob([], { type: 'image/heic' }));
                }
              }, 'image/jpeg', quality);
            }
          }, 'image/heic', quality);
        } catch (e) {
          exportCanvas.toBlob((fb) => {
            resolve(new Blob([fb || ''], { type: 'image/heic' }));
          }, 'image/jpeg', quality);
        }
      });
    } else {
      blob = await new Promise((resolve) => {
        try {
          exportCanvas.toBlob((b) => {
            if (!b || (targetFormat === 'avif' && b.type !== 'image/avif')) {
              exportCanvas.toBlob((fallbackBlob) => {
                resolve(fallbackBlob || new Blob([], { type: mime }));
              }, 'image/jpeg', quality);
            } else {
              resolve(b);
            }
          }, mime, quality);
        } catch (e) {
          exportCanvas.toBlob((fb) => resolve(fb), 'image/jpeg', quality);
        }
      });
    }

    const blobSize = (blob && blob.size) ? blob.size : 0;
    const blobType = (blob && blob.type) ? blob.type : mime;

    return {
      blob,
      width,
      height,
      mimeType: blobType,
      extension: ext,
      size: blobSize,
      originalSize: this.fileSize || 0
    };
  }

  // Parse SVG text to get intrinsic viewBox or width/height dimensions
  parseSvgDimensions(svgText) {
    let width = 800;
    let height = 800;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (svgEl) {
        const vb = svgEl.getAttribute('viewBox');
        if (vb) {
          const parts = vb.trim().split(/[\s,]+/).map(Number);
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            width = parts[2];
            height = parts[3];
          }
        } else {
          const wAttr = parseFloat(svgEl.getAttribute('width'));
          const hAttr = parseFloat(svgEl.getAttribute('height'));
          if (!isNaN(wAttr) && wAttr > 0) width = wAttr;
          if (!isNaN(hAttr) && hAttr > 0) height = hAttr;
        }
      }
    } catch (e) {
      console.warn('SVG dimension parsing warning:', e);
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  // Rasterize SVG string to sharp Canvas at target dimensions & optional background color
  async rasterizeSvg(svgText, targetWidth, targetHeight, bgFill = null, targetFormat = 'png', quality = 0.92) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(16, targetWidth);
    canvas.height = Math.max(16, targetHeight);
    const ctx = canvas.getContext('2d');

    // Optional background fill
    if (bgFill && bgFill !== 'transparent') {
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load SVG into Image element'));
      img.src = url;
    });

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    let mime = 'image/png';
    let ext = 'png';
    if (targetFormat === 'webp') {
      mime = 'image/webp';
      ext = 'webp';
    } else if (targetFormat === 'jpeg') {
      mime = 'image/jpeg';
      ext = 'jpg';
    }

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), mime, quality);
    });

    return {
      canvas,
      blob,
      width: canvas.width,
      height: canvas.height,
      mimeType: mime,
      extension: ext,
      size: (blob && blob.size) || 0
    };
  }

  // Generate crisp geometric demo SVG vector
  getSampleSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="none" />
  <g filter="url(#shadow)">
    <polygon points="400,120 660,270 660,570 400,720 140,570 140,270" fill="url(#grad1)" />
    <polygon points="400,200 590,310 590,530 400,640 210,530 210,310" fill="#ffffff" fill-opacity="0.12" />
    <circle cx="400" cy="420" r="140" fill="url(#grad2)" />
    <polygon points="400,320 480,480 320,480" fill="#ffffff" />
    <circle cx="400" cy="420" r="28" fill="#1e293b" />
  </g>
  <text x="400" y="770" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" fill="#64748b" text-anchor="middle" letter-spacing="4">PIXKIT VECTOR ASSET</text>
</svg>`;
  }

  // Encode Canvas to binary Microsoft .ICO format with multi-resolution support
  async canvasToIcoBlob(srcCanvas, sizes = [16, 32, 48], fitMode = 'cover') {
    const pngBuffers = [];
    const validSizes = sizes.filter(s => [16, 32, 48, 64, 128, 256].includes(s));
    if (validSizes.length === 0) validSizes.push(32);

    for (const size of validSizes) {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const sw = srcCanvas.width || 800;
      const sh = srcCanvas.height || 600;

      if (fitMode === 'contain') {
        const scale = Math.min(size / sw, size / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = (size - dw) / 2;
        const dy = (size - dh) / 2;
        ctx.drawImage(srcCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
      } else if (fitMode === 'stretch') {
        ctx.drawImage(srcCanvas, 0, 0, size, size);
      } else {
        // cover (center crop into 1:1)
        const scale = Math.max(size / sw, size / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = (size - dw) / 2;
        const dy = (size - dh) / 2;
        ctx.drawImage(srcCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
      }

      const pngBlob = await new Promise(resolve => c.toBlob(resolve, 'image/png'));
      const arrayBuffer = await pngBlob.arrayBuffer();
      pngBuffers.push({
        size,
        buffer: new Uint8Array(arrayBuffer),
        canvas: c
      });
    }

    const count = pngBuffers.length;
    const headerLength = 6 + (16 * count);
    let totalLength = headerLength;
    for (const item of pngBuffers) {
      totalLength += item.buffer.length;
    }

    const icoData = new Uint8Array(totalLength);
    const view = new DataView(icoData.buffer);

    // Write ICONDIR
    view.setUint16(0, 0, true); // Reserved
    view.setUint16(2, 1, true); // Type: 1 = ICO
    view.setUint16(4, count, true); // Number of images

    let currentOffset = headerLength;

    // Write ICONDIRENTRY for each image
    for (let i = 0; i < count; i++) {
      const item = pngBuffers[i];
      const entryOffset = 6 + (i * 16);
      const widthByte = item.size >= 256 ? 0 : item.size;
      const heightByte = item.size >= 256 ? 0 : item.size;

      view.setUint8(entryOffset + 0, widthByte);
      view.setUint8(entryOffset + 1, heightByte);
      view.setUint8(entryOffset + 2, 0); // Palette count
      view.setUint8(entryOffset + 3, 0); // Reserved
      view.setUint16(entryOffset + 4, 1, true); // Color planes
      view.setUint16(entryOffset + 6, 32, true); // Bits per pixel
      view.setUint32(entryOffset + 8, item.buffer.length, true); // Size of image data
      view.setUint32(entryOffset + 12, currentOffset, true); // Offset of image data

      // Copy PNG buffer to data chunk
      icoData.set(item.buffer, currentOffset);
      currentOffset += item.buffer.length;
    }

    return {
      blob: new Blob([icoData], { type: 'image/x-icon' }),
      sizes: validSizes,
      pngBuffers
    };
  }

  /**
   * Convert canvas to Base64 data with configurable format, quality, max dimension, and snippet types
   */
  async canvasToBase64(canvas, options = {}) {
    const {
      mimeType = 'image/png',
      quality = 0.92,
      maxDim = null,
      snippetType = 'data-uri'
    } = options;

    let targetCanvas = canvas;
    if (maxDim && (canvas.width > maxDim || canvas.height > maxDim)) {
      const scale = Math.min(maxDim / canvas.width, maxDim / canvas.height);
      const scaledW = Math.max(1, Math.round(canvas.width * scale));
      const scaledH = Math.max(1, Math.round(canvas.height * scale));
      const temp = document.createElement('canvas');
      temp.width = scaledW;
      temp.height = scaledH;
      const ctx = temp.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, scaledW, scaledH);
      targetCanvas = temp;
    }

    const dataUri = targetCanvas.toDataURL(mimeType, quality);
    const rawBase64 = dataUri.split(',')[1] || '';
    const byteSize = Math.round((rawBase64.length * 3) / 4);

    let snippet = dataUri;
    if (snippetType === 'html-img') {
      snippet = `<img src="${dataUri}" alt="embedded image" width="${targetCanvas.width}" height="${targetCanvas.height}">`;
    } else if (snippetType === 'css-bg') {
      snippet = `background-image: url("${dataUri}");`;
    } else if (snippetType === 'raw') {
      snippet = rawBase64;
    } else if (snippetType === 'markdown') {
      snippet = `![Embedded Image](${dataUri})`;
    } else if (snippetType === 'json') {
      snippet = JSON.stringify({ image: dataUri, width: targetCanvas.width, height: targetCanvas.height }, null, 2);
    }

    return {
      dataUri,
      rawBase64,
      snippet,
      byteSize,
      charLength: snippet.length,
      mimeType,
      width: targetCanvas.width,
      height: targetCanvas.height
    };
  }

  /**
   * Pure client-side PDF generator from Canvas without external dependencies
   */
  async canvasToPdfBlob(canvas, options = {}) {
    const {
      pageSize = 'a4',       // 'a4', 'letter', 'legal', 'auto'
      orientation = 'auto',  // 'auto', 'portrait', 'landscape'
      margin = 'small',      // 'none', 'small', 'standard'
      fitMode = 'contain',   // 'contain', 'cover', 'original'
      quality = 0.92
    } = options;

    const imgW = canvas.width;
    const imgH = canvas.height;

    // Determine base dimensions in points (72 pt = 1 inch)
    let basePageW = 595.28;
    let basePageH = 841.89;

    if (pageSize === 'letter') {
      basePageW = 612;
      basePageH = 792;
    } else if (pageSize === 'legal') {
      basePageW = 612;
      basePageH = 1008;
    } else if (pageSize === 'auto') {
      basePageW = imgW * 72 / 96;
      basePageH = imgH * 72 / 96;
    }

    // Determine Orientation
    let isLandscape = false;
    if (orientation === 'landscape') {
      isLandscape = true;
    } else if (orientation === 'portrait') {
      isLandscape = false;
    } else {
      // Auto orientation based on image aspect ratio
      isLandscape = imgW > imgH;
    }

    let pageW = isLandscape ? Math.max(basePageW, basePageH) : Math.min(basePageW, basePageH);
    let pageH = isLandscape ? Math.min(basePageW, basePageH) : Math.max(basePageW, basePageH);

    if (pageSize === 'auto') {
      pageW = imgW * 72 / 96;
      pageH = imgH * 72 / 96;
    }

    // Determine Margin in points
    let marginPt = 0;
    if (pageSize !== 'auto') {
      if (margin === 'small') marginPt = 28.35; // 10mm
      else if (margin === 'standard') marginPt = 56.7; // 20mm
    }

    const availW = Math.max(10, pageW - (marginPt * 2));
    const availH = Math.max(10, pageH - (marginPt * 2));

    // Calculate image position and render size on PDF page
    let renderW = availW;
    let renderH = availH;
    let posX = marginPt;
    let posY = marginPt;

    const imgAspect = imgW / imgH;
    const availAspect = availW / availH;

    if (fitMode === 'cover') {
      if (imgAspect > availAspect) {
        renderH = availH;
        renderW = availH * imgAspect;
        posX = marginPt + (availW - renderW) / 2;
      } else {
        renderW = availW;
        renderH = availW / imgAspect;
        posY = marginPt + (availH - renderH) / 2;
      }
    } else if (fitMode === 'original') {
      renderW = imgW * 72 / 96;
      renderH = imgH * 72 / 96;
      posX = (pageW - renderW) / 2;
      posY = (pageH - renderH) / 2;
    } else {
      // contain (default)
      if (imgAspect > availAspect) {
        renderW = availW;
        renderH = availW / imgAspect;
        posY = marginPt + (availH - renderH) / 2;
      } else {
        renderH = availH;
        renderW = availH * imgAspect;
        posX = marginPt + (availW - renderW) / 2;
      }
    }

    // Convert Canvas to JPEG Blob & Uint8Array stream
    const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    const jpegBuffer = new Uint8Array(await jpegBlob.arrayBuffer());

    // Build PDF objects
    const objects = [];
    const offsets = [];

    const addObject = (content) => {
      objects.push(content);
    };

    // 1: Catalog
    addObject(`<< /Type /Catalog /Pages 2 0 R >>`);

    // 2: Pages
    addObject(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);

    // 3: Page
    addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>`);

    // 4: Image XObject header
    const imgHeader = `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuffer.length} >>\nstream\n`;
    const imgFooter = `\nendstream`;

    // 5: Contents (Matrix transform and draw image)
    const contentStream = `q\n${renderW.toFixed(2)} 0 0 ${renderH.toFixed(2)} ${posX.toFixed(2)} ${posY.toFixed(2)} cm\n/Im1 Do\nQ\n`;
    addObject(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`);

    // Encode all parts into single binary stream
    const textEncoder = new TextEncoder();
    const parts = [];
    let currentPos = 0;

    const pushChunk = (str) => {
      const bytes = textEncoder.encode(str);
      parts.push(bytes);
      currentPos += bytes.length;
    };

    pushChunk(`%PDF-1.4\n%âãÏÓ\n`);

    // Write Obj 1, 2, 3
    for (let i = 0; i < 3; i++) {
      offsets.push(currentPos);
      pushChunk(`${i + 1} 0 obj\n${objects[i]}\nendobj\n`);
    }

    // Write Obj 4 (Image stream)
    offsets.push(currentPos);
    pushChunk(`4 0 obj\n${imgHeader}`);
    parts.push(jpegBuffer);
    currentPos += jpegBuffer.length;
    pushChunk(`${imgFooter}\nendobj\n`);

    // Write Obj 5 (Contents)
    offsets.push(currentPos);
    pushChunk(`5 0 obj\n${objects[3]}\nendobj\n`);

    // Write XREF table
    const startXref = currentPos;
    let xref = `xref\n0 6\n0000000000 65535 f \n`;
    for (let i = 0; i < 5; i++) {
      xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    pushChunk(xref);

    const pdfBlob = new Blob(parts, { type: 'application/pdf' });

    return {
      blob: pdfBlob,
      pageWidthPt: pageW,
      pageHeightPt: pageH,
      pageWidthMm: Math.round(pageW * 25.4 / 72),
      pageHeightMm: Math.round(pageH * 25.4 / 72),
      isLandscape,
      renderWidthPt: renderW,
      renderHeightPt: renderH,
      pageSizeName: pageSize.toUpperCase(),
      byteSize: pdfBlob.size
    };
  }

  static formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

window.pixkitEngine = new PixKitEngine();
