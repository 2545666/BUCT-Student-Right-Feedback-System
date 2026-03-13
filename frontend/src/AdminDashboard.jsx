import React, { useState, useEffect, useCallback } from 'react';
import sieLogo from './assets/LOGO_1.png';
import beian from './assets/beian.png';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
//账号管理组件
const AccountManagement = ({ token, user: currentUser }) => {
  const [users, setUsers] = useState([]);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, type: '', data: [], title: '' });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) {
      alert('获取用户列表失败');
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePromote = async (e) => {
    e.preventDefault();
    if (!targetStudentId) return;
    const targetUser = users.find(u => u.studentId === targetStudentId);
    if (!targetUser) return alert('未找到该学号的用户');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${targetStudentId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: 'admin' })
      });
      if ((await res.json()).success) {
        alert(`${targetUser.name} (${targetStudentId}) 已经是管理员了`);
        setTargetStudentId('');
        fetchUsers();
      }
    } catch (err) { alert('操作失败'); }
  };

  const handleDemote = async (studentId) => {
    if (!window.confirm(`确定要撤销学号 ${studentId} 的管理员权限吗？`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${studentId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: 'student' })
      });
      if ((await res.json()).success) {
        alert('该账号已降级为普通学生');
        fetchUsers();
      }
    } catch (err) { alert('操作失败'); }
  };

  const handleResetPassword = async (studentId) => {
    const newPwd = prompt(`请输入学号 ${studentId} 的新密码(至少6位)：`, '123456');
    if (!newPwd || newPwd.length < 6) return alert('密码无效或取消操作');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${studentId}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newPassword: newPwd })
      });
      if ((await res.json()).success) alert('密码重置成功');
    } catch (err) { alert('重置失败'); }
  };

  const viewStudentFeedbacks = async (userId, userName) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/feedbacks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetailsModal({
          isOpen: true, type: 'feedback', title: `${userName} 提交的问题 (含匿名)`, data: data.feedbacks
        });
      }
    } catch (err) { alert('获取记录失败'); }
  };

  const viewAdminLogs = async (userId, userName) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetailsModal({
          isOpen: true, type: 'log', title: `${userName} 的处理操作日志`, data: data.logs
        });
      }
    } catch (err) { alert('获取日志失败'); }
  };

  const admins = users.filter(u => u.role === 'admin' || u.role === 'superadmin');
  const students = users.filter(u => u.role === 'student');

  if (currentUser?.role !== 'superadmin') return null;

  return (
    <div className="space-y-6 mt-6 animate-fadeIn">
      <div className="p-6 bg-white/5 border border-purple-500/30 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
        <h3 className="text-lg font-bold text-white mb-4">赋予管理员权限</h3>
        <form onSubmit={handlePromote} className="flex gap-4">
          <input
            type="text"
            value={targetStudentId}
            onChange={(e) => setTargetStudentId(e.target.value)}
            placeholder="输入要升级的学生学号"
            className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-purple-500 outline-none"
            required
          />
          <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all">
            确认设为管理员
          </button>
        </form>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl h-96 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 shrink-0">子管理员账号</h3>
          <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
            <table className="w-full text-left text-sm text-purple-200/80">
              <thead className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-white/10 text-white z-10">
                <tr><th className="py-2 pl-2">人员</th><th className="py-2">操作</th></tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin._id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 pl-2">
                      <div className="text-white font-medium">{admin.name} {admin.role === 'superadmin' && <span className="text-[10px] text-yellow-400 border border-yellow-400/50 rounded px-1 ml-1">超管</span>}</div>
                      <div className="text-xs font-mono opacity-60">{admin.studentId}</div>
                    </td>
                    <td className="py-3 space-x-2">
                      <button onClick={() => viewAdminLogs(admin._id, admin.name)} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/40 transition">日志</button>
                      <button onClick={() => handleResetPassword(admin.studentId)} className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded hover:bg-yellow-500/40 transition">重置</button>
                      {admin.role !== 'superadmin' && (
                        <button onClick={() => handleDemote(admin.studentId)} className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/40 transition">降级</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl h-96 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 shrink-0">学生账号</h3>
          <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
            <table className="w-full text-left text-sm text-purple-200/80">
              <thead className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-white/10 text-white z-10">
                <tr><th className="py-2 pl-2">人员</th><th className="py-2">操作</th></tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student._id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 pl-2">
                      <div className="text-white font-medium">{student.name}</div>
                      <div className="text-xs font-mono opacity-60">{student.studentId}</div>
                    </td>
                    <td className="py-3 space-x-2">
                      <button onClick={() => viewStudentFeedbacks(student._id, student.name)} className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/40 transition">查阅</button>
                      <button onClick={() => handleResetPassword(student.studentId)} className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded hover:bg-yellow-500/40 transition">重置</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detailsModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl p-6 max-h-[80vh] flex flex-col relative">
            <button onClick={() => setDetailsModal({ isOpen: false, type: '', data: [], title: '' })} className="absolute top-4 right-4 text-white/50 hover:text-white text-xl z-10">✕</button>
            <h3 className="text-xl font-bold text-white mb-4 shrink-0 pr-8">{detailsModal.title}</h3>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {detailsModal.data.length === 0 ? (
                <p className="text-purple-200/50 py-4 text-center">暂无记录</p>
              ) : (
                detailsModal.data.map((item, index) => (
                  <div key={index} className="p-3 bg-white/5 rounded-lg text-sm text-purple-200/80 border border-white/5">
                    {detailsModal.type === 'feedback' && (
                      <>
                        <div className="flex justify-between items-start text-white font-medium mb-1">
                          <span className="flex-1 pr-2 break-all">{item.title} {item.isAnonymous && <span className="text-xs px-1 py-0.5 ml-1 bg-orange-500/20 text-orange-400 rounded">匿名提交</span>}</span>
                          <span className="text-xs text-purple-200/50 shrink-0 mt-0.5">{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="line-clamp-2 text-xs opacity-80 mt-1">{item.content}</p>
                      </>
                    )}
                    {detailsModal.type === 'log' && (
                      <>
                        <div className="flex justify-between items-center font-medium mb-1">
                          <span className="text-blue-300 px-2 py-0.5 bg-blue-500/10 rounded text-xs">{item.action}</span>
                          <span className="text-xs text-purple-200/50">{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="mt-2 text-xs opacity-70 bg-black/20 p-2 rounded break-all font-mono">
                          {JSON.stringify(item.details)}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// 管理员仪表板组件
export default function AdminDashboard({ user, token, onLogout }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '' });
  // [新增] 高级检索与归档状态
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [semesterName, setSemesterName] = useState(''); // 用于显示学期归档的大标题
  const [loading, setLoading] = useState(false);
  const [resetStudentId, setResetStudentId] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [responseText, setResponseText] = useState('');
  // 找到现有的 useState 区域
  const [activeTab, setActiveTab] = useState('overview'); // 默认显示概览
  const [showAccountManagement, setShowAccountManagement] = useState(false); // [新增] 控制账号管理面板的显示
// [修改] 同步最新的 5 大分类
  const categories = {
    academic: { label: '教学教务', icon: '📚' },
    accommodation: { label: '宿舍住宿', icon: '🏠' },
    catering: { label: '餐饮服务', icon: '🍽️' },
    safety: { label: '安全保卫', icon: '🛡️' },
    comprehensive: { label: '综合服务与其他', icon: '📋' }
  };

  const statusConfig = {
    pending: { label: '待处理', color: 'yellow' },
    processing: { label: '处理中', color: 'blue' },
    resolved: { label: '已解决', color: 'green' },
    rejected: { label: '已拒绝', color: 'red' }
  };

  const priorityConfig = {
    low: { label: '低', color: 'gray' },
    normal: { label: '普通', color: 'blue' },
    high: { label: '高', color: 'orange' },
    urgent: { label: '紧急', color: 'red' }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error('获取统计失败:', err);
    }
  }, [token]);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // 原有的筛选参数
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.priority) params.append('priority', filters.priority);
      
      // [新增] 附加高级检索参数
      if (searchQuery) params.append('search', searchQuery);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const res = await fetch(`${API_BASE}/admin/feedbacks?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setFeedbacks(data.feedbacks);
    } catch (err) {
      console.error('获取反馈失败:', err);
    }
    setLoading(false);
  }, [token, filters, searchQuery, dateRange]); // [注意] 依赖项增加了 searchQuery 和 dateRange
  useEffect(() => {
    fetchStats();
    fetchFeedbacks();
    const interval = setInterval(() => {
      fetchStats();
      fetchFeedbacks();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchFeedbacks]);

  const updateStatus = async (feedbackId, status) => {
    try {
      const res = await fetch(`${API_BASE}/admin/feedback/${feedbackId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, response: responseText })
      });
      const data = await res.json();
      if (data.success) {
        alert('状态更新成功');
        setResponseText('');
        setSelectedFeedback(null);
        fetchFeedbacks();
        fetchStats();
      } else {
        alert(data.message || '更新失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  };
  const handleResetPassword = async () => {
    if (!resetStudentId || !resetNewPassword) {
      alert('请输入学号和新密码');
      return;
    }
    if (!confirm(`确定要将学号 ${resetStudentId} 的密码重置吗？`)) return;

    try {
      const res = await fetch(`${API_BASE}/admin/users/${resetStudentId}/reset-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: resetNewPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setResetStudentId('');
        setResetNewPassword('');
      } else {
        alert(data.message || '重置失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-slate-950/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
           <img 
                src={sieLogo} 
                alt="系统LOGO" 
                className="w-12 h-12 object-contain" // object-contain 保证图片完整显示不被裁剪
           />
            <div>
             <h1 className="text-base md:text-2xl font-bold text-white whitespace-nowrap">管理控制台</h1>
             <p className="text-xs text-purple-200/60">学生权益反馈系统</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="px-1 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs">
              {user?.role === 'superadmin' ? '超级管理员' : '管理员'}
            </span>
            <span className="text-white">{user?.name}</span>
            <button 
              onClick={onLogout}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              退出
            </button>
          </div>
        </div>
      </header>

     <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* [新增] 模块切换控制区 (仅超级管理员可见) */}
        {user?.role === 'superadmin' && (
          <div className="mb-8 flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
            <button
              onClick={() => setShowAccountManagement(false)}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-all ${
                !showAccountManagement ? 'bg-purple-600 text-white' : 'text-purple-200/60 hover:text-white'
              }`}
            >
              <span>📋</span> 业务处理面板
            </button>
            <button
              onClick={() => setShowAccountManagement(true)}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-all ${
                showAccountManagement ? 'bg-purple-600 text-white' : 'text-purple-200/60 hover:text-white'
              }`}
            >
              <span>👥</span> 账号管理面板
            </button>
          </div>
        )}

        {/* --- [新增] 根据状态决定显示哪个区域 --- */}
        {showAccountManagement && user?.role === 'superadmin' ? (
           <AccountManagement token={token} user={user} />
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: '总反馈', value: stats.total, icon: '📊', gradient: 'from-purple-600 to-purple-400' },
              { label: '待处理', value: stats.pending, icon: '⏳', gradient: 'from-yellow-600 to-yellow-400' },
              { label: '处理中', value: stats.processing, icon: '⚙️', gradient: 'from-blue-600 to-blue-400' },
              { label: '已解决', value: stats.resolved, icon: '✅', gradient: 'from-green-600 to-green-400' }
            ].map((stat, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-20 blur-2xl`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-200/60 text-sm">{stat.label}</span>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <p className="text-4xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Category Stats */}
       {stats?.byCategory && (
          <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-medium text-white mb-4">按类别统计</h3>
            {/* [修改] 适配 5 个分类的网格布局 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(categories).map(([key, cat]) => (
                <div key={key} className="text-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                  <span className="text-3xl">{cat.icon}</span>
                  <p className="text-white font-bold mt-2">{stats.byCategory[key] || 0}</p>
                  <p className="text-purple-200/60 text-xs">{cat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <span>🔐</span> 用户密码重置
          </h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-sm text-purple-200/60 mb-1 block">学生学号</label>
              <input
                type="text"
                value={resetStudentId}
                onChange={e => setResetStudentId(e.target.value)}
                placeholder="例如：2024090101"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-sm text-purple-200/60 mb-1 block">新密码</label>
              <input
                type="text"
                value={resetNewPassword}
                onChange={e => setResetNewPassword(e.target.value)}
                placeholder="设置一个临时密码"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleResetPassword}
              className="w-full md:w-auto px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all font-medium"
            >
              确认重置
            </button>
          </div>
        </div>

      {/* [新增] 高级检索与学期归档工具栏 */}
        <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <span>🔍</span> 问题检索与归档
            </h3>
            <button 
              onClick={() => {
                setSearchQuery('');
                setDateRange({ start: '', end: '' });
                setSemesterName('');
                setFilters({ status: '', category: '', priority: '' });
              }}
              className="text-xs text-purple-300 hover:text-white transition-colors"
            >
              清空所有条件
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* 1. 关键词搜索 (占4格) */}
            <div className="md:col-span-4">
              <label className="text-xs text-purple-200/60 mb-1.5 block">关键词检索 (空格分隔)</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="例如：宿舍 漏水"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-purple-500 transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">🔎</span>
              </div>
            </div>

            {/* 2. 归档/学期名称 (占3格) */}
            <div className="md:col-span-3">
              <label className="text-xs text-purple-200/60 mb-1.5 block">归档/学期名称 (可选)</label>
              <input
                type="text"
                value={semesterName}
                onChange={e => setSemesterName(e.target.value)}
                placeholder="例: 23-24学年第一学期"
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all text-yellow-300 placeholder-white/20"
              />
            </div>

            {/* 3. 时间范围 (占5格) */}
            <div className="md:col-span-5 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-purple-200/60 mb-1.5 block">起始日期</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs text-purple-200/60 mb-1.5 block">截止日期</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <select
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">全部状态</option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          
          <select
            value={filters.category}
            onChange={e => setFilters({...filters, category: e.target.value})}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">全部类别</option>
            {Object.entries(categories).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          
          <select
            value={filters.priority}
            onChange={e => setFilters({...filters, priority: e.target.value})}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">全部优先级</option>
            {Object.entries(priorityConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => setFilters({ status: '', category: '', priority: '' })}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all"
          >
            重置筛选
          </button>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {/* [新增] 学期归档展示框架 - 当设定了学期名和时间时显示 */}
          {semesterName && dateRange.start && dateRange.end && !loading && (
            <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 flex items-center justify-between shadow-lg shadow-purple-900/20">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">📂</span>
                  <h2 className="text-2xl font-bold text-white tracking-wide">{semesterName}</h2>
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30 uppercase tracking-wider">
                    Archive
                  </span>
                </div>
                <p className="text-purple-200/60 text-sm flex items-center gap-3 font-mono">
                  <span>📅 {dateRange.start} ~ {dateRange.end}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  <span>共检索到 <span className="text-white font-bold">{feedbacks.length}</span> 条反馈</span>
                </p>
              </div>
            </div>
          )}
          {loading ? (
            <div className="text-center py-12 text-purple-200/60">加载中...</div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 text-purple-200/60">
              <span className="text-6xl mb-4 block">📭</span>
              暂无反馈
            </div>
          ) : (
            feedbacks.map(feedback => {
              const cat = categories[feedback.category] || { label: feedback.category, icon: '📋' };
              const status = statusConfig[feedback.status] || statusConfig.pending;
              const priority = priorityConfig[feedback.priority] || priorityConfig.normal;
              
              return (
                <div 
                  key={feedback._id}
                  className={`p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer ${
                    selectedFeedback?._id === feedback._id ? 'border-purple-500 bg-purple-500/10' : ''
                  }`}
                  onClick={() => setSelectedFeedback(selectedFeedback?._id === feedback._id ? null : feedback)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-xl">{cat.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-white font-medium">{feedback.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs bg-${priority.color}-500/20 text-${priority.color}-400`}>
                            {priority.label}
                          </span>
                        </div>
                       <div className="flex items-center gap-4 text-sm text-purple-200/60">
                          {/* [修改] 增加二级分类的箭头与显示 */}
                          <span>{cat.label}{feedback.subCategory ? ` > ${feedback.subCategory}` : ''}</span>
                          <span>{feedback.isAnonymous ? '匿名用户' : feedback.user?.name}</span>
                          <span>{new Date(feedback.createdAt).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${status.color}-500/20 text-${status.color}-400`}>
                      {status.label}
                    </span>
                  </div>
                  
                  {selectedFeedback?._id === feedback._id && (
                    <div className="mt-4 pt-4 border-t border-white/10" onClick={e => e.stopPropagation()}>
                      <p className="text-purple-200/80 whitespace-pre-wrap mb-4">{feedback.content}</p>
                      
                      {feedback.responses?.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <h5 className="text-sm font-medium text-white">处理记录</h5>
                          {feedback.responses.map((resp, i) => (
                            <div key={i} className="pl-4 border-l-2 border-purple-500/50 py-2">
                              <p className="text-sm text-purple-200/80">{resp.content}</p>
                              <p className="text-xs text-purple-200/40 mt-1">
                                {resp.adminName} · {new Date(resp.createdAt).toLocaleString('zh-CN')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <textarea
                          value={responseText}
                          onChange={e => setResponseText(e.target.value)}
                          placeholder="添加处理回复..."
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 min-h-[100px]"
                        />
                        
                        <div className="flex flex-wrap gap-2">
                          {feedback.status !== 'processing' && (
                            <button
                              onClick={() => updateStatus(feedback._id, 'processing')}
                              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-all"
                            >
                              开始处理
                            </button>
                          )}
                          {feedback.status !== 'resolved' && (
                            <button
                              onClick={() => updateStatus(feedback._id, 'resolved')}
                              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm transition-all"
                            >
                              标记解决
                            </button>
                          )}
                          {feedback.status !== 'rejected' && (
                            <button
                              onClick={() => updateStatus(feedback._id, 'rejected')}
                              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition-all"
                            >
                              拒绝
                            </button>
                          )}
                          <button
                            onClick={() => updateStatus(feedback._id, feedback.status)}
                            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm transition-all"
                          >
                            仅添加回复
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
             );
            })
          )}
        </div>
        </> // [新增] 闭合 showAccountManagement 判断的 else 分支
        )}  {/* [新增] 闭合大括号 */}
      </main>

            {/* [修改] 底部双备案信息 */}
        <div className="mt-6 text-center text-[10px] md:text-xs text-purple-200/40 px-4 transform scale-90 origin-center space-y-2">
          <p>Copyright© 2026 赵启涵. </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mt-1">
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-purple-200 transition-colors"
            >
              京ICP备2026010091号-1
            </a>
            <a 
              href="https://beian.mps.gov.cn/#/query/webSearch?code=11011402055565" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-1 hover:text-purple-200 transition-colors"
            >
              <img src={beian} alt="公安" className="w-3 h-3 md:w-4 md:h-4" /> 
              京公网安备11011402055565号
            </a>
          </div>
        </div>
      </div>
  );
}