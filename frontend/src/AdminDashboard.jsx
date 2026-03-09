import React, { useState, useEffect, useCallback } from 'react';
import sieLogo from './assets/SIE_LOGO.png';
import sievox from './assets/SIEVOX_LOGO.png';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

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

  const categories = {
    academic: { label: '教学教务', icon: '📚' },
    accommodation: { label: '宿舍住宿', icon: '🏠' },
    catering: { label: '餐饮服务', icon: '🍽️' },
    financial: { label: '财务收费', icon: '💰' },
    safety: { label: '安全保卫', icon: '🛡️' },
    other: { label: '其他问题', icon: '📋' }
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
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
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
                          <span>{cat.label}</span>
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
      </main>
    </div>
  );
}
