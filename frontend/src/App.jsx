import AdminDashboard from './AdminDashboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, ChevronRight,
  GraduationCap, House, IdCard, ImagePlus, KeyRound, LayoutDashboard, LockKeyhole,
  LogOut, MessageCircleMore, MessagesSquare, Palette, Paperclip, Plus, Send,
  Settings, ShieldCheck, Smartphone, Sparkles, SquarePen, Utensils, UserRound,
  X, BedDouble, Eye, EyeOff, Moon, Sun, Info, Route, Clock3, PhoneCall
} from 'lucide-react';
import sieLogo from './assets/LOGO_1.png';
import collegeLogo from './assets/SIE_LOGO.svg';

const API_BASE = import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:3001/api` : '/api';

export const CATEGORIES_CONFIG = {
  academic: {
    label: '教学教务',
    short: '教学',
    icon: GraduationCap,
    tileClass: 'academic',
    desc: '课程、考试与学籍',
    sub: ['课程与教学管理', '学辅答疑与讲座安排', '考试与成绩管理', '发展与规划指导', '学籍与培养方案', '设施维修与维护', '其他教学相关']
  },
  accommodation: {
    label: '宿舍住宿',
    short: '住宿',
    icon: BedDouble,
    tileClass: 'housing',
    desc: '环境与生活服务',
    sub: ['住宿环境与管理', '生活配套服务', '其他宿舍相关']
  },
  catering: {
    label: '餐饮服务',
    short: '餐饮',
    icon: Utensils,
    tileClass: 'dining',
    desc: '食品、价格与运营',
    sub: ['食品安全与卫生', '菜品与价格管理', '食堂运营与服务', '其他餐饮相关']
  },
  safety: {
    label: '安全保卫',
    short: '安全',
    icon: ShieldCheck,
    tileClass: 'safety',
    desc: '人身、消防与网络',
    sub: ['人身与财产安全', '消防安全与隐患', '交通与出行安全', '网络与信息安全', '其他安全相关']
  },
  comprehensive: {
    label: '综合服务',
    short: '综合',
    icon: Sparkles,
    tileClass: 'service',
    desc: '活动、心理与行政',
    sub: ['学院活动与文化建设', '心理健康与成长支持', '行政服务与流程优化', '校园公共设施与环境', '其他未分类诉求']
  }
};

const STATUS_META = {
  pending: { label: '待受理', className: 'pending' },
  processing: { label: '处理中', className: 'processing' },
  resolved: { label: '已解决', className: 'resolved' },
  rejected: { label: '已拒绝', className: 'pending' }
};

const PRIORITY_LABEL = {
  low: '低',
  normal: '普通',
  high: '高',
  urgent: '紧急'
};

const THEME_COLORS = [
  { key: 'purple', label: '典雅紫', value: '#6750A4' },
  { key: 'blue', label: '海洋蓝', value: '#1A6CE3' },
  { key: 'green', label: '森林绿', value: '#4A8D3F' },
  { key: 'orange', label: '暖阳橙', value: '#C85100' },
  { key: 'teal', label: '青碧色', value: '#007B7B' }
];

const cls = (...items) => items.filter(Boolean).join(' ');

const getCategory = (value) => CATEGORIES_CONFIG[value] || CATEGORIES_CONFIG.comprehensive;
const formatDate = (value) => value ? new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '刚刚';
const firstChar = (name = '赵') => name.trim().slice(0, 1) || '赵';

export const AttachmentViewer = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="attachment-strip">
      {attachments.map((file, i) => {
        const path = file.path || '';
        const url = path.startsWith('/api') ? path : `/api${path}`;
        const isImage = file.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(path || file.filename);
        if (isImage) {
          return <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={file.filename || '附件'} /></a>;
        }
        return <a key={i} href={url} target="_blank" rel="noreferrer"><Paperclip />{file.filename || '附件'}</a>;
      })}
    </div>
  );
};

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setUser(data.user);
      else logout();
    } catch {
      logout();
    }
  }, [token, logout]);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const login = async (studentId, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (payload) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  };

  return { user, token, login, register, logout, refreshUser };
};

export const useTheme = () => {
  const [mode, setMode] = useState(() => localStorage.getItem('sievox_demo_theme_mode') || localStorage.getItem('sievox_theme_v2') || 'light');
  const [color, setColor] = useState(() => localStorage.getItem('sievox_demo_theme_color') || localStorage.getItem('sievox_palette_v2') || 'blue');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode === 'dark' ? 'dark' : 'light';
    root.dataset.color = THEME_COLORS.some(item => item.key === color) ? color : 'blue';
    root.classList.toggle('dark', mode === 'dark');
    localStorage.setItem('sievox_demo_theme_mode', root.dataset.theme);
    localStorage.setItem('sievox_demo_theme_color', root.dataset.color);
    localStorage.setItem('sievox_theme_v2', root.dataset.theme);
    localStorage.setItem('sievox_palette_v2', root.dataset.color);
  }, [mode, color]);

  return { mode, setMode, color, setColor, open, setOpen };
};

const ThemePanel = ({ theme }) => (
  <aside className={cls('theme-panel', theme.open && 'is-open')} aria-hidden={!theme.open}>
    <header>
      <div><span>APPEARANCE</span><h2>外观设置</h2></div>
      <button className="icon-button" type="button" onClick={() => theme.setOpen(false)}><X /></button>
    </header>
    <div className="theme-section">
      <p>显示模式</p>
      <div className="theme-mode-switch">
        <button className={theme.mode !== 'dark' ? 'is-active' : ''} type="button" onClick={() => theme.setMode('light')}><Sun />浅色</button>
        <button className={theme.mode === 'dark' ? 'is-active' : ''} type="button" onClick={() => theme.setMode('dark')}><Moon />深色</button>
      </div>
    </div>
    <div className="theme-section">
      <p>主题色</p>
      <div className="palette-list">
        {THEME_COLORS.map(item => (
          <button key={item.key} className={theme.color === item.key ? 'is-active' : ''} type="button" onClick={() => theme.setColor(item.key)}>
            <i className={`palette-swatch ${item.key}`}></i>
            <span><strong>{item.label}</strong><small>{item.value}</small></span>
            <Check />
          </button>
        ))}
      </div>
    </div>
    <p className="theme-note"><Info />外观选择会自动保存在当前浏览器中。</p>
  </aside>
);

const LoginPage = ({ onLogin, onRegister, theme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginRole, setLoginRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ studentId: '', password: '', confirmPassword: '', name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!isLogin && form.password !== form.confirmPassword) return setError('两次输入的密码不一致');
    setLoading(true);
    try {
      const data = isLogin ? await onLogin(form.studentId, form.password) : await onRegister(form);
      if (!data.success) setError(data.message || (isLogin ? '登录失败' : '注册失败'));
      else if (!isLogin) {
        setIsLogin(true);
        setError('');
        alert('注册成功，请登录');
      }
    } catch {
      setError('网络错误，请重试');
    }
    setLoading(false);
  };

  return (
    <section className="login-view" aria-label="SIEVOX 登录">
      <div className="login-art" aria-hidden="true">
        <div className="login-art-header">
          <div className="institution-mark"><img src={sieLogo} alt="" /><div><strong>SIEVOX</strong><span>STUDENT RIGHTS & INTERESTS</span></div></div>
          <span className="edition-mark">SIE · 2026</span>
        </div>
        <div className="art-orbit orbit-one"></div>
        <div className="art-orbit orbit-two"></div>
        <div className="art-seal"><MessageCircleMore /><span>倾听</span></div>
        <div className="art-cross cross-one"></div>
        <div className="art-cross cross-two"></div>
        <div className="login-art-copy">
          <p className="art-kicker">BE HEARD · BE SEEN</p>
          <h1>每一种声音，<br />都值得被认真回应。</h1>
          <div className="art-caption"><span>01</span><p>连接学生与学院，让问题有回应、处理有进度、权益有保障。</p></div>
        </div>
        <div className="login-art-footer"><span>北京化工大学</span><span>国际教育学院</span><b></b><span>BUCT</span></div>
      </div>

      <div className="login-panel">
        <div className="login-panel-top">
          <div className="college-signature"><span className="signature-rule"></span><div><strong>北京化工大学</strong><span>国际教育学院</span></div></div>
          <button className="icon-button theme-trigger" type="button" onClick={() => theme.setOpen(true)}><Palette /></button>
        </div>
        <form className="login-form" onSubmit={submit}>
          <div className="login-heading">
            <span className="login-index">01 / ACCESS</span>
            <h2>{isLogin ? '欢迎回来' : '创建学生账号'}</h2>
            <p>{isLogin ? '登录 SIEVOX，继续查看你的反馈进展。' : '首次使用请完成校内身份信息登记。'}</p>
          </div>
          <div className="login-role-switch" aria-label="登录身份">
            {[
              ['student', GraduationCap, '学生登录'],
              ['admin', ShieldCheck, '管理登录'],
              ['superadmin', ShieldCheck, '超级管理员']
            ].map(([key, Icon, label]) => (
              <button key={key} className={loginRole === key ? 'is-active' : ''} type="button" onClick={() => setLoginRole(key)}>
                <Icon />{label}
              </button>
            ))}
          </div>
          {error && <div className="form-message">{error}</div>}
          <label className="login-field">
            <span>{loginRole === 'student' ? '学号' : '账号'}</span>
            <div><IdCard /><input name="studentId" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder="请输入学号" autoComplete="username" required /></div>
          </label>
          {!isLogin && (
            <>
              <label className="login-field"><span>姓名</span><div><UserRound /><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="请输入真实姓名" required /></div></label>
              <label className="login-field"><span>邮箱</span><div><MessagesSquare /><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="请输入邮箱" required /></div></label>
            </>
          )}
          <label className="login-field">
            <span>密码</span>
            <div><LockKeyhole /><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="请输入密码" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
          </label>
          {!isLogin && <label className="login-field"><span>确认密码</span><div><KeyRound /><input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="请再次输入密码" required /></div></label>}
          <div className="login-options">
            <label><input type="checkbox" defaultChecked /><i></i><span>保持登录</span></label>
            <button type="button" onClick={() => alert('请企业微信联系【赵启涵】重置密码\n学号：2024090107\n默认密码：123456')}>忘记密码？</button>
          </div>
          <button className="login-submit" type="submit" disabled={loading}><span>{loading ? '正在验证身份…' : (isLogin ? '进入权益反馈系统' : '创建学生账号')}</span><ArrowUpRight /></button>
          <div className="login-register"><span>{isLogin ? '首次使用 SIEVOX？' : '已有账号？'}</span><button type="button" onClick={() => setIsLogin(v => !v)}>{isLogin ? '创建学生账号' : '返回登录'}</button></div>
        </form>
        <div className="login-help"><ShieldCheck /><p><strong>统一身份安全认证</strong><span>个人信息仅用于校内身份核验与反馈进度通知。</span></p></div>
        <footer className="login-legal"><span>© 2026 BUCT SIE</span><span>隐私保护</span><span>使用帮助</span></footer>
      </div>
      <ThemePanel theme={theme} />
    </section>
  );
};

const RoleTag = ({ user }) => <b className="role-pill admin">{user?.identityLabel || (user?.role === 'student' ? '学生' : '管理员')}</b>;

const Sidebar = ({ user, activePage, setActivePage, openCompose, onLogout, openSettings }) => (
  <aside className="sidebar" aria-label="主导航">
    <div className="brand-lockup"><img src={sieLogo} alt="SIEVOX" /><div><strong>SIEVOX</strong><span>学生权益反馈系统</span></div></div>
    <nav className="side-nav">
      <p className="nav-label">学生服务</p>
      <button className={cls('nav-item', activePage === 'dashboard' && 'is-active')} type="button" onClick={() => setActivePage('dashboard')}><LayoutDashboard /><span>权益工作台</span></button>
      <button className="nav-item" type="button" onClick={() => openCompose()}><SquarePen /><span>发起反馈</span><kbd>N</kbd></button>
      <button className={cls('nav-item', activePage === 'feedbacks' && 'is-active')} type="button" onClick={() => setActivePage('feedbacks')}><MessagesSquare /><span>我的反馈</span><span className="nav-count">●</span></button>
      <button className={cls('nav-item', activePage === 'guide' && 'is-active')} type="button" onClick={() => setActivePage('guide')}><BookOpen /><span>服务指南</span></button>
    </nav>
    <div className="service-note"><div className="service-note-head"><span className="live-dot"></span><span>反馈通道正常</span></div><strong>3.2 小时</strong><p>本学期平均首次响应</p></div>
    <div className="sidebar-user">
      <span className="avatar">{firstChar(user?.name)}</span>
      <div><strong>{user?.name}</strong><span>{user?.studentId}</span></div>
      <button className="icon-button on-dark" type="button" onClick={openSettings}><Settings /></button>
      <button className="icon-button on-dark" type="button" onClick={onLogout}><LogOut /></button>
    </div>
  </aside>
);

const Topbar = ({ pageTitle, theme, openPreview, notifications, openSettings, user }) => (
  <header className="topbar">
    <div className="breadcrumb"><span>国际教育学院</span><ChevronRight /><strong id="page-title">{pageTitle}</strong></div>
    <div className="topbar-actions">
      <div className="role-switch" aria-label="当前身份"><button className="is-active" type="button">学生端</button></div>
      <RoleTag user={user} />
      <button className="icon-button theme-trigger" type="button" onClick={() => theme.setOpen(true)}><Palette /></button>
      <button className="outline-button" type="button" onClick={openPreview}><Smartphone />手机端预览</button>
      <button className="icon-button" type="button" onClick={openSettings}><Settings /></button>
      <button className="icon-button" type="button"><Bell />{notifications.length > 0 && <span className="notification-dot"></span>}</button>
    </div>
  </header>
);

const StatusPill = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return <span className={`status ${meta.className}`}><i></i>{meta.label}</span>;
};

const CategoryIcon = ({ category }) => {
  const cat = getCategory(category);
  const Icon = cat.icon;
  return <span className={`case-icon ${cat.tileClass}`}><Icon /></span>;
};

const StatsStrip = ({ stats }) => (
  <div className="stats-strip" aria-label="反馈统计">
    <div><span>本学期反馈</span><strong>{String(stats.total || 0).padStart(2, '0')}</strong><small>持续记录</small></div>
    <div><span>处理中</span><strong className="text-blue">{String(stats.processing || 0).padStart(2, '0')}</strong><small>等待部门更新</small></div>
    <div><span>已解决</span><strong className="text-green">{String(stats.resolved || 0).padStart(2, '0')}</strong><small>解决率提升中</small></div>
    <div><span>待受理</span><strong>{String(stats.pending || 0).padStart(2, '0')}</strong><small>进入受理队列</small></div>
  </div>
);

const CategoryGrid = ({ openCompose }) => (
  <div className="category-grid">
    {Object.entries(CATEGORIES_CONFIG).map(([key, cat]) => {
      const Icon = cat.icon;
      return (
        <button key={key} className={`category-tile ${cat.tileClass}`} type="button" onClick={() => openCompose(key)}>
          <span><Icon /></span><strong>{cat.label}</strong><small>{cat.desc}</small><ArrowUpRight />
        </button>
      );
    })}
  </div>
);

const FeedbackRow = ({ feedback, onOpen }) => {
  const cat = getCategory(feedback.category);
  return (
    <button className="feedback-row" type="button" onClick={() => onOpen(feedback)}>
      <CategoryIcon category={feedback.category} />
      <span className="feedback-copy"><strong>{feedback.title}</strong><small>{cat.label} · {feedback.subCategory || '综合事项'}</small></span>
      <StatusPill status={feedback.status} />
      <span className="feedback-time"><strong>{formatDate(feedback.updatedAt || feedback.createdAt)}</strong><small>{feedback.responses?.length ? '已有部门回复' : '已进入队列'}</small></span>
      <ChevronRight />
    </button>
  );
};

const ActiveCase = ({ feedback, onOpen }) => {
  if (!feedback) return (
    <section className="active-case">
      <div className="section-heading compact"><div><p className="eyebrow">ACTIVE CASE</p><h2>暂无处理中事项</h2></div></div>
      <p className="case-summary">当前没有正在处理中的反馈。你可以发起新的问题反馈。</p>
    </section>
  );
  return (
    <section className="active-case">
      <div className="section-heading compact"><div><p className="eyebrow">ACTIVE CASE</p><h2>{STATUS_META[feedback.status]?.label || '处理中'}</h2></div><StatusPill status={feedback.status} /></div>
      <p className="case-number">#{feedback._id?.slice(-6)?.toUpperCase()}</p>
      <h3>{feedback.title}</h3>
      <p className="case-summary">{feedback.responses?.[feedback.responses.length - 1]?.content || '事项已进入处理流程，新的处理进展会通过站内通知同步。'}</p>
      <ol className="case-timeline">
        <li className="is-done"><span><Check /></span><div><strong>提交成功</strong><small>{formatDate(feedback.createdAt)}</small></div></li>
        <li className={feedback.status === 'resolved' ? 'is-done' : 'is-current'}><span>{feedback.status === 'resolved' ? <Check /> : null}</span><div><strong>{feedback.status === 'resolved' ? '处理完成' : '部门核实中'}</strong><small>{formatDate(feedback.updatedAt)}</small></div></li>
        <li><span></span><div><strong>归档留痕</strong><small>反馈记录永久保留</small></div></li>
      </ol>
      <button className="wide-outline-button" type="button" onClick={() => onOpen(feedback)}>查看完整对话<ArrowRight /></button>
    </section>
  );
};

const ComposeDrawer = ({ open, mobile, category, setCategory, onClose, onSubmit, loading }) => {
  const [subCategory, setSubCategory] = useState('');
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', isAnonymous: false });
  const [files, setFiles] = useState([]);
  const activeCategory = category || '';
  const catMeta = activeCategory ? getCategory(activeCategory) : null;

  useEffect(() => { if (category) setSubCategory(''); }, [category]);

  const submit = () => {
    if (!activeCategory || !subCategory || !form.title || !form.content) return alert('请完整填写问题领域、细分类别、标题和描述');
    onSubmit({ ...form, category: activeCategory, subCategory }, files).then(ok => {
      if (ok) {
        setForm({ title: '', content: '', priority: 'normal', isAnonymous: false });
        setFiles([]);
        setSubCategory('');
      }
    });
  };

  if (mobile) {
    return (
      <section className={cls('mobile-sheet', open && 'is-open')} aria-hidden={!open}>
        <div className="sheet-handle"></div>
        <header><div><span>STEP 1 OF 3</span><h2>告诉我们发生了什么</h2></div><button className="icon-button" type="button" onClick={onClose}><X /></button></header>
        <div className="sheet-body">
          <label>问题领域</label>
          <button className="mobile-select" type="button"><span>{catMeta?.label || '请选择问题领域'}</span><ChevronRight /></button>
          <label>细分类别</label>
          <select value={subCategory} onChange={e => setSubCategory(e.target.value)}><option value="">请选择细分类别</option>{catMeta?.sub.map(item => <option key={item}>{item}</option>)}</select>
          <label>问题标题</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="用一句话概括问题" />
          <label>详细描述</label><textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="时间、地点、具体情况…" />
          <div className="sheet-actions">
            <label className="sheet-attach"><Paperclip /><input hidden type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
            <label className="mobile-anonymous"><input type="checkbox" checked={form.isAnonymous} onChange={e => setForm({ ...form, isAnonymous: e.target.checked })} /><i></i><span>匿名</span></label>
            <button className="sheet-next" type="button" onClick={submit} disabled={loading}>{loading ? '提交中' : '提交反馈'}<ArrowRight /></button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <aside className={cls('compose-drawer', open && 'is-open')} aria-hidden={!open} aria-label="发起反馈">
      <header><div><span>NEW FEEDBACK</span><h2>发起反馈</h2></div><button className="icon-button" type="button" onClick={onClose}><X /></button></header>
      <div className="compose-body">
        <div className="step-indicator"><span className="is-active">1</span><i></i><span>2</span><i></i><span>3</span><small>描述问题</small><small>补充信息</small><small>确认提交</small></div>
        <label className="field-label">问题领域</label>
        <div className="compose-categories">
          {Object.entries(CATEGORIES_CONFIG).map(([key, cat]) => <button key={key} className={activeCategory === key ? 'is-active' : ''} type="button" onClick={() => setCategory(key)}>{cat.label}</button>)}
        </div>
        <label className="input-field"><span>细分类别</span><select value={subCategory} onChange={e => setSubCategory(e.target.value)}><option value="">请选择详细诉求分类</option>{catMeta?.sub.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="input-field"><span>问题标题</span><input maxLength="50" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="用一句话概括你遇到的问题" /><small>{form.title.length} / 50</small></label>
        <label className="input-field textarea-field"><span>详细描述</span><textarea maxLength="500" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="请描述时间、地点、具体情况，以及你希望得到的帮助…" /><small>{form.content.length} / 500</small></label>
        <label className="upload-area"><ImagePlus /><div><strong>{files.length ? `已选择 ${files.length} 个文件` : '添加图片或视频'}</strong><p>最多 10 个文件，单个不超过 20MB</p></div><span className="outline-button">选择文件</span><input hidden type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
        <div className="compose-options">
          <div><span>优先级</span><div className="priority-switch">{['normal', 'high', 'urgent'].map(key => <button key={key} className={form.priority === key ? 'is-active' : ''} type="button" onClick={() => setForm({ ...form, priority: key })}>{PRIORITY_LABEL[key]}</button>)}</div></div>
          <label><span><strong>匿名提交</strong><small>处理部门不可见你的身份</small></span><input className="switch-input" type="checkbox" checked={form.isAnonymous} onChange={e => setForm({ ...form, isAnonymous: e.target.checked })} /><i></i></label>
        </div>
      </div>
      <footer><button className="text-button" type="button" onClick={onClose}>暂存草稿</button><button className="primary-button" type="button" onClick={submit} disabled={loading}>确认并提交<Send /></button></footer>
    </aside>
  );
};

const FeedbackDialog = ({ feedback, onClose, onReply, onRecall, onDelete }) => {
  const [reply, setReply] = useState('');
  if (!feedback) return null;
  const status = STATUS_META[feedback.status] || STATUS_META.pending;
  const submitReply = async () => {
    if (!reply.trim()) return;
    await onReply(feedback._id, reply);
    setReply('');
  };
  return (
    <div className="dialog-backdrop">
      <dialog className="feedback-dialog" open>
        <button className="dialog-close icon-button" type="button" onClick={onClose}><X /></button>
        <div className="dialog-status"><span className={`status ${status.className}`}><i></i>{status.label}</span><small>#{feedback._id?.slice(-6)?.toUpperCase()}</small></div>
        <h2>{feedback.title}</h2>
        <p>{feedback.content}</p>
        <AttachmentViewer attachments={feedback.attachments} />
        <ol className="dialog-timeline">
          <li className="done"><Check /><div><strong>提交成功</strong><small>{formatDate(feedback.createdAt)}</small></div></li>
          {(feedback.responses || []).map(resp => (
            <li className="current" key={resp._id || resp.createdAt}><MessagesSquare /><div><strong>{resp.adminName || '处理老师'}回复</strong><small>{formatDate(resp.createdAt)}</small><p>{resp.isRecalled ? '该回复已被撤回' : resp.content}</p><AttachmentViewer attachments={resp.attachments} />{!resp.isRecalled && <button className="text-button" type="button" onClick={() => onRecall(feedback._id, resp._id)}>撤回留言</button>}</div></li>
          ))}
        </ol>
        <div className="dialog-reply"><input value={reply} onChange={e => setReply(e.target.value)} placeholder="补充信息或回复处理老师…" /><button type="button" onClick={submitReply}><Send /><span>发送</span></button></div>
        {feedback.status === 'pending' && <button className="text-button danger-text" type="button" onClick={() => onDelete(feedback._id)}>撤销这条反馈</button>}
      </dialog>
    </div>
  );
};

const StudentDesktop = ({ user, stats, feedbacks, activePage, setActivePage, openCompose, onOpenFeedback }) => {
  const latest = feedbacks[0];
  const activeCase = feedbacks.find(item => item.status === 'processing') || latest;
  return (
    <section id="student-desktop" className="role-view">
      <div className={cls('page-panel', activePage === 'dashboard' && 'is-active')}>
        <div className="page-heading">
          <div><p className="eyebrow">MONDAY · 21 JULY</p><h1>晚上好，{user?.name}</h1><p>你有 {stats.processing || 0} 条反馈正在处理，最近一次更新于 {latest ? formatDate(latest.updatedAt || latest.createdAt) : '暂无'}。</p></div>
          <button className="primary-button" type="button" onClick={() => openCompose()}><Plus />发起新反馈</button>
        </div>
        <StatsStrip stats={stats} />
        <div className="workspace-grid">
          <div className="workspace-primary">
            <section className="content-section"><div className="section-heading"><div><h2>从哪里开始？</h2><p>选择问题领域，我们会自动匹配负责部门。</p></div></div><CategoryGrid openCompose={openCompose} /></section>
            <section className="content-section feedback-section"><div className="section-heading"><div><h2>最近反馈</h2><p>所有进度与回复会在这里持续留痕。</p></div><button className="text-button" type="button" onClick={() => setActivePage('feedbacks')}>查看全部<ArrowRight /></button></div><div className="feedback-list">{feedbacks.slice(0, 3).map(item => <FeedbackRow key={item._id} feedback={item} onOpen={onOpenFeedback} />)}</div></section>
          </div>
          <aside className="insight-rail"><ActiveCase feedback={activeCase} onOpen={onOpenFeedback} /><section className="response-note"><MessageCircleMore /><div><strong>你的声音，会抵达。</strong><p>匿名反馈不会向处理部门展示个人身份，所有操作均保留审计记录。</p></div></section></aside>
        </div>
      </div>

      <div className={cls('page-panel simple-page', activePage === 'feedbacks' && 'is-active')}>
        <div className="page-heading"><div><p className="eyebrow">MY FEEDBACK</p><h1>我的反馈</h1><p>按状态查看提交记录、部门回复与处理结果。</p></div><button className="primary-button" type="button" onClick={() => openCompose()}><Plus />发起新反馈</button></div>
        <div className="filter-row"><button className="filter-chip is-active">全部 {feedbacks.length}</button><button className="filter-chip">待受理 {stats.pending}</button><button className="filter-chip">处理中 {stats.processing}</button><button className="filter-chip">已解决 {stats.resolved}</button><span></span><label className="search-field"><MessagesSquare /><input placeholder="搜索标题或编号" /></label></div>
        <div className="feedback-list full-list">{feedbacks.map(item => <FeedbackRow key={item._id} feedback={item} onOpen={onOpenFeedback} />)}</div>
      </div>

      <div className={cls('page-panel simple-page', activePage === 'guide' && 'is-active')}>
        <div className="page-heading"><div><p className="eyebrow">SERVICE GUIDE</p><h1>服务指南</h1><p>了解各类事项的受理范围、预计时效和紧急联系渠道。</p></div></div>
        <div className="guide-grid">
          <section><Route /><h2>反馈如何流转</h2><p>提交后由学生权益中心初审，并按问题领域分派至责任部门，全程可查看节点与回复。</p></section>
          <section><Clock3 /><h2>响应时效</h2><p>普通事项原则上 1 个工作日内首次响应；高优先级问题会进入加急队列。</p></section>
          <section><PhoneCall /><h2>紧急事项</h2><p>涉及人身安全、火情或突发疾病时，请直接联系校园应急电话，不要仅依赖在线反馈。</p></section>
        </div>
      </div>
    </section>
  );
};

const MobileShell = ({ user, feedbacks, stats, page, setPage, openCompose, onOpenFeedback, theme }) => {
  const latest = feedbacks.find(item => item.status === 'processing') || feedbacks[0];
  return (
    <div className="mobile-stage">
      <div className="mobile-shell">
        <header className="mobile-header">
          <div className="mobile-brand"><img src={sieLogo} alt="SIEVOX" /><div><strong>SIEVOX</strong><span>学生权益反馈</span></div></div>
          <div className="mobile-header-actions"><button className="icon-button theme-trigger" type="button" onClick={() => theme.setOpen(true)}><Palette /></button><button className="icon-button"><Bell /><span className="notification-dot"></span></button></div>
        </header>
        <main className="mobile-main">
          <section className={cls('mobile-page', page === 'home' && 'is-active')}>
            <div className="mobile-greeting"><p>晚上好，{user?.name}</p><h1>今天想反馈什么？</h1></div>
            {latest && <button className="mobile-active-case" type="button" onClick={() => onOpenFeedback(latest)}><span className="case-state"><i></i>{STATUS_META[latest.status]?.label}</span><span className="case-code">#{latest._id?.slice(-6)?.toUpperCase()}</span><strong>{latest.title}</strong><p>{latest.responses?.length ? '已有部门回复' : '已进入处理队列'} · {formatDate(latest.updatedAt || latest.createdAt)}</p><span className="mobile-progress"><i></i></span><span className="progress-labels"><small>已提交</small><small>核实中</small><small>待完成</small></span></button>}
            <section className="mobile-section"><div className="mobile-section-head"><h2>快速反馈</h2><span>选择问题领域</span></div><div className="mobile-categories">{Object.entries(CATEGORIES_CONFIG).map(([key, cat]) => { const Icon = cat.icon; return <button key={key} type="button" onClick={() => openCompose(key, true)}><span className={cat.tileClass}><Icon /></span><small>{cat.short}</small></button>; })}</div></section>
            <section className="mobile-section recent-mobile"><div className="mobile-section-head"><h2>最近反馈</h2><button type="button" onClick={() => setPage('feedbacks')}>全部 {feedbacks.length} 条<ChevronRight /></button></div>{feedbacks.slice(0, 2).map(item => <button key={item._id} className="mobile-feedback" type="button" onClick={() => onOpenFeedback(item)}><CategoryIcon category={item.category} /><span><strong>{item.title}</strong><small>{formatDate(item.createdAt)} · {getCategory(item.category).label}</small></span><StatusPill status={item.status} /></button>)}</section>
          </section>
          <section className={cls('mobile-page', page === 'feedbacks' && 'is-active')}>
            <div className="mobile-page-title"><button className="icon-button" type="button" onClick={() => setPage('home')}><ArrowLeft /></button><div><span>我的记录</span><h1>我的反馈</h1></div></div>
            <div className="mobile-filter-scroll"><button className="is-active">全部 {feedbacks.length}</button><button>处理中 {stats.processing}</button><button>待受理 {stats.pending}</button><button>已解决 {stats.resolved}</button></div>
            <div className="mobile-history">{feedbacks.map(item => <button key={item._id} type="button" onClick={() => onOpenFeedback(item)}><span><StatusPill status={item.status} /><small>#{item._id?.slice(-6)?.toUpperCase()}</small></span><strong>{item.title}</strong><p>{item.responses?.[0]?.content || item.content}</p><time>更新于 {formatDate(item.updatedAt || item.createdAt)}</time></button>)}</div>
          </section>
          <section className={cls('mobile-page', page === 'guide' && 'is-active')}>
            <div className="mobile-page-title"><div><span>帮助中心</span><h1>服务指南</h1></div></div>
            <div className="mobile-guide"><button><Route /><span><strong>反馈如何流转</strong><small>查看受理和分派规则</small></span><ChevronRight /></button><button><Clock3 /><span><strong>处理需要多久</strong><small>各类型事项响应时效</small></span><ChevronRight /></button><button><ShieldCheck /><span><strong>紧急情况处理</strong><small>校园应急联系电话</small></span><ChevronRight /></button></div>
          </section>
        </main>
        <nav className="mobile-tabbar" aria-label="手机端导航">
          <button className={page === 'home' ? 'is-active' : ''} type="button" onClick={() => setPage('home')}><House /><span>首页</span></button>
          <button className={page === 'feedbacks' ? 'is-active' : ''} type="button" onClick={() => setPage('feedbacks')}><MessagesSquare /><span>反馈</span></button>
          <button className="mobile-compose" type="button" onClick={() => openCompose('', true)}><Plus /></button>
          <button className={page === 'guide' ? 'is-active' : ''} type="button" onClick={() => setPage('guide')}><BookOpen /><span>指南</span></button>
          <button type="button"><UserRound /><span>我的</span></button>
        </nav>
      </div>
    </div>
  );
};

const SettingsModal = ({ open, user, onClose, token, onLogout, onRefreshUser }) => {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: '', studentId: '', email: '', phone: '' });
  const [pwd, setPwd] = useState({ current: '', new: '' });
  useEffect(() => {
    if (open) setProfile({ name: user?.name || '', studentId: user?.studentId || '', email: user?.email || '', phone: user?.phone || '' });
  }, [open, user]);
  if (!open) return null;

  const saveProfile = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/auth/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(profile) });
    const data = await res.json();
    alert(data.success ? '个人信息修改成功' : data.message || '修改失败');
    if (data.success) onRefreshUser?.();
  };
  const changePwd = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/auth/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.new }) });
    const data = await res.json();
    alert(data.success ? '密码修改成功，请重新登录' : data.message || '修改失败');
    if (data.success) onLogout();
  };

  return (
    <div className="dialog-backdrop">
      <dialog className="feedback-dialog settings-dialog" open>
        <button className="dialog-close icon-button" type="button" onClick={onClose}><X /></button>
        <div className="admin-tabs"><button className={tab === 'profile' ? 'is-active' : ''} onClick={() => setTab('profile')}>个人资料</button><button className={tab === 'password' ? 'is-active' : ''} onClick={() => setTab('password')}>修改密码</button></div>
        {tab === 'profile' ? (
          <form className="score-form" onSubmit={saveProfile}>
            <div className="form-grid"><label><span>学号</span><input value={profile.studentId} onChange={e => setProfile({ ...profile, studentId: e.target.value })} /></label><label><span>姓名</span><input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label></div>
            <label className="reason-field"><span>邮箱</span><input value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></label>
            <label className="reason-field"><span>手机号</span><input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></label>
            <button className="primary-button">保存资料修改</button>
          </form>
        ) : (
          <form className="score-form" onSubmit={changePwd}>
            <label className="reason-field"><span>当前密码</span><input type="password" value={pwd.current} onChange={e => setPwd({ ...pwd, current: e.target.value })} /></label>
            <label className="reason-field"><span>新密码</span><input type="password" value={pwd.new} onChange={e => setPwd({ ...pwd, new: e.target.value })} /></label>
            <button className="primary-button">确认修改密码</button>
          </form>
        )}
      </dialog>
    </div>
  );
};

const DashboardPage = ({ user, token, onLogout, onRefreshUser, theme }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activePage, setActivePage] = useState('dashboard');
  const [mobilePage, setMobilePage] = useState('home');
  const [composeOpen, setComposeOpen] = useState(false);
  const [mobileComposeOpen, setMobileComposeOpen] = useState(false);
  const [composeCategory, setComposeCategory] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewMobile, setPreviewMobile] = useState(false);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const s = { total: feedbacks.length, pending: 0, processing: 0, resolved: 0, rejected: 0 };
    feedbacks.forEach(item => { s[item.status] = (s[item.status] || 0) + 1; });
    return s;
  }, [feedbacks]);

  const fetchFeedbacks = useCallback(async () => {
    const res = await fetch(`${API_BASE}/feedback/my`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setFeedbacks(data.feedbacks || []);
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    document.body.classList.toggle('preview-mobile', previewMobile);
    return () => document.body.classList.remove('preview-mobile');
  }, [previewMobile]);

  useEffect(() => {
    fetchFeedbacks();
    fetchNotifications();
    const id = setInterval(() => { fetchFeedbacks(); fetchNotifications(); }, 12000);
    return () => clearInterval(id);
  }, [fetchFeedbacks, fetchNotifications]);

  const openCompose = (category = '', mobile = false) => {
    setComposeCategory(category);
    if (mobile) setMobileComposeOpen(true);
    else setComposeOpen(true);
  };

  const submitFeedback = async (formData, files) => {
    setLoading(true);
    try {
      let uploadedFiles = [];
      if (files?.length) {
        const body = new FormData();
        files.forEach(file => body.append('files', file));
        const up = await fetch(`${API_BASE}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
        const upData = await up.json();
        if (upData.success) uploadedFiles = upData.files;
      }
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, attachments: uploadedFiles })
      });
      const data = await res.json();
      if (data.success) {
        setComposeOpen(false);
        setMobileComposeOpen(false);
        setActivePage('feedbacks');
        setMobilePage('feedbacks');
        await fetchFeedbacks();
      } else alert(data.message || '提交失败');
      return data.success;
    } catch {
      alert('网络错误，请重试');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reply = async (feedbackId, content) => {
    const res = await fetch(`${API_BASE}/feedback/${feedbackId}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content }) });
    const data = await res.json();
    if (data.success) {
      await fetchFeedbacks();
      setSelectedFeedback(null);
    } else alert(data.message || '发送失败');
  };

  const recall = async (feedbackId, replyId) => {
    if (!window.confirm('确定撤回这条留言吗？')) return;
    const res = await fetch(`${API_BASE}/feedback/${feedbackId}/reply/${replyId}/recall`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      await fetchFeedbacks();
      setSelectedFeedback(null);
    } else alert(data.message || '撤回失败');
  };

  const deleteFeedback = async (feedbackId) => {
    if (!window.confirm('确定彻底撤销这条反馈吗？')) return;
    const res = await fetch(`${API_BASE}/feedback/${feedbackId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      await fetchFeedbacks();
      setSelectedFeedback(null);
    } else alert(data.message || '撤销失败');
  };

  const pageTitle = activePage === 'feedbacks' ? '我的反馈' : activePage === 'guide' ? '服务指南' : '权益工作台';

  return (
    <>
      <div className="desktop-shell">
        <Sidebar user={user} activePage={activePage} setActivePage={setActivePage} openCompose={openCompose} onLogout={onLogout} openSettings={() => setSettingsOpen(true)} />
        <main className="desktop-main">
          <Topbar pageTitle={pageTitle} theme={theme} openPreview={() => setPreviewMobile(true)} notifications={notifications} openSettings={() => setSettingsOpen(true)} user={user} />
          <StudentDesktop user={user} stats={stats} feedbacks={feedbacks} activePage={activePage} setActivePage={setActivePage} openCompose={openCompose} onOpenFeedback={setSelectedFeedback} />
        </main>
      </div>
      <button className="preview-exit icon-button" type="button" onClick={() => setPreviewMobile(false)}><X /></button>
      <MobileShell user={user} feedbacks={feedbacks} stats={stats} page={mobilePage} setPage={setMobilePage} openCompose={openCompose} onOpenFeedback={setSelectedFeedback} theme={theme} />
      <div className={cls('drawer-backdrop', (composeOpen || mobileComposeOpen) && 'is-open')} onClick={() => { setComposeOpen(false); setMobileComposeOpen(false); }}></div>
      <ComposeDrawer open={composeOpen} category={composeCategory} setCategory={setComposeCategory} onClose={() => setComposeOpen(false)} onSubmit={submitFeedback} loading={loading} />
      <ComposeDrawer mobile open={mobileComposeOpen} category={composeCategory} setCategory={setComposeCategory} onClose={() => setMobileComposeOpen(false)} onSubmit={submitFeedback} loading={loading} />
      <FeedbackDialog feedback={selectedFeedback} onClose={() => setSelectedFeedback(null)} onReply={reply} onRecall={recall} onDelete={deleteFeedback} />
      <SettingsModal open={settingsOpen} user={user} token={token} onClose={() => setSettingsOpen(false)} onLogout={onLogout} onRefreshUser={onRefreshUser} />
      <ThemePanel theme={theme} />
    </>
  );
};

export default function App() {
  const { user, token, login, register, logout, refreshUser } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    document.body.classList.toggle('auth-active', !user);
    return () => document.body.classList.remove('auth-active');
  }, [user]);

  if (!user) return <LoginPage onLogin={login} onRegister={register} theme={theme} />;
  if (user.role === 'admin' || user.role === 'superadmin') {
    return <AdminDashboard user={user} token={token} onLogout={logout} onRefreshUser={refreshUser} themeTools={theme} />;
  }
  return <DashboardPage user={user} token={token} onLogout={logout} onRefreshUser={refreshUser} theme={theme} />;
}
