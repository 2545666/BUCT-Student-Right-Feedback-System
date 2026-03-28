import React, { useState, useEffect, useCallback } from 'react';
import sieLogo from './assets/LOGO_1.png';
import beian from './assets/beian.png';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// ===================== 全局配置字典 =====================
const categories = {
  'academic': { label: '教学教务', icon: '📚' },
  'accommodation': { label: '宿舍住宿', icon: '🏠' },
  'catering': { label: '餐饮服务', icon: '🍽️' },
  'safety': { label: '安全保卫', icon: '🛡️' },
  'comprehensive': { label: '综合服务与其他', icon: '📋' }
};

const statusConfig = {
  'pending': { label: '待处理', color: 'yellow' },
  'processing': { label: '处理中', color: 'blue' },
  'resolved': { label: '已解决', color: 'green' },
  'rejected': { label: '已拒绝', color: 'red' }
};

const priorityConfig = {
  'low': { label: '较低', color: 'gray' },
  'normal': { label: '一般', color: 'blue' },
  'high': { label: '紧急', color: 'red' }
};

// ===================== 附件预览组件 =====================
export const AttachmentViewer = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 mt-3 mb-2">
     {attachments.map((file, i) => {
        const url = (file.path || '').startsWith('/api') ? file.path : `/api${file.path || ''}`;
        const isImage = file.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.path || file.filename);
        const isVideo = file.mimetype?.startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(file.path || file.filename);

        if (isImage) {
          return (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-20 h-20 md:w-24 md:h-24 overflow-hidden rounded-xl border border-white/20 hover:border-purple-500 transition-all shadow-md" onClick={e => e.stopPropagation()}>
              <img src={url} alt={file.filename} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
            </a>
          );
        }
        if (isVideo) {
          return (
            <video key={i} src={url} controls className="h-20 md:h-24 max-w-[150px] md:max-w-[200px] object-cover rounded-xl border border-white/20 shadow-md" onClick={e => e.stopPropagation()} />
          );
        }
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-purple-200 hover:bg-white/10 hover:text-white transition-all shadow-sm" onClick={e => e.stopPropagation()}>
            <span>📎</span><span className="truncate max-w-[120px]" title={file.filename}>{file.filename}</span>
          </a>
        );
      })}
    </div>
  );
};

// ===================== 绩效维度配置 =====================
const PERF_DIMENSIONS = {
  attendance: { label: '考勤积分', max: 20, color: 'purple' },
  activity: { label: '活动贡献', max: 35, color: 'blue' },
  feedback: { label: '权益跟进', max: 25, color: 'green' },
  copywriting: { label: '文案与策划', max: 15, color: 'yellow' },
  others: { label: '其他常规', max: 5, color: 'gray' },
  bonus: { label: '特别加分', max: '附加', color: 'red' }
};

// ===================== 考核细则面板 =====================
const PerformanceRulesAccordion = () => (
  <div className="mb-6 p-1 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
    <details className="group">
      <summary className="flex items-center justify-between p-4 cursor-pointer list-none text-white font-medium outline-none">
        <div className="flex items-center gap-3"><span className="text-xl">📜</span><span className="text-sm md:text-base">点击查看《SIE学生权益部志愿者考核细则》</span></div>
        <span className="text-purple-300 transition-transform duration-300 group-open:-rotate-180">▼</span>
      </summary>
      <div className="p-4 md:p-5 pt-0 text-sm text-purple-200/80 border-t border-white/10 mt-2 space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
        <p className="text-xs text-yellow-400/80 font-bold">全员初始为 0 分。通过完成任务积攒分数，各模块达到上限后即封顶，期末满分 100 分及以上。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse mt-2 text-xs min-w-[500px]">
            <thead><tr className="border-b border-white/10 text-white/60"><th className="py-2">考核维度</th><th className="w-16">封顶分</th><th>加分标准 (每次/每周)</th></tr></thead>
            <tbody className="divide-y divide-white/5">
            <tr><td className="py-2 text-purple-300">考勤积分</td><td>20分</td><td>准时出勤/合规请假 +2 分；迟到早退 +1 分；无故缺席 0 分。</td></tr>
            <tr><td className="py-2 text-blue-300">活动贡献</td><td>35分</td><td>核心统筹策划 +4~5 分；主要骨干 +2~3 分；普通参与 +1 分。</td></tr>
            <tr><td className="py-2 text-green-300">权益跟进</td><td>25分</td><td>按时巡检系统与规范回复留言 +2分/周；全月账号无违规 +1.25分/月。</td></tr>
            <tr><td className="py-2 text-yellow-300">文案与策划</td><td>15分</td><td>主笔大型活动策划案 +4~5分；主笔推送文案 +2~3分；参与辅助 +1分。</td></tr>
            <tr><td className="py-2 text-gray-300">其他常规</td><td>5分</td><td>完成物资管理、资料整理或跨部门对接 +1分/次。</td></tr>
            <tr><td className="py-2 text-red-400 font-bold">特别加分</td><td>附加</td><td>获校级表彰、突出建设性贡献直接 +2~5 分，计入总分。</td></tr>
          </tbody>
        </table>
      </div>
     </div>
    </details>
  </div>
);

// ===================== 绩效多边形雷达图组件 =====================
const PerformanceRadar = ({ scores, dimensions }) => {
  const keys = ['attendance', 'activity', 'feedback', 'copywriting', 'others'];
  const size = 220; 
  const center = size / 2;
  const radius = size * 0.35; 

  const points = keys.map((key, i) => {
    const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
    const max = dimensions[key].max;
    const score = scores[key] || 0;
    const ratio = Math.min(1, Math.max(0, score / max));
    return `${center + radius * ratio * Math.cos(angle)},${center + radius * ratio * Math.sin(angle)}`;
  }).join(' ');

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];
  const grids = gridLevels.map(level => {
    return keys.map((_, i) => {
      const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
      return `${center + radius * level * Math.cos(angle)},${center + radius * level * Math.sin(angle)}`;
    }).join(' ');
  });

  return (
    <div className="flex justify-center items-center py-2">
      <svg width={size} height={size} className="overflow-visible drop-shadow-xl">
        {grids.map((pts, i) => <polygon key={i} points={pts} fill={i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)"} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />)}
        {keys.map((_, i) => {
          const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
          return <line key={`line-${i}`} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        })}
        <polygon points={points} fill="rgba(168, 85, 247, 0.4)" stroke="#c084fc" strokeWidth="2" className="drop-shadow-[0_0_12px_rgba(168,85,247,0.8)] transition-all duration-700 ease-in-out" />
        {keys.map((key, i) => {
          const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
          const max = dimensions[key].max;
          const ratio = Math.min(1, Math.max(0, (scores[key] || 0) / max));
          const px = center + radius * ratio * Math.cos(angle);
          const py = center + radius * ratio * Math.sin(angle);
          const lx = center + (radius + 24) * Math.cos(angle); 
          const ly = center + (radius + 15) * Math.sin(angle);
          return (
            <g key={key}>
              <circle cx={px} cy={py} r="4" fill="#fff" className="shadow-lg" />
              <text x={lx} y={ly} fill="rgba(255,255,255,0.7)" fontSize="11" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                {dimensions[key].label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ===================== 账号管理子组件 =====================
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
      if (data.success) setUsers(data.users || []);
    } catch (err) { alert('获取用户列表失败'); }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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

  const handleDirectPromote = async (studentId, studentName) => {
    if (!window.confirm(`确定要将 ${studentName} (${studentId}) 升级为管理员吗？`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${studentId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: 'admin' })
      });
      if ((await res.json()).success) {
        alert(`${studentName} (${studentId}) 已经是管理员了`);
        fetchUsers();
      }
    } catch (err) { alert('操作失败'); }
  };

 const handleResetPassword = async (studentId) => {
    const newPwd = window.prompt(`请输入学号 ${studentId} 的新密码(至少6位)：`, '123456'); 
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
        setDetailsModal({ isOpen: true, type: 'feedback', title: `${userName} 提交的问题 (含匿名)`, data: data.feedbacks || [] });
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
        setDetailsModal({ isOpen: true, type: 'log', title: `${userName} 的处理操作日志`, data: data.logs || [] });
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
          <input type="text" value={targetStudentId} onChange={(e) => setTargetStudentId(e.target.value)} placeholder="输入要升级的学生学号" className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-purple-500 outline-none" required />
          <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all">确认设为管理员</button>
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
                      <button onClick={() => handleDirectPromote(student.studentId, student.name)} className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/40 transition">升级</button>
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
              {(!detailsModal.data || detailsModal.data.length === 0) ? (
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
                        <div className="flex justify-between items-center font-medium mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-300 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
                              {item.action === 'update_status' ? '处理了问题' : (item.action === 'create' ? '提交了问题' : item.action)}
                            </span>
                            {item.details?.status && (
                              <span className="text-purple-300 text-xs font-bold">
                                将状态变更为: {statusConfig[item.details.status]?.label || item.details.status}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-purple-200/50 shrink-0">{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
                        </div>
                        
                        {item.feedbackInfo ? (
                          <div className="mt-2 bg-slate-950/50 rounded-lg p-3 border border-white/5">
                            <div className="text-sm text-white font-medium mb-1">处理目标：{item.feedbackInfo.title}</div>
                            <p className="text-xs text-purple-200/60 mb-3 line-clamp-2">问题描述：{item.feedbackInfo.content}</p>
                            
                            <details className="group cursor-pointer">
                              <summary className="text-xs text-purple-400 hover:text-purple-300 outline-none select-none font-medium pb-1 transition-colors">
                                ▶ 点击查看完整对话流转记录 ({item.feedbackInfo.responses?.length || 0} 条互动)
                              </summary>
                              <div className="mt-3 space-y-2 cursor-default pt-2 border-t border-white/5">
                                {item.feedbackInfo.responses?.length > 0 ? (
                                  item.feedbackInfo.responses.map((resp, idx) => {
                                    const isStudent = resp.senderType === 'student';
                                    return (
                                      <div key={idx} className={`p-2.5 rounded-xl border ${isStudent ? 'bg-blue-500/10 border-blue-500/20 mr-6' : 'bg-purple-500/10 border-purple-500/20 ml-6'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className={`text-[10px] font-bold ${isStudent ? 'text-blue-300' : 'text-purple-300'}`}>
                                            {isStudent ? (resp.senderName || '学生留言') : (resp.adminName || resp.senderName || '系统管理员')}
                                          </span>
                                          <span className="text-[9px] text-purple-200/40">{new Date(resp.createdAt).toLocaleString('zh-CN')}</span>
                                        </div>
                                        <p className="text-xs text-purple-100 whitespace-pre-wrap leading-relaxed">{resp.content || '(仅更新了状态/附件)'}</p>
                                        {resp.attachments?.length > 0 && <span className="text-[10px] text-purple-400 mt-1.5 block">📎 包含 {resp.attachments.length} 个附件</span>}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-xs text-purple-200/40 italic text-center py-2">暂无流转对话</p>
                                )}
                              </div>
                            </details>
                          </div>
                        ) : (
                          <div className="mt-2 text-xs opacity-70 bg-black/20 p-2 rounded break-all font-mono">
                            {JSON.stringify(item.details)}
                          </div>
                        )}
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

// ===================== 主页面: AdminDashboard =====================
export default function AdminDashboard({ user, token, onLogout, onRefreshUser }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [semesterName, setSemesterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetStudentId, setResetStudentId] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [responseText, setResponseText] = useState('');
  const [selectedReplyFiles, setSelectedReplyFiles] = useState([]);
  const [showAccountManagement, setShowAccountManagement] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [pwdData, setPwdData] = useState({ current: '', new: '' });
  const [profileData, setProfileData] = useState({ name: '', studentId: '', email: '', phone: '' });

  // 绩效与学期专属状态
  const [showPerformanceManagement, setShowPerformanceManagement] = useState(false);
  const [performanceRecords, setPerformanceRecords] = useState([]);
  const [perfForm, setPerfForm] = useState({ volunteerIds: [], dimension: 'attendance', score: '', reason: '', occurrenceDate: '', activityName: '', targetSemester: '' });
  const [volunteers, setVolunteers] = useState([]);
  const [currentSemester, setCurrentSemester] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [availableSemesters, setAvailableSemesters] = useState([]);

  // 加权核算器专属状态
  const [showWeightCalc, setShowWeightCalc] = useState(false);
  const [calcDimension, setCalcDimension] = useState('activity');
  const [totalActivitiesCount, setTotalActivitiesCount] = useState(10); 
  const [weightConfig, setWeightConfig] = useState({}); 

  // 撤回绩效记录
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('警告：确定要彻底撤回这条赋分记录吗？撤回后该人员本学期的总分将自动重算！')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/performance/${recordId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if ((await res.json()).success) {
        fetchPerformanceAndUsers(selectedSemester); 
      }
    } catch (err) { alert('撤回失败'); }
  };

  // 应用加权计算
  const handleApplyWeighting = async () => {
    if (!window.confirm('确定应用加权吗？系统将自动校准该板块得分，并在得分处点亮“已加权”绿标。')) return;

    for (const v of volunteers) {
        const userRecords = performanceRecords.filter(r => r.volunteer?._id === v._id && r.dimension === calcDimension);
        let attendedWeight = 0;
        let currentScore = 0;
        let existingWeightRecordId = null;

        userRecords.forEach(r => {
            if (r.activityName === '期末系统加权') {
                existingWeightRecordId = r._id; return;
            }
            const nameKey = r.activityName || '未命名/常规记录';
            if (r.score > 0) {
                if (weightConfig[nameKey] !== undefined) {
                    attendedWeight += Number(weightConfig[nameKey]);
                } else {
                    attendedWeight += 1;
                }
            }
            currentScore += r.score;
        });
        
        const maxScore = PERF_DIMENSIONS[calcDimension]?.max || 100;
        const finalScore = (maxScore * attendedWeight) / (totalActivitiesCount || 1);
        const diff = finalScore - currentScore;

        if (existingWeightRecordId) {
            await fetch(`${API_BASE}/admin/performance/${existingWeightRecordId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        }

        await fetch(`${API_BASE}/admin/performance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                volunteerIds: [v._id], dimension: calcDimension, score: diff.toFixed(2),
                reason: `期末系统动态加权 (得分占比: ${attendedWeight.toFixed(1)}/${totalActivitiesCount})`,
                occurrenceDate: new Date().toISOString().split('T')[0], activityName: '期末系统加权', 
                targetSemester: selectedSemester || currentSemester
            })
        });
    }
    alert('加权已成功应用！成绩右上角已点亮绿色的“已加权”。');
    setShowWeightCalc(false);
    fetchPerformanceAndUsers(selectedSemester);
  };

  // [修改修复] 彻底解决由于多次 .json() 读取流或 undefined 引起的崩溃隐患
  const fetchPerformanceAndUsers = useCallback(async (targetSemester = '') => {
    try {
      const sysRes = await fetch(`${API_BASE}/admin/system/config`, { headers: { 'Authorization': `Bearer ${token}` } });
      const sysData = await sysRes.json();
      
      let querySemester = targetSemester || selectedSemester; 
      
      if (sysData.success) {
        setCurrentSemester(sysData.currentSemester);
        setAvailableSemesters(sysData.semesters || []);
        if (!querySemester) {
            querySemester = sysData.currentSemester;
            setSelectedSemester(sysData.currentSemester);
        }
        setPerfForm(prev => ({ ...prev, targetSemester: querySemester }));
      }

      const endpoint = user?.role === 'superadmin' ? '/admin/performance' : '/admin/performance/my';
      const res = await fetch(`${API_BASE}${endpoint}?semester=${encodeURIComponent(querySemester)}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setPerformanceRecords(data.records || []);

      if (user?.role === 'superadmin') {
        const uRes = await fetch(`${API_BASE}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        const uData = await uRes.json(); // 安全的单次读取
        if (uData.success) setVolunteers((uData.users || []).filter(u => u.role === 'admin'));
      }
    } catch (err) { console.error('获取绩效信息失败:', err); }
  }, [token, user?.role, selectedSemester]);

  const calculateScore = useCallback((records) => {
    let scores = { attendance: 0, activity: 0, feedback: 0, copywriting: 0, others: 0, bonus: 0 };
    let weightedFlags = { attendance: false, activity: false, feedback: false, copywriting: false, others: false, bonus: false };
    
    (records || []).forEach(r => { 
        if (scores[r.dimension] !== undefined) {
            scores[r.dimension] += r.score; 
            if (r.activityName === '期末系统加权') weightedFlags[r.dimension] = true;
        }
    });
    
    const attendance = Math.min(PERF_DIMENSIONS.attendance.max, Math.max(0, scores.attendance));
    const activity = Math.min(PERF_DIMENSIONS.activity.max, Math.max(0, scores.activity));
    const feedback = Math.min(PERF_DIMENSIONS.feedback.max, Math.max(0, scores.feedback));
    const copywriting = Math.min(PERF_DIMENSIONS.copywriting.max, Math.max(0, scores.copywriting));
    const others = Math.min(PERF_DIMENSIONS.others.max, Math.max(0, scores.others));
    const bonus = Math.max(0, scores.bonus);
    
    const total = attendance + activity + feedback + copywriting + others + bonus;
    return { attendance, activity, feedback, copywriting, others, bonus, total, weightedFlags };
  }, []);

  const handlePerfSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/performance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...perfForm, targetSemester: selectedSemester || currentSemester })
      });
      if ((await res.json()).success) {
        alert('绩效录入成功');
        setPerfForm({ volunteerIds: [], dimension: 'attendance', score: '', reason: '', occurrenceDate: '', activityName: '', targetSemester: selectedSemester || currentSemester });
        fetchPerformanceAndUsers(selectedSemester);
      }
    } catch (err) { alert('提交失败'); }
  };

  const handleArchiveSemester = async () => {
    const newSemester = window.prompt(`当前运行学期为：${currentSemester}\n请输入新学期的名称以进行归档重置`); 
    if (!newSemester || newSemester === currentSemester) return;
    if (!window.confirm(`警告：确认开启新学期 [${newSemester}] 吗？\n开启后全员当期积分将重新从 0 累计，旧学期数据将被永久归档！`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/admin/system/semester`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ semester: newSemester })
      });
      if ((await res.json()).success) {
        alert('新学期已成功开启！全员积分已重置。');
        fetchPerformanceAndUsers(newSemester);
      }
    } catch(err) { alert('操作失败'); }
  };

  const handleRenameSemester = async () => {
    if (!selectedSemester) return alert('请先选择一个需要修改的学期');
    const newName = window.prompt(`修改学期名称\n\n原名称：${selectedSemester}\n请输入新名称：`, selectedSemester);
    if (!newName || newName === selectedSemester) return;
    if (!window.confirm(`确定将学期重命名为 "${newName}" 吗？\n该操作会同步更新该学期下产生的所有历史数据与加权记录。`)) return;

    try {
      const res = await fetch(`${API_BASE}/admin/system/semester/rename`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldName: selectedSemester, newName })
      });
      const data = await res.json();
      if (data.success) {
        alert('学期名称修改成功！');
        fetchPerformanceAndUsers(newName);
      } else {
        alert(data.message || '操作失败');
      }
    } catch (err) { alert('网络错误'); }
  };

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (err) {}
  }, [token]);

  const markNotificationsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
      setNotifications([]);
      setShowNotifs(false);
    } catch (err) {}
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdData.new.length < 6) return alert('新密码至少需要6位');
    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwdData.current, newPassword: pwdData.new })
      });
      const data = await res.json();
      if (data.success) {
        alert('密码修改成功！请重新登录。');
        setShowSettingsModal(false);
        setPwdData({ current: '', new: '' });
        onLogout(); 
      } else {
        alert(data.message || '修改失败');
      }
    } catch (err) { alert('网络错误'); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.success) {
        alert('个人信息修改成功！');
        if (onRefreshUser) onRefreshUser();
      } else {
        alert(data.message || '修改失败');
      }
    } catch (err) { alert('网络错误'); }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) { console.error('获取统计数据失败:', err); }
  }, [token]);

  const fetchFeedbacks = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true); 
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.priority) params.append('priority', filters.priority);
      if (searchQuery) params.append('search', searchQuery);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      
      const res = await fetch(`${API_BASE}/admin/feedbacks?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setFeedbacks(data.feedbacks || []); 
    } catch (err) { console.error('获取反馈失败:', err); }
    if (showLoading) setLoading(false);
  }, [token, filters, searchQuery, dateRange]);

  useEffect(() => {
    fetchStats();
    fetchFeedbacks(true); 
    fetchNotifications(); 
    fetchPerformanceAndUsers(); 
    const interval = setInterval(() => {
      fetchStats();
      fetchFeedbacks(false); 
      fetchNotifications(); 
      fetchPerformanceAndUsers(); 
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchFeedbacks, fetchNotifications, fetchPerformanceAndUsers]);

  const handleRecallMsg = async (feedbackId, replyId) => {
    if (!window.confirm('确定要撤回这条回复吗？（撤回后学生和普通管理员将无法查看具体内容）')) return;
    try {
      const res = await fetch(`${API_BASE}/feedback/${feedbackId}/reply/${replyId}/recall`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchFeedbacks(false); 
      } else {
        alert(data.message || '撤回失败');
      }
    } catch (err) { alert('网络错误'); }
  };

  const updateStatus = async (feedbackId, status) => {
    try {
      let uploadedFiles = [];
      if (selectedReplyFiles.length > 0) {
        const fileData = new FormData();
        selectedReplyFiles.forEach(f => fileData.append('files', f));
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fileData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) uploadedFiles = uploadData.files;
      }

      const res = await fetch(`${API_BASE}/admin/feedback/${feedbackId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status, response: responseText, attachments: uploadedFiles })
      });
      const data = await res.json();
      if (data.success) {
        alert('状态更新成功');
        setResponseText('');
        setSelectedReplyFiles([]);
        setSelectedFeedback(null);
        fetchFeedbacks(false); 
        fetchStats();
      } else {
        alert(data.message || '更新失败');
      }
    } catch (err) { alert('网络错误'); }
  };

  const handleResetPassword = async () => {
    if (!resetStudentId || !resetNewPassword) {
      alert('请输入学号和新密码');
      return;
    }
    if (!window.confirm(`确定要将学号 ${resetStudentId} 的密码重置吗？`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${resetStudentId}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
    } catch (err) { alert('网络错误'); }
  };

  // ------------------ 视图渲染 ------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
      
      {/* 顶部导航 */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-slate-950/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={sieLogo} alt="系统LOGO" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-base md:text-2xl font-bold text-white whitespace-nowrap">管理控制台</h1>
              <p className="text-xs text-purple-200/60">学生权益反馈系统</p>
            </div>
          </div>
          
        <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="p-2 text-xl hover:bg-white/10 rounded-full transition-all relative">
                📬
                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900"></span>}
              </button>
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[100] max-h-80 flex flex-col overflow-hidden text-left">
                  <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <span className="text-sm font-medium text-white">消息通知</span>
                    {notifications.length > 0 && <button onClick={markNotificationsRead} className="text-xs text-purple-300 hover:text-white">全部标为已读</button>}
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-purple-200/50 text-center py-6">暂无新消息</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className="p-2.5 mb-1 bg-white/5 rounded-lg border border-white/5 text-purple-100 flex flex-col gap-1">
                          <p className="text-xs break-words">{n.content}</p>
                          <span className="text-[10px] text-purple-200/40 text-right">{new Date(n.createdAt).toLocaleString('zh-CN')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right hidden sm:block">
             <div className="text-sm font-bold text-white">{user?.name}</div>
              <div className="text-xs text-purple-200/60 font-mono mt-0.5">{user?.studentId}</div>
            </div>
            
            <button 
              onClick={() => {
                setProfileData({
                  name: user?.name || '',
                  studentId: user?.studentId || '',
                  email: user?.email || '',
                  phone: user?.phone || ''
                });
                setSettingsTab('profile');
                setShowSettingsModal(true);
              }}
              className="px-4 py-2 bg-white/5 hover:bg-purple-500/20 text-purple-200 hover:text-purple-300 rounded-xl text-sm transition-all border border-white/10"
            >
              修改信息
            </button>

            <button 
              onClick={onLogout}
              className="px-4 py-2 bg-white/5 hover:bg-red-500/20 text-purple-200 hover:text-red-400 rounded-xl text-sm transition-all border border-white/10 hover:border-red-500/30"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* 主体内容区 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex flex-nowrap gap-1 md:gap-2 p-1 bg-white/5 rounded-xl w-full md:w-fit overflow-x-auto custom-scrollbar">
          <button
            onClick={() => { setShowAccountManagement(false); setShowPerformanceManagement(false); }}
            className={`px-3 md:px-6 py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-all text-xs md:text-sm whitespace-nowrap shrink-0 ${!showAccountManagement && !showPerformanceManagement ? 'bg-purple-600 text-white' : 'text-purple-200/60 hover:text-white'}`}
          >
            <span>📋</span> 业务反馈处理
          </button>
          
          {user?.role === 'superadmin' && (
            <button
              onClick={() => { setShowAccountManagement(true); setShowPerformanceManagement(false); }}
              className={`px-3 md:px-6 py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-all text-xs md:text-sm whitespace-nowrap shrink-0 ${showAccountManagement ? 'bg-purple-600 text-white' : 'text-purple-200/60 hover:text-white'}`}
            >
              <span>👥</span> 账号管理面板
            </button>
          )}

          <button
            onClick={() => { setShowAccountManagement(false); setShowPerformanceManagement(true); }}
            className={`px-3 md:px-6 py-2 rounded-lg flex items-center gap-1 md:gap-2 transition-all text-xs md:text-sm whitespace-nowrap shrink-0 ${showPerformanceManagement ? 'bg-purple-600 text-white' : 'text-purple-200/60 hover:text-white'}`}
          >
            <span>📊</span> {user?.role === 'superadmin' ? '部门绩效管理' : '我的绩效档案'}
          </button>
        </div>

        {showPerformanceManagement ? (
          <div className="animate-fadeIn space-y-4 md:space-y-6">
            <PerformanceRulesAccordion />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-white/10 mb-4 md:mb-6 shadow-lg gap-4">
               <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full md:w-auto">
                 <span className="text-white font-bold shrink-0">当前管理学期：</span>
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                   <select 
                     value={selectedSemester} 
                     onChange={(e) => { setSelectedSemester(e.target.value); fetchPerformanceAndUsers(e.target.value); }}
                     className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 rounded-lg text-white border border-white/10 outline-none text-sm"
                   >
                     {availableSemesters.map(s => <option key={s} value={s}>{s} {s === currentSemester ? '(当前运行中)' : '(历史归档)'}</option>)}
                   </select>
                   {user?.role === 'superadmin' && (
                     <button onClick={handleRenameSemester} title="重命名此学期" className="p-2 shrink-0 bg-white/5 hover:bg-white/10 rounded-lg text-purple-300 hover:text-white transition-colors border border-white/5">
                       ✏️ 
                     </button>
                   )}
                 </div>
               </div>
               {user?.role === 'superadmin' && (
                 <button onClick={handleArchiveSemester} className="w-full md:w-auto px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 rounded-lg transition-all text-sm font-medium shrink-0">
                   📦 归档并开启新学期
                 </button>
               )}
            </div>
            
            {user?.role === 'superadmin' ? (
              <div className="space-y-4 md:space-y-6">
                <div className="p-4 md:p-6 bg-gradient-to-br from-slate-900 to-purple-950/50 border border-purple-500/30 rounded-2xl">
                  {/* [修复] 在这里加回了呼出“加权核算器”的按钮！ */}
                  <h3 className="text-base md:text-lg font-bold text-white mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2"><span>🏆</span> 部门全员期末核算总榜单</div>
                    {user?.role === 'superadmin' && (
                      <button onClick={() => setShowWeightCalc(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg shadow-md transition-colors flex items-center gap-1">
                        <span>🧮</span> 期末动态加权结算
                      </button>
                    )}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="border-b border-white/10 text-purple-200/60">
                        <tr>
                          <th className="pb-3 pr-4">志愿者姓名</th>
                          <th className="pb-3 pr-4 text-purple-300">考勤(20)</th>
                          <th className="pb-3 pr-4 text-blue-300">活动(35)</th>
                          <th className="pb-3 pr-4 text-green-300">跟进(25)</th>
                          <th className="pb-3 pr-4 text-yellow-300">文案(15)</th>
                          <th className="pb-3 pr-4 text-gray-300">常规(5)</th>
                          <th className="pb-3 pr-4 text-red-300">+附加</th>
                          <th className="pb-3 font-bold text-white">总计得分</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-purple-100">
                        {volunteers.map(v => {
                          const personalRecords = performanceRecords.filter(r => r.volunteer?._id === v._id);
                          return { user: v, scoreObj: calculateScore(personalRecords) };
                        }).sort((a, b) => b.scoreObj.total - a.scoreObj.total).map(({ user: v, scoreObj: s }) => (
                          <tr key={v._id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 pr-4 font-medium text-white">{v.name}</td>
                            <td className="py-3 pr-4">{s.attendance}</td>
                            <td className="py-3 pr-4">{s.activity}</td>
                            <td className="py-3 pr-4">{s.feedback}</td>
                            <td className="py-3 pr-4">{s.copywriting}</td>
                            <td className="py-3 pr-4">{s.others}</td>
                            <td className="py-3 pr-4 text-red-400">{s.bonus > 0 ? `+${s.bonus}` : '-'}</td>
                            <td className="py-3 text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 relative pr-6">
                              {s.total}
                              {Object.values(s.weightedFlags).some(val => val) && <span className="absolute top-1 ml-1 text-[9px] text-green-400 bg-green-500/10 border border-green-500/30 px-1 py-0.5 rounded shadow-sm whitespace-nowrap">已加权</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                  <div className="md:col-span-1 p-4 md:p-6 bg-white/5 border border-white/10 rounded-2xl h-fit">
                    <h3 className="text-base md:text-lg font-bold text-white mb-4">✍️ 快捷赋分录入</h3>
                    <form onSubmit={handlePerfSubmit} className="space-y-4">
                      
                      <div>
                        <label className="text-xs text-purple-200/60 mb-1 block">录入目标学期 (默认跟随当前视图)</label>
                        <select 
                          value={perfForm.targetSemester || currentSemester} 
                          onChange={e => setPerfForm({...perfForm, targetSemester: e.target.value})} 
                          className={`w-full px-3 py-2 rounded-lg text-white outline-none transition-colors ${
                            perfForm.targetSemester && perfForm.targetSemester !== currentSemester 
                              ? 'bg-orange-950/50 border border-orange-500/50 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.2)]' 
                              : 'bg-slate-900 border border-white/10'
                          }`}
                        >
                          {availableSemesters.map(s => <option key={s} value={s}>{s} {s === currentSemester ? '(当前学期)' : '(历史归档)'}</option>)}
                        </select>
                        {perfForm.targetSemester && perfForm.targetSemester !== currentSemester && (
                          <p className="text-[10px] text-orange-400 mt-1.5 flex items-start gap-1 leading-tight">
                            <span className="shrink-0">⚠️</span>
                            <span>注意：您当前正在向历史归档学期补录积分，此操作将改变该学期的结算总分。</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-purple-200/60 mb-1 block">考核维度</label>
                        <select value={perfForm.dimension} onChange={e => setPerfForm({...perfForm, dimension: e.target.value})} className="w-full px-3 py-2 bg-slate-900 rounded-lg text-white border border-white/10 outline-none">
                          {Object.entries(PERF_DIMENSIONS).map(([k, v]) => <option key={k} value={k}>{v.label} (封顶{v.max}分)</option>)}
                        </select>
                      </div>
                      
                      {(perfForm.dimension === 'attendance' || perfForm.dimension === 'activity' || perfForm.dimension === 'copywriting' || perfForm.dimension === 'bonus') && (
                        <div>
                          <label className="text-xs text-purple-200/60 mb-1 block">具体项目名称 (填写名称后方可参与期末加权)</label>
                          <input type="text" placeholder="例: 第三周例会 / 迎新晚会统筹" value={perfForm.activityName} onChange={e => setPerfForm({...perfForm, activityName: e.target.value})} className="w-full px-3 py-2 bg-slate-900 rounded-lg text-white border border-white/10 outline-none" />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-purple-200/60 mb-1 block">发生日期</label>
                          <input type="date" required value={perfForm.occurrenceDate} onChange={e => setPerfForm({...perfForm, occurrenceDate: e.target.value})} className="w-full px-3 py-2 bg-slate-900 rounded-lg text-white border border-white/10 outline-none [color-scheme:dark]" />
                        </div>
                        <div>
                          <label className="text-xs text-purple-200/60 mb-1 block">获得积分数</label>
                          <input type="number" step="0.5" required placeholder="如 2 或 4.5" value={perfForm.score} onChange={e => setPerfForm({...perfForm, score: e.target.value})} className="w-full px-3 py-2 bg-slate-900 rounded-lg text-white border border-white/10 outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-purple-200/60 mb-1 block">详细加分事由</label>
                        <textarea required rows="2" placeholder="例: 按时全勤出勤 / 独立撰写大型策划案" value={perfForm.reason} onChange={e => setPerfForm({...perfForm, reason: e.target.value})} className="w-full px-3 py-2 bg-slate-900 rounded-lg text-white border border-white/10 outline-none resize-none" />
                      </div>
                      <div>
                        <label className="text-xs text-purple-200/60 mb-1 block">选择志愿者 (可批量勾选)</label>
                        <div className="max-h-32 overflow-y-auto bg-slate-900 rounded-lg border border-white/10 p-2 space-y-1 custom-scrollbar">
                          {volunteers.map(v => (
                            <label key={v._id} className="flex items-center gap-2 text-sm text-white hover:bg-white/5 p-1 rounded cursor-pointer">
                              <input type="checkbox" checked={perfForm.volunteerIds.includes(v._id)} onChange={(e) => {
                                const ids = e.target.checked ? [...perfForm.volunteerIds, v._id] : perfForm.volunteerIds.filter(id => id !== v._id);
                                setPerfForm({...perfForm, volunteerIds: ids});
                              }} className="accent-purple-500" />
                              {v.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <button type="submit" className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium shadow-lg">确认发放积分</button>
                    </form>
                  </div>

                  <div className="md:col-span-2 p-4 md:p-6 bg-white/5 border border-white/10 rounded-2xl h-fit">
                    <h3 className="text-base md:text-lg font-bold text-white mb-4">🗂 部门打分流水账库</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="border-b border-white/10 text-purple-200/60">
                          <tr><th className="pb-3 pr-4">日期</th><th className="pb-3 pr-4">志愿者</th><th className="pb-3 pr-4">分值</th><th className="pb-3 pr-4">维度</th><th className="pb-3">事由明细</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-purple-100">
                          {performanceRecords.map(r => (
                            <tr key={r._id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 pr-4 text-xs">{new Date(r.occurrenceDate).toLocaleDateString('zh-CN')}</td>
                              <td className="py-3 pr-4">{r.volunteer?.name}</td>
                              <td className={`py-3 pr-4 font-bold text-green-400`}>+{r.score}</td>
                              <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded text-[10px] bg-${PERF_DIMENSIONS[r.dimension]?.color || 'gray'}-500/20 text-${PERF_DIMENSIONS[r.dimension]?.color || 'gray'}-300`}>{PERF_DIMENSIONS[r.dimension]?.label || '旧版归档记录'}</span></td>
                              <td className="py-3 text-xs truncate max-w-[200px]" title={r.reason}>{r.activityName ? `[${r.activityName}] ` : ''}{r.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                 <div className="space-y-4 md:space-y-6">
                  <div className="p-4 md:p-6 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl text-center relative overflow-hidden">
                    <p className="text-sm md:text-base text-purple-200/80 mb-2">【{selectedSemester || '当前学期'}】绩效得分</p>
                    <div className="relative inline-block">
                      <p className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 drop-shadow-lg mb-0">
                        {calculateScore(performanceRecords).total} <span className="text-lg md:text-xl font-normal text-white/50">/100</span>
                      </p>
                      {Object.values(calculateScore(performanceRecords).weightedFlags).some(v => v) && (
                        <span className="absolute -top-3 -right-14 bg-green-500/20 border border-green-500/50 text-green-400 text-[10px] px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(34,197,94,0.3)] font-bold whitespace-nowrap">
                          ✓ 已加权
                        </span>
                      )}
                    </div>
                    
                    <PerformanceRadar scores={calculateScore(performanceRecords)} dimensions={PERF_DIMENSIONS} />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-left border-t border-white/10 pt-4 mt-2">
                      {['attendance', 'activity', 'feedback', 'copywriting', 'others'].map(k => {
                        const s = calculateScore(performanceRecords)[k];
                        const d = PERF_DIMENSIONS[k];
                        const isMax = s >= d.max;
                        return (
                          <div key={k} className={`p-2.5 rounded-xl border ${isMax ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/20 border-white/5'}`}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className={`text-${isMax ? 'yellow' : d.color}-300 flex items-center gap-1`}>
                                {d.label}
                                {calculateScore(performanceRecords).weightedFlags[k] && <span className="bg-green-500/20 text-green-400 text-[8px] px-1 rounded border border-green-500/30">加权</span>}
                              </span>
                              <span className={`font-bold ${isMax ? 'text-yellow-400' : 'text-white'}`}>{isMax ? '已满MAX' : `${s}/${d.max}`}</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden"><div className={`h-full ${isMax ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' : `bg-${d.color}-500`}`} style={{ width: `${(s/d.max)*100}%` }}></div></div>
                          </div>
                        );
                      })}
                      <div className="col-span-1 sm:col-span-2 bg-red-900/20 p-2.5 rounded-xl border border-red-500/20 flex justify-between items-center">
                        <span className="text-xs text-red-300">🎉 特殊附加奖励</span><span className="text-lg font-bold text-red-400">+{calculateScore(performanceRecords).bonus}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6 bg-white/5 border border-white/10 rounded-2xl max-h-[600px] flex flex-col">
                  <h3 className="text-base md:text-lg font-bold text-white mb-4 shrink-0">📈 我的绩效履历档案</h3>
                  <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-4">
                    {performanceRecords.length === 0 ? <p className="text-center text-purple-200/50 py-10 text-sm">该学期暂未获取积分</p> : 
                      performanceRecords.map(r => (
                        <div key={r._id} className="relative pl-6 border-l-2 border-purple-500/30 pb-4 last:pb-0">
                          <span className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>
                          <div className="text-[10px] text-purple-200/50 mb-1">{new Date(r.occurrenceDate).toLocaleDateString('zh-CN')} · 由 {r.recordedBy?.name} 授予</div>
                          <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] bg-${PERF_DIMENSIONS[r.dimension]?.color || 'gray'}-500/20 text-${PERF_DIMENSIONS[r.dimension]?.color || 'gray'}-300`}>{PERF_DIMENSIONS[r.dimension]?.label || '旧版记录'}</span>
                                {r.activityName && <span className="text-xs font-bold text-white">[{r.activityName}]</span>}
                              </div>
                              <p className="text-sm text-purple-100">{r.reason}</p>
                            </div>
                            <span className={`shrink-0 text-lg font-bold text-green-400`}>+{r.score}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : showAccountManagement && user?.role === 'superadmin' ? (
           <AccountManagement token={token} user={user} />
        ) : (
          <>
            {/* 统计模块 */}
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

            {/* 按类别统计 */}
            {stats?.byCategory && (
              <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-4">按类别统计</h3>
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

            {/* 密码重置面板 */}
            <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <span>🔐</span> 用户密码重置
              </h3>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="text-sm text-purple-200/60 mb-1 block">学生学号</label>
                  <input type="text" value={resetStudentId} onChange={e => setResetStudentId(e.target.value)} placeholder="例如：2024090101" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-sm text-purple-200/60 mb-1 block">新密码</label>
                  <input type="text" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} placeholder="设置一个临时密码" className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <button onClick={handleResetPassword} className="w-full md:w-auto px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all font-medium">确认重置</button>
              </div>
            </div>

            {/* 检索与归档面板 */}
            <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-white flex items-center gap-2"><span>🔍</span> 问题检索与归档</h3>
                <button onClick={() => { setSearchQuery(''); setDateRange({ start: '', end: '' }); setSemesterName(''); setFilters({ status: '', category: '', priority: '' }); }} className="text-xs text-purple-300 hover:text-white transition-colors">清空所有条件</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <label className="text-xs text-purple-200/60 mb-1.5 block">关键词检索 (空格分隔)</label>
                  <div className="relative">
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="例如：宿舍 漏水" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-purple-500 transition-all" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">🔎</span>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs text-purple-200/60 mb-1.5 block">归档/学期名称 (可选)</label>
                  <input type="text" value={semesterName} onChange={e => setSemesterName(e.target.value)} placeholder="例: 23-24学年第一学期" className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all text-yellow-300 placeholder-white/20" />
                </div>

                <div className="md:col-span-5 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-purple-200/60 mb-1.5 block">起始日期</label>
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs text-purple-200/60 mb-1.5 block">截止日期</label>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all [color-scheme:dark]" />
                  </div>
                </div>
              </div>
            </div>

            {/* 快速筛选按钮 */}
            <div className="mb-6 flex flex-wrap gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                <option value="">全部状态</option>
                {Object.entries(statusConfig).map(([k, v]) => ( <option key={k} value={k}>{v.label}</option> ))}
              </select>
              
              <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                <option value="">全部类别</option>
                {Object.entries(categories).map(([k, v]) => ( <option key={k} value={k}>{v.label}</option> ))}
              </select>
              
              <select value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-purple-500">
                <option value="">全部优先级</option>
                {Object.entries(priorityConfig).map(([k, v]) => ( <option key={k} value={k}>{v.label}</option> ))}
              </select>
              
              <button onClick={() => setFilters({ status: '', category: '', priority: '' })} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all">重置筛选</button>
            </div>

            {/* 反馈列表 */}
            <div className="space-y-4">
              {semesterName && dateRange.start && dateRange.end && !loading && (
                <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 flex items-center justify-between shadow-lg shadow-purple-900/20">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">📂</span>
                      <h2 className="text-2xl font-bold text-white tracking-wide">{semesterName}</h2>
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30 uppercase tracking-wider">Archive</span>
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
                  <span className="text-6xl mb-4 block">📭</span>暂无反馈
                </div>
              ) : (
                feedbacks.map(feedback => {
                  const cat = categories[feedback.category] || { label: feedback.category, icon: '📋' };
                  const status = statusConfig[feedback.status] || statusConfig.pending;
                  const priority = priorityConfig[feedback.priority] || priorityConfig.normal;
                  
                  return (
                    <div key={feedback._id} className={`p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer ${selectedFeedback?._id === feedback._id ? 'border-purple-500 bg-purple-500/10' : ''}`} onClick={() => setSelectedFeedback(selectedFeedback?._id === feedback._id ? null : feedback)}>
                      <div className="flex items-start justify-between gap-2 md:gap-4">
                        <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <span className="text-lg md:text-xl">{cat.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                              <h4 className="text-white font-medium truncate max-w-full">{feedback.title}</h4>
                              <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] md:text-xs bg-${priority.color}-500/20 text-${priority.color}-400`}>{priority.label}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-sm text-purple-200/60">
                              <span className="shrink-0">{cat.label}{feedback.subCategory ? ` > ${feedback.subCategory}` : ''}</span>
                              <span className="shrink-0">{feedback.isAnonymous ? '匿名用户' : feedback.user?.name}</span>
                              <span className="shrink-0">{new Date(feedback.createdAt).toLocaleString('zh-CN')}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-${status.color}-500/20 text-${status.color}-400`}>{status.label}</span>
                      </div>
                      
                      {selectedFeedback?._id === feedback._id && (
                        <div className="mt-4 pt-4 border-t border-white/10" onClick={e => e.stopPropagation()}>
                          <p className="text-purple-200/80 whitespace-pre-wrap mb-4">{feedback.content}</p>
                          <AttachmentViewer attachments={feedback.attachments} />
                          
                          {feedback.responses?.length > 0 && (
                            <div className="mb-4 space-y-3">
                              <h5 className="text-sm font-medium text-white mb-2">流转与对话记录</h5>
                              {feedback.responses.map((resp, i) => {
                                const isStudent = resp.senderType === 'student';
                                const isAdmin = !isStudent;
                                const isSuperadmin = user?.role === 'superadmin';

                                if (resp.isRecalled && !isSuperadmin) {
                                  return (
                                    <div key={i} className={`p-3 rounded-xl border opacity-50 ${isStudent ? 'bg-blue-500/10 border-blue-500/20 mr-8' : 'bg-purple-500/10 border-purple-500/20 ml-8'}`}>
                                      <p className="text-xs text-purple-200/50 italic text-center py-2">此消息已撤回</p>
                                    </div>
                                  );
                                }

                                return (
                                 <div key={i} className={`p-3 rounded-xl border ${isStudent ? 'bg-blue-500/10 border-blue-500/20 mr-8' : 'bg-purple-500/10 border-purple-500/20 ml-8'} ${resp.isRecalled ? 'opacity-60 border-red-500/30 bg-red-900/10' : ''}`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className={`text-xs font-bold ${isStudent ? 'text-blue-300' : 'text-purple-300'}`}>
                                        {isStudent ? (resp.senderName || '学生') : (resp.adminName || resp.senderName || '系统管理员')}
                                        {resp.isRecalled && isSuperadmin && (
                                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] border ${resp.recalledByRole === 'superadmin' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                            {resp.recalledByRole === 'superadmin' ? '超管强制撤回' : '发出者已撤回'}
                                          </span>
                                        )}
                                      </span>
                                      
                                      <div className="flex items-center gap-2">
                                        {!resp.isRecalled && isAdmin && (resp.adminId === user?.id || isSuperadmin) && (
                                          <button onClick={(e) => { e.stopPropagation(); handleRecallMsg(feedback._id, resp._id); }} className="text-[10px] text-red-400/80 hover:text-red-400 transition-colors">
                                            撤回
                                          </button>
                                        )}
                                        <span className="text-[10px] text-purple-200/40">{new Date(resp.createdAt).toLocaleString('zh-CN')}</span>
                                      </div>
                                    </div>
                                    <p className="text-sm text-purple-100 whitespace-pre-wrap leading-relaxed">{resp.content}</p>
                                    <AttachmentViewer attachments={resp.attachments} />
                                  </div>
                                );
                              })}
                            </div>
                         )}
                          
                          <div className="space-y-3">
                            <textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="添加处理回复..." className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 min-h-[100px]" />
                            <input type="file" multiple onChange={e => setSelectedReplyFiles(Array.from(e.target.files))} className="block w-full text-xs text-purple-200/60 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer" />
                            
                            <div className="flex flex-wrap gap-2">
                              {feedback.status !== 'processing' && ( <button onClick={() => updateStatus(feedback._id, 'processing')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-all">开始处理</button> )}
                              {feedback.status !== 'resolved' && ( <button onClick={() => updateStatus(feedback._id, 'resolved')} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm transition-all">标记解决</button> )}
                              {feedback.status !== 'rejected' && ( <button onClick={() => updateStatus(feedback._id, 'rejected')} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition-all">拒绝</button> )}
                              <button onClick={() => updateStatus(feedback._id, feedback.status)} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm transition-all">仅添加回复</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* 底部信息 */}
      <div className="mt-6 text-center text-[10px] md:text-xs text-purple-200/40 px-4 transform scale-90 origin-center space-y-2 pb-6">
        <p>Copyright© 2026 赵启涵.</p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mt-1">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:text-purple-200 transition-colors">京ICP备2026010091号-1</a>
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=11011402055565" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-purple-200 transition-colors">
            <img src={beian} alt="公安" className="w-3 h-3 md:w-4 md:h-4" /> 京公网安备11011402055565号
          </a>
        </div>
      </div>

      {/* 动态加权核算器弹窗 */}
      {showWeightCalc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-5xl p-6 relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <button onClick={() => setShowWeightCalc(false)} className="absolute top-4 right-4 text-purple-200/50 hover:text-white text-lg z-10">✕</button>
            
            <div className="flex flex-wrap items-center justify-between mb-4 pr-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><span>🧮</span> 期末分数动态加权结算器</h3>
              <button onClick={handleApplyWeighting} className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                ✓ 确认并应用加权到总分
              </button>
            </div>
            
            <p className="text-xs text-purple-200/60 mb-6">公式：该板块结算分 = 该板块满分 × (已参加活动对应设定的权重之和) / 该板块内设定所有活动总次数(×1)</p>
            
            <div className="grid md:grid-cols-3 gap-6 flex-1 min-h-0">
              <div className="md:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="text-xs text-purple-200/60 mb-1 block">1. 选择需加权结算的板块</label>
                  <select value={calcDimension} onChange={e => setCalcDimension(e.target.value)} className="w-full px-3 py-2 bg-slate-950 rounded-lg text-white border border-white/10 outline-none focus:border-blue-500 transition-colors">
                    {Object.entries(PERF_DIMENSIONS).map(([k, v]) => <option key={k} value={k}>{v.label} (满分 {v.max})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-purple-200/60 mb-1 block">2. 设定【该板块内所有活动总次数】分母</label>
                  <input type="number" min="1" value={totalActivitiesCount} onChange={e => setTotalActivitiesCount(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-950 rounded-lg text-white border border-white/10 outline-none focus:border-blue-500" />
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <label className="text-xs text-blue-300 font-bold mb-2 block">3. 各活动名称及权重配置 (自动提取自流水)</label>
                  {[...new Set(performanceRecords.filter(r => r.dimension === calcDimension && r.activityName !== '期末系统加权').map(r => r.activityName || '未命名/常规记录'))].map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 mb-2 p-2 bg-white/5 rounded border border-white/5">
                      <span className="text-xs text-white truncate flex-1" title={activity}>{activity}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-purple-200/50">权重:</span>
                        <input type="number" step="0.1" min="0" value={weightConfig[activity] ?? 1} 
                          onChange={e => setWeightConfig({...weightConfig, [activity]: Number(e.target.value)})} 
                          className="w-14 px-1 py-1 bg-slate-950 rounded text-white text-xs border border-white/10 text-center outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  ))}
                  {[...new Set(performanceRecords.filter(r => r.dimension === calcDimension && r.activityName !== '期末系统加权').map(r => r.activityName || '未命名/常规记录'))].length === 0 && (
                    <p className="text-xs text-purple-200/40 text-center py-4">当前学期该板块暂无任何有效流水记录</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden">
                <div className="p-3 bg-blue-900/20 border-b border-white/10 shrink-0">
                  <span className="text-sm font-bold text-blue-300">📊 加权后预览榜单 (点击应用前仅作预览)</span>
                </div>
                <div className="overflow-y-auto p-0 flex-1 custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 sticky top-0 backdrop-blur text-purple-200/60 text-xs">
                      <tr><th className="py-2 pl-4">干事姓名</th><th className="py-2">有效参次记录</th><th className="py-2 text-blue-300">累计获得权重</th><th className="py-2 pr-4 font-bold text-white text-right">加权后覆盖得分</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {volunteers.map(v => {
                        const userRecords = performanceRecords.filter(r => r.volunteer?._id === v._id && r.dimension === calcDimension);
                        let attendedWeight = 0;
                        userRecords.forEach(r => {
                          if (r.activityName === '期末系统加权') return; 
                          const nameKey = r.activityName || '未命名/常规记录';
                          if (r.score > 0) {
                              if (weightConfig[nameKey] !== undefined) {
                                  attendedWeight += Number(weightConfig[nameKey]);
                              } else {
                                  attendedWeight += 1;
                              }
                          }
                        });
                        const maxScore = PERF_DIMENSIONS[calcDimension]?.max || 100;
                        const finalScore = (maxScore * attendedWeight) / (totalActivitiesCount || 1);
                        return { user: v, count: userRecords.filter(r => r.score > 0 && r.activityName !== '期末系统加权').length, weight: attendedWeight, score: finalScore };
                      }).sort((a, b) => b.score - a.score).map((data, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="py-3 pl-4 font-medium text-white">{data.user.name}</td>
                          <td className="py-3 text-purple-200/60">{data.count} 条记录</td>
                          <td className="py-3 font-mono text-blue-300">{data.weight.toFixed(1)}</td>
                          <td className="py-3 pr-4 text-right text-lg font-bold text-green-400">{data.score.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全局设置弹窗 */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl">
            <button onClick={() => setShowSettingsModal(false)} className="absolute top-4 right-4 text-purple-200/50 hover:text-white text-lg">✕</button>
            <div className="flex mb-6 p-1 bg-white/5 rounded-xl w-full">
              <button onClick={() => setSettingsTab('profile')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settingsTab === 'profile' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-200/60 hover:text-white'}`}>个人资料</button>
              <button onClick={() => setSettingsTab('password')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settingsTab === 'password' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-200/60 hover:text-white'}`}>修改密码</button>
            </div>
            {settingsTab === 'profile' ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-purple-200/80">学号</label>
                    <input type="text" required value={profileData.studentId} onChange={e => setProfileData({...profileData, studentId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-purple-200/80">姓名</label>
                    <input type="text" required value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-purple-200/80">邮箱</label>
                  <input type="email" required value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-purple-200/80">手机号</label>
                  <input type="text" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all font-medium shadow-lg shadow-purple-500/20">保存资料修改</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-purple-200/80">当前密码</label>
                  <input type="password" required value={pwdData.current} onChange={e => setPwdData({...pwdData, current: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500" placeholder="输入当前使用的密码" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-purple-200/80">新密码</label>
                  <input type="password" required value={pwdData.new} onChange={e => setPwdData({...pwdData, new: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-purple-500" placeholder="设置新密码（至少6位）" />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all font-medium shadow-lg shadow-purple-500/20">确认修改密码</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}