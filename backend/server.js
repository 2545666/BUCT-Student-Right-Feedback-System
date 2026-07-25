// ============================================
// 北京化工大学国际教育学院 - SIEVOX学生权益反馈系统
// 后端服务器 - Express + MongoDB + JWT
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https'); // [新增] 引入 https 模块
const http = require('http'); // [新增] 引入 http 模块用于重定向
const {
  ORGANIZATIONS,
  MEMBER_ROLES,
  POSITION_TITLES,
  getDepartmentLabel,
  getHubModuleAccess,
  getIdentityLabel,
  getVolunteerPerformancePolicy,
  isValidManagedDepartment,
  listDepartments,
  listHubModules,
  listHubWindows,
  HUB_SYSTEM,
  validateAssignment
} = require('./organization');
const app = express();
app.set('trust proxy', 1);
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    // 解决中文文件名乱码问题，使用时间戳+随机数
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 限制 50MB

// [修复] 将静态资源映射到 /api/uploads 下，完美利用现有的代理配置
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
// ============================================
// 环境配置
// ============================================
const config = {
  port: process.env.PORT || 3101,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/buct_feedback',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-buct-2024-secure',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  nodeEnv: process.env.NODE_ENV || 'development'
};

app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ============================================
// 安全中间件配置
// ============================================

// Helmet - 设置安全HTTP头
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求体解析
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 数据清洗 - 防止NoSQL注入
app.use(mongoSanitize());

// XSS防护
app.use(xss());

// 防止HTTP参数污染
app.use(hpp());

// 压缩响应
app.use(compression());

// 请求日志
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============================================
// MongoDB 数据模型
// ============================================

// 用户模型
const userSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, '学号是必填项'],
    unique: true,
    trim: true,
    match: [/^\d{8,12}$/, '学号格式不正确']
  },
  password: {
    type: String,
    required: [true, '密码是必填项'],
    minlength: [6, '密码至少6位'],
    select: false // 查询时默认不返回密码
  },
  name: {
    type: String,
    required: [true, '姓名是必填项'],
    trim: true,
    maxlength: [50, '姓名不能超过50个字符']
  },
  email: {
    type: String,
    required: [true, '邮箱是必填项'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, '邮箱格式不正确']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^1[3-9]\d{9}$/, '手机号格式不正确']
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'superadmin'],
    default: 'student'
  },
  // 临时最高权限与现有角色体系解耦，由环境变量指定账号授予。
  isUltimateAdmin: {
    type: Boolean,
    default: false
  },
  memberRole: {
    type: String,
    enum: Object.keys(MEMBER_ROLES),
    default: 'student'
  },
  positionTitle: {
    type: String,
    enum: Object.keys(POSITION_TITLES),
    default: 'student'
  },
  organization: {
    type: String,
    enum: [...Object.keys(ORGANIZATIONS), null],
    default: null
  },
  department: {
    type: String,
    default: null
  },
  managedDepartments: [{
    organization: {
      type: String,
      enum: Object.keys(ORGANIZATIONS)
    },
    department: String,
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true
});

// 密码加密
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 验证密码
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 检查账户是否被锁定
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

const User = mongoose.model('User', userSchema);

// 反馈模型
const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
 category: {
    type: String,
    // [修改] 移除了 financial 和 other，增加了 comprehensive
    enum: ['academic', 'accommodation', 'catering', 'safety', 'comprehensive'],
    required: [true, '请选择问题类别']
  },
  // [新增] 必须包含二级具体分类
  subCategory: {
    type: String,
    required: [true, '请选择具体的诉求分类']
  },
  handlingOrganization: {
    type: String,
    enum: [...Object.keys(ORGANIZATIONS), null],
    default: null
  },
  handlingDepartment: {
    type: String,
    default: null
  },
  handlingHistory: [{
    organization: String,
    department: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: String
  }],
  title: {
    type: String,
    required: [true, '标题是必填项'],
    trim: true,
    maxlength: [100, '标题不能超过100个字符']
  },
  content: {
    type: String,
    required: [true, '内容是必填项'],
    trim: true,
    maxlength: [2000, '内容不能超过2000个字符']
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'resolved', 'rejected'],
    default: 'pending'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String
  }],
 responses: [{
    content: String,
    senderType: { type: String, enum: ['student', 'admin', 'superadmin'] },
    senderName: String,
    adminId: mongoose.Schema.Types.ObjectId, // [新增] 记录操作者的唯一ID
    adminName: String,
    attachments: Array,
    isRecalled: { type: Boolean, default: false }, 
    recalledByRole: String, // [新增] 记录是由谁撤回的 ('self' 或 'superadmin')
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  tags: [String],
  // [新增] 软删除/撤回标记
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: Date
}, {
  timestamps: true
});
// 创建索引以优化查询性能
feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ category: 1, status: 1 });
feedbackSchema.index({ status: 1, priority: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

// [新增] 消息通知 Schema
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String, // 'new_feedback', 'status_update', 'new_message'
  content: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// 操作日志模型 - 用于审计
const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  resource: String,
  resourceId: mongoose.Schema.Types.ObjectId,
  details: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String
}, {
  timestamps: true
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// [修改] 纯加分制绩效考核流水模型
const performanceRecordSchema = new mongoose.Schema({
  volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dimension: { 
    type: String, 
    enum: ['attendance', 'activity', 'feedback', 'copywriting', 'others', 'bonus'], // [修改] 纯加分维度
    required: true 
  },
  score: { type: Number, required: true }, 
  reason: { type: String, required: true },
  occurrenceDate: { type: Date, required: true },
  activityName: { type: String },
  organization: { type: String, enum: [...Object.keys(ORGANIZATIONS), null], default: null },
  department: { type: String, default: null },
  semester: { type: String, required: true } // [新增] 学期归档标签
}, { timestamps: true });

const PerformanceRecord = mongoose.model('PerformanceRecord', performanceRecordSchema);

const performancePolicyDimensionSchema = new mongoose.Schema({
  key: {
    type: String,
    enum: ['attendance', 'activity', 'feedback', 'copywriting', 'others', 'bonus'],
    required: true
  },
  label: { type: String, required: true },
  maxScore: { type: Number, default: null },
  capLabel: { type: String, required: true },
  color: { type: String, default: 'slate' },
  rule: { type: String, required: true },
  scoringMode: {
    type: String,
    enum: ['capped_additive', 'bonus'],
    default: 'capped_additive'
  }
}, { _id: false });

const departmentPerformancePolicySchema = new mongoose.Schema({
  organization: { type: String, enum: Object.keys(ORGANIZATIONS), required: true },
  department: { type: String, required: true },
  sourcePolicyId: { type: String, required: true },
  template: { type: String, default: 'sievox_default_v1' },
  sourceProduct: { type: String, default: 'SIEVOX' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  totalBaseScore: { type: Number, default: 100 },
  bonusMode: { type: String, enum: ['extra'], default: 'extra' },
  dimensions: { type: [performancePolicyDimensionSchema], default: [] },
  notes: { type: [String], default: [] },
  version: { type: Number, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
departmentPerformancePolicySchema.index({ organization: 1, department: 1 }, { unique: true });
const DepartmentPerformancePolicy = mongoose.model('DepartmentPerformancePolicy', departmentPerformancePolicySchema);

// [新增] 系统配置模型 (用于存储当前运行的学期)
const systemConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true }
});
const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

// [新增] 按学期成员名单模型 (绩效"人员存档")
// 每条记录表示：某个志愿者(User) 属于某个学期(semester) 的绩效名单。
// 冻结时对 name/studentId 做快照，防止账号后续被注销/改名后历史名单丢失姓名。
const semesterMemberSchema = new mongoose.Schema({
  volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  semester:  { type: String, required: true },
  name:      { type: String },   // 快照
  studentId: { type: String },   // 快照
  addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
semesterMemberSchema.index({ volunteer: 1, semester: 1 }, { unique: true });
const SemesterMember = mongoose.model('SemesterMember', semesterMemberSchema);

const cohortSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  semesters: [{ type: String }],
  archivedAt: Date,
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
const Cohort = mongoose.model('Cohort', cohortSchema);

const cohortMembershipSchema = new mongoose.Schema({
  cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  accountSnapshot: {
    name: String,
    studentId: String,
    email: String,
    phone: String
  },
  systemRole: { type: String, enum: ['student', 'admin', 'superadmin'], required: true },
  memberRole: { type: String, enum: Object.keys(MEMBER_ROLES), required: true },
  positionTitle: { type: String, enum: Object.keys(POSITION_TITLES), required: true },
  organization: { type: String, enum: [...Object.keys(ORGANIZATIONS), null], default: null },
  department: { type: String, default: null },
  managedDepartments: [{
    organization: { type: String, enum: Object.keys(ORGANIZATIONS) },
    department: String,
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date
  }],
  appointmentHistory: [{
    memberRole: String,
    positionTitle: String,
    organization: String,
    department: String,
    startDate: Date,
    endDate: Date
  }],
  performanceSnapshot: {
    total: { type: Number, default: 0 },
    byDimension: { type: mongoose.Schema.Types.Mixed, default: {} },
    rank: Number,
    records: { type: [mongoose.Schema.Types.Mixed], default: [] },
    semesters: { type: [String], default: [] },
    archivedAt: Date
  },
  archivedAt: Date,
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
cohortMembershipSchema.index({ cohort: 1, user: 1 }, { unique: true, sparse: true });
const CohortMembership = mongoose.model('CohortMembership', cohortMembershipSchema);

// [新增] 读取/记录"已纳入名单管理"的学期集合 (存于 SystemConfig, JSON 字符串)
// 被标记为 managed 的学期：新开启的学期、或超管显式保存过名单的学期 —— 其"空名单"即真正为空，不再回退。
async function getManagedSemesters() {
  const doc = await SystemConfig.findOne({ key: 'rosterManagedSemesters' });
  if (!doc) return [];
  try { return JSON.parse(doc.value) || []; } catch (e) { return []; }
}
async function markSemesterManaged(semester) {
  if (!semester) return;
  const list = await getManagedSemesters();
  if (!list.includes(semester)) {
    list.push(semester);
    await SystemConfig.findOneAndUpdate(
      { key: 'rosterManagedSemesters' },
      { value: JSON.stringify(list) },
      { upsert: true }
    );
  }
}

// [新增] 名单解析工具：按"解析规则"返回某学期的有效成员 [{ _id, name, studentId }]
// 规则：1) 存在显式名单 → 用显式名单(账号被注销时回退快照)
//       2) 学期已被 managed 但无显式名单 → 空即为空(新学期/已清空的名单)
//       3) 无显式名单且为当前运行学期(未 managed) → 当前全部 admin(上线兼容,可编辑)
//       4) 无显式名单且为历史学期(未 managed) → 该学期绩效流水中出现过的成员
async function resolveSemesterMembers(semester) {
  const explicit = await SemesterMember.find({ semester })
    .populate('volunteer', 'name studentId')
    .sort({ createdAt: 1 });
  if (explicit.length > 0) {
    const members = explicit.map(m => ({
      _id: m.volunteer?._id || m.volunteer,
      name: m.volunteer?.name || m.name,
      studentId: m.volunteer?.studentId || m.studentId
    }));
    return { members, source: 'explicit' };
  }

  // 已被显式管理(新学期或曾保存过名单)→ 空即为空，不再回退
  const managed = await getManagedSemesters();
  if (managed.includes(semester)) {
    return { members: [], source: 'explicit' };
  }

  const config = await SystemConfig.findOne({ key: 'currentSemester' });
  const currentSemester = config ? config.value : null;

  if (semester && semester === currentSemester) {
    const admins = await User.find({ role: 'admin' })
      .select('name studentId').sort({ createdAt: -1 });
    return { members: admins.map(u => ({ _id: u._id, name: u.name, studentId: u.studentId })), source: 'current' };
  }

  const volunteerIds = await PerformanceRecord.find({ semester }).distinct('volunteer');
  const users = await User.find({ _id: { $in: volunteerIds } }).select('name studentId');
  return { members: users.map(u => ({ _id: u._id, name: u.name, studentId: u.studentId })), source: 'legacy' };
}

// ============================================
// 中间件
// ============================================

// JWT认证中间件
const authenticate = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: '用户不存在或已被禁用' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '认证失败，请重新登录' });
  }
};

// 管理员权限中间件
const adminOnly = (req, res, next) => {
  if (!req.user.isUltimateAdmin && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: '无权限访问' });
  }
  next();
};

// 记录审计日志
const logAction = async (userId, action, resource, resourceId, details, req) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      resource,
      resourceId,
      details,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    console.error('审计日志记录失败:', error);
  }
};

// 输入验证辅助函数
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/<[^>]*>/g, '');
  }
  return input;
};

const sanitizeManagedDepartments = (departments = [], assignedBy = null) => {
  if (!Array.isArray(departments)) return [];
  const seen = new Set();
  return departments
    .filter(isValidManagedDepartment)
    .filter(item => {
      const key = `${item.organization}:${item.department}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(item => ({
      organization: item.organization,
      department: item.department,
      assignedBy,
      assignedAt: new Date()
    }));
};

const getUserManagedDepartments = (user = {}) => {
  if (user.isUltimateAdmin) return listDepartments();
  const assignments = [];

  if (['department_head', 'youth_league_cadre'].includes(user.positionTitle) && user.organization && user.department) {
    assignments.push({ organization: user.organization, department: user.department });
  }

  if (Array.isArray(user.managedDepartments)) {
    user.managedDepartments.forEach(item => {
      if (isValidManagedDepartment(item)) assignments.push({
        organization: item.organization,
        department: item.department
      });
    });
  }

  const seen = new Set();
  return assignments.filter(item => {
    const key = `${item.organization}:${item.department}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const serializeManagedDepartment = (item = {}) => ({
  organization: item.organization,
  organizationLabel: ORGANIZATIONS[item.organization]?.label || '',
  department: item.department,
  departmentLabel: ORGANIZATIONS[item.organization]?.departments?.[item.department] || '',
  label: getDepartmentLabel(item.organization, item.department)
});

const serializeUser = (user) => ({
  _id: user._id,
  id: user._id,
  studentId: user.studentId,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  role: user.role,
  isUltimateAdmin: Boolean(user.isUltimateAdmin),
  memberRole: user.memberRole || 'student',
  positionTitle: user.positionTitle || (user.role === 'admin' ? 'volunteer' : 'student'),
  identityLabel: getIdentityLabel(user),
  organization: user.organization || null,
  organizationLabel: ORGANIZATIONS[user.organization]?.label || '',
  department: user.department || null,
  departmentLabel: getDepartmentLabel(user.organization, user.department),
  managedDepartments: getUserManagedDepartments(user).map(serializeManagedDepartment),
  moduleCapabilities: getHubModuleAccess(user)
});

const getPerformancePolicyModuleAccess = (user, assignment) => {
  const moduleAccess = getHubModuleAccess(user).find(item =>
    item.organization === assignment.organization &&
    item.department === assignment.department
  );
  if (!moduleAccess) return null;
  return {
    moduleId: moduleAccess.moduleId,
    accessLevel: moduleAccess.accessLevel,
    capabilities: moduleAccess.capabilities || [],
    canEdit: moduleAccess.capabilities?.includes('manage_volunteer_performance_policy') || false
  };
};

const serializeDepartmentPerformancePolicy = (policyDoc, organization, department) => {
  const basePolicy = getVolunteerPerformancePolicy(organization, department);
  if (!basePolicy) return null;
  if (!policyDoc) {
    return {
      ...basePolicy,
      isCustomized: false,
      updatedAt: null,
      updatedBy: null
    };
  }

  const policy = policyDoc.toObject ? policyDoc.toObject() : policyDoc;
  const updatedBy = policy.updatedBy && typeof policy.updatedBy === 'object'
    ? {
      id: policy.updatedBy._id || policy.updatedBy.id,
      name: policy.updatedBy.name || '',
      studentId: policy.updatedBy.studentId || ''
    }
    : null;

  return {
    ...basePolicy,
    id: policy._id || basePolicy.id,
    sourcePolicyId: policy.sourcePolicyId || basePolicy.sourcePolicyId,
    version: policy.version || 1,
    template: policy.template || basePolicy.template,
    sourceProduct: policy.sourceProduct || basePolicy.sourceProduct,
    title: policy.title || basePolicy.title,
    description: policy.description || basePolicy.description,
    totalBaseScore: policy.totalBaseScore ?? basePolicy.totalBaseScore,
    bonusMode: policy.bonusMode || basePolicy.bonusMode,
    dimensions: Array.isArray(policy.dimensions) && policy.dimensions.length
      ? policy.dimensions.map(item => ({
        key: item.key,
        label: item.label,
        maxScore: item.maxScore ?? null,
        capLabel: item.capLabel,
        color: item.color,
        rule: item.rule,
        scoringMode: item.scoringMode
      }))
      : basePolicy.dimensions,
    notes: Array.isArray(policy.notes) && policy.notes.length ? policy.notes : basePolicy.notes,
    isCustomized: true,
    updatedAt: policy.updatedAt || null,
    updatedBy
  };
};

const sanitizePolicyText = (value, fallback, maxLength = 220) => {
  const clean = sanitizeInput(value);
  const text = typeof clean === 'string' && clean.trim() ? clean.trim() : fallback;
  return text.slice(0, maxLength);
};

const normalizeDepartmentPerformancePolicyPayload = (payload = {}, organization, department) => {
  const basePolicy = getVolunteerPerformancePolicy(organization, department);
  const incomingDimensions = Array.isArray(payload.dimensions) ? payload.dimensions : [];
  const incomingByKey = new Map(incomingDimensions.map(item => [item?.key, item]));
  const dimensions = basePolicy.dimensions.map(defaultDimension => {
    const incoming = incomingByKey.get(defaultDimension.key) || {};
    const isBonus = defaultDimension.key === 'bonus';
    const requestedMax = Number(incoming.maxScore ?? defaultDimension.maxScore ?? 0);
    const maxScore = isBonus ? null : Math.max(0, Math.min(100, Number.isFinite(requestedMax) ? requestedMax : defaultDimension.maxScore));
    return {
      key: defaultDimension.key,
      label: sanitizePolicyText(incoming.label, defaultDimension.label, 32),
      maxScore,
      capLabel: sanitizePolicyText(incoming.capLabel, isBonus ? '附加' : `${maxScore}分`, 16),
      color: defaultDimension.color,
      rule: sanitizePolicyText(incoming.rule, defaultDimension.rule, 420),
      scoringMode: defaultDimension.scoringMode
    };
  });
  const totalBaseScore = dimensions
    .filter(item => item.scoringMode !== 'bonus')
    .reduce((sum, item) => sum + Number(item.maxScore || 0), 0);

  const notes = Array.isArray(payload.notes)
    ? payload.notes.map(item => sanitizePolicyText(item, '', 120)).filter(Boolean).slice(0, 4)
    : basePolicy.notes;

  return {
    sourcePolicyId: basePolicy.sourcePolicyId,
    template: basePolicy.template,
    sourceProduct: basePolicy.sourceProduct,
    title: sanitizePolicyText(payload.title, basePolicy.title, 80),
    description: sanitizePolicyText(payload.description, basePolicy.description, 180),
    totalBaseScore,
    bonusMode: basePolicy.bonusMode,
    dimensions,
    notes: notes.length ? notes : basePolicy.notes
  };
};

const getCurrentSemesterName = async () => {
  let current = await SystemConfig.findOne({ key: 'currentSemester' });
  if (!current) {
    current = await SystemConfig.create({ key: 'currentSemester', value: '2025-2026学年 第二学期' });
  }
  return current.value;
};

const getDepartmentPerformanceAccess = (user, assignment) => {
  const access = getPerformancePolicyModuleAccess(user, assignment);
  if (!access || !access.canEdit) return null;
  return access;
};

const serializeDepartmentPerformanceRecord = (record) => ({
  id: record._id,
  _id: record._id,
  volunteer: record.volunteer ? {
    id: record.volunteer._id || record.volunteer.id,
    _id: record.volunteer._id || record.volunteer.id,
    name: record.volunteer.name || '',
    studentId: record.volunteer.studentId || ''
  } : null,
  recordedBy: record.recordedBy ? {
    id: record.recordedBy._id || record.recordedBy.id,
    name: record.recordedBy.name || ''
  } : null,
  dimension: record.dimension,
  score: record.score,
  reason: record.reason,
  occurrenceDate: record.occurrenceDate,
  activityName: record.activityName || '',
  organization: record.organization,
  department: record.department,
  semester: record.semester,
  createdAt: record.createdAt
});

const hasSuperadminAccess = (user) => Boolean(user?.isUltimateAdmin || user?.role === 'superadmin');
const hasUltimateAccess = (user) => Boolean(user?.isUltimateAdmin);

const ultimateOnly = (req, res, next) => {
  if (!hasUltimateAccess(req.user)) {
    return res.status(403).json({ success: false, message: '仅终极管理员可用' });
  }
  next();
};

const buildDepartmentScopedQuery = (user) => {
  if (user.isUltimateAdmin) return {};
  const managed = getUserManagedDepartments(user);
  const unassignedFeedbackScope = [
    { handlingOrganization: null },
    { handlingOrganization: { $exists: false } },
    { handlingDepartment: null },
    { handlingDepartment: { $exists: false } }
  ];
  if (managed.length === 0) return { $or: unassignedFeedbackScope };
  return {
    $or: [
      ...unassignedFeedbackScope,
      ...managed.map(item => ({
        handlingOrganization: item.organization,
        handlingDepartment: item.department
      }))
    ]
  };
};

const ensureFeedbackAccess = (user, feedback) => {
  if (user.isUltimateAdmin) return true;
  if (user.role === 'admin') return true;
  if (user.role !== 'superadmin') return false;
  if (!feedback.handlingOrganization || !feedback.handlingDepartment) return true;
  return getUserManagedDepartments(user).some(item =>
    item.organization === feedback.handlingOrganization &&
    item.department === feedback.handlingDepartment
  );
};

const buildUserDepartmentScopedQuery = (user) => {
  if (user.isUltimateAdmin) return {};
  const managed = getUserManagedDepartments(user);
  if (managed.length === 0) return { _id: null };
  return {
    $or: managed.map(item => ({
      organization: item.organization,
      department: item.department
    }))
  };
};

const getScopedVolunteerIds = async (user) => {
  if (user.isUltimateAdmin) return null;
  const scopeQuery = buildUserDepartmentScopedQuery(user);
  if (scopeQuery._id === null) return [];
  const ids = await User.find({ role: 'admin', ...scopeQuery }).distinct('_id');
  return ids.map(id => id.toString());
};

const filterMembersByDepartmentScope = async (user, members = []) => {
  if (user.isUltimateAdmin) return members;
  const allowedIds = new Set(await getScopedVolunteerIds(user));
  return members.filter(member => allowedIds.has(String(member._id)));
};

const ensureVolunteerDepartmentAccess = (user, volunteer) => {
  if (user.isUltimateAdmin) return true;
  if (user.role !== 'superadmin' || !volunteer) return false;
  return getUserManagedDepartments(user).some(item =>
    item.organization === volunteer.organization &&
    item.department === volunteer.department
  );
};

const ensurePerformanceRecordAccess = (user, record) => {
  if (user.isUltimateAdmin) return true;
  if (ensureVolunteerDepartmentAccess(user, record.volunteer)) return true;
  return getUserManagedDepartments(user).some(item =>
    item.organization === record.organization &&
    item.department === record.department
  );
};

const buildPerformanceSnapshot = async (userId, semesters = []) => {
  const query = { volunteer: userId };
  if (semesters.length > 0) query.semester = { $in: semesters };
  const records = await PerformanceRecord.find(query)
    .populate('recordedBy', 'name')
    .sort({ occurrenceDate: -1, createdAt: -1 })
    .lean();
  const byDimension = {};
  let total = 0;
  records.forEach(record => {
    const score = Number(record.score || 0);
    total += score;
    byDimension[record.dimension] = (byDimension[record.dimension] || 0) + score;
  });
  return {
    total,
    byDimension,
    records,
    semesters,
    archivedAt: new Date()
  };
};

const serializeCohort = (cohort) => ({
  id: cohort._id,
  name: cohort.name,
  startDate: cohort.startDate,
  endDate: cohort.endDate,
  status: cohort.status,
  semesters: cohort.semesters || [],
  archivedAt: cohort.archivedAt || null,
  createdAt: cohort.createdAt
});

const serializeCohortMember = (member) => {
  const account = member.accountSnapshot || {};
  return {
    id: member._id,
    cohort: member.cohort,
    userId: member.user?._id || member.user || null,
    name: account.name || member.user?.name || '',
    studentId: account.studentId || member.user?.studentId || '',
    email: account.email || member.user?.email || '',
    phone: account.phone || member.user?.phone || '',
    systemRole: member.systemRole,
    memberRole: member.memberRole,
    memberRoleLabel: MEMBER_ROLES[member.memberRole] || '',
    positionTitle: member.positionTitle,
    identityLabel: POSITION_TITLES[member.positionTitle] || '',
    organization: member.organization || null,
    organizationLabel: ORGANIZATIONS[member.organization]?.label || '',
    department: member.department || null,
    departmentLabel: getDepartmentLabel(member.organization, member.department),
    managedDepartments: (member.managedDepartments || []).map(serializeManagedDepartment),
    appointmentHistory: member.appointmentHistory || [],
    performanceSnapshot: member.performanceSnapshot || {},
    archivedAt: member.archivedAt || null
  };
};

const buildMemberSnapshot = (user) => ({
  name: user.name,
  studentId: user.studentId,
  email: user.email,
  phone: user.phone || ''
});

const buildIdentityUpdate = (input = {}, actorId = null) => {
  const requested = {
    memberRole: input.memberRole || 'student',
    positionTitle: input.positionTitle || 'student',
    organization: input.organization || null,
    department: input.department || null
  };
  const validation = validateAssignment(requested);
  if (!validation.valid) return validation;

  const update = {
    role: validation.accessRole,
    memberRole: requested.memberRole,
    positionTitle: requested.positionTitle,
    organization: validation.organization,
    department: validation.department
  };

  if (requested.memberRole === 'presidium') {
    update.managedDepartments = sanitizeManagedDepartments(input.managedDepartments, actorId);
  } else {
    update.managedDepartments = [];
  }

  return { valid: true, update };
};

// ============================================
// API 路由
// ============================================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '服务运行正常',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/organization/meta', (req, res) => {
  res.json({
    success: true,
    organizations: ORGANIZATIONS,
    departments: listDepartments(),
    memberRoles: MEMBER_ROLES,
    positionTitles: POSITION_TITLES
  });
});

app.get('/api/hub/modules', (req, res) => {
  res.json({
    success: true,
    hub: HUB_SYSTEM,
    modules: listHubModules(),
    windows: listHubWindows()
  });
});

app.get('/api/hub/me', authenticate, (req, res) => {
  res.json({
    success: true,
    hub: HUB_SYSTEM,
    user: serializeUser(req.user),
    modules: listHubModules(),
    windows: listHubWindows(),
    accessibleModules: getHubModuleAccess(req.user)
  });
});

app.get('/api/hub/departments/:organization/:department/performance-policy', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getPerformancePolicyModuleAccess(req.user, assignment);
  if (!access) {
    return res.status(403).json({ success: false, message: '无权访问该部门绩效制度' });
  }

  try {
    const policy = await DepartmentPerformancePolicy
      .findOne(assignment)
      .populate('updatedBy', 'name studentId')
      .lean();
    res.json({
      success: true,
      policy: serializeDepartmentPerformancePolicy(policy, assignment.organization, assignment.department),
      access
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门绩效制度失败' });
  }
});

app.put('/api/hub/departments/:organization/:department/performance-policy', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getPerformancePolicyModuleAccess(req.user, assignment);
  if (!access) {
    return res.status(403).json({ success: false, message: '无权访问该部门绩效制度' });
  }
  if (!access.canEdit) {
    return res.status(403).json({ success: false, message: '当前身份不能编辑该部门绩效制度' });
  }

  try {
    const existing = await DepartmentPerformancePolicy.findOne(assignment).lean();
    const normalizedPolicy = normalizeDepartmentPerformancePolicyPayload(req.body, assignment.organization, assignment.department);
    const policy = await DepartmentPerformancePolicy.findOneAndUpdate(
      assignment,
      {
        ...assignment,
        ...normalizedPolicy,
        version: (existing?.version || 0) + 1,
        updatedBy: req.user._id
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('updatedBy', 'name studentId');

    await logAction(req.user._id, 'update_performance_policy', 'departmentPerformancePolicy', policy._id, assignment, req);
    res.json({
      success: true,
      message: '绩效制度已保存',
      policy: serializeDepartmentPerformancePolicy(policy, assignment.organization, assignment.department),
      access
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '保存部门绩效制度失败' });
  }
});

app.post('/api/hub/departments/:organization/:department/performance-policy/reset', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getPerformancePolicyModuleAccess(req.user, assignment);
  if (!access) {
    return res.status(403).json({ success: false, message: '无权访问该部门绩效制度' });
  }
  if (!access.canEdit) {
    return res.status(403).json({ success: false, message: '当前身份不能恢复该部门绩效制度' });
  }

  try {
    const existing = await DepartmentPerformancePolicy.findOneAndDelete(assignment).lean();
    await logAction(req.user._id, 'reset_performance_policy', 'departmentPerformancePolicy', existing?._id, assignment, req);
    res.json({
      success: true,
      message: '已恢复 SIEVOX 默认绩效制度',
      policy: serializeDepartmentPerformancePolicy(null, assignment.organization, assignment.department),
      access
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '恢复部门绩效制度失败' });
  }
});

app.get('/api/hub/departments/:organization/:department/performance-workbench', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getDepartmentPerformanceAccess(req.user, assignment);
  if (!access) {
    return res.status(403).json({ success: false, message: '当前身份不能管理该部门绩效' });
  }

  try {
    const currentSemester = await getCurrentSemesterName();
    const semester = sanitizeInput(req.query.semester) || currentSemester;
    const volunteers = await User.find({
      role: 'admin',
      organization: assignment.organization,
      department: assignment.department,
      isActive: true
    }).select('-password').sort({ studentId: 1 });
    const volunteerIds = volunteers.map(user => user._id);
    const rosterDocs = await SemesterMember.find({
      semester,
      volunteer: { $in: volunteerIds }
    }).populate('volunteer', 'name studentId email phone role memberRole positionTitle organization department').lean();
    const records = await PerformanceRecord.find({
      semester,
      organization: assignment.organization,
      department: assignment.department
    })
      .populate('volunteer', 'name studentId organization department')
      .populate('recordedBy', 'name')
      .sort({ occurrenceDate: -1, createdAt: -1 })
      .lean();
    const policyDoc = await DepartmentPerformancePolicy.findOne(assignment).populate('updatedBy', 'name studentId').lean();
    const recordSemesters = await PerformanceRecord.find({
      organization: assignment.organization,
      department: assignment.department
    }).distinct('semester');
    const semesters = Array.from(new Set([currentSemester, semester, ...recordSemesters].filter(Boolean)));

    res.json({
      success: true,
      access,
      currentSemester,
      semester,
      semesters,
      volunteers: volunteers.map(serializeUser),
      roster: rosterDocs.map(doc => doc.volunteer ? serializeUser(doc.volunteer) : null).filter(Boolean),
      records: records.map(serializeDepartmentPerformanceRecord),
      policy: serializeDepartmentPerformancePolicy(policyDoc, assignment.organization, assignment.department)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门绩效工作台失败' });
  }
});

app.put('/api/hub/departments/:organization/:department/performance-roster', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getDepartmentPerformanceAccess(req.user, assignment);
  if (!access) {
    return res.status(403).json({ success: false, message: '当前身份不能维护该部门成员名单' });
  }

  try {
    const semester = sanitizeInput(req.body.semester) || await getCurrentSemesterName();
    const requestedIds = Array.from(new Set((Array.isArray(req.body.volunteerIds) ? req.body.volunteerIds : []).map(String).filter(Boolean)));
    const departmentVolunteers = await User.find({
      role: 'admin',
      organization: assignment.organization,
      department: assignment.department,
      isActive: true
    }).select('name studentId');
    const allowedIds = new Set(departmentVolunteers.map(user => user._id.toString()));
    const hasOutOfScope = requestedIds.some(id => !allowedIds.has(id));
    if (hasOutOfScope) {
      return res.status(403).json({ success: false, message: '只能添加该部门内的志愿者账号' });
    }

    await SemesterMember.deleteMany({ semester, volunteer: { $in: Array.from(allowedIds) } });
    const selectedVolunteers = departmentVolunteers.filter(user => requestedIds.includes(user._id.toString()));
    if (selectedVolunteers.length > 0) {
      await SemesterMember.insertMany(selectedVolunteers.map(user => ({
        volunteer: user._id,
        semester,
        name: user.name,
        studentId: user.studentId,
        addedBy: req.user._id
      })));
    }
    await markSemesterManaged(semester);
    await logAction(req.user._id, 'update_department_performance_roster', 'semesterMember', req.user._id, { ...assignment, semester, count: selectedVolunteers.length }, req);
    res.json({ success: true, message: '部门成员名单已保存' });
  } catch (error) {
    res.status(500).json({ success: false, message: '保存部门成员名单失败' });
  }
});

app.post('/api/hub/departments/:organization/:department/performance-records', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getDepartmentPerformanceAccess(req.user, assignment);
  if (!access) {
    return res.status(403).json({ success: false, message: '当前身份不能录入该部门绩效' });
  }

  try {
    const semester = sanitizeInput(req.body.targetSemester) || await getCurrentSemesterName();
    const volunteerIds = Array.from(new Set((Array.isArray(req.body.volunteerIds) ? req.body.volunteerIds : []).map(String).filter(Boolean)));
    if (volunteerIds.length === 0) return res.status(400).json({ success: false, message: '请选择成员' });
    const policy = serializeDepartmentPerformancePolicy(
      await DepartmentPerformancePolicy.findOne(assignment).lean(),
      assignment.organization,
      assignment.department
    );
    const dimension = sanitizeInput(req.body.dimension);
    if (!policy.dimensions.some(item => item.key === dimension)) {
      return res.status(400).json({ success: false, message: '绩效维度无效' });
    }
    const score = Number(req.body.score);
    if (!Number.isFinite(score) || score <= 0) {
      return res.status(400).json({ success: false, message: '请输入有效加分' });
    }
    const reason = sanitizeInput(req.body.reason);
    if (!reason) return res.status(400).json({ success: false, message: '请填写加分事由' });

    const targetVolunteers = await User.find({
      _id: { $in: volunteerIds },
      role: 'admin',
      organization: assignment.organization,
      department: assignment.department,
      isActive: true
    }).select('organization department');
    if (targetVolunteers.length !== volunteerIds.length) {
      return res.status(403).json({ success: false, message: '只能为该部门志愿者录入绩效' });
    }
    const rosterCount = await SemesterMember.countDocuments({ semester, volunteer: { $in: volunteerIds } });
    if (rosterCount !== volunteerIds.length) {
      return res.status(400).json({ success: false, message: '请先将成员加入本学期绩效名单' });
    }

    const occurrenceDate = req.body.occurrenceDate ? new Date(req.body.occurrenceDate) : new Date();
    const records = volunteerIds.map(volunteerId => ({
      volunteer: volunteerId,
      recordedBy: req.user._id,
      dimension,
      score,
      reason,
      occurrenceDate,
      activityName: sanitizeInput(req.body.activityName) || '',
      organization: assignment.organization,
      department: assignment.department,
      semester
    }));
    await PerformanceRecord.insertMany(records);
    await logAction(req.user._id, 'create_department_performance_records', 'performanceRecord', req.user._id, { ...assignment, semester, count: records.length, dimension, score }, req);
    res.json({ success: true, message: '绩效录入成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '录入部门绩效失败' });
  }
});

app.delete('/api/hub/departments/:organization/:department/performance-records/:id', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getDepartmentPerformanceAccess(req.user, assignment);
  if (!access) {
    return res.status(403).json({ success: false, message: '当前身份不能撤回该部门绩效' });
  }

  try {
    const record = await PerformanceRecord.findOne({
      _id: req.params.id,
      organization: assignment.organization,
      department: assignment.department
    });
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });
    await record.deleteOne();
    await logAction(req.user._id, 'delete_department_performance_record', 'performanceRecord', req.params.id, assignment, req);
    res.json({ success: true, message: '绩效记录已撤回' });
  } catch (error) {
    res.status(500).json({ success: false, message: '撤回部门绩效失败' });
  }
});

app.get('/api/ultimate/overview', authenticate, ultimateOnly, async (req, res) => {
  try {
    const [cohortCount, archivedCount, memberCount, userCount] = await Promise.all([
      Cohort.countDocuments(),
      Cohort.countDocuments({ status: 'archived' }),
      CohortMembership.countDocuments(),
      User.countDocuments({ isActive: true })
    ]);
    res.json({
      success: true,
      stats: { cohortCount, archivedCount, memberCount, userCount },
      departments: listDepartments()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取总览失败' });
  }
});

app.get('/api/ultimate/cohorts', authenticate, ultimateOnly, async (req, res) => {
  try {
    const cohorts = await Cohort.find().sort({ startDate: -1, createdAt: -1 }).lean();
    res.json({ success: true, cohorts: cohorts.map(serializeCohort) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取届次失败' });
  }
});

app.post('/api/ultimate/cohorts', authenticate, ultimateOnly, async (req, res) => {
  try {
    const { name, startDate, endDate, status = 'draft', semesters = [] } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '请填写届次名称' });
    const cohort = await Cohort.create({
      name: sanitizeInput(name),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      semesters: Array.isArray(semesters) ? semesters.map(sanitizeInput).filter(Boolean) : []
    });
    await logAction(req.user._id, 'create_cohort', 'cohort', cohort._id, { name }, req);
    res.status(201).json({ success: true, cohort: serializeCohort(cohort) });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建届次失败' });
  }
});

app.patch('/api/ultimate/cohorts/:id', authenticate, ultimateOnly, async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });
    ['name', 'status'].forEach(field => {
      if (req.body[field] !== undefined) cohort[field] = sanitizeInput(req.body[field]);
    });
    if (req.body.startDate !== undefined) cohort.startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    if (req.body.endDate !== undefined) cohort.endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;
    if (Array.isArray(req.body.semesters)) cohort.semesters = req.body.semesters.map(sanitizeInput).filter(Boolean);
    await cohort.save();
    await logAction(req.user._id, 'update_cohort', 'cohort', cohort._id, {}, req);
    res.json({ success: true, cohort: serializeCohort(cohort) });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新届次失败' });
  }
});

app.get('/api/ultimate/users', authenticate, ultimateOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json({ success: true, users: users.map(serializeUser) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户失败' });
  }
});

app.patch('/api/ultimate/users/:studentId/identity', authenticate, ultimateOnly, async (req, res) => {
  try {
    const user = await User.findOne({ studentId: req.params.studentId });
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

    const identity = buildIdentityUpdate(req.body, req.user._id);
    if (!identity.valid) return res.status(400).json({ success: false, message: identity.message });
    Object.assign(user, identity.update);
    await user.save();

    await logAction(req.user._id, 'assign_identity', 'user', user._id, identity.update, req);
    res.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: '身份分配失败' });
  }
});

app.get('/api/ultimate/members', authenticate, ultimateOnly, async (req, res) => {
  try {
    const query = req.query.cohortId ? { cohort: req.query.cohortId } : {};
    const members = await CohortMembership.find(query)
      .populate('user', 'name studentId email phone')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, members: members.map(serializeCohortMember) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取届次成员失败' });
  }
});

app.post('/api/ultimate/members', authenticate, ultimateOnly, async (req, res) => {
  try {
    const { cohortId, studentId, password, name, email, phone } = req.body;
    if (!cohortId || !studentId) return res.status(400).json({ success: false, message: '缺少届次或学号' });
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });
    if (cohort.status === 'archived') return res.status(400).json({ success: false, message: '已归档届次不可继续编辑成员' });

    const identity = buildIdentityUpdate(req.body, req.user._id);
    if (!identity.valid) return res.status(400).json({ success: false, message: identity.message });

    let user = await User.findOne({ studentId });
    if (!user) {
      if (!password || !name || !email) {
        return res.status(400).json({ success: false, message: '新成员账号需要姓名、邮箱和初始密码' });
      }
      user = await User.create({
        studentId: sanitizeInput(studentId),
        password,
        name: sanitizeInput(name),
        email: sanitizeInput(email),
        phone: sanitizeInput(phone),
        ...identity.update
      });
    } else {
      if (name) user.name = sanitizeInput(name);
      if (email) user.email = sanitizeInput(email);
      if (phone !== undefined) user.phone = sanitizeInput(phone);
      Object.assign(user, identity.update);
      await user.save();
    }

    const membership = await CohortMembership.findOneAndUpdate(
      { cohort: cohort._id, user: user._id },
      {
        $set: {
          cohort: cohort._id,
          user: user._id,
          accountSnapshot: buildMemberSnapshot(user),
          systemRole: user.role,
          memberRole: user.memberRole,
          positionTitle: user.positionTitle,
          organization: user.organization,
          department: user.department,
          managedDepartments: user.managedDepartments
        },
        $push: {
          appointmentHistory: {
            memberRole: user.memberRole,
            positionTitle: user.positionTitle,
            organization: user.organization,
            department: user.department,
            startDate: req.body.appointmentStart ? new Date(req.body.appointmentStart) : new Date(),
            endDate: req.body.appointmentEnd ? new Date(req.body.appointmentEnd) : undefined
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('user', 'name studentId email phone');

    await logAction(req.user._id, 'upsert_cohort_member', 'cohortMembership', membership._id, { cohortId, studentId }, req);
    res.json({ success: true, member: serializeCohortMember(membership) });
  } catch (error) {
    console.error('保存届次成员失败:', error);
    res.status(500).json({ success: false, message: '保存届次成员失败' });
  }
});

app.patch('/api/ultimate/members/:id', authenticate, ultimateOnly, async (req, res) => {
  try {
    const membership = await CohortMembership.findById(req.params.id).populate('user');
    if (!membership) return res.status(404).json({ success: false, message: '成员不存在' });
    if (!membership.user) return res.status(400).json({ success: false, message: '成员未绑定账号' });
    const cohort = await Cohort.findById(membership.cohort);
    if (cohort?.status === 'archived') return res.status(400).json({ success: false, message: '已归档届次不可继续编辑成员' });

    const user = membership.user;
    ['name', 'email', 'phone', 'studentId'].forEach(field => {
      if (req.body[field] !== undefined) user[field] = sanitizeInput(req.body[field]);
    });

    const identity = buildIdentityUpdate({
      memberRole: req.body.memberRole || membership.memberRole,
      positionTitle: req.body.positionTitle || membership.positionTitle,
      organization: req.body.organization !== undefined ? req.body.organization : membership.organization,
      department: req.body.department !== undefined ? req.body.department : membership.department,
      managedDepartments: req.body.managedDepartments !== undefined ? req.body.managedDepartments : membership.managedDepartments
    }, req.user._id);
    if (!identity.valid) return res.status(400).json({ success: false, message: identity.message });

    Object.assign(user, identity.update);
    await user.save();

    membership.accountSnapshot = buildMemberSnapshot(user);
    membership.systemRole = user.role;
    membership.memberRole = user.memberRole;
    membership.positionTitle = user.positionTitle;
    membership.organization = user.organization;
    membership.department = user.department;
    membership.managedDepartments = user.managedDepartments;
    membership.appointmentHistory.push({
      memberRole: user.memberRole,
      positionTitle: user.positionTitle,
      organization: user.organization,
      department: user.department,
      startDate: req.body.appointmentStart ? new Date(req.body.appointmentStart) : new Date(),
      endDate: req.body.appointmentEnd ? new Date(req.body.appointmentEnd) : undefined
    });
    await membership.save();

    await logAction(req.user._id, 'update_cohort_member', 'cohortMembership', membership._id, {}, req);
    await membership.populate('user', 'name studentId email phone');
    res.json({ success: true, member: serializeCohortMember(membership) });
  } catch (error) {
    console.error('更新届次成员失败:', error);
    res.status(500).json({ success: false, message: '更新届次成员失败' });
  }
});

app.get('/api/ultimate/cohorts/:id/archive-preview', authenticate, ultimateOnly, async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });
    const members = await CohortMembership.find({ cohort: cohort._id }).populate('user', 'name studentId email phone');
    const previews = await Promise.all(members.map(async (member) => {
      const snapshot = await buildPerformanceSnapshot(member.user?._id || member.user, cohort.semesters || []);
      return {
        ...serializeCohortMember(member),
        performanceSnapshot: snapshot
      };
    }));

    previews.sort((a, b) => Number(b.performanceSnapshot?.total || 0) - Number(a.performanceSnapshot?.total || 0));
    previews.forEach((member, index) => {
      member.performanceSnapshot.rank = index + 1;
    });

    res.json({ success: true, cohort: serializeCohort(cohort), members: previews });
  } catch (error) {
    console.error('生成归档预览失败:', error);
    res.status(500).json({ success: false, message: '生成归档预览失败' });
  }
});

app.post('/api/ultimate/cohorts/:id/archive', authenticate, ultimateOnly, async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });
    const members = await CohortMembership.find({ cohort: cohort._id }).populate('user');
    const snapshots = [];

    for (const member of members) {
      if (member.user) member.accountSnapshot = buildMemberSnapshot(member.user);
      member.performanceSnapshot = await buildPerformanceSnapshot(member.user?._id || member.user, cohort.semesters || []);
      member.archivedAt = new Date();
      member.archivedBy = req.user._id;
      snapshots.push(member);
    }

    snapshots.sort((a, b) => Number(b.performanceSnapshot?.total || 0) - Number(a.performanceSnapshot?.total || 0));
    snapshots.forEach((member, index) => {
      member.performanceSnapshot.rank = index + 1;
    });
    await Promise.all(snapshots.map(member => member.save()));

    cohort.status = 'archived';
    cohort.archivedAt = new Date();
    cohort.archivedBy = req.user._id;
    await cohort.save();

    await logAction(req.user._id, 'archive_cohort', 'cohort', cohort._id, { members: members.length }, req);
    res.json({ success: true, cohort: serializeCohort(cohort), archivedMembers: members.length });
  } catch (error) {
    console.error('归档届次失败:', error);
    res.status(500).json({ success: false, message: '归档届次失败' });
  }
});

// [新增] 通用文件上传接口
app.post('/api/upload', authenticate, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: '未检测到文件' });
    }
    const files = req.files.map(file => ({
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      // [修复] 新上传的文件路径加上 /api 前缀
      path: `/api/uploads/${file.filename}`,
      mimetype: file.mimetype
    }));
    res.json({ success: true, files });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ success: false, message: '文件上传失败' });
  }
});

// [修改] 消息撤回接口 (限制仅本人或超管可撤回，并记录撤回人角色)
app.patch('/api/feedback/:id/reply/:replyId/recall', authenticate, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: '反馈不存在' });

    const reply = feedback.responses.id(req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, message: '回复不存在' });

    // 权限校验：判断是否是发出者本人，或者是超级管理员
    const isSender = reply.adminId && reply.adminId.toString() === req.user._id.toString();
    const isSuperadmin = hasSuperadminAccess(req.user);

    if (!isSender && !isSuperadmin) {
      return res.status(403).json({ success: false, message: '权限不足：只能撤回自己发出的消息' });
    }

    // 标记为已撤回，并记录执行撤回的角色
    reply.isRecalled = true;
    reply.recalledByRole = isSender ? 'self' : 'superadmin';
    await feedback.save();
    
    res.json({ success: true, message: '撤回成功' });
  } catch (error) {
    console.error('撤回失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// ================== 认证相关 ==================

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { studentId, password, name, email, phone } = req.body;
    
    // 验证必填字段
    if (!studentId || !password || !name || !email) {
      return res.status(400).json({ success: false, message: '请填写所有必填字段' });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ studentId }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: existingUser.studentId === studentId ? '学号已被注册' : '邮箱已被注册' 
      });
    }
    
    // 创建用户
    const user = await User.create({
      studentId: sanitizeInput(studentId),
      password,
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: sanitizeInput(phone)
    });
    
    await logAction(user._id, 'register', 'user', user._id, { studentId }, req);
    
    res.status(201).json({ 
      success: true, 
      message: '注册成功' 
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '注册失败，请重试' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    
    if (!studentId || !password) {
      return res.status(400).json({ success: false, message: '请输入学号和密码' });
    }
    
    const user = await User.findOne({ studentId }).select('+password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: '学号或密码错误' });
    }
    
    // 检查账户锁定
    if (user.isLocked()) {
      return res.status(423).json({ 
        success: false, 
        message: '账户已被锁定，请稍后再试' 
      });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      // 增加失败次数
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000; // 锁定30分钟
      }
      await user.save();
      
      return res.status(401).json({ success: false, message: '学号或密码错误' });
    }
    
    // 重置登录尝试
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();
    
    // 生成JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );
    
    await logAction(user._id, 'login', 'user', user._id, {}, req);
    
    res.json({
      success: true,
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '登录失败，请重试' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: serializeUser(req.user)
  });
});

// 修改密码
// [修改] 修改密码 - 增强版
app.put('/api/auth/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. 验证输入
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请提供当前密码和新密码' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码至少需要6位' });
    }

    // 2. 获取用户（需包含密码字段用于比对）
    const user = await User.findById(req.user._id).select('+password');

    // 3. 校验旧密码
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '当前密码验证失败' });
    }

    // 4. 设置新密码并保存 (pre-save hook 会自动处理加密)
    user.password = newPassword;
    await user.save();

    // 5. 记录日志
    await logAction(req.user._id, 'password_change', 'user', req.user._id, { action: 'self_reset' }, req);

   res.json({ success: true, message: '密码修改成功，请妥善保管' });
  } catch (error) {
    console.error('密码修改失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
});

// [新增] 修改个人信息接口
app.put('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const { name, email, phone, studentId } = req.body;

    // 基本验证
    if (!name || !email || !studentId) {
      return res.status(400).json({ success: false, message: '姓名、邮箱和学号为必填项' });
    }

    // 检查学号或邮箱是否被其他用户占用
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: req.user._id } }, // 排除当前用户自己
        { $or: [{ studentId }, { email }] }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.studentId === studentId ? '该学号已被其他账号使用' : '该邮箱已被其他账号绑定'
      });
    }

    // 更新用户信息 (禁止修改 role 权限)
    const user = await User.findById(req.user._id);
    user.name = sanitizeInput(name);
    user.email = sanitizeInput(email);
    user.phone = sanitizeInput(phone);
    user.studentId = sanitizeInput(studentId);
    await user.save();

    await logAction(req.user._id, 'update_profile', 'user', req.user._id, { action: 'update_info' }, req);

    res.json({
      success: true,
      message: '个人资料修改成功',
      user: serializeUser(user)
    });
  } catch (error) {
    console.error('修改信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
});

// ================== 反馈相关 ==================
// [新增] 获取当前用户的未读通知
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id, isRead: false }).sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// [新增] 标记通知为已读
app.put('/api/notifications/read', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// [修改] 学生撤销(删除)整条反馈接口 - 改为软删除
app.delete('/api/feedback/:id', authenticate, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: '反馈不存在' });
    }
    
    // 权限校验：仅允许发帖人本人，或具备该反馈范围权限的管理者删除
    if (feedback.user.toString() !== req.user._id.toString() && !hasSuperadminAccess(req.user)) {
      return res.status(403).json({ success: false, message: '权限不足：只能撤销自己的反馈' });
    }
    if (feedback.user.toString() !== req.user._id.toString() && !ensureFeedbackAccess(req.user, feedback)) {
      return res.status(403).json({ success: false, message: '权限不足：不能撤销其他部门反馈' });
    }

    // [修改] 软删除逻辑
    feedback.isRevoked = true;
    feedback.revokedAt = new Date();
    await feedback.save();

    await logAction(req.user._id, 'revoke', 'feedback', feedback._id, { action: 'student_revoke' }, req);

    res.json({ success: true, message: '反馈已成功撤销' });
  } catch (error) {
    console.error('撤销反馈失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误，撤销失败' });
  }
});

// [新增] 学生对反馈问题添加补充留言
app.post('/api/feedback/:id/reply', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: '留言不能为空' });
    
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback || feedback.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: '无权操作' });
    }

    feedback.responses.push({
      content: sanitizeInput(content),
      senderType: 'student',
      senderName: req.user.name
    });
    await feedback.save();

    // 触发通知：发给所有管理员
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    const notifications = admins.map(admin => ({
      user: admin._id,
      type: 'new_message',
      content: `您有新的留言：学生对问题 [${feedback.title}] 进行了补充`
    }));
    await Notification.insertMany(notifications);

    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: '留言失败' });
  }
});

// 提交反馈
app.post('/api/feedback', authenticate, async (req, res) => {
  try {
    // [修改] 解构出 attachments
    const { category, subCategory, title, content, priority, isAnonymous, attachments } = req.body;
    
    if (!category || !subCategory || !title || !content) {
      return res.status(400).json({ success: false, message: '请填写所有必填字段' });
    }
    
    const feedback = await Feedback.create({
      user: req.user._id,
      category,
      subCategory,
    
      title: sanitizeInput(title),
      content: sanitizeInput(content),
      priority: priority || 'normal',
      isAnonymous: !!isAnonymous,
      attachments: attachments || [] // [新增] 存入数据库
    });
    await logAction(req.user._id, 'create', 'feedback', feedback._id, { category }, req);

    // [新增] 触发通知给管理员
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    const notifications = admins.map(admin => ({
      user: admin._id,
      type: 'new_feedback',
      content: `您有新的问题待处理：[${title}]`
    }));
    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: '反馈提交成功',
      feedback: {
        id: feedback._id,
        title: feedback.title,
        status: feedback.status
      }
    });
  } catch (error) {
    console.error('提交反馈错误:', error);
    res.status(500).json({ success: false, message: '提交失败，请重试' });
  }
});

// 获取我的反馈列表
app.get('/api/feedback/my', authenticate, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    
    // [修改] 排除已被撤回的反馈
    const query = { user: req.user._id, isRevoked: { $ne: true } };
    if (status) query.status = status;
    if (category) query.category = category;
    
    const feedbacks = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Feedback.countDocuments(query);
    
    res.json({
      success: true,
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取反馈列表失败' });
  }
});

// 获取单个反馈详情
app.get('/api/feedback/:id', authenticate, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ success: false, message: '反馈不存在' });
    }
    
    // 检查权限
    if (feedback.user.toString() !== req.user._id.toString() && 
        req.user.role === 'student') {
      return res.status(403).json({ success: false, message: '无权查看此反馈' });
    }
    
    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取反馈详情失败' });
  }
});

// ================== 管理员API ==================

// [修改] 获取所有反馈（管理员）- 支持高级检索与时间归档
app.get('/api/admin/feedbacks', authenticate, adminOnly, async (req, res) => {
  try {
    const { 
      status, 
      category, 
      priority, 
      page = 1, 
      limit = 20,
      search,      // [新增] 接收搜索关键词
      startDate,   // [新增] 接收开始日期
      endDate      // [新增] 接收结束日期
    } = req.query;
    
    // 1. 构建基础查询条件
    const query = {};
    
    // [新增] 权限隔离：普通管理员看不到已撤回的反馈，超管可以看到所有
    if (!hasSuperadminAccess(req.user)) {
      query.isRevoked = { $ne: true };
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    if (req.user.role === 'superadmin' && !req.user.isUltimateAdmin) {
      Object.assign(query, buildDepartmentScopedQuery(req.user));
    }

    // 2. [新增] 时间范围检索 logic (用于学期归档)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate); // 大于等于开始时间
      }
      if (endDate) {
        // 将结束时间设定为当天的最后一毫秒，确保包含当天的数据
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // 3. [新增] 多关键词复合检索 logic
    if (search) {
      // 将搜索字符串按空格拆分为数组，支持多个关键词同时搜索
      const keywords = search.trim().split(/\s+/);
      
      if (keywords.length > 0) {
        // 使用 $and 逻辑：必须同时满足所有关键词（精准定位）
        // 在 title 和 content 中进行模糊匹配 ($regex)
        query.$and = keywords.map(kw => ({
          $or: [
            { title: { $regex: kw, $options: 'i' } },   // 匹配标题 (忽略大小写)
            { content: { $regex: kw, $options: 'i' } }  // 匹配内容 (忽略大小写)
          ]
        }));
      }
    }
    
    // 执行数据库查询
    const feedbacks = await Feedback.find(query)
      .populate('user', 'studentId name')
      .sort({ createdAt: -1 }) // 默认按时间倒序排列
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    // 处理匿名用户显示
    feedbacks.forEach(f => {
      if (f.isAnonymous) {
        f.user = { studentId: '匿名', name: '匿名用户' };
      }
    });
    
    const total = await Feedback.countDocuments(query);
    
    res.json({
      success: true,
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取反馈列表失败:', error); // 增加详细错误日志
    res.status(500).json({ success: false, message: '获取反馈列表失败' });
  }
});

// 更新反馈状态（管理员）
app.patch('/api/admin/feedback/:id/status', authenticate, adminOnly, async (req, res) => {
  try {
    // [修改] 接收 attachments
    const { status, response, attachments, handlingOrganization, handlingDepartment } = req.body;
    
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ success: false, message: '反馈不存在' });
    }

    if (!ensureFeedbackAccess(req.user, feedback)) {
      return res.status(403).json({ success: false, message: '无权处理该部门反馈' });
    }
    
    feedback.status = status;
    if (handlingOrganization || handlingDepartment) {
      if (!isValidManagedDepartment({ organization: handlingOrganization, department: handlingDepartment })) {
        return res.status(400).json({ success: false, message: '处理部门无效' });
      }
      const targetScope = { handlingOrganization, handlingDepartment };
      if (!ensureFeedbackAccess(req.user, targetScope)) {
        return res.status(403).json({ success: false, message: '无权分配到该部门' });
      }
      feedback.handlingOrganization = handlingOrganization;
      feedback.handlingDepartment = handlingDepartment;
      feedback.handlingHistory.push({
        organization: handlingOrganization,
        department: handlingDepartment,
        changedBy: req.user._id,
        note: '更新处理归属部门'
      });
    }
    
    // [修改] 如果有文本或有附件，都算作一次有效回复
    if (response || (attachments && attachments.length > 0)) {
      feedback.responses.push({
        content: response ? sanitizeInput(response) : '',
        adminId: req.user._id,
        adminName: req.user.name,
        attachments: attachments || [] // [新增]
      });
    }
    
   if (status === 'resolved') {
      feedback.resolvedAt = new Date();
    }
    
    await feedback.save();
    
    // [新增] 触发状态更新通知给发帖学生
    await Notification.create({
      user: feedback.user,
      type: 'status_update',
      content: `您的问题状态更新了：[${feedback.title}] 已变更为或有新回复`
    });
  
    await logAction(req.user._id, 'update_status', 'feedback', feedback._id, { status }, req);
    
    res.json({ success: true, message: '状态更新成功', feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新状态失败' });
  }
});
// ================== 超级管理员账号管理专属 API ==================

// [新增] 账号注销接口（仅超管可用）
app.delete('/api/admin/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    // 1. 双重越权校验：账号注销属于全局高危操作，仅终极管理员可执行。
    if (!hasUltimateAccess(req.user)) {
      return res.status(403).json({ success: false, message: '权限不足：仅终极管理员可执行注销操作' });
    }
    
    const targetUserId = req.params.id;
    
    // 2. 逻辑阻断：防止超管误注销当前正在使用的账号
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: '安全限制：不能注销当前正在登录的账号' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: '目标用户不存在' });
    }

    if (targetUser.isUltimateAdmin && !req.user.isUltimateAdmin) {
      return res.status(403).json({ success: false, message: '不能注销终极管理员账号' });
    }

    // 3. 执行彻底删除
    await User.findByIdAndDelete(targetUserId);
    
    // 4. 记录高危操作日志
    try {
      await logAction(req.user._id, 'delete_account', 'user', targetUserId, { targetStudentId: targetUser.studentId }, req);
    } catch (e) {
      console.error('注销日志记录失败:', e);
    }

    res.json({ success: true, message: '账号已成功彻底注销' });
  } catch (error) {
    console.error('注销账号失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误，注销失败' });
  }
});

// 1. 获取所有用户列表（区分角色）
app.get('/api/admin/users', authenticate, adminOnly, async (req, res) => {
  try {
    if (!hasSuperadminAccess(req.user)) {
      return res.status(403).json({ success: false, message: '仅负责人可用' });
    }

    // 终极管理员查看全员；普通超级管理员仅查看自己分管部门内的志愿者账号，
    // 供绩效名单/录入使用，避免账号清单越权扩散。
    const query = hasUltimateAccess(req.user)
      ? {}
      : { role: 'admin', ...buildUserDepartmentScopedQuery(req.user) };
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users: users.map(serializeUser) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

// 2. 获取特定学生提交的所有反馈（包含匿名）
app.get('/api/admin/users/:id/feedbacks', authenticate, adminOnly, async (req, res) => {
  try {
    if (!hasUltimateAccess(req.user)) {
      return res.status(403).json({ success: false, message: '仅终极管理员可用' });
    }
    // 直接通过 user ObjectID 查询，不受匿名状态限制
    const feedbacks = await Feedback.find({ user: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取学生反馈记录失败' });
  }
});

// 3. 获取子管理员的操作日志（状态更新、回复等）
app.get('/api/admin/users/:id/logs', authenticate, adminOnly, async (req, res) => {
  try {
    if (!hasUltimateAccess(req.user)) {
      return res.status(403).json({ success: false, message: '仅终极管理员可用' });
    }
    // 查询 AuditLog 表中的操作记录
    const logs = await AuditLog.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    // [新增] 关联查询反馈详情，以便在日志中查看处理的是哪个问题以及完整的对话流转
    for (let log of logs) {
      if (log.resource === 'feedback' && log.resourceId) {
        log.feedbackInfo = await Feedback.findById(log.resourceId).lean();
      }
    }

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取操作日志失败' });
  }
});

//  管理员重置用户密码
app.patch('/api/admin/users/:studentId/reset-password', authenticate, adminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const targetStudentId = req.params.studentId;

    if (!hasUltimateAccess(req.user)) {
      return res.status(403).json({ success: false, message: '权限不足：仅终极管理员可重置他人密码' });
    }

    if (!newPassword) {
      return res.status(400).json({ success: false, message: '请提供新密码' });
    }

    // 查找用户
    const user = await User.findOne({ studentId: targetStudentId });
    
    if (!user) {
      return res.status(404).json({ success: false, message: '找不到该学号的用户' });
    }

    // 修改密码 (User模型会自动加密)
    user.password = newPassword;
    
    // 解锁账户 (如果因为尝试次数过多被锁)
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();

    await logAction(req.user._id, 'admin_reset_password', 'user', user._id, { targetStudentId }, req);

    res.json({ success: true, message: `用户 ${targetStudentId} 的密码已重置` });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({ success: false, message: '重置密码失败' });
  }
});
// [新增] 修改用户角色（提升为管理员/降级）
app.patch('/api/admin/users/:studentId/role', authenticate, adminOnly, async (req, res) => {
  try {
    // 旧角色接口保留兼容，但账号授权仍只允许终极管理员操作。
    if (!hasUltimateAccess(req.user)) {
      return res.status(403).json({ success: false, message: '权限不足：只有终极管理员可操作' });
    }

    const { role } = req.body; // 目标角色: 'admin' 或 'student'
    const targetStudentId = req.params.studentId;

    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: '角色无效' });
    }

    const user = await User.findOne({ studentId: targetStudentId });
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (user.isUltimateAdmin && !req.user.isUltimateAdmin) {
      return res.status(403).json({ success: false, message: '不能修改终极管理员账号角色' });
    }

    user.role = role;
    await user.save();

    await logAction(req.user._id, 'change_role', 'user', user._id, { targetStudentId, newRole: role }, req);

    res.json({ success: true, message: `用户 ${targetStudentId} 已更新为 ${role === 'admin' ? '管理员' : '学生'}` });
  } catch (error) {
    console.error('修改角色失败:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

// 获取统计数据（管理员）
app.get('/api/admin/stats', authenticate, adminOnly, async (req, res) => {
  try {
    // [新增] 统计时排除被撤回的记录，确保普通管理员和超管看到的数据对齐，或者让其一致反映有效数据
    const baseQuery = { isRevoked: { $ne: true } };
    if (req.user.role === 'superadmin' && !req.user.isUltimateAdmin) {
      Object.assign(baseQuery, buildDepartmentScopedQuery(req.user));
    }

    const [
      totalFeedbacks,
      pendingCount,
      processingCount,
      resolvedCount,
      categoryStats
    ] = await Promise.all([
      Feedback.countDocuments(baseQuery),
      Feedback.countDocuments({ ...baseQuery, status: 'pending' }),
      Feedback.countDocuments({ ...baseQuery, status: 'processing' }),
      Feedback.countDocuments({ ...baseQuery, status: 'resolved' }),
      Feedback.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      success: true,
      stats: {
        total: totalFeedbacks,
        pending: pendingCount,
        processing: processingCount,
        resolved: resolvedCount,
        byCategory: categoryStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// ================== 部门绩效与系统学期 API ==================

// [新增] 获取当前运行学期及历史学期列表
app.get('/api/admin/system/config', authenticate, adminOnly, async (req, res) => {
  try {
    let config = await SystemConfig.findOne({ key: 'currentSemester' });
    if (!config) config = await SystemConfig.create({ key: 'currentSemester', value: '2025-2026学年 第二学期' });
    const perfSemesters = await PerformanceRecord.distinct('semester');
    const rosterSemesters = await SemesterMember.distinct('semester');
    const semesters = Array.from(new Set([...perfSemesters, ...rosterSemesters]));
    if (!semesters.includes(config.value)) semesters.push(config.value);
    res.json({ success: true, currentSemester: config.value, semesters });
  } catch (error) { res.status(500).json({ success: false }); }
});

// [新增] 归档并开启新学期 (仅超管)
app.post('/api/admin/system/semester', authenticate, adminOnly, async (req, res) => {
  if (!hasUltimateAccess(req.user)) return res.status(403).json({ success: false, message: '仅终极管理员可开启新学期' });
  try {
    // [新增] 切换前冻结上一学期名单：若旧学期尚无显式名单，则把其"有效名单"快照存档
    const oldConfig = await SystemConfig.findOne({ key: 'currentSemester' });
    const oldSemester = oldConfig ? oldConfig.value : null;
    if (oldSemester && oldSemester !== req.body.semester) {
      const existing = await SemesterMember.countDocuments({ semester: oldSemester });
      if (existing === 0) {
        const { members } = await resolveSemesterMembers(oldSemester);
        if (members.length > 0) {
          await SemesterMember.insertMany(members.map(m => ({
            volunteer: m._id, semester: oldSemester, name: m.name, studentId: m.studentId, addedBy: req.user._id
          })), { ordered: false }).catch(() => {});
        }
      }
      await markSemesterManaged(oldSemester);
    }

    // [新增] 新学期纳入名单管理：名单从空开始，需重新选择(不回退到全部 admin)
    await markSemesterManaged(req.body.semester);
    await SystemConfig.findOneAndUpdate({ key: 'currentSemester' }, { value: req.body.semester }, { upsert: true });
    res.json({ success: true, message: '新学期已开启' });
  } catch (error) { res.status(500).json({ success: false }); }
});

// [新增] 重命名学期 (仅超管)：同步改绩效流水、成员名单、当前学期与受管学期列表
app.put('/api/admin/system/semester/rename', authenticate, adminOnly, async (req, res) => {
  if (!hasUltimateAccess(req.user)) return res.status(403).json({ success: false, message: '仅终极管理员可重命名学期' });
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ success: false, message: '缺少学期名称' });
    if (oldName === newName) return res.status(400).json({ success: false, message: '新旧名称相同' });

    // 防止意外合并：若新名称已被使用则拒绝
    const conflict =
      (await PerformanceRecord.countDocuments({ semester: newName })) > 0 ||
      (await SemesterMember.countDocuments({ semester: newName })) > 0 ||
      (await getManagedSemesters()).includes(newName);
    const curConfig = await SystemConfig.findOne({ key: 'currentSemester' });
    if (conflict || (curConfig && curConfig.value === newName)) {
      return res.status(409).json({ success: false, message: '该学期名称已存在，无法重命名' });
    }

    // 同步更新所有以学期字符串为键的数据
    await PerformanceRecord.updateMany({ semester: oldName }, { semester: newName });
    await SemesterMember.updateMany({ semester: oldName }, { semester: newName });
    if (curConfig && curConfig.value === oldName) {
      curConfig.value = newName;
      await curConfig.save();
    }
    const managed = await getManagedSemesters();
    if (managed.includes(oldName)) {
      const updated = managed.map(s => (s === oldName ? newName : s));
      await SystemConfig.findOneAndUpdate({ key: 'rosterManagedSemesters' }, { value: JSON.stringify(updated) }, { upsert: true });
    }

    res.json({ success: true, message: '学期名称已更新' });
  } catch (error) { res.status(500).json({ success: false, message: '重命名失败' }); }
});

// [新增] 获取某学期成员名单 (仅超管)
app.get('/api/admin/system/roster', authenticate, adminOnly, async (req, res) => {
  if (!hasSuperadminAccess(req.user)) return res.status(403).json({ success: false, message: '仅负责人可用' });
  try {
    const semester = req.query.semester;
    if (!semester) return res.status(400).json({ success: false, message: '缺少学期参数' });
    const { members, source } = await resolveSemesterMembers(semester);
    res.json({ success: true, members: await filterMembersByDepartmentScope(req.user, members), source });
  } catch (error) { res.status(500).json({ success: false, message: '获取名单失败' }); }
});

// [新增] 保存/整份替换某学期成员名单 (仅超管)
app.post('/api/admin/system/roster', authenticate, adminOnly, async (req, res) => {
  if (!hasSuperadminAccess(req.user)) return res.status(403).json({ success: false, message: '仅负责人可用' });
  try {
    const { semester, volunteerIds } = req.body;
    if (!semester) return res.status(400).json({ success: false, message: '缺少学期参数' });
    const ids = Array.from(new Set((Array.isArray(volunteerIds) ? volunteerIds : []).map(String).filter(Boolean)));
    const scopedVolunteerIds = await getScopedVolunteerIds(req.user);
    if (scopedVolunteerIds) {
      const allowed = new Set(scopedVolunteerIds);
      const hasOutOfScope = ids.some(id => !allowed.has(id));
      if (hasOutOfScope) {
        return res.status(403).json({ success: false, message: '只能维护分管部门内的成员名单' });
      }
    }

    // 终极管理员整份替换；普通超级管理员只替换自己分管部门范围内的名单成员。
    const deleteQuery = { semester };
    if (scopedVolunteerIds) deleteQuery.volunteer = { $in: scopedVolunteerIds };
    await SemesterMember.deleteMany(deleteQuery);
    if (ids.length > 0) {
      const users = await User.find({ _id: { $in: ids }, role: 'admin' }).select('name studentId');
      const docs = users.map(u => ({
        volunteer: u._id, semester, name: u.name, studentId: u.studentId, addedBy: req.user._id
      }));
      if (docs.length > 0) await SemesterMember.insertMany(docs);
    }
    // [新增] 标记该学期已纳入名单管理：此后"空名单"即真正为空，不再回退到全部 admin
    await markSemesterManaged(semester);
    res.json({ success: true, message: '名单已保存' });
  } catch (error) { res.status(500).json({ success: false, message: '保存名单失败' }); }
});

// 1. [超管] 批量录入绩效记录 (修复Bug：支持跨学期补录)
app.post('/api/admin/performance', authenticate, adminOnly, async (req, res) => {
  if (!hasSuperadminAccess(req.user)) return res.status(403).json({ success: false, message: '仅负责人可用' });
  try {
    // [修复] 接收前端传来的 targetSemester
    const { volunteerIds, dimension, score, reason, occurrenceDate, activityName, targetSemester } = req.body;
    if (!volunteerIds || volunteerIds.length === 0) return res.status(400).json({ success: false, message: '请选择人员' });
    const ids = Array.from(new Set(volunteerIds.map(String).filter(Boolean)));
    const volunteerQuery = { _id: { $in: ids }, role: 'admin' };
    if (!req.user.isUltimateAdmin) Object.assign(volunteerQuery, buildUserDepartmentScopedQuery(req.user));
    const targetVolunteers = await User.find(volunteerQuery).select('organization department');
    if (targetVolunteers.length !== ids.length) {
      return res.status(403).json({ success: false, message: '只能为分管部门内的成员录入绩效' });
    }
    const volunteerMap = new Map(targetVolunteers.map(volunteer => [volunteer._id.toString(), volunteer]));
    
    const config = await SystemConfig.findOne({ key: 'currentSemester' });
    const currentSemester = config ? config.value : '2025-2026学年 第二学期';
    
    // [修复] 补录时优先使用指定的学期，否则使用当前学期
    const finalSemester = targetSemester || currentSemester;

    const records = ids.map(vid => {
      const volunteer = volunteerMap.get(vid);
      return ({
      volunteer: vid, recordedBy: req.user._id, dimension, score: Number(score), reason, occurrenceDate, activityName,
      organization: volunteer?.organization || null,
      department: volunteer?.department || null,
      semester: finalSemester // [绑定最终学期]
    });
    });
    await PerformanceRecord.insertMany(records);
    res.json({ success: true, message: '绩效录入成功' });
  } catch (error) { res.status(500).json({ success: false, message: '录入失败' }); }
});

// 2. [超管] 获取全员绩效流水 (按学期筛选)
app.get('/api/admin/performance', authenticate, adminOnly, async (req, res) => {
  if (!hasSuperadminAccess(req.user)) return res.status(403).json({ success: false });
  try {
    const query = req.query.semester ? { semester: req.query.semester } : {};
    const scopedVolunteerIds = await getScopedVolunteerIds(req.user);
    if (scopedVolunteerIds) query.volunteer = { $in: scopedVolunteerIds };
    const records = await PerformanceRecord.find(query)
      .populate('volunteer', 'name studentId organization department')
      .populate('recordedBy', 'name')
      .sort({ occurrenceDate: -1, createdAt: -1 });
    res.json({ success: true, records });
  } catch (error) { res.status(500).json({ success: false }); }
});

// 3. [子管理员/志愿者] 获取本人的绩效流水 (按学期筛选)
app.get('/api/admin/performance/my', authenticate, adminOnly, async (req, res) => {
  try {
    const query = { volunteer: req.user._id };
    if (req.query.semester) query.semester = req.query.semester;
    const records = await PerformanceRecord.find(query)
      .populate('recordedBy', 'name')
      .sort({ occurrenceDate: -1, createdAt: -1 });
    res.json({ success: true, records });
  } catch (error) { res.status(500).json({ success: false }); }
});
// 4. [新增] [超管] 撤回/删除一条绩效记录
app.delete('/api/admin/performance/:id', authenticate, adminOnly, async (req, res) => {
  if (!hasSuperadminAccess(req.user)) return res.status(403).json({ success: false, message: '仅负责人可用' });
  try {
    const record = await PerformanceRecord.findById(req.params.id).populate('volunteer', 'organization department');
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });
    if (!ensurePerformanceRecordAccess(req.user, record)) {
      return res.status(403).json({ success: false, message: '无权撤回该部门绩效记录' });
    }
    await record.deleteOne();
    res.json({ success: true, message: '记录已成功撤回' });
  } catch (error) { res.status(500).json({ success: false, message: '撤回失败' }); }
});

// ================== 终极管理员组织与届次归档 API ==================

app.get('/api/admin/organization/options', authenticate, adminOnly, async (req, res) => {
  res.json({
    success: true,
    organizations: ORGANIZATIONS,
    memberRoles: MEMBER_ROLES,
    positionTitles: POSITION_TITLES,
    departments: listDepartments()
  });
});

app.get('/api/admin/ultimate/cohorts', authenticate, adminOnly, ultimateOnly, async (req, res) => {
  try {
    const cohorts = await Cohort.find().sort({ startDate: -1, createdAt: -1 }).lean();
    res.json({ success: true, cohorts });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取届次失败' });
  }
});

app.post('/api/admin/ultimate/cohorts', authenticate, adminOnly, ultimateOnly, async (req, res) => {
  try {
    const { name, startDate, endDate, status = 'draft', semesters = [] } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '请填写届次名称' });
    if (!['draft', 'active'].includes(status)) {
      return res.status(400).json({ success: false, message: '届次状态无效' });
    }
    if (status === 'active') await Cohort.updateMany({ status: 'active' }, { status: 'draft' });
    const cohort = await Cohort.create({
      name: sanitizeInput(name),
      startDate,
      endDate,
      status,
      semesters: Array.isArray(semesters) ? semesters.map(sanitizeInput).filter(Boolean) : []
    });
    await logAction(req.user._id, 'create_cohort', 'cohort', cohort._id, { name: cohort.name }, req);
    res.status(201).json({ success: true, cohort });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建届次失败' });
  }
});

app.put('/api/admin/ultimate/cohorts/:id', authenticate, adminOnly, ultimateOnly, async (req, res) => {
  try {
    const { name, startDate, endDate, status, semesters } = req.body;
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });
    if (cohort.status === 'archived') return res.status(400).json({ success: false, message: '已归档届次不可编辑' });
    if (name) cohort.name = sanitizeInput(name);
    if (startDate !== undefined) cohort.startDate = startDate || null;
    if (endDate !== undefined) cohort.endDate = endDate || null;
    if (Array.isArray(semesters)) cohort.semesters = semesters.map(sanitizeInput).filter(Boolean);
    if (status) {
      if (!['draft', 'active'].includes(status)) return res.status(400).json({ success: false, message: '届次状态无效' });
      if (status === 'active') await Cohort.updateMany({ _id: { $ne: cohort._id }, status: 'active' }, { status: 'draft' });
      cohort.status = status;
    }
    await cohort.save();
    await logAction(req.user._id, 'update_cohort', 'cohort', cohort._id, { name: cohort.name, status: cohort.status }, req);
    res.json({ success: true, cohort });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新届次失败' });
  }
});

app.get('/api/admin/ultimate/cohorts/:id/members', authenticate, adminOnly, ultimateOnly, async (req, res) => {
  try {
    const members = await CohortMembership.find({ cohort: req.params.id })
      .populate('user', 'name studentId email phone role memberRole positionTitle organization department managedDepartments isUltimateAdmin')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, members });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取届次成员失败' });
  }
});

app.post('/api/admin/ultimate/cohorts/:id/members', authenticate, adminOnly, ultimateOnly, async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });
    if (cohort.status === 'archived') return res.status(400).json({ success: false, message: '已归档届次不可编辑' });

    const {
      userId,
      studentId,
      memberRole,
      positionTitle,
      organization,
      department,
      managedDepartments = [],
      startDate,
      endDate
    } = req.body;
    const user = userId ? await User.findById(userId) : await User.findOne({ studentId });
    if (!user) return res.status(404).json({ success: false, message: '成员账号不存在' });

    const assignment = validateAssignment({ memberRole, positionTitle, organization, department });
    if (!assignment.valid) return res.status(400).json({ success: false, message: assignment.message });

    const cleanManaged = sanitizeManagedDepartments(managedDepartments, req.user._id);
    user.role = assignment.accessRole;
    user.memberRole = memberRole;
    user.positionTitle = positionTitle;
    user.organization = assignment.organization;
    user.department = assignment.department;
    user.managedDepartments = memberRole === 'presidium' ? cleanManaged : [];
    await user.save();

    const membership = await CohortMembership.findOneAndUpdate(
      { cohort: cohort._id, user: user._id },
      {
        $set: {
          cohort: cohort._id,
          user: user._id,
          accountSnapshot: {
            name: user.name,
            studentId: user.studentId,
            email: user.email,
            phone: user.phone
          },
          systemRole: user.role,
          memberRole,
          positionTitle,
          organization: assignment.organization,
          department: assignment.department,
          managedDepartments: user.managedDepartments
        },
        $push: {
          appointmentHistory: {
            memberRole,
            positionTitle,
            organization: assignment.organization,
            department: assignment.department,
            startDate: startDate || cohort.startDate,
            endDate: endDate || cohort.endDate
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await logAction(req.user._id, 'upsert_cohort_member', 'cohortMembership', membership._id, {
      cohort: cohort.name,
      targetStudentId: user.studentId,
      positionTitle
    }, req);
    res.json({ success: true, user: serializeUser(user), membership });
  } catch (error) {
    res.status(500).json({ success: false, message: '保存届次成员失败' });
  }
});

app.patch('/api/admin/ultimate/users/:studentId/identity', authenticate, adminOnly, ultimateOnly, async (req, res) => {
  try {
    const user = await User.findOne({ studentId: req.params.studentId });
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    if (user._id.toString() === req.user._id.toString() && req.body.isUltimateAdmin === false) {
      return res.status(400).json({ success: false, message: '不能移除当前登录账号的终极管理员权限' });
    }
    const {
      memberRole,
      positionTitle,
      organization,
      department,
      managedDepartments = [],
      isUltimateAdmin
    } = req.body;
    const assignment = validateAssignment({ memberRole, positionTitle, organization, department });
    if (!assignment.valid) return res.status(400).json({ success: false, message: assignment.message });

    user.role = assignment.accessRole;
    user.memberRole = memberRole;
    user.positionTitle = positionTitle;
    user.organization = assignment.organization;
    user.department = assignment.department;
    user.managedDepartments = memberRole === 'presidium'
      ? sanitizeManagedDepartments(managedDepartments, req.user._id)
      : [];
    if (typeof isUltimateAdmin === 'boolean') user.isUltimateAdmin = isUltimateAdmin;
    await user.save();
    await logAction(req.user._id, 'update_identity', 'user', user._id, {
      targetStudentId: user.studentId,
      positionTitle,
      isUltimateAdmin: user.isUltimateAdmin
    }, req);
    res.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新身份失败' });
  }
});

app.get('/api/admin/ultimate/cohorts/:id/archive-preview', authenticate, adminOnly, ultimateOnly, async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id).lean();
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });
    const memberships = await CohortMembership.find({ cohort: cohort._id }).lean();
    const previews = await Promise.all(memberships.map(async membership => ({
      ...membership,
      performanceSnapshot: await buildPerformanceSnapshot(membership.user, cohort.semesters || [])
    })));
    res.json({ success: true, cohort, members: previews });
  } catch (error) {
    res.status(500).json({ success: false, message: '生成归档预览失败' });
  }
});

app.post('/api/admin/ultimate/cohorts/:id/archive', authenticate, adminOnly, ultimateOnly, async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });
    const memberships = await CohortMembership.find({ cohort: cohort._id });
    for (const membership of memberships) {
      membership.performanceSnapshot = await buildPerformanceSnapshot(membership.user, cohort.semesters || []);
      membership.archivedAt = new Date();
      membership.archivedBy = req.user._id;
      await membership.save();
    }
    cohort.status = 'archived';
    cohort.archivedAt = new Date();
    cohort.archivedBy = req.user._id;
    await cohort.save();
    await logAction(req.user._id, 'archive_cohort', 'cohort', cohort._id, { name: cohort.name }, req);
    res.json({ success: true, message: '届次已归档', cohort, archivedMembers: memberships.length });
  } catch (error) {
    res.status(500).json({ success: false, message: '届次归档失败' });
  }
});
// ============================================
// 错误处理
// ============================================

// 404处理
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // 不向客户端暴露敏感错误信息
  res.status(err.status || 500).json({
    success: false,
    message: config.nodeEnv === 'development' ? err.message : '服务器错误'
  });
});

// ============================================
// 数据库连接和服务器启动
// ============================================
const startServer = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB 连接成功');
    
// [修改] 初始化 1 个临时终极管理员和 2 个普通超级管理员账号
    const superadminsToInit = [
      {
        studentId: '20240901010',
        name: '终极管理员',
        email: 'ultimate_admin@buct.edu.cn',
        isUltimateAdmin: true,
        memberRole: 'presidium',
        positionTitle: 'presidium_member'
      },
      {
        studentId: '20240901008',
        name: '超级管理员2',
        email: 'superadmin2@buct.edu.cn',
        memberRole: 'presidium',
        positionTitle: 'presidium_member'
      },
      {
        studentId: '20240901009',
        name: '超级管理员3',
        email: 'superadmin3@buct.edu.cn',
        memberRole: 'presidium',
        positionTitle: 'youth_league_deputy_secretary'
      }
    ];
    
    for (const adminData of superadminsToInit) {
      try {
        const exists = await User.findOne({
          $or: [
            { studentId: adminData.studentId },
            { email: adminData.email }
          ]
        });
        if (!exists) {
          // 若账号不存在，直接创建为 superadmin
          await User.create({
            studentId: adminData.studentId,
            name: adminData.name,
            email: adminData.email,
            password: 'SIEVOX2026.', // pre-save hook 会自动加密
            role: 'superadmin',
            isUltimateAdmin: Boolean(adminData.isUltimateAdmin),
            memberRole: adminData.memberRole,
            positionTitle: adminData.positionTitle
          });
          console.log(`✅ Superadmin ${adminData.studentId} created`);
        } else {
          exists.role = 'superadmin';
          exists.isUltimateAdmin = Boolean(adminData.isUltimateAdmin);
          exists.memberRole = adminData.memberRole;
          exists.positionTitle = adminData.positionTitle;
          await exists.save();
          console.log(`✅ Superadmin ${adminData.studentId} ensured`);
        }
      } catch (e) {
        // [修复] 单个超管初始化失败(如邮箱/学号与既有账号冲突)时仅告警跳过，避免整个服务启动崩溃
        console.warn(`⚠️  跳过超管初始化 ${adminData.studentId}: ${e.message}`);
      }
    }

    // [修改] 根据环境决定启动 HTTP 还是 HTTPS
    if (config.nodeEnv === 'production') {
      // 生产环境：读取 SSL 证书并启动 HTTPS
    // 1. [新增] 启动 HTTP 服务监听 80 端口，将所有请求强制定向到 HTTPS
      http.createServer((req, res) => {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
      }).listen(80, () => {
        console.log(`🚀 生产环境: HTTP 服务器运行在端口 80 (仅用于自动重定向至 HTTPS)`);
      })
      const privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'sievox.cn.key'), 'utf8');
      const certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'sievox.cn.pem'), 'utf8');
      const credentials = { key: privateKey, cert: certificate };

      const httpsServer = https.createServer(credentials, app);
      
      // HTTPS 默认端口是 443
      httpsServer.listen(443, () => {
        console.log(`🚀 生产环境: HTTPS 服务器安全运行在端口 443`);
      });
    } else {
      // 开发环境：使用普通的 HTTP 与当前配置端口
      app.listen(config.port, () => {
        console.log(`🚀 开发环境: HTTP 服务器运行在 http://localhost:${config.port}`);
      });
    }

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
