import AdminDashboard, { OrganizationFrameworkPanel } from './AdminDashboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, ChevronRight,
  GraduationCap, House, IdCard, ImagePlus, KeyRound, LayoutDashboard, LockKeyhole,
  LogOut, MessageCircleMore, MessagesSquare, Palette, Paperclip, Plus, Send,
  Settings, ShieldCheck, Smartphone, Sparkles, SquarePen, Utensils, UserRound,
  X, BedDouble, Eye, EyeOff, Moon, Sun, Info, Route, Clock3, PhoneCall,
  Building2, ChevronLeft, ExternalLink, Flag, HeartHandshake, Megaphone,
  Network, Paintbrush, Radio, Scale, Trophy, UsersRound, Wrench
} from 'lucide-react';
import sieLogo from './assets/LOGO_1.png';
import collegeLogo from './assets/SIE_LOGO.svg';
import { API_BASE } from './api';

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
const AUTH_TOKEN_KEY = 'siehub_auth_token_v2';
const LEGACY_AUTH_TOKEN_KEY = 'token';

const readStoredToken = () => {
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  return sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
};

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
  const [token, setToken] = useState(readStoredToken);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
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

  const login = async (studentId, password, remember = false) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
      if (remember) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      } else {
        sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
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

const ThemeModeButtons = ({ theme, compact = false }) => (
  <div className={cls('theme-mode-icons', compact && 'compact')} aria-label="深浅色切换">
    <button
      className={theme.mode !== 'dark' ? 'is-active' : ''}
      type="button"
      onClick={() => theme.setMode('light')}
      aria-label="浅色模式"
      title="浅色模式"
    >
      <Sun />
    </button>
    <button
      className={theme.mode === 'dark' ? 'is-active' : ''}
      type="button"
      onClick={() => theme.setMode('dark')}
      aria-label="深色模式"
      title="深色模式"
    >
      <Moon />
    </button>
  </div>
);

const ThemePanel = ({ theme }) => (
  <aside className={cls('theme-panel', theme.open && 'is-open')} aria-hidden={!theme.open}>
    <header>
      <div><span>APPEARANCE</span><h2>外观设置</h2></div>
      <button className="icon-button" type="button" onClick={() => theme.setOpen(false)}><X /></button>
    </header>
    <div className="theme-section theme-composer">
      <div>
        <p>模式</p>
        <ThemeModeButtons theme={theme} />
      </div>
      <div>
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
    </div>
    <p className="theme-note"><Info />外观选择会自动保存在当前浏览器中。</p>
  </aside>
);

const LoginPage = ({ onLogin, onRegister, theme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [form, setForm] = useState({ studentId: '', password: '', confirmPassword: '', name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loginModules = SIEHUB_MODULES.filter(module => module.organization !== 'hub');
  const youthLeagueCount = loginModules.filter(module => module.organization === 'youth_league').length;
  const studentUnionCount = loginModules.filter(module => module.organization === 'student_union').length;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!isLogin && form.password !== form.confirmPassword) return setError('两次输入的密码不一致');
    setLoading(true);
    try {
      const data = isLogin ? await onLogin(form.studentId, form.password, remember) : await onRegister(form);
      if (!data.success) setError(data.message || (isLogin ? '登录失败' : '注册失败'));
      else if (!isLogin) {
        setIsLogin(true);
        setError('');
        alert('注册成功，请登录');
      }
    } catch {
      setError('无法连接 SIEHUB 后端，请确认本地服务已启动。');
    }
    setLoading(false);
  };

  return (
    <section className="login-view siehub-login-view" aria-label="SIEHUB 统一登录">
      <div className="login-art siehub-login-art" aria-hidden="true">
        <div className="login-art-header">
          <div className="institution-mark siehub-institution-mark">
            <span className="siehub-login-logo"><Radio /></span>
            <div><strong>SIEHUB</strong><span>SIE LIFE PLATFORM</span></div>
          </div>
          <span className="edition-mark">LT1 · PLATFORM UPGRADE</span>
        </div>
        <div className="siehub-login-blueprint">
          <div className="blueprint-axis"></div>
          <div className="blueprint-axis vertical"></div>
          {loginModules.map((module, index) => {
            const Icon = module.icon;
            return (
              <span
                key={module.key}
                className={cls('hub-node', module.key === 'student_rights' && 'is-live')}
                style={{ '--node-index': `${index}`, '--node-col': `${index % 3}`, '--node-row': `${Math.floor(index / 3)}` }}
              >
                <Icon />
                <b>{module.product || module.title}</b>
              </span>
            );
          })}
        </div>
        <div className="art-seal siehub-access-seal"><Network /><span>HUB</span></div>
        <div className="login-art-copy">
          <p className="art-kicker">ONE ID · ALL STUDENT WORK</p>
          <h1>一处登录，抵达所有学生工作模块。</h1>
          <div className="art-caption"><span>01</span><p>SIEHUB 作为一级生活平台，统一承载团委、学生会各部门子平台；SIEVOX 继续作为学生权益部成熟模块运行。</p></div>
        </div>
        <div className="login-art-footer"><span>团委 {youthLeagueCount} 个模块</span><span>学生会 {studentUnionCount} 个模块</span><b></b><span>SIEVOX 已接入</span></div>
      </div>

      <div className="login-panel siehub-login-panel">
        <div className="login-panel-top">
          <div className="college-signature siehub-college-signature">
            <img src={collegeLogo} alt="" />
            <span className="signature-rule"></span>
            <div><strong>北京化工大学</strong><span>国际教育学院</span></div>
          </div>
          <button className="icon-button theme-trigger" type="button" onClick={() => theme.setOpen(true)}><Palette /></button>
        </div>
        <form className="login-form" onSubmit={submit}>
          <div className="login-heading">
            <span className="login-index">01 / SIEHUB ACCESS</span>
            <h2>{isLogin ? '进入 SIEHUB' : '申请学生账号'}</h2>
            <p>{isLogin ? '输入账号与密码，系统会自动识别身份，进入对应的部门平台或 SIEVOX。' : '首次使用请完成校内身份信息登记，账号创建后从 SIEHUB 统一登录。'}</p>
          </div>
          <div className="unified-login-card siehub-routing-card" aria-label="SIEHUB 统一登录说明">
            <ShieldCheck />
            <div>
              <strong>统一认证 · 自动分流</strong>
              <span>学生、志愿者、部门负责人/团委学生兼职团干部、主席团成员/团委学生兼职副书记与终极管理员均从此处登录。</span>
            </div>
          </div>
          <div className="siehub-login-routes" aria-label="登录后分流范围">
            <span><GraduationCap />学生端</span>
            <span><UsersRound />部门平台</span>
            <span><Scale />SIEVOX</span>
          </div>
          {error && <div className="form-message">{error}</div>}
          <label className="login-field">
            <span>学号 / 账号</span>
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
            <label><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /><i></i><span>保持登录</span></label>
            <button type="button" onClick={() => alert('请企业微信联系【赵启涵】重置密码\n学号：2024090107\n默认密码：123456')}>忘记密码？</button>
          </div>
          <button className="login-submit" type="submit" disabled={loading}><span>{loading ? '正在验证身份…' : (isLogin ? '进入 SIEHUB' : '创建 SIEHUB 学生账号')}</span><ArrowUpRight /></button>
          <div className="login-register"><span>{isLogin ? '首次使用 SIEHUB？' : '已有账号？'}</span><button type="button" onClick={() => setIsLogin(v => !v)}>{isLogin ? '创建学生账号' : '返回登录'}</button></div>
        </form>
        <div className="login-help"><ShieldCheck /><p><strong>SIEHUB 统一身份安全认证</strong><span>个人信息仅用于校内身份核验、部门工作协同与服务进度通知。</span></p></div>
        <footer className="login-legal"><span>© 2026 BUCT SIE · SIEHUB</span><span>隐私保护</span><span>使用帮助</span></footer>
      </div>
      <ThemePanel theme={theme} />
    </section>
  );
};

const RoleTag = ({ user }) => <b className="role-pill admin">{user?.isUltimateAdmin ? '终极管理员' : (user?.identityLabel || (user?.role === 'student' ? '学生' : '管理员'))}</b>;

const SIEHUB_MODULES = [
  { key: 'hub_governance', organization: 'hub', title: '组织治理中枢', summary: '团委学生会架构、成员身份、分管部门与届次归档', icon: ShieldCheck, tone: 'gold', product: 'SIEHUB', ultimateOnly: true },
  { key: 'organization', organization: 'youth_league', title: '组织部', summary: '组织建设、团务活动与成员发展', icon: Network, tone: 'indigo' },
  { key: 'publicity', organization: 'youth_league', title: '宣传部', summary: '品牌传播、视觉内容与新闻采编', icon: Megaphone, tone: 'orange' },
  { key: 'practice', organization: 'youth_league', title: '实践部', summary: '社会实践、项目协作与成长记录', icon: Flag, tone: 'green' },
  { key: 'volunteer_service', organization: 'youth_league', title: '志愿者工作部', summary: '志愿服务、时长管理与项目调度', icon: HeartHandshake, tone: 'red' },
  { key: 'general_office', organization: 'student_union', title: '综合办公室', summary: '组织运转、会议事项与综合协调', icon: Building2, tone: 'slate' },
  { key: 'student_rights', organization: 'student_union', title: '学生权益部', summary: 'SIEVOX 学生权益反馈系统', icon: Scale, tone: 'blue', product: 'SIEVOX' },
  { key: 'culture_sports_arts', organization: 'student_union', title: '文体艺术部', summary: '文体活动、艺术项目与赛事组织', icon: Trophy, tone: 'purple' },
  { key: 'academic_technology', organization: 'student_union', title: '学术科技部', summary: '学术活动、科技竞赛与创新服务', icon: Wrench, tone: 'teal' },
  { key: 'new_media', organization: 'student_union', title: '新媒体工作部', summary: '内容矩阵、平台运营与视觉创作', icon: Paintbrush, tone: 'pink' }
];

const DEFAULT_VOLUNTEER_PERFORMANCE_POLICY = {
  sourceProduct: 'SIEVOX',
  title: 'SIEVOX 志愿者绩效考核制度',
  description: '所有部门初始统一复刻学生权益部 SIEVOX 的六维志愿者绩效考核制度。',
  totalBaseScore: 100,
  bonusMode: 'extra',
  dimensions: [
    { key: 'attendance', label: '考勤积分', capLabel: '20分', maxScore: 20, rule: '准时出勤/合规请假 +2 分；迟到早退 +1 分；无故缺席 0 分。', color: 'purple' },
    { key: 'activity', label: '活动贡献', capLabel: '35分', maxScore: 35, rule: '核心统筹策划 +4~5 分；主要骨干 +2~3 分；普通参与 +1 分。', color: 'blue' },
    { key: 'feedback', label: '权益跟进', capLabel: '25分', maxScore: 25, rule: '按时巡检系统与规范回复留言 +2 分/周；全月账号无违规 +1.25 分/月。', color: 'green' },
    { key: 'copywriting', label: '文案与策划', capLabel: '15分', maxScore: 15, rule: '主笔大型活动策划案 +4~5 分；主笔推送文案 +2~3 分；参与辅助 +1 分。', color: 'yellow' },
    { key: 'others', label: '其他常规', capLabel: '5分', maxScore: 5, rule: '完成物资管理、资料整理或跨部门对接 +1 分/次。', color: 'slate' },
    { key: 'bonus', label: '特别加分', capLabel: '附加', maxScore: null, rule: '获校级表彰、突出建设性贡献直接 +2~5 分，计入总分。', color: 'red' }
  ],
  notes: ['全员初始为 0 分', '五项常规维度封顶后计入总分，特别加分为附加项']
};

const canManageVolunteerPolicy = (user, module) => {
  if (user?.isUltimateAdmin) return true;
  const matchedAccess = getModuleAccess(user, module);
  if (matchedAccess) return matchedAccess.capabilities?.includes('manage_volunteer_performance_policy');
  return user?.role === 'superadmin' && ['department_head', 'youth_league_cadre', 'presidium_member', 'youth_league_deputy_secretary'].includes(user?.positionTitle);
};

const getModuleAccess = (user, module) => {
  const accessItems = Array.isArray(user?.moduleCapabilities) ? user.moduleCapabilities : [];
  return accessItems.find(item =>
    item.department === module?.key ||
    item.key === module?.key ||
    item.moduleId === module?.id ||
    (module?.key === 'student_rights' && item.moduleId === 'sievox')
  );
};

const canSwitchDepartmentPortal = (user, module) => {
  if (user?.isUltimateAdmin) return true;
  const access = getModuleAccess(user, module);
  return access?.accessLevel === 'manage' && access.capabilities?.includes('switch_portal');
};

const createPolicyDraft = (policy = DEFAULT_VOLUNTEER_PERFORMANCE_POLICY) => ({
  title: policy.title || DEFAULT_VOLUNTEER_PERFORMANCE_POLICY.title,
  description: policy.description || DEFAULT_VOLUNTEER_PERFORMANCE_POLICY.description,
  dimensions: (policy.dimensions?.length ? policy.dimensions : DEFAULT_VOLUNTEER_PERFORMANCE_POLICY.dimensions).map(item => ({
    key: item.key,
    label: item.label,
    maxScore: item.maxScore,
    capLabel: item.capLabel || (item.maxScore ? `${item.maxScore}分` : '附加'),
    color: item.color || item.tone || 'slate',
    rule: item.rule
  })),
  notes: policy.notes?.length ? [...policy.notes] : [...DEFAULT_VOLUNTEER_PERFORMANCE_POLICY.notes]
});

const DepartmentPerformancePolicyCard = ({ module, policy, canEdit, loading, saving, message, onSave, onReset }) => {
  const activePolicy = policy || DEFAULT_VOLUNTEER_PERFORMANCE_POLICY;
  const dimensions = activePolicy.dimensions?.length ? activePolicy.dimensions : DEFAULT_VOLUNTEER_PERFORMANCE_POLICY.dimensions;
  const notes = activePolicy.notes?.length ? activePolicy.notes : DEFAULT_VOLUNTEER_PERFORMANCE_POLICY.notes;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => createPolicyDraft(activePolicy));

  useEffect(() => {
    if (!editing) setDraft(createPolicyDraft(activePolicy));
  }, [activePolicy.id, activePolicy.version, activePolicy.updatedAt, editing]);

  const updateDraftDimension = (key, field, value) => {
    setDraft(current => ({
      ...current,
      dimensions: current.dimensions.map(item => {
        if (item.key !== key) return item;
        if (field === 'maxScore') {
          const score = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
          return { ...item, maxScore: score, capLabel: item.key === 'bonus' ? '附加' : `${score || 0}分` };
        }
        return { ...item, [field]: value };
      })
    }));
  };

  const submitDraft = async () => {
    if (!onSave) return;
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // 保持编辑态，避免保存失败时丢失用户正在调整的规则。
    }
  };

  return (
  <section className={cls('siehub-policy-card', editing && 'is-editing')}>
    <div className="siehub-policy-head">
      <div>
        <p>{module?.title || '部门工作台'} / VOLUNTEER PERFORMANCE</p>
        <h3>志愿者绩效制度</h3>
        <span>{activePolicy.description || '当前先完整复刻 SIEVOX 的六维考核体系，后续再按部门单独微调。'}</span>
      </div>
      <div className="siehub-policy-actions">
        <b>{loading ? '同步中' : activePolicy.isCustomized ? `定制版 v${activePolicy.version || 1}` : canEdit ? '可编辑' : '只读'}</b>
        {canEdit && (
          <>
            {!editing ? (
              <button type="button" onClick={() => setEditing(true)} disabled={loading || saving}>编辑制度</button>
            ) : (
              <>
                <button type="button" className="ghost" onClick={() => { setDraft(createPolicyDraft(activePolicy)); setEditing(false); }} disabled={saving}>取消</button>
                <button type="button" onClick={submitDraft} disabled={saving}>{saving ? '保存中' : '保存制度'}</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
    <div className="siehub-policy-note">
      <ShieldCheck />
      <div>
        <strong>{activePolicy.sourceProduct || 'SIEVOX'} 同款模板</strong>
        <span>{module?.title || '该部门'}当前采用「{activePolicy.title || 'SIEVOX 志愿者绩效考核制度'}」{activePolicy.updatedBy?.name ? `，最近由 ${activePolicy.updatedBy.name} 更新` : ''}。</span>
      </div>
      {canEdit && <button type="button" onClick={onReset} disabled={saving || loading}>恢复 SIEVOX 默认</button>}
    </div>
    {message && <div className="siehub-policy-message">{message}</div>}
    {editing && (
      <div className="siehub-policy-editor">
        <label>
          <span>制度标题</span>
          <input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} />
        </label>
        <label>
          <span>制度说明</span>
          <textarea value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} rows={3} />
        </label>
      </div>
    )}
    <div className="siehub-policy-grid">
      {dimensions.map(item => (
        <article key={item.key} className={`siehub-policy-item tone-${item.tone || item.color || 'slate'}`}>
          {editing ? (
            <>
              <div className="siehub-policy-item-editor">
                <label>
                  <span>维度名称</span>
                  <input value={draft.dimensions.find(d => d.key === item.key)?.label || item.label} onChange={event => updateDraftDimension(item.key, 'label', event.target.value)} />
                </label>
                <label>
                  <span>{item.key === 'bonus' ? '计分方式' : '封顶分'}</span>
                  <input
                    type={item.key === 'bonus' ? 'text' : 'number'}
                    value={item.key === 'bonus' ? '附加' : (draft.dimensions.find(d => d.key === item.key)?.maxScore ?? '')}
                    disabled={item.key === 'bonus'}
                    onChange={event => updateDraftDimension(item.key, 'maxScore', event.target.value)}
                  />
                </label>
              </div>
              <textarea value={draft.dimensions.find(d => d.key === item.key)?.rule || item.rule} onChange={event => updateDraftDimension(item.key, 'rule', event.target.value)} rows={4} />
            </>
          ) : (
            <>
              <span>{item.capLabel || (item.maxScore ? `${item.maxScore}分` : '附加')}</span>
              <strong>{item.label}</strong>
              <em>{item.rule}</em>
            </>
          )}
        </article>
      ))}
    </div>
    <div className="siehub-policy-footer">
      <span>{notes[0]}</span>
      <i></i>
      <span>{notes[1]}</span>
    </div>
  </section>
  );
};

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const calculateDepartmentScoreRows = (records = [], roster = [], policy = DEFAULT_VOLUNTEER_PERFORMANCE_POLICY) => {
  const dimensions = policy?.dimensions?.length ? policy.dimensions : DEFAULT_VOLUNTEER_PERFORMANCE_POLICY.dimensions;
  const caps = Object.fromEntries(dimensions.map(item => [item.key, item.maxScore]));
  const rows = new Map(roster.map(user => [user.id || user._id, { user, byDimension: {}, total: 0 }]));
  records.forEach(record => {
    const userId = record.volunteer?.id || record.volunteer?._id;
    if (!rows.has(userId)) return;
    const row = rows.get(userId);
    row.byDimension[record.dimension] = (row.byDimension[record.dimension] || 0) + Number(record.score || 0);
  });
  rows.forEach(row => {
    row.total = dimensions.reduce((sum, item) => {
      const raw = Math.max(0, row.byDimension[item.key] || 0);
      return sum + (item.key === 'bonus' || item.scoringMode === 'bonus' ? raw : Math.min(Number(caps[item.key] || 0), raw));
    }, 0);
  });
  return Array.from(rows.values()).sort((a, b) => b.total - a.total);
};

const DepartmentPerformanceWorkbench = ({ module, token, canManage }) => {
  const [workbench, setWorkbench] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [rosterSelection, setRosterSelection] = useState([]);
  const [recordSelection, setRecordSelection] = useState([]);
  const [form, setForm] = useState({
    dimension: 'attendance',
    score: '',
    reason: '',
    activityName: '',
    occurrenceDate: getTodayInputValue(),
    targetSemester: ''
  });

  const refreshWorkbench = useCallback(async () => {
    if (!module?.organization || !module?.key || !token || !canManage) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/performance-workbench`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '获取部门绩效工作台失败');
      setWorkbench(data);
      const rosterIds = (data.roster || []).map(user => user.id || user._id);
      setRosterSelection(rosterIds);
      setRecordSelection(current => current.filter(id => rosterIds.includes(id)));
      setForm(current => ({
        ...current,
        targetSemester: data.semester || current.targetSemester,
        dimension: data.policy?.dimensions?.[0]?.key || current.dimension
      }));
    } catch (error) {
      setMessage(error.message || '获取部门绩效工作台失败');
    } finally {
      setLoading(false);
    }
  }, [module?.organization, module?.key, token, canManage]);

  useEffect(() => {
    refreshWorkbench();
  }, [refreshWorkbench]);

  if (!canManage) return null;

  const volunteers = workbench?.volunteers || [];
  const roster = workbench?.roster || [];
  const records = workbench?.records || [];
  const policy = workbench?.policy || DEFAULT_VOLUNTEER_PERFORMANCE_POLICY;
  const dimensions = policy.dimensions?.length ? policy.dimensions : DEFAULT_VOLUNTEER_PERFORMANCE_POLICY.dimensions;
  const scoreRows = calculateDepartmentScoreRows(records, roster, policy);

  const toggleRoster = (id) => {
    setRosterSelection(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const toggleRecordMember = (id) => {
    setRecordSelection(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const saveRoster = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/performance-roster`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ semester: workbench?.semester || form.targetSemester, volunteerIds: rosterSelection })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '保存成员名单失败');
      setMessage('本学期绩效成员名单已保存。');
      await refreshWorkbench();
    } catch (error) {
      setMessage(error.message || '保存成员名单失败');
    } finally {
      setSaving(false);
    }
  };

  const submitPerformance = async (event) => {
    event.preventDefault();
    if (recordSelection.length === 0) return setMessage('请先选择要录入绩效的成员。');
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/performance-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, volunteerIds: recordSelection, targetSemester: workbench?.semester || form.targetSemester })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '绩效录入失败');
      setMessage('绩效录入成功。');
      setRecordSelection([]);
      setForm(current => ({ ...current, score: '', reason: '', activityName: '', occurrenceDate: getTodayInputValue() }));
      await refreshWorkbench();
    } catch (error) {
      setMessage(error.message || '绩效录入失败');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (recordId) => {
    if (!window.confirm('确认撤回这条绩效记录吗？')) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/performance-records/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '撤回失败');
      setMessage('绩效记录已撤回。');
      await refreshWorkbench();
    } catch (error) {
      setMessage(error.message || '撤回失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="siehub-performance-card">
      <div className="siehub-performance-head">
        <div>
          <p>DEPARTMENT PERFORMANCE</p>
          <h3>部门绩效工作台</h3>
          <span>{workbench?.semester || '当前学期'} · 添加成员、批量录入、查看流水与排行。</span>
        </div>
        <button type="button" onClick={refreshWorkbench} disabled={loading || saving}>{loading ? '同步中' : '刷新'}</button>
      </div>
      {message && <div className="siehub-policy-message">{message}</div>}
      <div className="siehub-performance-stats">
        <span><strong>{volunteers.length}</strong><em>部门志愿者账号</em></span>
        <span><strong>{roster.length}</strong><em>本学期成员</em></span>
        <span><strong>{records.length}</strong><em>绩效流水</em></span>
      </div>
      <div className="siehub-performance-grid">
        <section className="siehub-performance-panel">
          <div className="siehub-performance-panel-head"><span>01</span><div><h4>添加本学期成员</h4><p>从该部门志愿者账号中选择参与绩效核算的成员。</p></div></div>
          <div className="siehub-member-checks">
            {volunteers.length === 0 ? <p className="siehub-empty-text">该部门还没有志愿者账号。</p> : volunteers.map(user => {
              const id = user.id || user._id;
              return (
                <label key={id} className="siehub-member-check">
                  <input type="checkbox" checked={rosterSelection.includes(id)} onChange={() => toggleRoster(id)} />
                  <span><strong>{user.name}</strong><small>{user.studentId}</small></span>
                </label>
              );
            })}
          </div>
          <button className="siehub-wide-action" type="button" onClick={saveRoster} disabled={saving || loading}>保存成员名单</button>
        </section>

        <form className="siehub-performance-panel" onSubmit={submitPerformance}>
          <div className="siehub-performance-panel-head"><span>02</span><div><h4>批量录入绩效</h4><p>成员必须先加入本学期名单，才能录入绩效。</p></div></div>
          <div className="siehub-record-targets">
            {roster.length === 0 ? <p className="siehub-empty-text">请先添加本学期成员。</p> : roster.map(user => {
              const id = user.id || user._id;
              return (
                <label key={id}>
                  <input type="checkbox" checked={recordSelection.includes(id)} onChange={() => toggleRecordMember(id)} />
                  <span>{user.name}</span>
                </label>
              );
            })}
          </div>
          <div className="siehub-performance-form-grid">
            <label><span>维度</span><select value={form.dimension} onChange={event => setForm({ ...form, dimension: event.target.value })}>{dimensions.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
            <label><span>加分</span><input type="number" step="0.5" min="0" value={form.score} onChange={event => setForm({ ...form, score: event.target.value })} required /></label>
            <label><span>日期</span><input type="date" value={form.occurrenceDate} onChange={event => setForm({ ...form, occurrenceDate: event.target.value })} required /></label>
            <label><span>事项名称</span><input value={form.activityName} onChange={event => setForm({ ...form, activityName: event.target.value })} placeholder="例：迎新活动统筹" /></label>
          </div>
          <label className="siehub-performance-reason"><span>加分事由</span><textarea value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} rows={3} required /></label>
          <button className="siehub-wide-action" type="submit" disabled={saving || loading}>{saving ? '处理中' : '录入绩效'}</button>
        </form>
      </div>

      <div className="siehub-performance-grid lower">
        <section className="siehub-performance-panel">
          <div className="siehub-performance-panel-head"><span>03</span><div><h4>部门排行</h4><p>按当前学期已录入流水实时计算。</p></div></div>
          <div className="siehub-score-list">
            {scoreRows.length === 0 ? <p className="siehub-empty-text">暂无排行数据。</p> : scoreRows.map((row, index) => (
              <div key={row.user.id || row.user._id} className="siehub-score-row">
                <b>{index + 1}</b>
                <span><strong>{row.user.name}</strong><small>{row.user.studentId}</small></span>
                <em>{row.total.toFixed(1)}</em>
              </div>
            ))}
          </div>
        </section>
        <section className="siehub-performance-panel">
          <div className="siehub-performance-panel-head"><span>04</span><div><h4>绩效流水</h4><p>最近录入的部门绩效记录。</p></div></div>
          <div className="siehub-record-list">
            {records.length === 0 ? <p className="siehub-empty-text">暂无绩效流水。</p> : records.slice(0, 10).map(record => {
              const dim = dimensions.find(item => item.key === record.dimension);
              return (
                <article key={record.id || record._id}>
                  <div><strong>{record.volunteer?.name || '成员'}</strong><small>{dim?.label || record.dimension} · {record.activityName || '常规记录'}</small><p>{record.reason}</p></div>
                  <span>+{record.score}</span>
                  <button type="button" onClick={() => deleteRecord(record.id || record._id)}>撤回</button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
};

const getAccessibleModules = (user) => {
  if (user?.isUltimateAdmin) return SIEHUB_MODULES;

  const rawCapabilities = Array.isArray(user?.moduleCapabilities) ? user.moduleCapabilities : [];
  const capabilities = rawCapabilities.map(item => typeof item === 'string' ? item : item?.department || item?.key).filter(Boolean);
  const managed = Array.isArray(user?.managedDepartments) ? user.managedDepartments.map(item => item?.department || item).filter(Boolean) : [];
  const departments = [...new Set([...capabilities, ...managed, user?.department].filter(Boolean))];

  if (departments.length) return SIEHUB_MODULES.filter(module => !module.ultimateOnly && departments.includes(module.key));
  if (user?.role === 'student' || user?.memberRole === 'student') {
    return SIEHUB_MODULES.filter(module => !module.ultimateOnly);
  }
  return [];
};

const HubUserChip = ({ user }) => (
  <div className="siehub-user-chip" aria-label="当前登录身份">
    <span className="siehub-avatar">{firstChar(user?.name)}</span>
    <span><strong>{user?.name}</strong><small>{user?.studentId}</small></span>
    <RoleTag user={user} />
  </div>
);

const SIEHUBHome = ({ user, theme, onOpenModule, onLogout }) => {
  const modules = getAccessibleModules(user);
  const governanceModules = modules.filter(module => module.organization === 'hub');
  const departmentModuleCount = modules.filter(module => module.organization !== 'hub').length;
  const youthLeague = modules.filter(module => module.organization === 'youth_league');
  const studentUnion = modules.filter(module => module.organization === 'student_union');
  const roleScope = user?.isUltimateAdmin ? '全平台治理范围' : `${user?.organizationLabel || '学生服务'} / ${user?.departmentLabel || '可访问模块'}`;

  const renderGroup = (title, marker, items) => (
    <section className="siehub-module-group">
      <div className="siehub-group-heading"><span>{marker}</span><div><p>MODULE GROUP</p><h2>{title}</h2></div><b>{items.length}</b></div>
      <div className="siehub-module-grid">
        {items.map(module => {
          const Icon = module.icon;
          const isSIEVOX = module.key === 'student_rights';
          return <button key={module.key} className={`siehub-module-card tone-${module.tone} ${isSIEVOX ? 'is-product' : ''}`} type="button" onClick={() => onOpenModule(module)}>
            <span className="siehub-module-icon"><Icon /></span>
            <span className="siehub-module-copy"><small>{module.product || 'SIEHUB MODULE'}</small><strong>{module.title}</strong><em>{module.summary}</em></span>
            <span className="siehub-module-action">{isSIEVOX ? <ExternalLink /> : <ChevronRight />}</span>
          </button>;
        })}
      </div>
    </section>
  );

  return <main className="siehub-shell">
    <header className="siehub-topbar">
      <div className="siehub-brand"><span className="siehub-brand-mark"><Radio /><i></i></span><div><strong>SIEHUB</strong><small>SIE LIFE PLATFORM</small></div></div>
      <div className="siehub-topbar-actions"><ThemeModeButtons theme={theme} compact /><button className="icon-button theme-trigger" type="button" onClick={() => theme.setOpen(true)} title="外观设置"><Palette /></button><HubUserChip user={user} /><button className="icon-button" type="button" onClick={onLogout} title="退出登录"><LogOut /></button></div>
    </header>
    <div className="siehub-content">
      <section className="siehub-hero">
        <div className="siehub-hero-meta"><span>SIE / PLATFORM 01</span><b>{roleScope}</b></div>
        <div><p>北京化工大学国际教育学院</p><h1>一处入口，连接每一份学生工作。</h1><div className="siehub-hero-note"><span>已接入 {departmentModuleCount} 个部门模块</span><i></i><span>学生权益部已启用 SIEVOX</span></div></div>
        <div className="siehub-hero-orbit" aria-hidden="true"><span>HUB</span><i></i><i></i><i></i></div>
      </section>
      {user?.isUltimateAdmin && governanceModules.length > 0 && renderGroup('平台治理', '00', governanceModules)}
      {renderGroup('团委', '01', youthLeague)}
      {renderGroup('学生会', '02', studentUnion)}
      <section className="siehub-governance-note"><UsersRound /><div><strong>{user?.isUltimateAdmin ? '终极管理员已获得全部模块访问权限' : '部门工作台会按照当前身份与分管范围开放'}</strong><span>部门负责人及以上成员可在所属模块中维护志愿者绩效考核制度；具体业务能力将随模块逐步上线。</span></div></section>
    </div>
    <ThemePanel theme={theme} />
  </main>;
};

const DepartmentStudentPortal = ({ module, onOpenSIEVOX }) => {
  const isSIEVOX = module?.key === 'student_rights';
  return (
    <>
      <section className="siehub-student-portal-card">
        <div className="siehub-student-portal-head">
          <p>STUDENT PORTAL</p>
          <h2>{module?.title}学生端</h2>
          <span>这里面向所有学生开放，用于查看部门服务说明、活动入口和后续上线的学生侧功能。</span>
        </div>
        <div className="siehub-student-service-grid">
          <article><span>01</span><strong>部门介绍</strong><p>{module?.summary || '部门服务信息将在此持续补充。'}</p></article>
          <article><span>02</span><strong>学生服务入口</strong><p>{isSIEVOX ? '学生权益反馈继续由 SIEVOX 承载。' : '该部门学生侧服务后续将在 SIEHUB 内逐步上线。'}</p></article>
          <article><span>03</span><strong>通知与活动</strong><p>面向学生的通知、报名、活动材料与服务进度将集中展示。</p></article>
        </div>
      </section>
      {isSIEVOX && (
        <section className="siehub-bridge-card"><Scale /><div><strong>SIEVOX 是学生权益部学生端</strong><span>普通学生和非分管成员进入学生权益部学生端时，会进入成熟的权益反馈系统。</span></div><button className="primary-button" type="button" onClick={onOpenSIEVOX}>进入 SIEVOX <ArrowUpRight /></button></section>
      )}
    </>
  );
};

const DepartmentPlaceholder = ({ module, user, token, theme, onBack, onOpenSIEVOX, onLogout }) => {
  const Icon = module?.icon || Building2;
  const [performancePolicy, setPerformancePolicy] = useState(null);
  const [policyAccess, setPolicyAccess] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');
  const canSwitchPortal = canSwitchDepartmentPortal(user, module);
  const [departmentPortal, setDepartmentPortal] = useState(canSwitchPortal ? 'manage' : 'student');
  const fallbackCanManagePerformance = canManageVolunteerPolicy(user, module);
  const canManagePerformance = policyAccess?.canEdit ?? fallbackCanManagePerformance;
  const canEnterSIEVOX = module?.key === 'student_rights' || user?.isUltimateAdmin;
  const showManagePortal = canSwitchPortal && departmentPortal === 'manage';

  useEffect(() => {
    setDepartmentPortal(canSwitchPortal ? 'manage' : 'student');
  }, [canSwitchPortal, module?.key]);

  useEffect(() => {
    if (!module?.organization || !module?.key || !token) {
      setPerformancePolicy(null);
      setPolicyAccess(null);
      return undefined;
    }

    let cancelled = false;
    setPolicyLoading(true);
    fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/performance-policy`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.success) {
          setPerformancePolicy(data.policy || null);
          setPolicyAccess(data.access || null);
        } else {
          setPerformancePolicy(null);
          setPolicyAccess(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPerformancePolicy(null);
          setPolicyAccess(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPolicyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [module?.organization, module?.key, token]);

  const savePerformancePolicy = async (draft) => {
    setPolicySaving(true);
    setPolicyMessage('');
    try {
      const res = await fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/performance-policy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(draft)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '保存绩效制度失败');
      setPerformancePolicy(data.policy || null);
      setPolicyAccess(data.access || null);
      setPolicyMessage('已保存为该部门的定制绩效制度。');
      return data;
    } catch (error) {
      setPolicyMessage(error.message || '保存绩效制度失败，请稍后重试。');
      throw error;
    } finally {
      setPolicySaving(false);
    }
  };

  const resetPerformancePolicy = async () => {
    if (!window.confirm(`确认将【${module?.title || '该部门'}】的志愿者绩效制度恢复为 SIEVOX 默认模板吗？`)) return;
    setPolicySaving(true);
    setPolicyMessage('');
    try {
      const res = await fetch(`${API_BASE}/hub/departments/${module.organization}/${module.key}/performance-policy/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '恢复默认失败');
      setPerformancePolicy(data.policy || null);
      setPolicyAccess(data.access || null);
      setPolicyMessage('已恢复为 SIEVOX 默认绩效制度。');
    } catch (error) {
      setPolicyMessage(error.message || '恢复默认失败，请稍后重试。');
    } finally {
      setPolicySaving(false);
    }
  };

  return <main className="siehub-shell siehub-department-shell">
    <header className="siehub-topbar"><div className="siehub-brand"><span className="siehub-brand-mark"><Radio /><i></i></span><div><strong>SIEHUB</strong><small>{module?.title || '部门工作台'} / FRAMEWORK</small></div></div><div className="siehub-topbar-actions"><ThemeModeButtons theme={theme} compact /><button className="icon-button theme-trigger" type="button" onClick={() => theme.setOpen(true)}><Palette /></button><HubUserChip user={user} /><button className="icon-button" type="button" onClick={onLogout} title="退出登录"><LogOut /></button></div></header>
    <div className="siehub-content">
      <button className="siehub-back" type="button" onClick={onBack}><ChevronLeft />返回模块总览</button>
      <section className="siehub-department-hero"><span className={`siehub-module-icon tone-${module?.tone || 'slate'}`}><Icon /></span><div><p>SIEHUB / DEPARTMENT PLATFORM</p><h1>{module?.title}</h1><span>{module?.summary}</span></div></section>
      {canSwitchPortal && (
        <div className="siehub-portal-switch" aria-label="部门端口切换">
          <button type="button" className={departmentPortal === 'student' ? 'is-active' : ''} onClick={() => setDepartmentPortal('student')}>学生端</button>
          <button type="button" className={departmentPortal === 'manage' ? 'is-active' : ''} onClick={() => setDepartmentPortal('manage')}>管理端</button>
        </div>
      )}
      {showManagePortal ? (
        <>
          <div className="siehub-framework-grid">
            <section><span>01</span><h2>部门工作台</h2><p>项目、通知、成员协作和日常事项将在该入口逐步接入。</p><button type="button" disabled>规划中</button></section>
            <section><span>02</span><h2>志愿者绩效制度</h2><p>{canManagePerformance ? '部门负责人及以上成员后续可在此调整规则细项；当前先沿用 SIEVOX 同款六维模板。' : '当前先统一沿用 SIEVOX 同款六维模板。'}</p><button type="button" disabled>{canManagePerformance ? '模板已同步' : '只读模板'}</button></section>
            <section><span>03</span><h2>成员与归档</h2><p>届次成员、身份标签、分管关系与绩效档案将归入统一组织框架。</p><button type="button" disabled>规划中</button></section>
          </div>
          <DepartmentPerformancePolicyCard
            module={module}
            policy={performancePolicy}
            canEdit={canManagePerformance}
            loading={policyLoading}
            saving={policySaving}
            message={policyMessage}
            onSave={savePerformancePolicy}
            onReset={resetPerformancePolicy}
          />
          <DepartmentPerformanceWorkbench module={module} token={token} canManage={canManagePerformance} />
          {canEnterSIEVOX ? (
            <section className="siehub-bridge-card"><Scale /><div><strong>学生权益部已具备独立业务平台</strong><span>SIEVOX 保持现有反馈、账号、绩效与组织管理功能，继续作为学生权益部的成熟子模块运行。</span></div><button className="primary-button" type="button" onClick={onOpenSIEVOX}>进入 SIEVOX <ArrowUpRight /></button></section>
          ) : (
            <section className="siehub-bridge-card"><Scale /><div><strong>该部门暂不接入 SIEVOX</strong><span>当前仅学生权益部保留成熟的 SIEVOX 业务模块，其他部门将以框架工作台和后续专属平台的形式逐步展开。</span></div></section>
          )}
        </>
      ) : (
        <DepartmentStudentPortal module={module} onOpenSIEVOX={onOpenSIEVOX} />
      )}
    </div>
    <ThemePanel theme={theme} />
  </main>;
};

const UltimateOrganizationWindow = ({ user, token, theme, onBack, onLogout }) => {
  const allowed = Boolean(user?.isUltimateAdmin);

  return <main className="siehub-shell siehub-ultimate-window admin-demo-shell">
    <header className="siehub-topbar">
      <div className="siehub-brand"><span className="siehub-brand-mark"><ShieldCheck /><i></i></span><div><strong>SIEHUB</strong><small>ORGANIZATION GOVERNANCE</small></div></div>
      <div className="siehub-topbar-actions"><ThemeModeButtons theme={theme} compact /><button className="icon-button theme-trigger" type="button" onClick={() => theme.setOpen(true)} title="外观设置"><Palette /></button><HubUserChip user={user} /><button className="icon-button" type="button" onClick={onLogout} title="退出登录"><LogOut /></button></div>
    </header>
    <div className="siehub-content">
      <button className="siehub-back" type="button" onClick={onBack}><ChevronLeft />返回模块总览</button>
      <section className="siehub-ultimate-hero">
        <span className="siehub-module-icon tone-gold"><ShieldCheck /></span>
        <div>
          <p>SIEHUB / ULTIMATE WINDOW</p>
          <h1>团委学生会组织治理中枢</h1>
          <span>届次成员、身份角色、分管部门与归档快照从 SIEVOX 中移出，由终极管理员在 SIEHUB 统一维护。</span>
        </div>
      </section>
      {allowed ? (
        <section className="siehub-organization-host">
          <OrganizationFrameworkPanel token={token} />
        </section>
      ) : (
        <section className="siehub-access-denied">
          <LockKeyhole />
          <div><strong>仅终极管理员可访问</strong><span>该窗口包含团委学生会组织架构、成员身份、分管关系与届次归档能力。</span></div>
        </section>
      )}
    </div>
    <ThemePanel theme={theme} />
  </main>;
};

const HubReturnButton = ({ onClick }) => <button className="siehub-return" type="button" onClick={onClick} title="返回 SIEHUB 模块总览"><Radio /><span>SIEHUB</span></button>;

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

const Topbar = ({ pageTitle, theme, openPreview, notifications, openSettings, user, portalView, onPortalChange }) => (
  <header className="topbar">
    <div className="breadcrumb"><span>国际教育学院</span><ChevronRight /><strong id="page-title">{pageTitle}</strong></div>
    <div className="topbar-actions">
      {user?.isUltimateAdmin && (
        <div className="role-switch" aria-label="当前身份">
          <button className={portalView === 'student' ? 'is-active' : ''} type="button" onClick={() => onPortalChange?.('student')}>学生端</button>
          <button className={portalView === 'admin' ? 'is-active' : ''} type="button" onClick={() => onPortalChange?.('admin')}>管理端</button>
          <button className={portalView === 'superadmin' ? 'is-active' : ''} type="button" onClick={() => onPortalChange?.('superadmin')}>超级管理员</button>
        </div>
      )}
      <div className="topbar-user-chip" aria-label="当前登录身份">
        <span>{user?.name}</span>
        <RoleTag user={user} />
      </div>
      <ThemeModeButtons theme={theme} compact />
      <button className="icon-button theme-trigger" type="button" onClick={() => theme.setOpen(true)}><Palette /></button>
      {user?.isUltimateAdmin && <button className="outline-button" type="button" onClick={openPreview}><Smartphone />手机端预览</button>}
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
          <div className="mobile-header-actions"><span className="mobile-role-chip"><span>{user?.name}</span><RoleTag user={user} /></span><button className="icon-button theme-trigger" type="button" onClick={() => theme.setOpen(true)}><Palette /></button><button className="icon-button"><Bell /><span className="notification-dot"></span></button></div>
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

const DashboardPage = ({ user, token, onLogout, onRefreshUser, theme, portalView = 'student', onPortalChange }) => {
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
          <Topbar pageTitle={pageTitle} theme={theme} openPreview={() => setPreviewMobile(true)} notifications={notifications} openSettings={() => setSettingsOpen(true)} user={user} portalView={portalView} onPortalChange={onPortalChange} />
          <StudentDesktop user={user} stats={stats} feedbacks={feedbacks} activePage={activePage} setActivePage={setActivePage} openCompose={openCompose} onOpenFeedback={setSelectedFeedback} />
        </main>
      </div>
      {user?.isUltimateAdmin && <button className="preview-exit icon-button" type="button" onClick={() => setPreviewMobile(false)}><X /></button>}
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
  const [portalView, setPortalView] = useState('superadmin');
  const [appSurface, setAppSurface] = useState('hub');
  const [activeModule, setActiveModule] = useState(null);

  useEffect(() => {
    document.body.classList.toggle('auth-active', !user);
    return () => document.body.classList.remove('auth-active');
  }, [user]);

  useEffect(() => {
    if (!user?.isUltimateAdmin) setPortalView('superadmin');
    else setPortalView(current => ['student', 'admin', 'superadmin'].includes(current) ? current : 'superadmin');
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAppSurface('hub');
      setActiveModule(null);
    }
  }, [user]);

  const openModule = (module) => {
    setActiveModule(module);
    if (module.key === 'hub_governance') {
      setAppSurface(user?.isUltimateAdmin ? 'ultimateOrganization' : 'hub');
      return;
    }
    const shouldOpenSIEVOXStudentPortal = module.key === 'student_rights' && !canSwitchDepartmentPortal(user, module);
    setAppSurface(shouldOpenSIEVOXStudentPortal ? 'sievox' : 'department');
  };

  if (!user) return <LoginPage onLogin={login} onRegister={register} theme={theme} />;
  if (appSurface === 'hub') return <SIEHUBHome user={user} theme={theme} onOpenModule={openModule} onLogout={logout} />;
  if (appSurface === 'ultimateOrganization') return <UltimateOrganizationWindow user={user} token={token} theme={theme} onBack={() => setAppSurface('hub')} onLogout={logout} />;
  if (appSurface === 'department') return <DepartmentPlaceholder module={activeModule} user={user} token={token} theme={theme} onBack={() => setAppSurface('hub')} onOpenSIEVOX={() => { setActiveModule(SIEHUB_MODULES.find(module => module.key === 'student_rights')); setAppSurface('sievox'); }} onLogout={logout} />;
  if (user.isUltimateAdmin && portalView === 'student') {
    return <><HubReturnButton onClick={() => setAppSurface('hub')} /><DashboardPage user={user} token={token} onLogout={logout} onRefreshUser={refreshUser} theme={theme} portalView={portalView} onPortalChange={setPortalView} /></>;
  }
  if (user.role === 'admin' || user.role === 'superadmin') {
    return (
      <>
        <HubReturnButton onClick={() => setAppSurface('hub')} />
        <AdminDashboard user={user} token={token} onLogout={logout} onRefreshUser={refreshUser} themeTools={theme} portalView={user.isUltimateAdmin ? portalView : undefined} onPortalChange={setPortalView} />
        <ThemePanel theme={theme} />
      </>
    );
  }
  return <><HubReturnButton onClick={() => setAppSurface('hub')} /><DashboardPage user={user} token={token} onLogout={logout} onRefreshUser={refreshUser} theme={theme} /></>;
}
