(() => {
  'use strict';

  // ===== STATE =====
  const state = {
    files: [],   // Array<File> em ordem de seleção
  };

  // ===== CONFIG (valores fixos) =====
  const TARGET_W    = 1280;
  const TARGET_H    = 720;

  // ===== DOM =====
  const dropzone     = document.getElementById('dropzone');
  const fileInput    = document.getElementById('fileInput');
  const processBtn   = document.getElementById('processBtn');
  const clearBtn     = document.getElementById('clearBtn');
  const fileListWrap = document.getElementById('fileListWrap');
  const fileList     = document.getElementById('fileList');
  const fileCount    = document.getElementById('fileCount');
  const statusBar    = document.getElementById('statusBar');
  const statusLabel  = document.getElementById('statusLabel');
  const statusCount  = document.getElementById('statusCount');
  const progressFill = document.getElementById('progressFill');

  // ===== HELPERS =====

  /**
   * Aplica a regra de renomeação:
   *  1) Remove o sufixo numérico final (ex.: _202605172301)
   *  2) Substitui underlines restantes por espaços
   *  3) Adiciona o índice sequencial como prefixo
   */
  function renameFile(originalName, index) {
    // Separa extensão
    const lastDot = originalName.lastIndexOf('.');
    let base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
    const ext  = lastDot > 0 ? originalName.slice(lastDot) : '';

    // 1) Remove sufixo numérico final (com ou sem separador _, -, espaço)
    //    Captura padrões como: _202605172301, -123456, 20250101, etc.
    base = base.replace(/[_\-\s]?\d{4,}$/g, '');

    // 2) Substitui underlines restantes por espaços
    base = base.replace(/_/g, ' ').trim();

    // 3) Prefixo sequencial
    return `${index} ${base}${ext}`;
  }

  /**
   * Redimensiona uma File para 1280x720 usando Canvas e retorna Blob (JPEG).
   */
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = TARGET_W;
        canvas.height = TARGET_H;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fundo branco (caso a imagem seja PNG transparente)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TARGET_W, TARGET_H);

        // Stretch exato para 1280x720 (conforme especificação)
        ctx.drawImage(img, 0, 0, TARGET_W, TARGET_H);

        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao gerar blob'));
        }, 'image/jpeg', 0.92);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Falha ao carregar imagem: ' + file.name));
      };

      img.src = url;
    });
  }

  /**
   * Trata a extensão final — todas as imagens serão salvas como .jpg
   * por uniformidade, já que o canvas exporta em JPEG.
   */
  function ensureJpgExtension(name) {
    return name.replace(/\.(jpe?g|png|webp|gif|bmp)$/i, '.jpg');
  }

  // ===== UI UPDATES =====

  function updateFileList() {
    const effective = state.files.length;

    fileList.innerHTML = '';
    state.files.forEach((file, i) => {
      const willProcess = i < effective;
      const newName = ensureJpgExtension(renameFile(file.name, i + 1));

      const li = document.createElement('li');
      li.className = 'file-row';
      li.dataset.idx = i;
      li.style.opacity = willProcess ? '1' : '0.35';
      li.innerHTML = `
        <div class="file-idx">${String(i + 1).padStart(2, '0')}</div>
        <div class="file-original" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
        <div class="file-new" title="${escapeHtml(newName)}">→ ${escapeHtml(newName)}</div>
        <div class="file-status" data-status>${willProcess ? 'aguardando' : 'fora do lote'}</div>
      `;
      fileList.appendChild(li);
    });

    fileCount.textContent = `${state.files.length} arquivo${state.files.length !== 1 ? 's' : ''} · ${effective} no lote`;
    fileListWrap.classList.toggle('visible', state.files.length > 0);
    processBtn.disabled = state.files.length === 0;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function setRowStatus(idx, status, cls) {
    const row = fileList.querySelector(`.file-row[data-idx="${idx}"] [data-status]`);
    if (row) {
      row.textContent = status;
      row.className = 'file-status ' + (cls || '');
    }
  }

  function setProgress(done, total, label) {
    statusBar.classList.add('visible');
    progressFill.style.width = total ? `${(done / total) * 100}%` : '0%';
    statusCount.textContent = `${done} / ${total}`;
    if (label) statusLabel.textContent = label;
  }

  // ===== FILE INTAKE =====

  function addFiles(fileListIn) {
    // Mantém ordem de chegada (FileList é iterável)
    const incoming = Array.from(fileListIn).filter(f => f.type.startsWith('image/'));
    if (incoming.length === 0) return;
    state.files = state.files.concat(incoming);
    updateFileList();
  }

  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    fileInput.value = ''; // permite re-selecionar os mesmos arquivos
  });

  ['dragenter', 'dragover'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files) addFiles(dt.files);
  });

  clearBtn.addEventListener('click', () => {
    state.files = [];
    statusBar.classList.remove('visible');
    progressFill.style.width = '0%';
    updateFileList();
  });

  // ===== PROCESS & DOWNLOAD =====

  processBtn.addEventListener('click', async () => {
    if (state.files.length === 0) return;

    const filesToProcess = state.files.slice();

    processBtn.disabled = true;
    clearBtn.disabled = true;
    setProgress(0, filesToProcess.length, 'Processando...');

    const zip = new JSZip();
    let done = 0;

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      setRowStatus(i, 'processando', 'processing');
      try {
        const blob = await resizeImage(file);
        const newName = ensureJpgExtension(renameFile(file.name, i + 1));
        zip.file(newName, blob);
        setRowStatus(i, 'pronto', 'done');
      } catch (err) {
        console.error(err);
        setRowStatus(i, 'erro', 'error');
      }
      done++;
      setProgress(done, filesToProcess.length, 'Processando...');
    }

    setProgress(done, filesToProcess.length, 'Compactando ZIP...');
    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (meta) => {
        // Atualiza barra durante compactação
        progressFill.style.width = `${meta.percent}%`;
      }
    );

    // Trigger download
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = `imagens-processadas-${stamp}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);

    setProgress(done, filesToProcess.length, 'Concluído ✓');
    processBtn.disabled = false;
    clearBtn.disabled = false;
  });

  // Inicialização
  updateFileList();
})();
