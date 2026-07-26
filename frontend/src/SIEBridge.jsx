import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, BookOpen, Check, Clock3, Download, Eye, FileText,
  Filter, Plus, Search, Send, Upload, X
} from 'lucide-react';
import { API_BASE } from './api';
import './siebridge.css';

const STATUS_META = {
  pending: { label: '待审核', tone: 'pending' },
  approved: { label: '已通过', tone: 'approved' },
  rejected: { label: '已驳回', tone: 'rejected' }
};

const DEFAULT_SECTIONS = [
  { key: 'past_exams', label: '往年真题' },
  { key: 'courseware', label: '课件' },
  { key: 'notes', label: '笔记整理' },
  { key: 'other', label: '其他资料' }
];

const formatFileSize = (size = 0) => {
  if (!size) return '未知大小';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const joinLabels = (items = []) => items.length ? items.join(' / ') : '未分类';

const fileUrl = (path) => path?.startsWith('/api') ? path : `${API_BASE}${path || ''}`;

const apiJson = async (path, token, options = {}) => {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};
  if (!res.ok || !data.success) {
    if (res.status === 413) throw new Error('上传文件过大，请压缩后重试或减少单次上传文件数量');
    if (res.status >= 500) throw new Error(data.message || '服务器暂时无法处理，请稍后重试');
    throw new Error(data.message || '请求失败，请检查网络后重试');
  }
  return data;
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return <span className={`siebridge-status ${meta.tone}`}>{meta.label}</span>;
};

const FileSelectionSummary = ({ files }) => {
  if (!files.length) return null;
  return (
    <ul className="siebridge-file-list" aria-label="已选择文件">
      {files.map((file, index) => (
        <li key={`${file.name}-${file.size}-${index}`}>
          <FileText />
          <span title={file.name}>{file.name}</span>
          <em>{formatFileSize(file.size)}</em>
        </li>
      ))}
    </ul>
  );
};

const CourseForm = ({ meta, onClose, onSubmit, submitting }) => {
  const [form, setForm] = useState({
    code: '',
    name: '',
    courseNature: '',
    majors: [],
    gradeLevels: [],
    section: 'past_exams',
    title: '',
    description: ''
  });
  const [files, setFiles] = useState([]);

  const toggle = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit(form, files);
  };

  return (
    <div className="siebridge-drawer">
      <form className="siebridge-panel" onSubmit={submit}>
        <header className="siebridge-panel-head">
          <div><span>NEW COURSE</span><h3>添加课程并上传资料</h3></div>
          <button type="button" className="icon-button" onClick={onClose}><X /></button>
        </header>
        <div className="siebridge-form-grid">
          <label><span>课程代码</span><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="如 MECH101" required /></label>
          <label><span>课程名称</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="请输入课程名称" required /></label>
          <label><span>课程性质</span><input value={form.courseNature} onChange={e => setForm({ ...form, courseNature: e.target.value })} placeholder="上传者自行填写，如专业必修/公共选修" required /></label>
          <label><span>资料标题</span><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="如 2024 春季期末真题" required /></label>
        </div>
        <div className="siebridge-choice-row">
          <strong>所属专业</strong>
          {(meta.majors || []).map(item => <button key={item} type="button" className={form.majors.includes(item) ? 'is-active' : ''} onClick={() => toggle('majors', item)}>{item}</button>)}
        </div>
        <div className="siebridge-choice-row compact">
          <strong>适用年级</strong>
          {(meta.gradeLevels || []).map(item => <button key={item} type="button" className={form.gradeLevels.includes(item) ? 'is-active' : ''} onClick={() => toggle('gradeLevels', item)}>{item}</button>)}
        </div>
        <div className="siebridge-choice-row compact">
          <strong>资料分区</strong>
          {(meta.sections || DEFAULT_SECTIONS).map(item => <button key={item.key} type="button" className={form.section === item.key ? 'is-active' : ''} onClick={() => setForm({ ...form, section: item.key })}>{item.label}</button>)}
        </div>
        <label className="siebridge-wide-field"><span>说明</span><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="可补充课程教师、考试年份、资料来源说明等" /></label>
        <label className="siebridge-upload"><Upload /><div><strong>{files.length ? `已选择 ${files.length} 个文件` : '上传课程资料'}</strong><p>支持 PDF、Word、PPT、Excel、ZIP，单个不超过 50MB</p><FileSelectionSummary files={files} /></div><input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
        <footer><button type="button" className="text-button" onClick={onClose}>取消</button><button className="primary-button" disabled={submitting} type="submit">{submitting ? '提交中...' : '提交审核'} <Send /></button></footer>
      </form>
    </div>
  );
};

const ResourceForm = ({ course, meta, onClose, onSubmit, submitting }) => {
  const [form, setForm] = useState({ section: 'past_exams', title: '', description: '' });
  const [files, setFiles] = useState([]);
  const submit = (event) => {
    event.preventDefault();
    onSubmit(course.id || course._id, form, files);
  };
  return (
    <div className="siebridge-drawer">
      <form className="siebridge-panel small" onSubmit={submit}>
        <header className="siebridge-panel-head">
          <div><span>UPLOAD RESOURCE</span><h3>{course.name}</h3></div>
          <button type="button" className="icon-button" onClick={onClose}><X /></button>
        </header>
        <div className="siebridge-choice-row compact">
          <strong>资料分区</strong>
          {(meta.sections || DEFAULT_SECTIONS).map(item => <button key={item.key} type="button" className={form.section === item.key ? 'is-active' : ''} onClick={() => setForm({ ...form, section: item.key })}>{item.label}</button>)}
        </div>
        <label><span>资料标题</span><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="请输入资料标题" required /></label>
        <label className="siebridge-wide-field"><span>说明</span><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="可补充年份、版本、适用范围等" /></label>
        <label className="siebridge-upload"><Upload /><div><strong>{files.length ? `已选择 ${files.length} 个文件` : '选择资料文件'}</strong><p>审核通过后才会在学生端展示</p><FileSelectionSummary files={files} /></div><input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
        <footer><button type="button" className="text-button" onClick={onClose}>取消</button><button className="primary-button" disabled={submitting} type="submit">{submitting ? '提交中...' : '提交审核'} <Send /></button></footer>
      </form>
    </div>
  );
};

export const SIEBridgeStudentPortal = ({ token }) => {
  const [meta, setMeta] = useState({ majors: [], gradeLevels: [], sections: DEFAULT_SECTIONS });
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [resources, setResources] = useState([]);
  const [submissions, setSubmissions] = useState({ courses: [], resources: [] });
  const [filters, setFilters] = useState({ search: '', major: '', grade: '' });
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [resourceFormCourse, setResourceFormCourse] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');

  const loadMeta = useCallback(async () => {
    const data = await apiJson('/siebridge/meta', token);
    setMeta({ majors: data.majors || [], gradeLevels: data.gradeLevels || [], sections: data.sections || DEFAULT_SECTIONS });
  }, [token]);

  const loadCourses = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.major) params.set('major', filters.major);
    if (filters.grade) params.set('grade', filters.grade);
    const data = await apiJson(`/siebridge/courses?${params.toString()}`, token);
    setCourses(data.courses || []);
  }, [filters, token]);

  const loadSubmissions = useCallback(async () => {
    const data = await apiJson('/siebridge/submissions/mine', token);
    setSubmissions({ courses: data.courses || [], resources: data.resources || [] });
  }, [token]);

  const loadCourseDetail = useCallback(async (course) => {
    if (!course) return;
    const data = await apiJson(`/siebridge/courses/${course.id || course._id}`, token);
    setSelectedCourse(data.course);
    setResources(data.resources || []);
  }, [token]);

  useEffect(() => { loadMeta().catch(error => setMessage(error.message)); }, [loadMeta]);
  useEffect(() => { loadCourses().catch(error => setMessage(error.message)); }, [loadCourses]);
  useEffect(() => { loadSubmissions().catch(() => {}); }, [loadSubmissions]);

  const groupedResources = useMemo(() => {
    const groups = Object.fromEntries((meta.sections || DEFAULT_SECTIONS).map(item => [item.key, []]));
    resources.forEach(item => { (groups[item.section] ||= []).push(item); });
    return groups;
  }, [meta.sections, resources]);

  const submitCourse = async (form, files) => {
    if (!files.length) return setMessage('请上传至少一份课程资料');
    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, Array.isArray(value) ? JSON.stringify(value) : value));
      files.forEach(file => body.append('files', file));
      await apiJson('/siebridge/courses', token, { method: 'POST', body });
      setCourseFormOpen(false);
      setMessage('课程与资料已提交审核');
      await Promise.all([loadCourses(), loadSubmissions()]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitResource = async (courseId, form, files) => {
    if (!files.length) return setMessage('请上传至少一份资料');
    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      files.forEach(file => body.append('files', file));
      await apiJson(`/siebridge/courses/${courseId}/resources`, token, { method: 'POST', body });
      setResourceFormCourse(null);
      setMessage('资料已提交审核');
      await Promise.all([loadCourseDetail(selectedCourse), loadSubmissions()]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPreview = async (resource) => {
    try {
      const res = await fetch(`${API_BASE}/siebridge/resources/${resource.id || resource._id}/preview`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('该资料暂不支持在线预览');
      const blob = await res.blob();
      if (preview?.url) URL.revokeObjectURL(preview.url);
      setPreview({ title: resource.title, url: URL.createObjectURL(blob) });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const downloadResource = async (resource) => {
    try {
      const res = await fetch(`${API_BASE}/siebridge/resources/${resource.id || resource._id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('下载失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resource.files?.[0]?.originalName || `${resource.title}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const submissionItems = [
    ...submissions.courses.map(item => ({ ...item, kind: '课程' })),
    ...submissions.resources.map(item => ({ ...item, kind: '资料', courseName: item.course?.name }))
  ].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  return (
    <section className="siebridge-shell">
      <div className="siebridge-toolbar">
        <div>
          <p>SIEBRIDGE RESOURCE PLATFORM</p>
          <h2>SIEBridge 课程资源共享平台</h2>
        </div>
        <button className="primary-button" type="button" onClick={() => setCourseFormOpen(true)}><Plus />添加课程</button>
      </div>
      <div className="siebridge-searchbar">
        <label><Search /><input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="输入课程代码或课程名称" /></label>
        <select value={filters.major} onChange={e => setFilters({ ...filters, major: e.target.value })}><option value="">全部专业</option>{meta.majors.map(item => <option key={item}>{item}</option>)}</select>
        <select value={filters.grade} onChange={e => setFilters({ ...filters, grade: e.target.value })}><option value="">全部年级</option>{meta.gradeLevels.map(item => <option key={item}>{item}</option>)}</select>
      </div>
      {message && <div className="siebridge-message">{message}<button type="button" onClick={() => setMessage('')}><X /></button></div>}
      <div className="siebridge-layout">
        <div className="siebridge-course-list">
          {courses.length ? courses.map(course => (
            <button key={course.id || course._id} className={selectedCourse?.id === course.id ? 'is-active' : ''} type="button" onClick={() => loadCourseDetail(course)}>
              <span>{course.code}</span>
              <strong>{course.name}</strong>
              <small>{course.courseNature} · {joinLabels(course.majors)} · {joinLabels(course.gradeLevels)}</small>
            </button>
          )) : <div className="siebridge-empty"><BookOpen /><strong>暂无课程</strong><span>可以添加课程并提交资料等待审核。</span></div>}
        </div>
        <div className="siebridge-course-detail">
          {selectedCourse ? (
            <>
              <header>
                <div><span>{selectedCourse.code}</span><h3>{selectedCourse.name}</h3><p>{selectedCourse.courseNature} · {joinLabels(selectedCourse.majors)} · {joinLabels(selectedCourse.gradeLevels)}</p></div>
                <button className="outline-button" type="button" onClick={() => setResourceFormCourse(selectedCourse)}><Upload />上传资料</button>
              </header>
              {(meta.sections || DEFAULT_SECTIONS).map(section => (
                <section key={section.key} className="siebridge-resource-section">
                  <h4>{section.label}</h4>
                  {(groupedResources[section.key] || []).length ? groupedResources[section.key].map(resource => {
                    const file = resource.files?.[0] || {};
                    const isPdf = file.extension === '.pdf' || file.mimetype === 'application/pdf';
                    return (
                      <article key={resource.id || resource._id}>
                        <FileText />
                        <div><strong>{resource.title}</strong><span>{file.originalName || '资料文件'} · {formatFileSize(file.size)}</span></div>
                        {isPdf && <button type="button" title="预览 PDF" onClick={() => openPreview(resource)}><Eye /></button>}
                        <button type="button" title="下载资料" onClick={() => downloadResource(resource)}><Download /></button>
                      </article>
                    );
                  }) : <p className="siebridge-muted">暂无已通过资料</p>}
                </section>
              ))}
            </>
          ) : <div className="siebridge-empty large"><Filter /><strong>选择一门课程</strong><span>课程资料会按往年真题、课件、笔记整理分区展示。</span></div>}
        </div>
      </div>
      <section className="siebridge-submissions">
        <header><div><p>MY SUBMISSIONS</p><h3>我的上传审核情况</h3></div><Clock3 /></header>
        <div>{submissionItems.length ? submissionItems.slice(0, 8).map(item => <article key={`${item.kind}-${item.id || item._id}`}><span>{item.kind}</span><strong>{item.name || item.title}</strong><small>{item.courseName || item.code || ''}</small><StatusBadge status={item.status} />{item.reviewComment && <em>{item.reviewComment}</em>}</article>) : <p className="siebridge-muted">暂无提交记录</p>}</div>
      </section>
      {courseFormOpen && <CourseForm meta={meta} onClose={() => setCourseFormOpen(false)} onSubmit={submitCourse} submitting={submitting} />}
      {resourceFormCourse && <ResourceForm course={resourceFormCourse} meta={meta} onClose={() => setResourceFormCourse(null)} onSubmit={submitResource} submitting={submitting} />}
      {preview && <div className="siebridge-preview"><dialog open><header><strong>{preview.title}</strong><button className="icon-button" type="button" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}><X /></button></header><iframe src={preview.url} title={preview.title}></iframe></dialog></div>}
    </section>
  );
};

export const SIEBridgeReviewWorkspace = ({ token }) => {
  const [status, setStatus] = useState('pending');
  const [courses, setCourses] = useState([]);
  const [resources, setResources] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson(`/siebridge/reviews?status=${status}`, token);
      setCourses(data.courses || []);
      setResources(data.resources || []);
      setMessage('');
    } catch (error) {
      setMessage(error.message);
      setCourses([]);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const review = async (type, id, nextStatus) => {
    const reviewComment = nextStatus === 'rejected' ? window.prompt('请输入驳回原因') : '';
    if (nextStatus === 'rejected' && !reviewComment) return;
    try {
      await apiJson(`/siebridge/reviews/${type}/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, reviewComment })
      });
      await loadReviews();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const openPreview = async (resource) => {
    try {
      const res = await fetch(`${API_BASE}/siebridge/resources/${resource.id || resource._id}/preview`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('该资料暂不支持在线预览');
      const blob = await res.blob();
      if (preview?.url) URL.revokeObjectURL(preview.url);
      setPreview({ title: resource.title, url: URL.createObjectURL(blob) });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const downloadResource = async (resource) => {
    try {
      const res = await fetch(`${API_BASE}/siebridge/resources/${resource.id || resource._id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('下载失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resource.files?.[0]?.originalName || resource.title;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const reviewItems = [
    ...courses.map(item => ({ ...item, type: 'course', kind: '课程申请' })),
    ...resources.map(item => ({ ...item, type: 'resource', kind: '资料申请', courseName: item.course?.name }))
  ];

  return (
    <section className="siebridge-review">
      <header className="siebridge-toolbar">
        <div><p>SIEBRIDGE REVIEW</p><h2>课程资源审核工作台</h2></div>
        <div className="siebridge-review-tabs">
          {['pending', 'approved', 'rejected'].map(item => <button key={item} type="button" className={status === item ? 'is-active' : ''} onClick={() => setStatus(item)}>{STATUS_META[item].label}</button>)}
        </div>
      </header>
      {message && <div className="siebridge-message">{message}</div>}
      <div className="siebridge-review-list">
        {loading ? <p className="siebridge-muted">正在加载审核队列…</p> : reviewItems.length ? reviewItems.map(item => (
          <article key={`${item.type}-${item.id || item._id}`}>
            <div><span>{item.kind}</span><strong>{item.name || item.title}</strong><small>{item.courseName || item.code || ''} · {item.submittedBy?.name || '未知上传者'}</small></div>
            <StatusBadge status={item.status} />
            {item.reviewComment && <p>{item.reviewComment}</p>}
            {item.type === 'resource' && <div className="siebridge-review-files"><button type="button" onClick={() => openPreview(item)}><Eye />预览</button><button type="button" onClick={() => downloadResource(item)}><Download />下载</button></div>}
            {status === 'pending' && <footer><button type="button" onClick={() => review(item.type, item.id || item._id, 'approved')}><Check />通过</button><button type="button" className="danger" onClick={() => review(item.type, item.id || item._id, 'rejected')}><X />驳回</button></footer>}
          </article>
        )) : <div className="siebridge-empty"><Clock3 /><strong>暂无记录</strong><span>当前筛选下没有需要显示的审核项。</span></div>}
      </div>
      {preview && <div className="siebridge-preview"><dialog open><header><strong>{preview.title}</strong><button className="icon-button" type="button" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}><X /></button></header><iframe src={preview.url} title={preview.title}></iframe></dialog></div>}
    </section>
  );
};
