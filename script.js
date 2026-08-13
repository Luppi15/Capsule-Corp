(() => {
  'use strict';

  // ===== STATE =====
  const state = {
    files: [],   // Array<File> em ordem de seleção
  };

  // ===== CONFIG (valores fixos) =====
  let TARGET_W    = 1280;
  const TARGET_H    = 720;

  // ===== DOM =====
  const dropzone     = document.getElementById('dropzone');
  const fileInput    = document.getElementById('fileInput');
  const processBtn   = document.getElementById('processBtn');
  const clearBtn     = document.getElementById('clearBtn');
  const resCheckbox  = document.getElementById('resCheckbox');
  const topbarInfo   = document.getElementById('topbarInfo');
  const fileListWrap = document.getElementById('fileListWrap');
  const fileList     = document.getElementById('fileList');
  const fileCount    = document.getElementById('fileCount');
  const statusBar    = document.getElementById('statusBar');
  const statusLabel  = document.getElementById('statusLabel');
  const statusCount  = document.getElementById('statusCount');
  const progressFill = document.getElementById('progressFill');

  // ===== HELPERS =====

  /**
   * Extrai o base limpo de um nome de arquivo:
   *  1) Remove extensão
   *  2) Remove sufixo numérico final (ex.: _202605172301)
   *  3) Substitui underlines por espaços
   */
  function extractBase(originalName) {
    const lastDot = originalName.lastIndexOf('.');
    let base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
    // 1) Remove sufixo de cópia do Windows: " (1)", " (2)", etc.
    base = base.replace(/\s*\(\d+\)$/g, '');
    // 2) Remove sufixo numérico final (ex.: _202605172301)
    base = base.replace(/[_\-\s]?\d{4,}$/g, '');
    // 3) Substitui underlines por espaços
    base = base.replace(/_/g, ' ');
    // 4) Remove pontos e reticências (… e ...) — a extensão já foi separada antes
    base = base.replace(/[.…]+/g, ' ');
    // 5) Limpa espaços múltiplos
    base = base.replace(/\s+/g, ' ').trim();
    return base;
  }

  function extractExt(originalName) {
    const lastDot = originalName.lastIndexOf('.');
    return lastDot > 0 ? originalName.slice(lastDot) : '';
  }

  /** Monta o nome final: índice + base (já traduzido ou não) + extensão */
  function buildName(index, base, ext) {
    return `${index} ${base}${ext}`;
  }

  // ===== TRADUÇÃO =====

  // Lista ampla de palavras inglesas comuns em nomes de arquivos de imagem
  const EN_WORDS = new Set([
    // Artigos, preposições, conjunções
    'the','a','an','is','are','was','were','be','been','have','has','had',
    'do','does','did','will','would','could','should','may','might',
    'of','in','to','for','with','on','at','by','from','as','and','or','but',
    'not','if','that','this','it','its','he','she','they','we','you',

    // Cores
    'red','blue','green','black','white','yellow','purple','orange','pink',
    'gray','grey','brown','beige','cream','ivory','tan','navy','teal',
    'maroon','gold','silver','bronze','turquoise','lavender','coral','olive',

    // Adjetivos descritivos
    'big','small','new','old','good','bad','dark','light','bright','clean',
    'beautiful','elegant','cozy','comfortable','simple','natural','organic',
    'modern','classic','vintage','rustic','industrial','minimalist','traditional',
    'luxury','luxurious','stylish','chic','pretty','cute','nice','lovely',
    'fresh','rich','warm','cool','cold','hot','dry','wet','soft','hard',
    'long','short','tall','wide','narrow','thin','thick','flat','round','square',
    'high','low','top','bottom','left','right','center','middle','front','back',
    'inner','outer','indoor','outdoor','open','closed','full','empty',
    'wooden','metal','steel','iron','glass','plastic','leather','stone','marble',
    'concrete','ceramic','bamboo','rattan','velvet','matte','glossy','shiny',
    'smooth','rough','transparent','colorful','monochrome','minimal',

    // Estilo / design
    'style','styled','styling','decor','decorated','decoration',
    'inspired','themed','aesthetic','bohemian','boho','farmhouse','scandinavian',
    'american','european','asian','japanese','italian','french','spanish',
    'tropical','urban','rural','coastal','mediterranean','contemporary',

    // Móveis / objetos domésticos
    'chair','chairs','table','tables','sofa','couch','desk','cabinet',
    'shelf','shelves','lamp','lamps','bed','curtain','curtains','rug','carpet',
    'pillow','pillows','cushion','cushions','vase','frame','mirror','clock',
    'counter','countertop','island','stool','stools','bench','drawer','drawers',
    'wardrobe','dresser','nightstand','bookcase','bookshelf','ottoman','armchair',
    'recliner','loveseat','futon','mattress','headboard','chandelier','pendant',
    'faucet','sink','tub','shower','toilet','vanity','basin','blinds','drapes',

    // Cômodos / espaços
    'room','kitchen','bedroom','bathroom','living','dining','office','garage',
    'porch','balcony','hallway','corridor','lobby','foyer','studio','loft',
    'basement','attic','laundry','pantry','closet','storage','entryway',

    // Casa / arquitetura
    'home','house','building','apartment','villa','cottage','cabin','mansion',
    'bungalow','townhouse','condo','penthouse','door','window','floor','wall',
    'ceiling','stairs','step','steps','roof','exterior','interior','entrance',

    // Natureza
    'photo','image','picture','sunset','sunrise','mountain','beach','city',
    'night','day','sky','sea','forest','lake','river','snow','rain','fire',
    'nature','water','earth','wind','cloud','clouds','sun','moon','star','stars',
    'tree','trees','flower','flowers','plant','plants','leaf','leaves','grass',
    'rock','rocks','sand','soil','field','meadow','valley','hill','ocean',
    'wave','waves','stream','waterfall','garden','park','yard','landscape',

    // Pessoas / animais
    'people','person','portrait','man','woman','boy','girl','child','children',
    'family','couple','group','friend','friends','baby','adult','dog','cat',
    'bird','fish','horse','rabbit','kitten','puppy',

    // Fotografia / design
    'background','wallpaper','banner','cover','logo','icon','design','art',
    'texture','pattern','abstract','concept','mockup','photography','shot',
    'view','scene','setting','composition','render','rendering','illustration',
    'drawing','sketch','template','preview','thumbnail','collection','series',

    // Viagem / lugares
    'travel','street','road','path','trail','bridge','tunnel','highway',
    'town','village','country','coast','island',

    // Comida / bebida
    'food','drink','coffee','tea','wine','beer','juice','breakfast','lunch',
    'dinner','snack','dessert','meal','fruit','vegetable','meat','cheese',
    'bread','cake','chocolate',

    // Materiais
    'wood','fabric','clay','silk','linen','cotton','wool','polyester',
  ]);

  // Sufixos comuns de palavras em inglês (para pegar palavras não listadas)
  const EN_SUFFIXES = ['ing','tion','ness','ment','ful','less','able','ible',
    'ive','ous','ish','ily','ely','ary','ory','ist','ism','ize','ise','ward',
    'ship','hood','some','wide','side','like','work','made','ware'];

  /** Retorna true se o texto parece ser inglês */
  function looksEnglish(text) {
    const words = text.toLowerCase().split(/[\s\-_]+/).filter(w => w.length > 1);
    // Verifica palavras conhecidas
    if (words.some(w => EN_WORDS.has(w))) return true;
    // Verifica sufixos comuns do inglês em palavras longas
    if (words.some(w => w.length > 5 && EN_SUFFIXES.some(s => w.endsWith(s)))) return true;
    return false;
  }

  // Cache para evitar chamadas repetidas para o mesmo texto
  const translationCache = new Map();

  /**
   * Traduz texto de inglês para português usando a API gratuita MyMemory.
   * Retorna o original em caso de falha ou timeout.
   */
  async function translateToPortuguese(text) {
    if (!text || !text.trim()) return text;
    if (!looksEnglish(text)) return text; // já está em português (ou outro idioma)
    if (translationCache.has(text)) return translationCache.get(text);

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt-BR`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      if (data.responseStatus === 200) {
        const translated = data.responseData.translatedText;
        translationCache.set(text, translated);
        return translated;
      }
    } catch (e) {
      console.warn('Tradução falhou para:', text, e);
    }
    return text; // fallback: mantém o original
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
    fileList.innerHTML = '';
    state.files.forEach((file, i) => {
      const base = extractBase(file.name);
      const ext  = extractExt(file.name);
      const previewName = ensureJpgExtension(buildName(i + 1, base, ext));

      const li = document.createElement('li');
      li.className = 'file-row';
      li.dataset.idx = i;
      li.innerHTML = `
        <div class="file-idx">${String(i + 1).padStart(2, '0')}</div>
        <div class="file-original" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
        <div class="file-new" data-newname title="${escapeHtml(previewName)}">→ ${escapeHtml(previewName)}</div>
        <div class="file-status" data-status>aguardando</div>
      `;
      fileList.appendChild(li);
    });

    fileCount.textContent = `${state.files.length} arquivo${state.files.length !== 1 ? 's' : ''}`;
    fileListWrap.classList.toggle('visible', state.files.length > 0);
    processBtn.disabled = state.files.length === 0;
  }

  /** Atualiza a coluna de nome novo após tradução */
  function setRowName(idx, newName) {
    const el = fileList.querySelector(`.file-row[data-idx="${idx}"] [data-newname]`);
    if (el) {
      el.textContent = `→ ${newName}`;
      el.title = newName;
    }
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

  if (resCheckbox) {
    resCheckbox.addEventListener('change', (e) => {
      TARGET_W = e.target.checked ? 1200 : 1280;
      if (topbarInfo) {
        topbarInfo.textContent = `${TARGET_W} × ${TARGET_H} · BATCH · LOCAL`;
      }
    });
  }

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
      try {
        // 1) Traduzir o nome se estiver em inglês
        const base = extractBase(file.name);
        const ext  = extractExt(file.name);

        if (looksEnglish(base)) {
          setRowStatus(i, 'traduzindo', 'processing');
          setProgress(done, filesToProcess.length, 'Traduzindo...');
        } else {
          setRowStatus(i, 'processando', 'processing');
        }

        const translatedBase = await translateToPortuguese(base);
        const newName = ensureJpgExtension(buildName(i + 1, translatedBase, ext));
        setRowName(i, newName);

        // 2) Redimensionar
        setRowStatus(i, 'processando', 'processing');
        setProgress(done, filesToProcess.length, 'Processando...');
        const blob = await resizeImage(file);

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
