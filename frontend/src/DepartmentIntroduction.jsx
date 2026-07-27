import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Eye,
  ImagePlus,
  Plus,
  Save,
  Send,
  SquarePen,
  Trash2,
  UploadCloud,
  Video
} from 'lucide-react';
import { API_BASE } from './api';

const getText = (value, language = 'zh') => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[language] || value.zh || value.en || '';
};

const DEPARTMENT_TITLE_EN = {
  organization: 'Organization Department',
  publicity: 'Publicity Department',
  practice: 'Practice Department',
  volunteer_service: 'Volunteer Service Department',
  general_office: 'General Office',
  student_rights: 'Student Rights Department',
  culture_sports_arts: 'Culture, Sports and Arts Department',
  academic_technology: 'Academic Technology Department',
  new_media: 'New Media Department'
};

const getModuleTitle = (module, language = 'zh') => {
  if (language === 'en') return DEPARTMENT_TITLE_EN[module?.key] || module?.title || 'Department';
  return module?.title || '部门';
};

const makeLocalized = (zh = '', en = '') => ({ zh, en });

const createBlock = (type) => {
  const id = `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const base = { id, type, visible: true, data: {} };
  if (type === 'hero') {
    base.data = {
      title: makeLocalized('部门介绍', 'Department Introduction'),
      subtitle: makeLocalized('在这里展示部门职责、成员风采与学生服务。', 'Show responsibilities, team profile and student services here.'),
      backgroundImageUrl: '',
      overlayOpacity: 0.45,
      textTone: 'light'
    };
  } else if (type === 'text') {
    base.data = {
      title: makeLocalized('正文标题', 'Section Title'),
      body: makeLocalized('请输入介绍内容。', 'Enter introduction content.'),
      backgroundImageUrl: '',
      overlayOpacity: 0.18,
      textTone: 'dark'
    };
  } else if (type === 'image') {
    base.data = {
      title: makeLocalized('图片展示', 'Image'),
      caption: makeLocalized('', ''),
      alt: makeLocalized('', ''),
      url: ''
    };
  } else if (type === 'video') {
    base.data = {
      title: makeLocalized('视频展示', 'Video'),
      caption: makeLocalized('', ''),
      alt: makeLocalized('', ''),
      url: ''
    };
  } else if (type === 'duties') {
    base.data = {
      title: makeLocalized('部门职责', 'Responsibilities'),
      items: [makeLocalized('完善一条部门职责', 'Add a responsibility')]
    };
  } else if (type === 'contact') {
    base.data = {
      title: makeLocalized('联系方式', 'Contact'),
      items: [{ label: makeLocalized('邮箱', 'Email'), value: makeLocalized('', '') }]
    };
  }
  return base;
};

const defaultContent = (module) => ({
  blocks: [
    {
      id: 'local-hero',
      type: 'hero',
      visible: true,
      data: {
        title: makeLocalized(module?.title || '部门介绍', getModuleTitle(module, 'en')),
        subtitle: makeLocalized(module?.summary || '部门介绍页面正在建设中。', 'This department introduction page is being prepared.'),
        backgroundImageUrl: '',
        overlayOpacity: 0.45,
        textTone: 'light'
      }
    },
    createBlock('text')
  ]
});

const FieldPair = ({ label, value = {}, onChange, textarea = false, language = 'zh' }) => {
  const Input = textarea ? 'textarea' : 'input';
  return (
    <label className="dept-intro-field">
      <span>{label}</span>
      <Input value={value.zh || ''} onChange={event => onChange({ ...value, zh: event.target.value })} placeholder={language === 'en' ? 'Chinese content' : '中文内容'} rows={textarea ? 4 : undefined} />
      <Input value={value.en || ''} onChange={event => onChange({ ...value, en: event.target.value })} placeholder={language === 'en' ? 'English content' : 'English content'} rows={textarea ? 4 : undefined} />
    </label>
  );
};

const getBackgroundBlockProps = (block, defaultTone) => {
  const url = block.data?.backgroundImageUrl || '';
  const textTone = ['light', 'dark'].includes(block.data?.textTone) ? block.data.textTone : defaultTone;
  const opacity = Number.isFinite(Number(block.data?.overlayOpacity)) ? Math.max(0, Math.min(0.9, Number(block.data.overlayOpacity))) : 0;
  if (!url) return { className: `tone-${textTone}`, style: undefined };
  const overlayColor = textTone === 'dark' ? '255, 255, 255' : '15, 23, 42';
  return {
    className: `has-background tone-${textTone}`,
    style: {
      backgroundImage: `linear-gradient(rgba(${overlayColor}, ${opacity}), rgba(${overlayColor}, ${opacity})), url("${url}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  };
};

const BlockPreview = ({ block, language = 'zh' }) => {
  if (!block?.visible) return null;
  const title = getText(block.data?.title, language);
  if (block.type === 'hero') {
    const backgroundProps = getBackgroundBlockProps(block, 'light');
    return (
      <section className={`dept-intro-page-hero ${backgroundProps.className}`} style={backgroundProps.style}>
        <p>SIEHUB / DEPARTMENT</p>
        <h1>{title}</h1>
        <span>{getText(block.data?.subtitle, language)}</span>
      </section>
    );
  }
  if (block.type === 'text') {
    const backgroundProps = getBackgroundBlockProps(block, 'dark');
    return (
      <section className={`dept-intro-page-section ${backgroundProps.className}`} style={backgroundProps.style}>
        <h2>{title}</h2>
        <p>{getText(block.data?.body, language)}</p>
      </section>
    );
  }
  if (block.type === 'image') {
    return (
      <section className="dept-intro-page-section media">
        <h2>{title}</h2>
        {block.data?.url ? <img src={block.data.url} alt={getText(block.data?.alt, language) || title} /> : <div className="dept-intro-media-empty"><ImagePlus />{language === 'en' ? 'No image uploaded' : '未上传图片'}</div>}
        {getText(block.data?.caption, language) && <p>{getText(block.data.caption, language)}</p>}
      </section>
    );
  }
  if (block.type === 'video') {
    return (
      <section className="dept-intro-page-section media">
        <h2>{title}</h2>
        {block.data?.url ? <video src={block.data.url} controls preload="metadata" /> : <div className="dept-intro-media-empty"><Video />{language === 'en' ? 'No video uploaded' : '未上传视频'}</div>}
        {getText(block.data?.caption, language) && <p>{getText(block.data.caption, language)}</p>}
      </section>
    );
  }
  if (block.type === 'duties') {
    return (
      <section className="dept-intro-page-section">
        <h2>{title}</h2>
        <div className="dept-intro-duty-list">
          {(block.data?.items || []).map((item, index) => <article key={`${block.id}-${index}`}>{getText(item, language)}</article>)}
        </div>
      </section>
    );
  }
  if (block.type === 'contact') {
    return (
      <section className="dept-intro-page-section">
        <h2>{title}</h2>
        <div className="dept-intro-contact-list">
          {(block.data?.items || []).map((item, index) => (
            <article key={`${block.id}-${index}`}>
              <span>{getText(item.label, language)}</span>
              <strong>{getText(item.value, language)}</strong>
            </article>
          ))}
        </div>
      </section>
    );
  }
  return null;
};

export const DepartmentIntroductionViewer = ({ module, token, language = 'zh' }) => {
  const [loading, setLoading] = useState(true);
  const [intro, setIntro] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/introduction`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.message || '获取部门介绍失败');
        setIntro(data.introduction);
      })
      .catch(error => {
        if (!cancelled) setMessage(error.message || '获取部门介绍失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [module.organization, module.key, token]);

  const content = intro?.content || defaultContent(module);
  return (
    <section className="dept-intro-page" data-i18n-skip>
      {loading ? <div className="dept-intro-status">{language === 'en' ? 'Loading department introduction...' : '加载部门介绍中...'}</div> : null}
      {message ? <div className="dept-intro-status error">{message}</div> : null}
      {!loading && !message && (
        <>
          {!intro?.hasPublished && <div className="dept-intro-status">{language === 'en' ? 'This department has not published a custom introduction page yet. The default template is shown.' : '该部门暂未发布自定义介绍页，当前显示默认模板。'}</div>}
          {(content.blocks || []).map(block => <BlockPreview key={block.id} block={block} language={language} />)}
        </>
      )}
    </section>
  );
};

export const DepartmentIntroductionEditor = ({ module, token, language = 'zh', onClose }) => {
  const isEnglish = language === 'en';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState('');
  const [intro, setIntro] = useState(null);
  const [content, setContent] = useState(defaultContent(module));
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [revisions, setRevisions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/introduction/editor`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.message || '获取编辑数据失败');
        setIntro(data.introduction);
        setContent(data.introduction?.content || defaultContent(module));
        setSelectedId(data.introduction?.content?.blocks?.[0]?.id || '');
        setRevisions(data.revisions || []);
      })
      .catch(error => {
        if (!cancelled) setMessage(error.message || '获取编辑数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [module.organization, module.key, token]);

  const blocks = content.blocks || [];
  const selectedBlock = useMemo(() => blocks.find(block => block.id === selectedId) || blocks[0], [blocks, selectedId]);

  const setBlocks = (nextBlocks) => {
    setContent({ blocks: nextBlocks });
    if (!nextBlocks.some(block => block.id === selectedId)) setSelectedId(nextBlocks[0]?.id || '');
  };

  const updateBlock = (id, updater) => {
    setBlocks(blocks.map(block => block.id === id ? updater(block) : block));
  };

  const addBlock = (type) => {
    const block = createBlock(type);
    setBlocks([...blocks, block]);
    setSelectedId(block.id);
  };

  const moveBlock = (id, direction) => {
    const index = blocks.findIndex(block => block.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  };

  const removeBlock = (id) => {
    if (blocks.length <= 1) {
        setMessage(isEnglish ? 'Keep at least one block.' : '至少保留一个区块。');
      return;
    }
    if (!window.confirm(isEnglish ? 'Delete this block?' : '确认删除该区块吗？')) return;
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const saveDraft = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/introduction/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ baseVersion: intro?.draftVersion || 0, content })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '保存草稿失败');
      setIntro(data.introduction);
      setContent(data.introduction?.content || content);
      setMessage(isEnglish ? 'Draft saved.' : '草稿已保存。');
    } catch (error) {
      setMessage(error.message || '保存草稿失败');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!window.confirm(isEnglish ? 'Publish this department introduction page now? Students will see it immediately.' : '确认发布该部门介绍页吗？学生端将立即看到最新内容。')) return;
    setPublishing(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/introduction/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: '管理端发布' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '发布失败');
      setIntro(data.introduction);
      setMessage(isEnglish ? 'Department intro page published.' : '部门介绍页已发布。');
    } catch (error) {
      setMessage(error.message || '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const uploadMedia = async (block, file, targetField = 'url') => {
    if (!file) return;
    setUploadingBlockId(block.id);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/introduction/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '上传失败');
      updateBlock(block.id, current => ({ ...current, data: { ...current.data, [targetField]: data.media.url } }));
      setMessage(isEnglish ? 'Media uploaded. Remember to save the draft.' : '媒体已上传，记得保存草稿。');
    } catch (error) {
      setMessage(error.message || '上传失败');
    } finally {
      setUploadingBlockId('');
    }
  };

  const renderInspector = () => {
    if (!selectedBlock) return <div className="dept-intro-editor-empty">{isEnglish ? 'Select a block to edit.' : '选择一个区块后编辑内容。'}</div>;
    const block = selectedBlock;
    const patchData = (patch) => updateBlock(block.id, current => ({ ...current, data: { ...current.data, ...patch } }));
    const renderBackgroundControls = () => (
      <div className="dept-intro-background-editor">
        <label className="dept-intro-field">
          <span>Background image URL</span>
          <input value={block.data.backgroundImageUrl || ''} onChange={event => patchData({ backgroundImageUrl: event.target.value })} placeholder="/uploads/department-intros/image.webp" />
        </label>
        <label className="dept-intro-upload-button">
          <UploadCloud />
          {uploadingBlockId === block.id ? 'Uploading...' : 'Upload background'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => uploadMedia(block, event.target.files?.[0], 'backgroundImageUrl')} />
        </label>
        <label className="dept-intro-field">
          <span>Overlay opacity</span>
          <input type="range" min="0" max="0.9" step="0.05" value={block.data.overlayOpacity ?? (block.type === 'hero' ? 0.45 : 0.18)} onChange={event => patchData({ overlayOpacity: Number(event.target.value) })} />
        </label>
        <div className="dept-intro-tone-toggle">
          <span>Text tone</span>
          <button type="button" className={(block.data.textTone || (block.type === 'hero' ? 'light' : 'dark')) === 'light' ? 'is-active' : ''} onClick={() => patchData({ textTone: 'light' })}>Light</button>
          <button type="button" className={(block.data.textTone || (block.type === 'hero' ? 'light' : 'dark')) === 'dark' ? 'is-active' : ''} onClick={() => patchData({ textTone: 'dark' })}>Dark</button>
        </div>
      </div>
    );
    return (
      <div className="dept-intro-inspector">
        <div className="dept-intro-inspector-head">
          <span>{block.type.toUpperCase()}</span>
          <button type="button" onClick={() => updateBlock(block.id, current => ({ ...current, visible: !current.visible }))}>
            <Eye />{block.visible ? (isEnglish ? 'Visible' : '显示') : (isEnglish ? 'Hidden' : '隐藏')}
          </button>
        </div>
        {(block.type === 'hero' || block.type === 'text' || block.type === 'image' || block.type === 'video' || block.type === 'duties' || block.type === 'contact') && (
          <FieldPair label={isEnglish ? 'Title' : '标题'} value={block.data.title} onChange={value => patchData({ title: value })} language={language} />
        )}
        {block.type === 'hero' && <FieldPair label={isEnglish ? 'Subtitle' : '副标题'} value={block.data.subtitle} onChange={value => patchData({ subtitle: value })} textarea language={language} />}
        {block.type === 'text' && <FieldPair label={isEnglish ? 'Body' : '正文'} value={block.data.body} onChange={value => patchData({ body: value })} textarea language={language} />}
        {(block.type === 'hero' || block.type === 'text') && renderBackgroundControls()}
        {(block.type === 'image' || block.type === 'video') && (
          <>
            <label className="dept-intro-upload-button">
              <UploadCloud />
              {uploadingBlockId === block.id ? (isEnglish ? 'Uploading...' : '上传中...') : block.type === 'image' ? (isEnglish ? 'Upload image' : '上传图片') : (isEnglish ? 'Upload video' : '上传视频')}
              <input type="file" accept={block.type === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4'} onChange={event => uploadMedia(block, event.target.files?.[0])} />
            </label>
            <FieldPair label={isEnglish ? 'Caption' : '说明'} value={block.data.caption} onChange={value => patchData({ caption: value })} textarea language={language} />
            <FieldPair label={isEnglish ? 'Alt text' : '替代文本'} value={block.data.alt} onChange={value => patchData({ alt: value })} language={language} />
          </>
        )}
        {block.type === 'duties' && (
          <div className="dept-intro-repeat-editor">
            {(block.data.items || []).map((item, index) => (
              <FieldPair key={`${block.id}-duty-${index}`} label={`${isEnglish ? 'Responsibility' : '职责'} ${index + 1}`} value={item} language={language} onChange={value => {
                const next = [...(block.data.items || [])];
                next[index] = value;
                patchData({ items: next });
              }} textarea />
            ))}
            <button type="button" onClick={() => patchData({ items: [...(block.data.items || []), makeLocalized('', '')] })}><Plus />{isEnglish ? 'Add responsibility' : '添加职责'}</button>
          </div>
        )}
        {block.type === 'contact' && (
          <div className="dept-intro-repeat-editor">
            {(block.data.items || []).map((item, index) => (
              <div className="dept-intro-contact-editor" key={`${block.id}-contact-${index}`}>
                <FieldPair label={`${isEnglish ? 'Label' : '标签'} ${index + 1}`} value={item.label} language={language} onChange={value => {
                  const next = [...(block.data.items || [])];
                  next[index] = { ...next[index], label: value };
                  patchData({ items: next });
                }} />
                <FieldPair label={`${isEnglish ? 'Content' : '内容'} ${index + 1}`} value={item.value} language={language} onChange={value => {
                  const next = [...(block.data.items || [])];
                  next[index] = { ...next[index], value };
                  patchData({ items: next });
                }} />
              </div>
            ))}
            <button type="button" onClick={() => patchData({ items: [...(block.data.items || []), { label: makeLocalized('', ''), value: makeLocalized('', '') }] })}><Plus />{isEnglish ? 'Add contact' : '添加联系方式'}</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="dept-intro-editor">
      <div className="dept-intro-editor-topbar">
        <div>
          <p>SIEHUB / INTRODUCTION BUILDER</p>
          <h2>{getModuleTitle(module, language)} · {isEnglish ? 'Department intro editor' : '部门介绍编辑'}</h2>
          <span>{isEnglish ? 'Draft version' : '草稿版本'} {intro?.draftVersion || 0} · {isEnglish ? 'Published version' : '已发布版本'} {intro?.publishedVersion || 0}</span>
        </div>
        <div>
          <button type="button" onClick={onClose}>{isEnglish ? 'Back to manage portal' : '返回管理端'}</button>
          <button type="button" onClick={saveDraft} disabled={saving}><Save />{saving ? (isEnglish ? 'Saving' : '保存中') : (isEnglish ? 'Save draft' : '保存草稿')}</button>
          <button className="primary-button" type="button" onClick={publish} disabled={publishing}><Send />{publishing ? (isEnglish ? 'Publishing' : '发布中') : (isEnglish ? 'Publish' : '发布')}</button>
        </div>
      </div>
      {message && <div className="dept-intro-status">{message}</div>}
      {loading ? <div className="dept-intro-status">{isEnglish ? 'Loading editor...' : '加载编辑器中...'}</div> : (
        <div className="dept-intro-editor-grid">
          <aside className="dept-intro-library">
            <strong>{isEnglish ? 'Block library' : '组件库'}</strong>
            <button type="button" onClick={() => addBlock('hero')}><Plus />{isEnglish ? 'Hero cover' : '顶部封面'}</button>
            <button type="button" onClick={() => addBlock('text')}><Plus />{isEnglish ? 'Text section' : '文本介绍'}</button>
            <button type="button" onClick={() => addBlock('image')}><ImagePlus />{isEnglish ? 'Image block' : '图片展示'}</button>
            <button type="button" onClick={() => addBlock('video')}><Video />{isEnglish ? 'Video block' : '视频展示'}</button>
            <button type="button" onClick={() => addBlock('duties')}><Plus />{isEnglish ? 'Responsibilities' : '部门职责'}</button>
            <button type="button" onClick={() => addBlock('contact')}><Plus />{isEnglish ? 'Contact' : '联系方式'}</button>
            <strong>{isEnglish ? 'Block order' : '区块顺序'}</strong>
            <div className="dept-intro-block-list">
              {blocks.map((block, index) => (
                <article key={block.id} className={block.id === selectedBlock?.id ? 'is-active' : ''} onClick={() => setSelectedId(block.id)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <b>{getText(block.data?.title, language) || block.type}</b>
                  <div>
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveBlock(block.id, -1); }} disabled={index === 0}><ChevronUp /></button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveBlock(block.id, 1); }} disabled={index === blocks.length - 1}><ChevronDown /></button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); removeBlock(block.id); }}><Trash2 /></button>
                  </div>
                </article>
              ))}
            </div>
          </aside>
          <main className="dept-intro-canvas">
            {(content.blocks || []).map(block => <BlockPreview key={block.id} block={block} language={language} />)}
          </main>
          <aside className="dept-intro-side">
            {renderInspector()}
            <div className="dept-intro-revisions">
              <strong>{isEnglish ? 'Publish history' : '发布记录'}</strong>
              {revisions.length ? revisions.map(item => (
                <article key={item.id}>
                  <span>v{item.version}</span>
                  <p>{new Date(item.createdAt).toLocaleString()}</p>
                </article>
              )) : <p>{isEnglish ? 'No publish history yet' : '暂无发布记录'}</p>}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

export const DepartmentIntroductionManageCard = ({ onOpen }) => (
  <section>
    <span>02</span>
    <h2>部门介绍编辑</h2>
    <p>使用受控区块搭建学生端部门介绍页，支持中英文文本、图片与视频。</p>
    <button type="button" onClick={onOpen}>进入编辑 <SquarePen /></button>
  </section>
);

export const DepartmentIntroductionEntryCard = ({ onOpen, module }) => (
  <button className="siehub-student-service-entry dept-intro-entry" type="button" onClick={onOpen}>
    <span>01</span>
    <SquarePen />
    <strong>部门介绍</strong>
    <p>{module?.summary || '查看该部门职责介绍、成员风采、服务流程与联系方式。'}</p>
    <b>查看介绍 <ArrowUpRight /></b>
  </button>
);
