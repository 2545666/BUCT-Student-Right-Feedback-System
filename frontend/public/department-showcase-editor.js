(function () {
  const AUTH_TOKEN_KEY = 'siehub_auth_token_v2';
  const CSS_ID = 'sie-showcase-editor-css';
  const EDITABLE_SELECTOR = [
    'h1', 'h2', 'h3', 'p', 'small', 'span', 'strong', 'b', 'em', 'a',
    'figcaption', '.hero-lede', '.event-info *', '.member-copy *'
  ].join(',');
  const SECTION_SELECTOR = 'header, main > section, main > div, footer';
  const STYLE_KEYS = [
    'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight',
    'lineHeight', 'letterSpacing', 'textAlign', 'textTransform', 'opacity',
    'borderColor', 'borderWidth', 'borderRadius', 'boxShadow', 'objectFit',
    'objectPosition', 'transform', 'display'
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeCss = (value = '') => {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  };
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
  const text = (value = '') => String(value || '').trim();
  const uid = () => 'node-' + Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);

  const getToken = () => {
    try {
      return sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY) || '';
    } catch (error) {
      return '';
    }
  };

  const request = async (url, options = {}, token = '') => {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      const error = new Error(data.message || 'Request failed');
      error.status = res.status;
      error.data = data;
      throw error;
    }
    return data;
  };

  const loadCss = () => {
    if (document.getElementById(CSS_ID)) return;
    const link = document.createElement('link');
    link.id = CSS_ID;
    link.rel = 'stylesheet';
    link.href = '../department-showcase-editor.css';
    document.head.append(link);
  };

  const cleanKeyPart = (value) => text(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

  const assignKey = (element, prefix, index) => {
    if (element.dataset.sieKey) return element.dataset.sieKey;
    const classPart = cleanKeyPart(element.className || '');
    const idPart = cleanKeyPart(element.id || '');
    const key = [prefix, element.tagName.toLowerCase(), idPart || classPart || 'item', index].join(':');
    element.dataset.sieKey = key;
    return key;
  };

  const resolveUrl = (url) => {
    if (!url) return '';
    try {
      return new URL(url, window.location.href).pathname + new URL(url, window.location.href).search;
    } catch (error) {
      return url;
    }
  };

  const readStyle = (element) => {
    const style = {};
    STYLE_KEYS.forEach((key) => {
      const value = element.style[key];
      if (value) style[key] = value;
    });
    return style;
  };

  const applyStyle = (element, style = {}) => {
    STYLE_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(style, key)) element.style[key] = style[key] || '';
    });
  };

  const canPatchNode = (element) => {
    if (!element || element.closest('.sie-showcase-editor')) return false;
    if (element.closest('script, style, noscript')) return false;
    if (element.matches('.gallery-modal, .gallery-modal *')) return false;
    return text(element.textContent) || element.matches('img, a');
  };

  const collectState = (state) => {
    state.sections = $$(SECTION_SELECTOR).map((element, index) => {
      const key = assignKey(element, 'section', index);
      if (!element.dataset.sieOriginalDisplay) element.dataset.sieOriginalDisplay = getComputedStyle(element).display || 'block';
      return element;
    });
    state.nodes = $$(EDITABLE_SELECTOR)
      .filter(canPatchNode)
      .filter((element, index, list) => list.indexOf(element) === index)
      .map((element, index) => {
        assignKey(element, 'text', index);
        return element;
      });
    state.images = $$('img')
      .filter((element) => !element.closest('.sie-showcase-editor'))
      .map((element, index) => {
        assignKey(element, 'image', index);
        return element;
      });
    state.galleryCards = $$('.gallery-trigger').map((element, index) => {
      const key = assignKey(element, 'gallery', index);
      element.dataset.sieGalleryKey = key;
      return element;
    });
  };

  const patchToDom = (patch = {}) => {
    const element = document.querySelector('[data-sie-key="' + escapeCss(patch.key) + '"]');
    if (!element) return;
    if (patch.removed) {
      element.remove();
      return;
    }
    element.hidden = patch.hidden === true;
    if (patch.text && !element.matches('img')) element.textContent = patch.text;
    if (patch.href && element.matches('a')) element.setAttribute('href', patch.href);
    if (patch.src && element.matches('img')) element.setAttribute('src', patch.src);
    if (patch.alt && element.matches('img')) element.setAttribute('alt', patch.alt);
    if (patch.title) element.setAttribute('title', patch.title);
    applyStyle(element, patch.style || {});
  };

  const applySectionState = (section = {}) => {
    const element = document.querySelector('[data-sie-key="' + escapeCss(section.key) + '"]');
    if (!element) return;
    if (section.removed) {
      element.remove();
      return;
    }
    element.hidden = section.hidden === true;
    applyStyle(element, section.style || {});
  };

  const applySectionOrder = (order = []) => {
    const main = $('main');
    if (!main || !Array.isArray(order) || order.length < 2) return;
    const owned = new Map($$('main > section, main > div', main).map((element) => [element.dataset.sieKey, element]));
    order.forEach((key) => {
      const element = owned.get(key);
      if (element) main.append(element);
    });
  };

  const galleryPhotosByKey = (showcase = {}) => {
    const map = new Map();
    (showcase.gallery?.events || []).forEach((event) => {
      if (event.key && Array.isArray(event.photos) && event.photos.length) map.set(event.key, event.photos);
    });
    return map;
  };

  const setCardPreview = (card, photos) => {
    const first = photos?.[0];
    const stage = $('.upload-photo', card);
    const img = stage?.querySelector('img');
    const count = stage?.querySelector('.photo-count');
    if (!first || !stage || !img) return;
    stage.classList.add('has-image');
    img.src = first.src;
    img.alt = first.alt || first.label || '';
    if (count) count.textContent = '01 / ' + String(photos.length).padStart(2, '0');
  };

  const applyGallery = (state, showcase = {}) => {
    state.galleryMap = galleryPhotosByKey(showcase);
    if (state.config.photoStorageKey) {
      window.SiePublishedShowcasePhotos = window.SiePublishedShowcasePhotos || {};
      window.SiePublishedShowcasePhotos[state.config.photoStorageKey] = {};
    }
    state.galleryCards.forEach((card) => {
      const photos = state.galleryMap.get(card.dataset.sieGalleryKey);
      if (photos?.length) {
        if (state.config.photoStorageKey) {
          window.SiePublishedShowcasePhotos[state.config.photoStorageKey][Number(card.dataset.galleryIndex || 0)] = photos;
        }
        setCardPreview(card, photos);
      }
    });
  };

  const applyShowcase = (state, showcase = {}) => {
    if (!showcase || showcase.schema !== 'fixed-showcase-v1') return;
    (showcase.patches || []).forEach(patchToDom);
    (showcase.sections || []).forEach(applySectionState);
    applySectionOrder(showcase.sectionOrder || []);
    collectState(state);
    applyGallery(state, showcase);
  };

  const readPatch = (element) => ({
    key: element.dataset.sieKey || uid(),
    tagName: element.tagName.toLowerCase(),
    text: element.matches('img') ? '' : element.textContent,
    href: element.matches('a') ? element.getAttribute('href') || '' : '',
    src: element.matches('img') ? resolveUrl(element.getAttribute('src') || '') : '',
    alt: element.matches('img') ? element.getAttribute('alt') || '' : '',
    title: element.getAttribute('title') || '',
    hidden: element.hidden === true,
    removed: false,
    style: readStyle(element)
  });

  const readSection = (element) => ({
    key: element.dataset.sieKey || uid(),
    hidden: element.hidden === true,
    removed: false,
    style: readStyle(element)
  });

  const exportShowcase = (state) => ({
    schema: 'fixed-showcase-v1',
    departmentKey: state.config.department,
    updatedAt: new Date().toISOString(),
    patches: [...state.nodes, ...state.images].filter((element) => element.isConnected).map(readPatch),
    sections: state.sections.filter((element) => element.isConnected).map(readSection),
    sectionOrder: $$('main > section, main > div').map((element) => element.dataset.sieKey).filter(Boolean),
    gallery: {
      events: state.galleryCards.map((card) => ({
        key: card.dataset.sieGalleryKey,
        photos: state.galleryMap.get(card.dataset.sieGalleryKey) || []
      }))
    }
  });

  const makeContent = (state) => ({
    blocks: [{
      id: 'fixed-showcase-summary',
      type: 'text',
      visible: false,
      data: {
        title: { zh: 'Fixed showcase', en: 'Fixed showcase' },
        body: { zh: 'Static showcase editor payload.', en: 'Static showcase editor payload.' }
      }
    }],
    showcase: exportShowcase(state)
  });

  const notify = (state, message, type = 'info') => {
    if (!state.toast) return;
    state.toast.textContent = message;
    state.toast.dataset.type = type;
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      if (state.toast) state.toast.textContent = '';
    }, 3200);
  };

  const renderNodeList = (state) => {
    if (!state.nodeList) return;
    state.nodeList.innerHTML = '';
    state.nodes.slice(0, 180).forEach((element) => {
      if (!element.isConnected) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sie-editor-layer';
      button.dataset.key = element.dataset.sieKey;
      button.innerHTML = '<span>' + escapeHtml(element.tagName.toLowerCase()) + '</span><b>' + escapeHtml(text(element.textContent).slice(0, 48) || element.dataset.sieKey) + '</b>';
      button.addEventListener('click', () => selectElement(state, element));
      state.nodeList.append(button);
    });
  };

  const syncInspector = (state) => {
    const element = state.selected;
    if (!state.inspector || !element) return;
    state.inspector.querySelector('[data-field="text"]').value = element.matches('img') ? (element.getAttribute('alt') || '') : element.textContent;
    state.inspector.querySelector('[data-field="href"]').value = element.matches('a') ? (element.getAttribute('href') || '') : '';
    state.inspector.querySelector('[data-field="href"]').closest('label').hidden = !element.matches('a');
    state.inspector.querySelector('[data-field="src"]').value = element.matches('img') ? (element.getAttribute('src') || '') : '';
    state.inspector.querySelector('[data-field="src"]').closest('label').hidden = !element.matches('img');
    state.inspector.querySelector('[data-field="fontSize"]').value = element.style.fontSize || '';
    state.inspector.querySelector('[data-field="fontWeight"]').value = element.style.fontWeight || '';
    state.inspector.querySelector('[data-field="lineHeight"]').value = element.style.lineHeight || '';
    state.inspector.querySelector('[data-field="color"]').value = element.style.color || '';
    state.inspector.querySelector('[data-field="backgroundColor"]').value = element.style.backgroundColor || '';
    state.inspector.querySelector('[data-field="textAlign"]').value = element.style.textAlign || '';
    state.inspector.querySelector('[data-field="borderRadius"]').value = element.style.borderRadius || '';
    state.inspector.querySelector('[data-field="opacity"]').value = element.style.opacity || '';
  };

  const selectElement = (state, element) => {
    if (!element || element.closest('.sie-showcase-editor')) return;
    state.selected?.classList.remove('sie-edit-selected');
    state.selected = element;
    element.classList.add('sie-edit-selected');
    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    syncInspector(state);
    renderNodeList(state);
  };

  const pushHistory = (state) => {
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(JSON.stringify(exportShowcase(state)));
    state.historyIndex = state.history.length - 1;
    if (state.history.length > 50) {
      state.history.shift();
      state.historyIndex -= 1;
    }
  };

  const restoreHistory = (state, direction) => {
    const nextIndex = state.historyIndex + direction;
    if (nextIndex < 0 || nextIndex >= state.history.length) return;
    state.historyIndex = nextIndex;
    applyShowcase(state, JSON.parse(state.history[nextIndex]));
    renderNodeList(state);
    syncInspector(state);
  };

  const markChanged = (state) => {
    state.dirty = true;
    window.clearTimeout(state.historyTimer);
    state.historyTimer = window.setTimeout(() => pushHistory(state), 350);
  };

  const uploadFile = async (state, file) => {
    const form = new FormData();
    form.append('file', file);
    const data = await request(state.apiBase + '/hub/departments/' + state.config.organization + '/' + state.config.department + '/introduction/media', {
      method: 'POST',
      body: form
    }, state.token);
    return data.media;
  };

  const openImagePicker = (state, target) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.multiple = target === 'gallery';
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      try {
        notify(state, 'Uploading...');
        const media = await Promise.all(files.slice(0, 24).map((file) => uploadFile(state, file)));
        if (target === 'gallery') {
          const card = state.selected?.closest('.gallery-trigger') || state.galleryCards[0];
          if (!card) return;
          const key = card.dataset.sieGalleryKey;
          const photos = media.map((item) => ({
            id: item.id,
            src: item.url,
            label: item.originalName || 'Image',
            caption: item.originalName || 'Image',
            alt: item.originalName || ''
          }));
          state.galleryMap.set(key, photos);
          setCardPreview(card, photos);
        } else if (state.selected?.matches('img')) {
          state.selected.src = media[0].url;
        }
        markChanged(state);
        notify(state, 'Uploaded', 'success');
      } catch (error) {
        notify(state, error.message || 'Upload failed', 'error');
      }
    });
    input.click();
  };

  const bindInspector = (state) => {
    const patchSelected = (field, value) => {
      const element = state.selected;
      if (!element) return;
      if (field === 'text') {
        if (element.matches('img')) element.setAttribute('alt', value);
        else element.textContent = value;
      } else if (field === 'href' && element.matches('a')) {
        element.setAttribute('href', value);
      } else if (field === 'src' && element.matches('img')) {
        element.setAttribute('src', value);
      } else {
        element.style[field] = value;
      }
      markChanged(state);
      renderNodeList(state);
    };

    state.inspector.addEventListener('input', (event) => {
      const field = event.target.dataset.field;
      if (field) patchSelected(field, event.target.value);
    });
    state.inspector.addEventListener('click', (event) => {
      const command = event.target.closest('[data-command]')?.dataset.command;
      if (!command) return;
      if (command === 'bold' && state.selected) patchSelected('fontWeight', state.selected.style.fontWeight === '800' ? '' : '800');
      if (command === 'hide' && state.selected) {
        state.selected.hidden = !state.selected.hidden;
        markChanged(state);
      }
      if (command === 'duplicate' && state.selected) {
        const clone = state.selected.cloneNode(true);
        clone.dataset.sieKey = uid();
        state.selected.after(clone);
        collectState(state);
        selectElement(state, clone);
        markChanged(state);
      }
      if (command === 'remove' && state.selected && window.confirm('Remove selected element from this page?')) {
        const next = state.selected.nextElementSibling || state.selected.previousElementSibling;
        state.selected.remove();
        state.selected = null;
        collectState(state);
        if (next) selectElement(state, next);
        markChanged(state);
      }
      if (command === 'replace-image') openImagePicker(state, 'image');
      if (command === 'gallery-upload') openImagePicker(state, 'gallery');
    });
  };

  const moveSelectedSection = (state, direction) => {
    const section = state.selected?.closest('main > section, main > div');
    if (!section) return;
    if (direction < 0 && section.previousElementSibling) section.parentNode.insertBefore(section, section.previousElementSibling);
    if (direction > 0 && section.nextElementSibling) section.parentNode.insertBefore(section.nextElementSibling, section);
    collectState(state);
    markChanged(state);
  };

  const renderShell = (state) => {
    const shell = document.createElement('aside');
    shell.className = 'sie-showcase-editor';
    shell.innerHTML = [
      '<div class="sie-editor-topbar">',
      '<button type="button" data-command="exit" title="Exit">X</button>',
      '<button type="button" data-command="undo" title="Undo">Undo</button>',
      '<button type="button" data-command="redo" title="Redo">Redo</button>',
      '<button type="button" data-command="section-up" title="Move section up">Up</button>',
      '<button type="button" data-command="section-down" title="Move section down">Down</button>',
      '<span class="sie-editor-spacer"></span>',
      '<button type="button" data-command="save">Save draft</button>',
      '<button type="button" class="sie-editor-primary" data-command="publish">Publish</button>',
      '</div>',
      '<div class="sie-editor-body">',
      '<div class="sie-editor-panel"><h2>Layers</h2><div class="sie-editor-layer-list"></div></div>',
      '<div class="sie-editor-panel sie-editor-inspector"><h2>Inspector</h2>',
      '<label><span>Text / Alt</span><textarea data-field="text" rows="5"></textarea></label>',
      '<label><span>Link</span><input data-field="href" /></label>',
      '<label><span>Image URL</span><input data-field="src" /></label>',
      '<div class="sie-editor-row"><button type="button" data-command="bold">B</button><button type="button" data-command="hide">Hide</button><button type="button" data-command="duplicate">Copy</button><button type="button" data-command="remove">Remove</button></div>',
      '<div class="sie-editor-row"><button type="button" data-command="replace-image">Replace image</button><button type="button" data-command="gallery-upload">Gallery photos</button></div>',
      '<label><span>Font size</span><input data-field="fontSize" placeholder="32px" /></label>',
      '<label><span>Weight</span><input data-field="fontWeight" placeholder="700" /></label>',
      '<label><span>Line height</span><input data-field="lineHeight" placeholder="1.2" /></label>',
      '<label><span>Color</span><input data-field="color" placeholder="#102238" /></label>',
      '<label><span>Background</span><input data-field="backgroundColor" placeholder="transparent" /></label>',
      '<label><span>Align</span><select data-field="textAlign"><option value=""></option><option>left</option><option>center</option><option>right</option><option>justify</option></select></label>',
      '<label><span>Radius</span><input data-field="borderRadius" placeholder="8px" /></label>',
      '<label><span>Opacity</span><input data-field="opacity" placeholder="1" /></label>',
      '</div>',
      '</div>',
      '<div class="sie-editor-toast" aria-live="polite"></div>'
    ].join('');
    document.body.append(shell);
    state.shell = shell;
    state.nodeList = $('.sie-editor-layer-list', shell);
    state.inspector = $('.sie-editor-inspector', shell);
    state.toast = $('.sie-editor-toast', shell);
    bindInspector(state);
    shell.addEventListener('click', async (event) => {
      const command = event.target.closest('[data-command]')?.dataset.command;
      if (!command) return;
      if (command === 'exit') return exitEditor(state);
      if (command === 'undo') return restoreHistory(state, -1);
      if (command === 'redo') return restoreHistory(state, 1);
      if (command === 'section-up') return moveSelectedSection(state, -1);
      if (command === 'section-down') return moveSelectedSection(state, 1);
      if (command === 'save') return saveDraft(state);
      if (command === 'publish') return publish(state);
    });
  };

  const enterEditor = (state) => {
    if (state.editorIntro?.content?.showcase) applyShowcase(state, state.editorIntro.content.showcase);
    document.body.classList.add('sie-showcase-editing');
    collectState(state);
    if (!state.shell) renderShell(state);
    state.nodes.forEach((element) => {
      element.contentEditable = 'true';
      element.spellcheck = false;
    });
    renderNodeList(state);
    pushHistory(state);
    selectElement(state, state.nodes[0] || state.images[0]);
    notify(state, 'Editor ready');
  };

  const exitEditor = (state) => {
    document.body.classList.remove('sie-showcase-editing');
    state.nodes.forEach((element) => {
      element.contentEditable = 'false';
      element.classList.remove('sie-edit-selected');
    });
    state.selected?.classList.remove('sie-edit-selected');
    state.selected = null;
    state.shell?.remove();
    state.shell = null;
  };

  const saveDraft = async (state) => {
    try {
      notify(state, 'Saving...');
      const data = await request(state.apiBase + '/hub/departments/' + state.config.organization + '/' + state.config.department + '/introduction/draft', {
        method: 'PUT',
        body: JSON.stringify({
          baseVersion: state.draftVersion,
          content: makeContent(state)
        })
      }, state.token);
      state.editorIntro = data.introduction;
      state.draftVersion = data.introduction?.draftVersion || state.draftVersion + 1;
      state.dirty = false;
      notify(state, 'Draft saved', 'success');
    } catch (error) {
      if (error.status === 409) notify(state, 'Draft changed elsewhere. Refresh and continue.', 'error');
      else notify(state, error.message || 'Save failed', 'error');
    }
  };

  const publish = async (state) => {
    if (!window.confirm('Publish this page now?')) return;
    try {
      notify(state, 'Publishing...');
      const data = await request(state.apiBase + '/hub/departments/' + state.config.organization + '/' + state.config.department + '/introduction/publish', {
        method: 'POST',
        body: JSON.stringify({
          content: makeContent(state),
          reason: 'Published from fixed showcase editor'
        })
      }, state.token);
      state.editorIntro = data.introduction;
      state.draftVersion = data.introduction?.draftVersion || state.draftVersion + 1;
      state.dirty = false;
      notify(state, 'Published', 'success');
    } catch (error) {
      notify(state, error.message || 'Publish failed', 'error');
    }
  };

  const bindPageEvents = (state) => {
    document.addEventListener('input', (event) => {
      if (!document.body.classList.contains('sie-showcase-editing')) return;
      if (event.target.closest('[contenteditable="true"]')) {
        markChanged(state);
        syncInspector(state);
      }
    });
    document.addEventListener('click', (event) => {
      if (!document.body.classList.contains('sie-showcase-editing')) return;
      const target = event.target.closest('[data-sie-key]');
      if (!target || target.closest('.sie-showcase-editor')) return;
      event.preventDefault();
      event.stopPropagation();
      selectElement(state, target);
    }, true);
    document.addEventListener('keydown', (event) => {
      if (!document.body.classList.contains('sie-showcase-editing')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        restoreHistory(state, event.shiftKey ? 1 : -1);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveDraft(state);
      }
    });
  };

  const customGalleryState = { photos: [], index: 0 };

  const renderCustomGallery = (index) => {
    const photos = customGalleryState.photos;
    if (!photos.length) return;
    customGalleryState.index = (index + photos.length) % photos.length;
    const photo = photos[customGalleryState.index];
    const image = $('#galleryImage');
    const caption = $('#galleryCaption');
    const counter = $('#galleryCounter');
    const thumbs = $('#galleryThumbs');
    if (image) {
      image.src = photo.src;
      image.alt = photo.alt || photo.label || '';
    }
    if (caption) caption.textContent = photo.caption || photo.label || '';
    if (counter) counter.textContent = 'PHOTO ' + String(customGalleryState.index + 1).padStart(2, '0') + ' / ' + String(photos.length).padStart(2, '0');
    if (thumbs) {
      thumbs.innerHTML = '';
      photos.forEach((item, photoIndex) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = photoIndex === customGalleryState.index ? 'active' : '';
        button.innerHTML = '<img src="' + escapeHtml(item.src) + '" alt="">';
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          renderCustomGallery(photoIndex);
        });
        thumbs.append(button);
      });
    }
  };

  const openCustomGallery = (card, photos) => {
    customGalleryState.photos = photos;
    customGalleryState.index = 0;
    $('#galleryTitle') && ($('#galleryTitle').textContent = $('.event-info h3', card)?.textContent || 'Gallery');
    $('#galleryCategory') && ($('#galleryCategory').textContent = $('.event-info small', card)?.textContent || 'SHOWCASE');
    renderCustomGallery(0);
    const modal = $('#galleryModal');
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-open');
  };

  const bindGalleryOverride = (state) => {
    document.addEventListener('click', (event) => {
      const card = event.target.closest('.gallery-trigger');
      if (!card) return;
      const photos = state.galleryMap.get(card.dataset.sieGalleryKey);
      if (!photos?.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openCustomGallery(card, photos);
    }, true);
    $('#galleryPrev')?.addEventListener('click', (event) => {
      if (!customGalleryState.photos.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      renderCustomGallery(customGalleryState.index - 1);
    }, true);
    $('#galleryNext')?.addEventListener('click', (event) => {
      if (!customGalleryState.photos.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      renderCustomGallery(customGalleryState.index + 1);
    }, true);
    $('#galleryClose')?.addEventListener('click', () => {
      customGalleryState.photos = [];
    }, true);
    document.addEventListener('keydown', (event) => {
      if (!customGalleryState.photos.length || !document.body.classList.contains('gallery-open')) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderCustomGallery(customGalleryState.index - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderCustomGallery(customGalleryState.index + 1);
      }
      if (event.key === 'Escape') customGalleryState.photos = [];
    }, true);
  };

  const boot = async (config = {}) => {
    if (!config.organization || !config.department) return;
    loadCss();
    const state = {
      config,
      apiBase: config.apiBase || '/api',
      token: getToken(),
      nodes: [],
      images: [],
      sections: [],
      galleryCards: [],
      galleryMap: new Map(),
      history: [],
      historyIndex: -1,
      draftVersion: 0
    };
    collectState(state);
    bindPageEvents(state);
    bindGalleryOverride(state);

    try {
      const data = await request(state.apiBase + '/public/departments/' + config.organization + '/' + config.department + '/introduction');
      applyShowcase(state, data.introduction?.content?.showcase);
    } catch (error) {
      // The original static page remains the source of truth until a showcase payload exists.
    }

    if (!state.token) return;
    try {
      const data = await request(state.apiBase + '/hub/departments/' + config.organization + '/' + config.department + '/introduction/editor', {}, state.token);
      state.editorIntro = data.introduction;
      state.draftVersion = data.introduction?.draftVersion || 0;
      // Public showcase pages are read-only; no edit entry is mounted here.
    } catch (error) {
      // Unauthorized users keep the exact published browsing experience.
    }
  };

  window.SieShowcaseEditor = { boot };
})();
