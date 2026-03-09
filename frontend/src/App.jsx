import AdminDashboard from './AdminDashboard'; // [!code ++]
import React, { useState, useEffect, useCallback } from 'react';
import sieLogo from './assets/SIE_LOGO.png';
import sievox from './assets/SIEVOX_LOGO.png';
// API Configuration
// 开发环境使用完整地址，生产环境使用相对路径（通过 Nginx 代理）
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// [新增] 全局分类字典配置 (含一二级联动)
export const CATEGORIES_CONFIG = {
  academic: {
    label: '教学教务', icon: '📚', desc: '课程、考试与规划',
    sub: ['课程与教学管理', '学辅答疑与讲座安排', '考试与成绩管理', '发展与规划指导', '学籍与培养方案', '设施维修与维护','其他教学相关']
  },
  accommodation: {
    label: '宿舍住宿', icon: '🏠', desc: '环境与配套服务',
    sub: ['住宿环境与管理', '生活配套服务','其他宿舍相关']
  },
  catering: {
    label: '餐饮服务', icon: '🍽️', desc: '食品、运营与价格',
    sub: ['食品安全与卫生', '菜品与价格管理', '食堂运营与服务', '其他餐饮相关']
  },
  safety: {
    label: '安全保卫', icon: '🛡️', desc: '人身、消防与网络',
    sub: ['人身与财产安全', '消防安全与隐患', '交通与出行安全', '网络与信息安全','其他安全相关']
  },
  comprehensive: {
    label: '综合服务与其他', icon: '📋', desc: '活动、心理与行政',
    sub: ['学院活动与文化建设', '心理健康与成长支持', '行政服务与流程优化', '校园公共设施与环境', '其他未分类诉求']
  }
};
// Custom Hooks
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

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

  const register = async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) setUser(data.user);
          else logout();
        })
        .catch(() => logout());
    }
  }, [token]);

  return { user, token, login, register, logout };
};

// Components
const GlowOrb = ({ className }) => (
  <div className={`absolute rounded-full blur-3xl opacity-30 animate-pulse ${className}`} />
);

const FloatingShape = ({ delay, className }) => (
  <div 
    className={`absolute opacity-10 ${className}`}
    style={{ animationDelay: `${delay}s` }}
  />
);

const Background = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950" />
    <GlowOrb className="w-96 h-96 bg-purple-600 -top-48 -left-48" />
    <GlowOrb className="w-80 h-80 bg-blue-600 top-1/3 -right-40" />
    <GlowOrb className="w-64 h-64 bg-violet-500 bottom-20 left-1/4" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    <div className="absolute inset-0" style={{
      backgroundImage: `radial-gradient(circle at 2px 2px, rgba(139,92,246,0.15) 1px, transparent 0)`,
      backgroundSize: '40px 40px'
    }} />
    {[...Array(6)].map((_, i) => (
      <FloatingShape 
        key={i} 
        delay={i * 0.5}
        className={`w-${20 + i * 10} h-${20 + i * 10} rounded-full border border-purple-500/20`}
        style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          animation: `float ${8 + i * 2}s ease-in-out infinite`
        }}
      />
    ))}
  </div>
);

//  Card 组件
const Card = ({ children, className = '', hover = true, ...props }) => ( // 1. 添加 ...props 接收剩余属性
  <div 
    className={`
      relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl
      ${hover ? 'hover:bg-white/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300' : ''}
      ${className}
    `}
    {...props} // 2. 将 onClick 等其他属性透传给 div
  >
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    ghost: 'bg-transparent hover:bg-white/10 text-purple-300'
  };
  
  return (
    <button
      className={`
        px-6 py-3 rounded-xl font-medium transition-all duration-300
        transform hover:scale-[1.02] active:scale-[0.98]
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, icon, ...props }) => (
  <div className="space-y-2">
    {label && <label className="text-sm text-purple-200/80 font-medium">{label}</label>}
    <div className="relative">
      {icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
          {icon}
        </span>
      )}
      <input
        className={`
          w-full px-4 py-3 ${icon ? 'pl-12' : ''} rounded-xl
          bg-white/5 border border-white/10 text-white placeholder-white/30
          focus:outline-none focus:border-purple-500/50 focus:bg-white/10
          transition-all duration-300
        `}
        {...props}
      />
    </div>
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="space-y-2">
    {label && <label className="text-sm text-purple-200/80 font-medium">{label}</label>}
    <select
      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
        focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300"
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label}</option>
      ))}
    </select>
  </div>
);

const StatusBadge = ({ status }) => {
  const config = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '待处理' },
    processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '处理中' },
    resolved: { bg: 'bg-green-500/20', text: 'text-green-400', label: '已解决' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: '已拒绝' }
  };
  const { bg, text, label } = config[status] || config.pending;
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

const CategoryIcon = ({ category }) => {
  const icons = {
    academic: '📚',
    accommodation: '🏠',
    catering: '🍽️',
    financial: '💰',
    safety: '🛡️',
    other: '📋'
  };
  return <span className="text-2xl">{icons[category] || '📋'}</span>;
};

// Pages
const LoginPage = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    studentId: '',
    password: '',
    name: '',
    email: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const result = await onLogin(formData.studentId, formData.password);
        if (!result.success) setError(result.message || '登录失败');
      } else {
        const result = await onRegister(formData);
        if (result.success) {
          setIsLogin(true);
          setError('');
          alert('注册成功，请登录');
        } else {
          setError(result.message || '注册失败');
        }
      }
    } catch (err) {
      setError('网络错误，请重试');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Background />
      
      <Card className="w-full max-w-md p-8 relative z-10" hover={false}>
       {/* 使用 flex 布局垂直居中，并大幅增加图片尺寸 */}
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          < img 
            src={sieLogo} 
            alt="系统LOGO" 
            className="w-32 h-32 md:w-40 md:h-40 object-contain mb-2 hover:scale-105 transition-transform duration-300" 
          />
           < img 
             src={sievox} 
             alt="名称LOGO" 
             className="w-48 md:w-56 h-auto object-contain mb-6 hover:scale-105 transition-transform duration-300" 
           />
         <h1 className="text-xl font-medium text-purple-200/80 mb-2">
              北京化工大学国际教育学院
         </h1>
         <p className="text-xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 tracking-wider drop-shadow-sm py-2">
           学生权益反馈系统
         </p >
        </div>

        <div className="flex mb-6 p-1 bg-white/5 rounded-xl">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              isLogin ? 'bg-purple-600 text-white' : 'text-purple-200/60 hover:text-white'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              !isLogin ? 'bg-purple-600 text-white' : 'text-purple-200/60 hover:text-white'
            }`}
          >
            注册
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="学号"
            placeholder="请输入学号"
            value={formData.studentId}
            onChange={e => setFormData({...formData, studentId: e.target.value})}
            icon="👤"
            required
          />
          
          {!isLogin && (
            <>
              <Input
                label="姓名"
                placeholder="请输入真实姓名"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
              <Input
                label="邮箱"
                type="email"
                placeholder="请输入邮箱地址"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                required
              />
              <Input
                label="手机号"
                placeholder="请输入手机号码"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </>
          )}
          
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            icon="🔒"
            required
          />
         {/* [新增] 忘记密码提示 */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => alert('请企业微信联系【赵启涵】重置密码\n学号：2024090107\n 默认密码：123456')}
            className="text-xs text-purple-300/60 hover:text-purple-200 transition-colors"
          >
            忘记密码？
          </button>
        </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '处理中...' : (isLogin ? '登录系统' : '注册账户')}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-[10px] md:text-xs text-purple-200/40 px-4 transform scale-90 origin-center">
          ©2026 赵启涵. All Rights Reserved. (Designed for BUCT SIE)
        </p>
      </Card>
    </div>
  );
};

const DashboardPage = ({ user, token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('submit');
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, resolved: 0 });
  const [loading, setLoading] = useState(false);
 // [新增] 修改密码相关状态
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdData, setPwdData] = useState({ current: '', new: '' });

  // [新增] 处理修改密码
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdData.new.length < 6) {
      alert('新密码至少需要6位');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          currentPassword: pwdData.current, 
          newPassword: pwdData.new 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('密码修改成功！请重新登录。');
        setShowPwdModal(false);
        setPwdData({ current: '', new: '' });
        onLogout(); // 强制退出让用户重新登录
      } else {
        alert(data.message || '修改失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  };
  const categories = Object.entries(CATEGORIES_CONFIG).map(([value, info]) => ({
    value,
    ...info
  }));

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/feedback/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.feedbacks);
        const s = { total: data.feedbacks.length, pending: 0, processing: 0, resolved: 0 };
        data.feedbacks.forEach(f => s[f.status]++);
        setStats(s);
      }
    } catch (err) {
      console.error('获取反馈失败:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchFeedbacks();
    const interval = setInterval(fetchFeedbacks, 10000); // 实时更新
    return () => clearInterval(interval);
  }, [fetchFeedbacks]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert('反馈提交成功！');
        fetchFeedbacks();
        setActiveTab('history');
      } else {
        alert(data.message || '提交失败');
      }
    } catch (err) {
      alert('网络错误，请重试');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Background />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
           <img 
             src={sieLogo} 
             alt="系统LOGO" 
             className="w-12 h-12 object-contain" // object-contain 保证图片完整显示不被裁剪
           />
            <div>
              <h1 className="text-base md:text-2xl font-bold text-white whitespace-nowrap">
                  学生权益反馈系统
                </h1>
              <p className="text-xs text-purple-200/60">北京化工大学国际教育学院</p>
            </div>
          </div>
          {/* 右侧用户信息区域 - 修改为三行布局 */}
          <div className="flex flex-col items-end justify-center">
            {/* 第一行：操作按钮 (小尺寸适配手机) */}
            <div className="flex items-center gap-2 mb-1">
              <button 
                onClick={() => setShowPwdModal(true)}
                className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] md:text-xs text-purple-200 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
              >
                修改密码
              </button>
              <button 
                onClick={onLogout}
                className="px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] md:text-xs text-red-400 hover:bg-red-500/20 transition-all whitespace-nowrap"
              >
                退出
              </button>
            </div>
            
            {/* 第二行：姓名 */}
            <p className="text-xs md:text-sm font-bold text-white leading-tight">
              {user?.name || '用户'}
            </p>
            
            {/* 第三行：学号 */}
            <p className="text-[10px] md:text-xs text-purple-200/50 font-mono leading-tight">
              {user?.studentId}
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '总反馈', value: stats.total, color: 'purple', icon: '📊' },
            { label: '待处理', value: stats.pending, color: 'yellow', icon: '⏳' },
            { label: '处理中', value: stats.processing, color: 'blue', icon: '⚙️' },
            { label: '已解决', value: stats.resolved, color: 'green', icon: '✅' }
          ].map((stat, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-200/60">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <span className="text-3xl opacity-50">{stat.icon}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl w-fit">
          {[
            { id: 'submit', label: '提交反馈', icon: '✏️' },
            { id: 'history', label: '我的反馈', icon: '📜' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-purple-600 text-white' 
                  : 'text-purple-200/60 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'submit' ? (
          <SubmitForm categories={categories} onSubmit={handleSubmit} loading={loading} />
        ) : (
          <FeedbackList feedbacks={feedbacks} categories={categories} />
        )}
      </main>
      {/* [新增] 修改密码弹窗 */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6 relative" hover={false}>
            <button 
              onClick={() => setShowPwdModal(false)}
              className="absolute top-4 right-4 text-purple-200/50 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-white mb-6">修改登录密码</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-purple-200/80">当前密码</label>
                <input
                  type="password"
                  required
                  value={pwdData.current}
                  onChange={e => setPwdData({...pwdData, current: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                  placeholder="输入当前使用的密码"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-purple-200/80">新密码</label>
                <input
                  type="password"
                  required
                  value={pwdData.new}
                  onChange={e => setPwdData({...pwdData, new: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                  placeholder="设置新密码（至少6位）"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPwdModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-purple-200 hover:bg-white/10 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all font-medium shadow-lg shadow-purple-500/20"
                >
                  确认修改
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
const SubmitForm = ({ categories, onSubmit, loading }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isAnonymous: false,
    priority: 'normal'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCategory || !selectedSubCategory) {
      alert('请完整选择问题类别（包含一级与二级细分）');
      return;
    }
    onSubmit({ ...formData, category: selectedCategory, subCategory: selectedSubCategory });
    setFormData({ title: '', content: '', isAnonymous: false, priority: 'normal' });
    setSelectedCategory('');
    setSelectedSubCategory('');
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Category Selection */}
      <div className="md:col-span-1">
        <h3 className="text-lg font-medium text-white mb-4">选择问题类别</h3>
        <div className="space-y-3">
          {categories.map(cat => (
            <Card
              key={cat.value}
              className={`p-4 cursor-pointer ${
                selectedCategory === cat.value 
                  ? '!border-purple-500 !bg-purple-500/20' 
                  : ''
              }`}
              onClick={() => {
                setSelectedCategory(cat.value);
                setSelectedSubCategory('');
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="text-white font-medium">{cat.label}</p>
                  <p className="text-xs text-purple-200/60">{cat.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* 二级分类动态展示区 */}
        {selectedCategory && (
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-purple-500/30">
            <h4 className="text-sm font-medium text-purple-200 mb-3">详细诉求分类 (必选)</h4>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES_CONFIG[selectedCategory].sub.map(sub => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubCategory(sub)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    selectedSubCategory === sub 
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
                      : 'border-white/10 text-purple-200/60 hover:bg-white/10'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <Card className="md:col-span-2 p-6" hover={false}>
        <h3 className="text-lg font-medium text-white mb-6">填写反馈内容</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="问题标题"
            placeholder="简要描述您遇到的问题"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            required
          />
          
          <div className="space-y-2">
            <label className="text-sm text-purple-200/80 font-medium">详细描述</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white 
                placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10
                transition-all duration-300 min-h-[150px] resize-none"
              placeholder="请详细描述问题情况，包括时间、地点、涉及人员等信息..."
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Select
              label="优先级"
              value={formData.priority}
              onChange={e => setFormData({...formData, priority: e.target.value})}
              options={[
                { value: 'urgent', label: '紧急' },
                { value: 'high', label: '高' },
                { value: 'normal', label: '普通' },
                { value: 'low', label: '低' }
              ]}
            />
            {/* 场景定义信息框 */}
            <div className="mt-2 p-3 rounded-xl bg-blue-900/20 border border-blue-500/20 text-xs text-blue-200/80 space-y-1.5 leading-relaxed">
              <p><span className="font-bold text-red-400">紧急：</span>涉及人身安全、重大财产损失、严重设施损坏等需立即干预处置的问题。</p>
              <p><span className="font-bold text-orange-400">高：</span>影响正常学习秩序、涉及核心权益受损、需快速响应的问题。</p>
              <p><span className="font-bold text-blue-400">普通：</span>日常权益、校园生活、服务体验等常规问题。</p>
              <p><span className="font-bold text-gray-400">低：</span>长期优化建议、功能改进等建设性意见。</p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isAnonymous}
              onChange={e => setFormData({...formData, isAnonymous: e.target.checked})}
              className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-600 
                focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-purple-200/80">匿名提交（您的个人信息将被保护）</span>
          </label>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '提交中...' : '提交反馈'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
const FeedbackList = ({ feedbacks, categories }) => {
  const [expandedId, setExpandedId] = useState(null);

  const getCategoryInfo = (cat) => categories.find(c => c.value === cat) || { label: cat, icon: '📋' };

  if (feedbacks.length === 0) {
    return (
      <Card className="p-12 text-center" hover={false}>
        <span className="text-6xl mb-4 block">📭</span>
        <p className="text-white text-lg">暂无反馈记录</p>
        <p className="text-purple-200/60 mt-2">提交您的第一条反馈吧！</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {feedbacks.map(feedback => {
        const catInfo = getCategoryInfo(feedback.category);
        const isExpanded = expandedId === feedback._id;

        return (
          <Card
            key={feedback._id}
            className="overflow-hidden"
            onClick={() => setExpandedId(isExpanded ? null : feedback._id)}
          >
            <div className="p-4 cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <span className="text-xl">{catInfo.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{feedback.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      {/* 显示一级分类与二级分类 */}
                      <span className="text-xs text-purple-200/60">
                        {catInfo.label} {feedback.subCategory ? ` > ${feedback.subCategory}` : ''}
                      </span>
                      <span className="text-xs text-purple-200/40">
                        {new Date(feedback.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>
                <StatusBadge status={feedback.status} />
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-purple-200/80 text-sm whitespace-pre-wrap">{feedback.content}</p>

                  {feedback.responses && feedback.responses.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h5 className="text-sm font-medium text-white">处理进度</h5>
                      {feedback.responses.map((resp, i) => (
                        <div key={i} className="pl-4 border-l-2 border-purple-500/50">
                          <p className="text-sm text-purple-200/80">{resp.content}</p>
                          <p className="text-xs text-purple-200/40 mt-1">
                            {resp.adminName} · {new Date(resp.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// Main App
export default function App() {
  const { user, token, login, register, logout } = useAuth();

  if (!user) {
    return <LoginPage onLogin={login} onRegister={register} />;
  }
  if (user.role === 'admin' || user.role === 'superadmin') {
    return <AdminDashboard user={user} token={token} onLogout={logout} />;
  }

  return <DashboardPage user={user} token={token} onLogout={logout} />;
}
