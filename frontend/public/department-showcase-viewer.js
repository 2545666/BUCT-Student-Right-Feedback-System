(function () {
  const path = window.location.pathname;
  const config = path.includes('academic-technology')
    ? { organization: 'student_union', department: 'academic_technology', brand: 'SIEBridge', theme: 'academic' }
    : path.includes('student-rights')
      ? { organization: 'student_union', department: 'student_rights', brand: 'SIEVOX', theme: 'rights' }
      : null;
  if (!config) return;

  const getText = (value, language = 'zh') => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[language] || value.zh || value.en || '';
  };

  const clamp = (value, fallback, min, max) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  };

  const cssEscape = (value) => String(value || '').replace(/"/g, '\\"');

  const injectStyles = () => {
    if (document.querySelector('#published-intro-style')) return;
    const style = document.createElement('style');
    style.id = 'published-intro-style';
    style.textContent = `
      body.published-intro-active {
        margin: 0;
        background: #f6f1e9;
      }
      body.published-intro-active > header,
      body.published-intro-active > footer,
      body.published-intro-active .grain,
      body.published-intro-active .gallery-modal {
        display: none !important;
      }
      .published-intro-shell {
        min-height: 100vh;
        color: #111827;
        background: #eef1f4;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      }
      .published-intro-topbar {
        position: sticky;
        top: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        min-height: 62px;
        padding: 12px clamp(16px, 4vw, 58px);
        color: #102238;
        background: rgba(255, 255, 255, .82);
        border-bottom: 1px solid rgba(15, 23, 42, .12);
        backdrop-filter: blur(18px);
      }
      .published-intro-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .08em;
      }
      .published-intro-brand img {
        width: 34px;
        height: 34px;
        object-fit: contain;
      }
      .published-intro-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .published-intro-actions a {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 12px;
        color: #fff;
        background: #174c41;
        text-decoration: none;
        font-size: 12px;
        font-weight: 800;
      }
      .published-intro-actions span {
        color: #64748b;
        font-size: 11px;
      }
      .published-intro-stage {
        display: grid;
        gap: clamp(34px, 5vw, 72px);
        padding: clamp(24px, 5vw, 70px) clamp(12px, 5vw, 70px);
      }
      .published-intro-page-wrap {
        width: min(100%, 1440px);
        margin: 0 auto;
        border: 1px solid rgba(15, 23, 42, .14);
        background: #fff;
        box-shadow: 0 30px 80px rgba(15, 23, 42, .16);
        overflow: auto;
      }
      .published-intro-page {
        position: relative;
        overflow: hidden;
        transform-origin: top left;
        transform: scale(var(--intro-scale, 1));
        animation: publishedIntroRise .52s both;
      }
      .published-intro-page.transition-none {
        animation: none;
      }
      .published-intro-page.transition-fade {
        animation-name: publishedIntroFade;
      }
      .published-intro-page.transition-slide {
        animation-name: publishedIntroSlide;
      }
      .published-intro-overlay,
      .published-intro-element-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .published-intro-element {
        position: absolute;
        overflow: hidden;
        display: flex;
        min-width: 0;
        min-height: 0;
      }
      .published-intro-text {
        width: 100%;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .published-intro-image img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .published-intro-image-empty {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: rgba(15, 23, 42, .54);
        border: 1px dashed rgba(15, 23, 42, .28);
        font-size: 18px;
        font-weight: 800;
        letter-spacing: .08em;
      }
      .published-intro-card-copy {
        position: relative;
        z-index: 1;
        width: 100%;
        display: grid;
        align-content: start;
        gap: 10px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .published-intro-card-copy small {
        font-size: .52em;
        letter-spacing: .14em;
        opacity: .78;
      }
      .published-intro-card-copy strong {
        font-size: 1.18em;
        line-height: 1.12;
      }
      .published-intro-card-copy p {
        margin: 0;
        font-size: .72em;
        font-weight: 500;
        line-height: 1.55;
        opacity: .82;
      }
      @keyframes publishedIntroRise {
        from { opacity: 0; transform: translateY(20px) scale(var(--intro-scale, 1)); }
        to { opacity: 1; transform: scale(var(--intro-scale, 1)); }
      }
      @keyframes publishedIntroFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes publishedIntroSlide {
        from { opacity: 0; transform: translateX(28px) scale(var(--intro-scale, 1)); }
        to { opacity: 1; transform: scale(var(--intro-scale, 1)); }
      }
      @media (max-width: 760px) {
        .published-intro-topbar {
          align-items: flex-start;
          flex-direction: column;
        }
        .published-intro-page-wrap {
          overflow: hidden;
        }
      }
    `;
    document.head.append(style);
  };

  const styleElement = (element, scale) => {
    const style = element.style || {};
    const backgroundImage = style.backgroundImageUrl ? `url("${cssEscape(style.backgroundImageUrl)}")` : '';
    return [
      `left:${clamp(style.x, 0, -2400, 2400) * scale}px`,
      `top:${clamp(style.y, 0, -2400, 2400) * scale}px`,
      `width:${clamp(style.width, 100, 24, 2400) * scale}px`,
      `height:${clamp(style.height, 100, 24, 1800) * scale}px`,
      `transform:rotate(${clamp(style.rotation, 0, -180, 180)}deg)`,
      `z-index:${clamp(style.zIndex, 1, 0, 999)}`,
      `color:${style.color || '#0f172a'}`,
      `opacity:${clamp(style.opacity ?? 1, 1, .05, 1)}`,
      `font-family:${style.fontFamily || 'Noto Sans SC'}`,
      `font-size:${clamp(style.fontSize, 18, 8, 180) * scale}px`,
      `font-weight:${clamp(style.fontWeight, 700, 100, 1000)}`,
      `line-height:${clamp(style.lineHeight, 1.25, .8, 3)}`,
      `text-align:${style.textAlign || 'left'}`,
      `background-color:${style.backgroundColor || 'transparent'}`,
      backgroundImage ? `background-image:${backgroundImage}` : '',
      `background-size:${style.backgroundSize || 'cover'}`,
      `background-position:${style.backgroundPosition || 'center'}`,
      `border:${clamp(style.borderWidth, 0, 0, 16) * scale}px solid ${style.borderColor || 'transparent'}`,
      `border-radius:${clamp(style.borderRadius, 0, 0, 120) * scale}px`,
      `padding:${clamp(style.padding, 0, 0, 120) * scale}px`
    ].filter(Boolean).join(';');
  };

  const createElementNode = (element, scale) => {
    if (!element || element.visible === false) return null;
    const node = document.createElement('div');
    node.className = `published-intro-element published-intro-${element.type || 'text'}`;
    node.setAttribute('style', styleElement(element, scale));

    const style = element.style || {};
    if (style.backgroundImageUrl && Number(style.overlayOpacity) > 0) {
      const overlay = document.createElement('span');
      overlay.className = 'published-intro-element-overlay';
      overlay.style.backgroundColor = style.overlayColor || '#0f172a';
      overlay.style.opacity = String(clamp(style.overlayOpacity, 0, 0, .95));
      node.append(overlay);
    }

    if (element.type === 'image') {
      if (element.content?.url) {
        const image = document.createElement('img');
        image.src = element.content.url;
        image.alt = getText(element.content.alt) || getText(element.content.title) || '';
        image.style.objectFit = style.objectFit || 'cover';
        image.style.objectPosition = style.objectPosition || 'center';
        node.append(image);
      } else {
        const empty = document.createElement('div');
        empty.className = 'published-intro-image-empty';
        empty.textContent = 'IMAGE SLOT';
        node.append(empty);
      }
      return node;
    }

    if (element.type === 'text') {
      const text = document.createElement('div');
      text.className = 'published-intro-text';
      text.textContent = getText(element.content?.text);
      node.append(text);
      return node;
    }

    if (element.type === 'shape') {
      const text = getText(element.content?.label);
      if (text) node.textContent = text;
      return node;
    }

    const copy = document.createElement('div');
    copy.className = 'published-intro-card-copy';
    if (element.type === 'activity') {
      const small = document.createElement('small');
      small.textContent = [getText(element.content?.kicker), getText(element.content?.date)].filter(Boolean).join(' / ');
      const title = document.createElement('strong');
      title.textContent = getText(element.content?.title);
      const body = document.createElement('p');
      body.textContent = getText(element.content?.body);
      copy.append(small, title, body);
    } else {
      const title = document.createElement('strong');
      title.textContent = getText(element.content?.title);
      const body = document.createElement('p');
      body.textContent = getText(element.content?.body);
      copy.append(title, body);
    }
    node.append(copy);
    return node;
  };

  const renderPublishedIntro = (intro) => {
    const pages = intro?.content?.pages || [];
    if (!intro?.hasPublished || !pages.length) return;
    injectStyles();

    const shell = document.createElement('main');
    shell.className = `published-intro-shell is-${config.theme}`;
    const topbar = document.createElement('header');
    topbar.className = 'published-intro-topbar';
    topbar.innerHTML = `
      <div class="published-intro-brand">
        <img src="../BUCT_LOGO_blue.png" alt="" />
        <img src="../SIE_LOGO.svg" alt="" />
        <strong>${config.brand} / ${intro.departmentLabel || ''}</strong>
      </div>
      <div class="published-intro-actions">
        <span>Published ${intro.publishedAt ? new Date(intro.publishedAt).toLocaleDateString() : ''}</span>
        <a href="/">Back to SIEHUB</a>
      </div>
    `;
    const stage = document.createElement('section');
    stage.className = 'published-intro-stage';
    const viewport = Math.min(window.innerWidth - 24, 1440);

    pages.forEach((page) => {
      const width = clamp(page.width, 1440, 640, 2400);
      const height = clamp(page.height, 900, 420, 1800);
      const scale = Math.min(1, viewport / width);
      const wrap = document.createElement('article');
      wrap.className = 'published-intro-page-wrap';
      wrap.style.height = `${height * scale}px`;

      const pageNode = document.createElement('section');
      pageNode.className = `published-intro-page transition-${page.transition || 'rise'}`;
      pageNode.style.width = `${width}px`;
      pageNode.style.height = `${height}px`;
      pageNode.style.setProperty('--intro-scale', String(scale));
      pageNode.style.backgroundColor = page.backgroundColor || '#f8fafc';
      if (page.backgroundImageUrl) {
        pageNode.style.backgroundImage = `url("${cssEscape(page.backgroundImageUrl)}")`;
        pageNode.style.backgroundSize = page.backgroundSize || 'cover';
        pageNode.style.backgroundPosition = page.backgroundPosition || 'center';
      }
      if (page.backgroundImageUrl && Number(page.overlayOpacity) > 0) {
        const overlay = document.createElement('span');
        overlay.className = 'published-intro-overlay';
        overlay.style.backgroundColor = page.overlayColor || '#0f172a';
        overlay.style.opacity = String(clamp(page.overlayOpacity, 0, 0, .95));
        pageNode.append(overlay);
      }
      (page.elements || []).forEach((element) => {
        const child = createElementNode(element, 1);
        if (child) pageNode.append(child);
      });
      wrap.append(pageNode);
      stage.append(wrap);
    });

    shell.append(topbar, stage);
    document.body.classList.add('published-intro-active');
    document.body.replaceChildren(shell);
  };

  fetch(`/api/public/hub/departments/${config.organization}/${config.department}/introduction`, {
    headers: { 'Cache-Control': 'no-cache' }
  })
    .then((response) => response.ok ? response.json() : null)
    .then((data) => {
      if (data?.success) renderPublishedIntro(data.introduction);
    })
    .catch(() => {});
})();
