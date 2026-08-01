// ============================================
// 北京化工大学国际教育学院 - SIEVOX学生权益反馈系统
// 后端服务器 - Express + MongoDB + JWT
// ============================================

require('dotenv').config();
// SMTP credentials are loaded from backend/.env when the process starts.
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
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const https = require('https'); // [新增] 引入 https 模块
const http = require('http'); // [新增] 引入 http 模块用于重定向
const {
  ORGANIZATIONS,
  MEMBER_ROLES,
  POSITION_TITLES,
  getDepartment,
  getDepartmentLabel,
  getHubModuleAccess,
  getIdentityLabel,
  getVolunteerPerformancePolicy,
  isValidManagedDepartment,
  listDepartments,
  listHubModules,
  listHubWindows,
  HUB_SYSTEM,
  SIEVOX_DEPARTMENT,
  validateAssignment
} = require('./organization');
const { installSieBridgeRoutes } = require('./siebridge');
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

const avatarUploadDir = path.join(uploadDir, 'avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `${req.user?._id || 'avatar'}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('unsupported_avatar_type'));
    }
    cb(null, true);
  }
});

const departmentIntroUploadDir = path.join(__dirname, 'department_intro_uploads');
if (!fs.existsSync(departmentIntroUploadDir)) {
  fs.mkdirSync(departmentIntroUploadDir, { recursive: true });
}
const departmentIntroStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, departmentIntroUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});
const departmentIntroUpload = multer({
  storage: departmentIntroStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4']);
    if (!allowed.has(ext)) return cb(new Error('仅支持 jpg、png、webp 图片与 mp4 视频'));
    cb(null, true);
  }
});

// [修复] 将静态资源映射到 /api/uploads 下，完美利用现有的代理配置
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
const departmentNoticeUploadDir = path.join(__dirname, 'department_notice_uploads');
if (!fs.existsSync(departmentNoticeUploadDir)) {
  fs.mkdirSync(departmentNoticeUploadDir, { recursive: true });
}
const departmentNoticeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, departmentNoticeUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});
const departmentNoticeUpload = multer({
  storage: departmentNoticeStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    if (!allowed.has(ext)) return cb(new Error('Only jpg, jpeg, png and webp images are supported'));
    cb(null, true);
  }
});

app.use('/api/department-intro-assets', express.static(departmentIntroUploadDir));
app.use('/api/department-notice-assets', express.static(departmentNoticeUploadDir));
// ============================================
// 环境配置
// ============================================
const config = {
  port: process.env.PORT || 3101,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/buct_feedback',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-buct-2024-secure',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  jwtRememberExpire: process.env.JWT_REMEMBER_EXPIRE || '180d',
  nodeEnv: process.env.NODE_ENV || 'development',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || 'SIEHUB <no-reply@siehub.local>',
  sslKeyPath: process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl', 'sievox.cn.key'),
  sslCertPath: process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl', 'sievox.cn.pem')
};

const getLoginTokenExpiresIn = (remember = false) => (remember ? config.jwtRememberExpire : config.jwtExpire);
const isMobileUserAgent = (userAgent = '') => /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
const shouldPersistLogin = (remember = false, userAgent = '') => remember || isMobileUserAgent(userAgent);
const allowedCorsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];

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
  origin: allowedCorsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求体解析
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

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
    validate: {
      validator: function(value) {
        return this.isUltimateAdmin || this.role !== 'student' || /^\d{10}$/.test(value);
      },
      message: '学生账号学号必须为唯一的10位数字'
    }
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
  avatarUrl: {
    type: String,
    default: ''
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

const emailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  purpose: { type: String, enum: ['register', 'reset_password'], required: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  verifiedAt: Date
}, { timestamps: true });

emailVerificationSchema.index({ email: 1, purpose: 1 });

const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

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
  feedbackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
  targetUrl: String,
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

const loginEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  studentId: { type: String, default: '', index: true },
  success: { type: Boolean, required: true, index: true },
  reason: { type: String, default: '' },
  ip: String,
  userAgent: String
}, {
  timestamps: true
});
loginEventSchema.index({ user: 1, createdAt: -1 });
loginEventSchema.index({ studentId: 1, createdAt: -1 });
const LoginEvent = mongoose.model('LoginEvent', loginEventSchema);

const PRIVACY_NOTICE_VERSION = 'siehub_privacy_notice_v1';

const privacyNoticeAcceptanceSchema = new mongoose.Schema({
  ipHash: { type: String, required: true, index: true },
  noticeVersion: { type: String, required: true, default: PRIVACY_NOTICE_VERSION, index: true },
  acceptedAt: { type: Date, default: Date.now },
  userAgentHash: String
});

privacyNoticeAcceptanceSchema.index({ ipHash: 1, noticeVersion: 1 }, { unique: true });

const PrivacyNoticeAcceptance = mongoose.model('PrivacyNoticeAcceptance', privacyNoticeAcceptanceSchema);

const getClientIp = (req) => {
  const rawIp = req.ip || req.connection?.remoteAddress || '';
  return rawIp.replace(/^::ffff:/, '') || 'unknown';
};

const hashPrivacyValue = (value) => crypto
  .createHash('sha256')
  .update(`${config.jwtSecret}:${value || 'unknown'}`)
  .digest('hex');

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

const departmentIntroductionSchema = new mongoose.Schema({
  organization: { type: String, enum: Object.keys(ORGANIZATIONS), required: true },
  department: { type: String, required: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  draftContent: { type: mongoose.Schema.Types.Mixed, default: null },
  publishedContent: { type: mongoose.Schema.Types.Mixed, default: null },
  draftVersion: { type: Number, default: 0 },
  publishedVersion: { type: Number, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: Date
}, { timestamps: true });
departmentIntroductionSchema.index({ organization: 1, department: 1 }, { unique: true });
const DepartmentIntroduction = mongoose.model('DepartmentIntroduction', departmentIntroductionSchema);

const departmentIntroductionRevisionSchema = new mongoose.Schema({
  organization: { type: String, enum: Object.keys(ORGANIZATIONS), required: true },
  department: { type: String, required: true },
  version: { type: Number, required: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  action: { type: String, enum: ['publish', 'restore'], default: 'publish' },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: String
}, { timestamps: true });
departmentIntroductionRevisionSchema.index({ organization: 1, department: 1, version: -1 });
const DepartmentIntroductionRevision = mongoose.model('DepartmentIntroductionRevision', departmentIntroductionRevisionSchema);

const departmentIntroductionMediaSchema = new mongoose.Schema({
  organization: { type: String, enum: Object.keys(ORGANIZATIONS), required: true },
  department: { type: String, required: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: String,
  filename: String,
  url: String,
  mimeType: String,
  type: { type: String, enum: ['image', 'video'], required: true },
  size: Number,
  hash: String,
  status: { type: String, enum: ['active', 'deleted'], default: 'active' }
}, { timestamps: true });
departmentIntroductionMediaSchema.index({ organization: 1, department: 1, createdAt: -1 });
const DepartmentIntroductionMedia = mongoose.model('DepartmentIntroductionMedia', departmentIntroductionMediaSchema);

const localizedTextSchema = new mongoose.Schema({
  zh: { type: String, default: '' },
  en: { type: String, default: '' }
}, { _id: false });

const departmentNoticeSchema = new mongoose.Schema({
  organization: { type: String, enum: Object.keys(ORGANIZATIONS), required: true },
  department: { type: String, required: true },
  title: { type: localizedTextSchema, required: true },
  summary: { type: localizedTextSchema, default: () => ({}) },
  body: { type: localizedTextSchema, default: () => ({}) },
  coverImageUrl: { type: String, default: '' },
  sourceUrl: { type: String, default: '' },
  source: { type: String, enum: ['manual', 'wechat_mp'], default: 'manual', index: true },
  sourceExternalId: { type: String, default: undefined },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  publishedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
departmentNoticeSchema.index({ organization: 1, department: 1, status: 1, publishedAt: -1 });
departmentNoticeSchema.index(
  { source: 1, sourceExternalId: 1 },
  { unique: true, partialFilterExpression: { sourceExternalId: { $type: 'string' } } }
);
const DepartmentNotice = mongoose.model('DepartmentNotice', departmentNoticeSchema);

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
    phone: String,
    avatarUrl: String
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
    const admins = await User.find({ memberRole: 'volunteer' })
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
const recordLoginEvent = async ({ user = null, studentId = '', success = false, reason = '' }, req) => {
  try {
    await LoginEvent.create({
      user: user?._id || user || null,
      studentId: studentId || user?.studentId || '',
      success: Boolean(success),
      reason,
      ip: req.ip,
      userAgent: req.get('User-Agent') || ''
    });
  } catch (error) {
    console.error('login event record failed:', error);
  }
};
const DEFAULT_CURRENT_SEMESTER = '2026-2027学年 第一学期';

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/<[^>]*>/g, '');
  }
  return input;
};

const normalizeEmail = (email) => sanitizeInput(email || '').toLowerCase();
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
const isValidStudentId = (studentId) => /^\d{10}$/.test(studentId);
const createVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));
const hashVerificationCode = (email, purpose, code) => crypto
  .createHash('sha256')
  .update(`${config.jwtSecret}:${purpose}:${normalizeEmail(email)}:${code}`)
  .digest('hex');

const hasSmtpConfig = () => Boolean(config.smtpHost && config.smtpUser && config.smtpPass);

const sendVerificationEmail = async ({ email, code, purpose }) => {
  const purposeLabel = purpose === 'reset_password' ? '找回密码' : '注册账号';
  const subject = `SIEHUB ${purposeLabel}验证码`;
  const text = `你的 SIEHUB ${purposeLabel}验证码是：${code}。验证码10分钟内有效，请勿转发给他人。`;
  const html = `
    <div style="font-family:Arial,'Microsoft YaHei',sans-serif;line-height:1.7;color:#123766">
      <h2 style="margin:0 0 12px">SIEHUB ${purposeLabel}验证码</h2>
      <p>你的验证码为：</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0">${code}</p>
      <p>验证码10分钟内有效，请勿转发给他人。如非本人操作，请忽略本邮件。</p>
    </div>
  `;

  if (!hasSmtpConfig()) {
    console.log(`[DEV EMAIL CODE] ${purposeLabel} ${email}: ${code}`);
    return { delivered: false, devMode: true };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass }
  });
  await transporter.sendMail({ from: config.smtpFrom, to: email, subject, text, html });
  return { delivered: true, devMode: false };
};

const issueEmailVerification = async ({ email, purpose }) => {
  const normalizedEmail = normalizeEmail(email);
  const latest = await EmailVerification.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });
  if (latest?.lastSentAt && Date.now() - latest.lastSentAt.getTime() < 60000) {
    const retryAfter = Math.ceil((60000 - (Date.now() - latest.lastSentAt.getTime())) / 1000);
    return { ok: false, status: 429, message: `验证码发送过于频繁，请 ${retryAfter} 秒后再试` };
  }

  const code = createVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await EmailVerification.create({
    email: normalizedEmail,
    purpose,
    codeHash: hashVerificationCode(normalizedEmail, purpose, code),
    expiresAt,
    lastSentAt: new Date()
  });
  const delivery = await sendVerificationEmail({ email: normalizedEmail, code, purpose });
  return { ok: true, expiresAt, ...delivery };
};

const verifyEmailCode = async ({ email, purpose, code, consume = true }) => {
  const normalizedEmail = normalizeEmail(email);
  const cleanCode = sanitizeInput(code || '');
  if (!/^\d{6}$/.test(cleanCode)) return { ok: false, message: '请输入6位邮箱验证码' };

  const record = await EmailVerification.findOne({
    email: normalizedEmail,
    purpose,
    expiresAt: { $gt: new Date() },
    verifiedAt: null
  }).sort({ createdAt: -1 });

  if (!record) return { ok: false, message: '验证码不存在或已过期，请重新获取' };
  if (record.attempts >= 5) return { ok: false, message: '验证码错误次数过多，请重新获取' };

  const expectedHash = hashVerificationCode(normalizedEmail, purpose, cleanCode);
  if (record.codeHash !== expectedHash) {
    record.attempts += 1;
    await record.save();
    return { ok: false, message: '验证码错误' };
  }

  if (consume) {
    record.verifiedAt = new Date();
    await record.save();
  }
  return { ok: true, record };
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
  avatarUrl: user.avatarUrl || '',
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
    canEdit: moduleAccess.capabilities?.includes('manage_department_performance') ||
      moduleAccess.capabilities?.includes('manage_volunteer_performance_policy') ||
      false
  };
};

const getDepartmentIntroductionAccess = (user, assignment) => {
  const moduleAccess = getHubModuleAccess(user).find(item =>
    item.organization === assignment.organization &&
    item.department === assignment.department
  );
  if (!moduleAccess) return null;
  return {
    moduleId: moduleAccess.moduleId,
    accessLevel: moduleAccess.accessLevel,
    capabilities: moduleAccess.capabilities || [],
    canEdit: moduleAccess.capabilities?.includes('manage_department_introduction') || false,
    canPublish: moduleAccess.capabilities?.includes('manage_department_introduction') || false
  };
};

const getDepartmentNoticeAccess = (user, assignment) => {
  const moduleAccess = getHubModuleAccess(user).find(item =>
    item.organization === assignment.organization &&
    item.department === assignment.department
  );
  if (!moduleAccess) return null;
  const canManage = moduleAccess.capabilities?.includes('manage_department_notice') || false;
  return {
    moduleId: moduleAccess.moduleId,
    accessLevel: moduleAccess.accessLevel,
    capabilities: moduleAccess.capabilities || [],
    canCreate: canManage,
    canEdit: canManage,
    canPublish: canManage
  };
};

const getDepartmentCapabilityAccess = (user, assignment, capability) => {
  if (!isValidManagedDepartment(assignment)) return null;
  const moduleAccess = getHubModuleAccess(user).find(item =>
    item.organization === assignment.organization &&
    item.department === assignment.department
  );
  if (!moduleAccess?.capabilities?.includes(capability)) return null;
  return {
    moduleId: moduleAccess.moduleId,
    accessLevel: moduleAccess.accessLevel,
    capabilities: moduleAccess.capabilities || []
  };
};

const hasDepartmentCapability = (user, assignment, capability) =>
  Boolean(getDepartmentCapabilityAccess(user, assignment, capability));

const canUseSensitiveSecurityTools = (user = {}) =>
  Boolean(
    user.isUltimateAdmin ||
    (user.role === 'superadmin' && (!user.positionTitle || user.positionTitle === 'student')) ||
    ['presidium_member', 'youth_league_deputy_secretary'].includes(user.positionTitle)
  );

const cleanText = (value, maxLength = 500) => {
  const clean = sanitizeInput(value || '');
  return typeof clean === 'string' ? clean.slice(0, maxLength) : '';
};

const cleanLocalizedText = (value = {}, fallback = {}, maxLength = 500) => ({
  zh: cleanText(value.zh ?? fallback.zh ?? '', maxLength),
  en: cleanText(value.en ?? fallback.en ?? '', maxLength)
});

const normalizeNoticePayload = (payload = {}, existing = null) => {
  const source = ['manual', 'wechat_mp'].includes(payload.source) ? payload.source : existing?.source || 'manual';
  const status = ['draft', 'published', 'archived'].includes(payload.status) ? payload.status : existing?.status || 'draft';
  const publishedAt = status === 'published'
    ? new Date(payload.publishedAt || existing?.publishedAt || Date.now())
    : existing?.publishedAt || null;
  const title = cleanLocalizedText(payload.title, existing?.title || {}, 120);
  const summary = cleanLocalizedText(payload.summary, existing?.summary || {}, 260);
  const body = cleanLocalizedText(payload.body, existing?.body || {}, 6000);

  return {
    title,
    summary,
    body,
    coverImageUrl: cleanText(payload.coverImageUrl ?? existing?.coverImageUrl ?? '', 500),
    sourceUrl: cleanText(payload.sourceUrl ?? existing?.sourceUrl ?? '', 500),
    source,
    sourceExternalId: cleanText(payload.sourceExternalId ?? existing?.sourceExternalId ?? '', 160) || undefined,
    status,
    publishedAt
  };
};

const serializeNoticeUserBrief = (user) => user ? ({
  id: user._id || user.id,
  name: user.name || '',
  studentId: user.studentId || ''
}) : null;

const serializeDepartmentNotice = (notice) => {
  const item = notice?.toObject ? notice.toObject() : notice;
  if (!item) return null;
  return {
    id: item._id,
    _id: item._id,
    organization: item.organization,
    organizationLabel: ORGANIZATIONS[item.organization]?.label || '',
    department: item.department,
    departmentLabel: getDepartment(item.organization, item.department) || '',
    title: item.title || { zh: '', en: '' },
    summary: item.summary || { zh: '', en: '' },
    body: item.body || { zh: '', en: '' },
    coverImageUrl: item.coverImageUrl || '',
    sourceUrl: item.sourceUrl || '',
    source: item.source || 'manual',
    sourceExternalId: item.sourceExternalId || '',
    status: item.status,
    publishedAt: item.publishedAt || null,
    createdBy: serializeNoticeUserBrief(item.createdBy),
    updatedBy: serializeNoticeUserBrief(item.updatedBy),
    publishedBy: serializeNoticeUserBrief(item.publishedBy),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const wechatMpSyncState = {
  lastSyncAt: null,
  lastSuccessAt: null,
  lastError: '',
  importedCount: 0,
  updatedCount: 0
};

let wechatMpTokenCache = {
  token: '',
  expiresAt: 0
};

let wechatMpSyncInFlight = null;

const fetchJsonWithTimeout = async (url, options = {}, timeoutMs = 12_000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const data = await res.json();
    return { res, data };
  } finally {
    clearTimeout(timer);
  }
};

const getWechatMpConfig = () => {
  const assignment = {
    organization: process.env.WECHAT_MP_NOTICE_ORGANIZATION || 'student_union',
    department: process.env.WECHAT_MP_NOTICE_DEPARTMENT || 'new_media'
  };
  return {
    enabled: String(process.env.WECHAT_MP_ENABLED || '').toLowerCase() === 'true',
    appId: process.env.WECHAT_MP_APP_ID || '',
    appSecret: process.env.WECHAT_MP_APP_SECRET || '',
    accountName: process.env.WECHAT_MP_ACCOUNT_NAME || '国教空间',
    accountUrl: process.env.WECHAT_MP_ACCOUNT_URL || '',
    coverImageUrl: process.env.WECHAT_MP_COVER_IMAGE_URL || '',
    qrImageUrl: process.env.WECHAT_MP_QR_IMAGE_URL || '',
    fallbackDescription: process.env.WECHAT_MP_FALLBACK_DESCRIPTION || '关注“国教空间”微信公众号，查看学院资讯与学生工作动态。',
    syncIntervalMinutes: Math.max(5, Number(process.env.WECHAT_MP_SYNC_INTERVAL_MINUTES || 60)),
    assignment: isValidManagedDepartment(assignment) ? assignment : { organization: 'student_union', department: 'new_media' }
  };
};

const isWechatMpSyncConfigured = (config = getWechatMpConfig()) =>
  Boolean(config.enabled && config.appId && config.appSecret);

const getWechatMpPublicConfig = (includeSync = false) => {
  const config = getWechatMpConfig();
  const publicConfig = {
    enabled: config.enabled,
    accountName: config.accountName,
    accountUrl: config.accountUrl,
    coverImageUrl: config.coverImageUrl,
    qrImageUrl: config.qrImageUrl,
    fallbackDescription: config.fallbackDescription,
    syncAvailable: isWechatMpSyncConfigured(config),
    noticeOrganization: config.assignment.organization,
    noticeDepartment: config.assignment.department,
    noticeDepartmentLabel: getDepartment(config.assignment.organization, config.assignment.department) || ''
  };
  if (includeSync) publicConfig.sync = wechatMpSyncState;
  return publicConfig;
};

const fetchWechatMpAccessToken = async (config) => {
  const now = Date.now();
  if (wechatMpTokenCache.token && wechatMpTokenCache.expiresAt - 60_000 > now) {
    return wechatMpTokenCache.token;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credential',
    appid: config.appId,
    secret: config.appSecret
  });
  const { res, data } = await fetchJsonWithTimeout(`https://api.weixin.qq.com/cgi-bin/token?${params.toString()}`);
  if (!res.ok || !data.access_token) {
    throw new Error(`wechat_token_failed_${data.errcode || res.status}`);
  }
  wechatMpTokenCache = {
    token: data.access_token,
    expiresAt: now + Math.max(300, Number(data.expires_in || 7200)) * 1000
  };
  return data.access_token;
};

const fetchWechatMpPublishedArticles = async (accessToken, offset = 0, count = 20) => {
  const { res, data } = await fetchJsonWithTimeout(`https://api.weixin.qq.com/cgi-bin/freepublish/batchget?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset, count, no_content: 0 })
  });
  if (!res.ok || data.errcode) {
    throw new Error(`wechat_articles_failed_${data.errcode || res.status}`);
  }
  return {
    items: Array.isArray(data.item) ? data.item : [],
    totalCount: Number(data.total_count || 0)
  };
};

const buildWechatNoticePayload = (article, newsItem, index, assignment) => {
  const publishedAt = article.update_time ? new Date(Number(article.update_time) * 1000) : new Date();
  return {
    ...assignment,
    title: { zh: cleanText(newsItem.title, 120), en: '' },
    summary: { zh: cleanText(newsItem.digest || newsItem.author || '', 260), en: '' },
    body: { zh: cleanText(newsItem.content || newsItem.digest || newsItem.title || '', 6000), en: '' },
    coverImageUrl: cleanText(newsItem.thumb_url || '', 500),
    sourceUrl: cleanText(newsItem.url || '', 500),
    source: 'wechat_mp',
    sourceExternalId: `${article.article_id || article.article_id_string || article.media_id || 'article'}:${article.update_time || 0}:${index}`,
    status: 'published',
    publishedAt
  };
};

const runWechatMpArticleSync = async () => {
  const config = getWechatMpConfig();
  wechatMpSyncState.lastSyncAt = new Date();
  wechatMpSyncState.lastError = '';
  if (!isWechatMpSyncConfigured(config)) {
    wechatMpSyncState.lastError = 'wechat_mp_not_configured';
    return { configured: false, importedCount: 0, updatedCount: 0 };
  }

  const accessToken = await fetchWechatMpAccessToken(config);
  const articles = [];
  let offset = 0;
  const count = 20;
  while (true) {
    const batch = await fetchWechatMpPublishedArticles(accessToken, offset, count);
    articles.push(...batch.items);
    offset += batch.items.length;
    if (!batch.items.length || batch.items.length < count || (batch.totalCount && offset >= batch.totalCount)) break;
  }
  let importedCount = 0;
  let updatedCount = 0;

  for (const article of articles) {
    const items = article.content?.news_item || [];
    for (let index = 0; index < items.length; index += 1) {
      const payload = buildWechatNoticePayload(article, items[index], index, config.assignment);
      if (!payload.title.zh || !payload.sourceExternalId) continue;
      const result = await DepartmentNotice.updateOne(
        { source: 'wechat_mp', sourceExternalId: payload.sourceExternalId },
        { $set: payload },
        { upsert: true }
      );
      if (result.upsertedCount) importedCount += 1;
      else if (result.modifiedCount) updatedCount += 1;
    }
  }

  Object.assign(wechatMpSyncState, {
    lastSuccessAt: new Date(),
    importedCount,
    updatedCount
  });
  return { configured: true, importedCount, updatedCount };
};

const syncWechatMpArticles = async () => {
  if (wechatMpSyncInFlight) return wechatMpSyncInFlight;
  wechatMpSyncInFlight = runWechatMpArticleSync().finally(() => {
    wechatMpSyncInFlight = null;
  });
  return wechatMpSyncInFlight;
};

const normalizeDateToEndOfDay = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
};

const createDefaultDepartmentIntroduction = (organization, department) => {
  const departmentLabel = getDepartment(organization, department) || '部门';
  const organizationLabel = ORGANIZATIONS[organization]?.label || '';
  return {
    blocks: [
      {
        id: 'default-hero',
        type: 'hero',
        visible: true,
        data: {
          title: { zh: departmentLabel, en: departmentLabel },
          subtitle: {
            zh: `${organizationLabel}${departmentLabel}介绍页面正在建设中。`,
            en: `${departmentLabel} introduction page is being prepared.`
          }
        }
      },
      {
        id: 'default-text',
        type: 'text',
        visible: true,
        data: {
          title: { zh: '部门简介', en: 'Department Profile' },
          body: {
            zh: '该部门将持续完善职责介绍、成员风采、服务流程与联系方式。',
            en: 'This department will keep improving its responsibilities, team profile, service process and contact information.'
          }
        }
      }
    ],
    pages: [
      {
        id: 'default-page',
        title: { zh: departmentLabel, en: departmentLabel },
        width: 1440,
        height: 900,
        backgroundColor: '#f8fafc',
        backgroundImageUrl: '',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overlayColor: '#0f172a',
        overlayOpacity: 0,
        transition: 'rise',
        elements: [
          {
            id: 'default-page-title',
            type: 'text',
            visible: true,
            content: { text: { zh: departmentLabel, en: departmentLabel } },
            style: {
              x: 88,
              y: 88,
              width: 720,
              height: 140,
              rotation: 0,
              zIndex: 3,
              fontFamily: 'Noto Serif SC',
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.1,
              color: '#102238',
              textAlign: 'left',
              backgroundColor: 'transparent',
              backgroundImageUrl: '',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              objectFit: 'cover',
              objectPosition: 'center',
              borderColor: 'transparent',
              borderWidth: 0,
              borderRadius: 16,
              padding: 0,
              overlayColor: '#0f172a',
              overlayOpacity: 0,
              opacity: 1
            }
          },
          {
            id: 'default-page-card',
            type: 'card',
            visible: true,
            content: {
              title: { zh: '部门简介', en: 'Department Profile' },
              body: {
                zh: `${organizationLabel}${departmentLabel}介绍页面正在建设中。`,
                en: 'This department introduction page is being prepared.'
              }
            },
            style: {
              x: 92,
              y: 310,
              width: 500,
              height: 260,
              rotation: 0,
              zIndex: 4,
              fontFamily: 'Noto Sans SC',
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.25,
              color: '#132033',
              textAlign: 'left',
              backgroundColor: '#ffffff',
              backgroundImageUrl: '',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              objectFit: 'cover',
              objectPosition: 'center',
              borderColor: 'transparent',
              borderWidth: 0,
              borderRadius: 28,
              padding: 24,
              overlayColor: '#0f172a',
              overlayOpacity: 0,
              opacity: 1
            }
          }
        ]
      }
    ]
  };
};

const normalizeIntroductionBlock = (block = {}, index = 0) => {
  const allowedTypes = new Set(['hero', 'text', 'image', 'video', 'duties', 'contact']);
  const type = allowedTypes.has(block.type) ? block.type : 'text';
  const normalizeOverlayOpacity = (value, fallback) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(0.9, number));
  };
  const normalizeTextTone = (value, fallback) => ['light', 'dark'].includes(value) ? value : fallback;
  const base = {
    id: cleanText(block.id, 48) || crypto.randomUUID(),
    type,
    visible: block.visible !== false,
    data: {}
  };

  if (type === 'hero') {
    base.data.title = cleanLocalizedText(block.data?.title, { zh: '部门介绍', en: 'Department Introduction' }, 80);
    base.data.subtitle = cleanLocalizedText(block.data?.subtitle, {}, 240);
    base.data.backgroundImageUrl = cleanText(block.data?.backgroundImageUrl, 300);
    base.data.overlayOpacity = normalizeOverlayOpacity(block.data?.overlayOpacity, 0.45);
    base.data.textTone = normalizeTextTone(block.data?.textTone, 'light');
  } else if (type === 'text') {
    base.data.title = cleanLocalizedText(block.data?.title, { zh: `正文 ${index + 1}`, en: `Section ${index + 1}` }, 80);
    base.data.body = cleanLocalizedText(block.data?.body, {}, 1600);
    base.data.backgroundImageUrl = cleanText(block.data?.backgroundImageUrl, 300);
    base.data.overlayOpacity = normalizeOverlayOpacity(block.data?.overlayOpacity, 0.18);
    base.data.textTone = normalizeTextTone(block.data?.textTone, 'dark');
  } else if (type === 'image' || type === 'video') {
    base.data.title = cleanLocalizedText(block.data?.title, { zh: type === 'image' ? '图片展示' : '视频展示', en: type === 'image' ? 'Image' : 'Video' }, 80);
    base.data.caption = cleanLocalizedText(block.data?.caption, {}, 240);
    base.data.url = cleanText(block.data?.url, 300);
    base.data.alt = cleanLocalizedText(block.data?.alt, {}, 120);
  } else if (type === 'duties') {
    base.data.title = cleanLocalizedText(block.data?.title, { zh: '部门职责', en: 'Responsibilities' }, 80);
    const items = Array.isArray(block.data?.items) ? block.data.items : [];
    base.data.items = items.slice(0, 12).map(item => cleanLocalizedText(item, {}, 220)).filter(item => item.zh || item.en);
  } else if (type === 'contact') {
    base.data.title = cleanLocalizedText(block.data?.title, { zh: '联系方式', en: 'Contact' }, 80);
    const items = Array.isArray(block.data?.items) ? block.data.items : [];
    base.data.items = items.slice(0, 12).map(item => ({
      label: cleanLocalizedText(item?.label, {}, 40),
      value: cleanLocalizedText(item?.value, {}, 160)
    })).filter(item => item.label.zh || item.label.en || item.value.zh || item.value.en);
  }

  return base;
};

const normalizeIntroductionContent = (payload = {}, assignment) => {
  const cleanCanvasStyle = (style = {}, index = 0) => {
    const clamp = (value, fallback, min, max) => {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.max(min, Math.min(max, number));
    };
    return {
      x: clamp(style.x, 80 + (index % 5) * 28, -2400, 2400),
      y: clamp(style.y, 80 + (index % 5) * 28, -2400, 2400),
      width: clamp(style.width, 360, 24, 2400),
      height: clamp(style.height, 180, 24, 1800),
      rotation: clamp(style.rotation, 0, -180, 180),
      zIndex: clamp(style.zIndex, index + 1, 0, 999),
      fontFamily: cleanText(style.fontFamily, 80) || 'Noto Sans SC',
      fontSize: clamp(style.fontSize, 24, 8, 180),
      fontWeight: clamp(style.fontWeight, 700, 100, 1000),
      lineHeight: clamp(style.lineHeight, 1.25, 0.8, 3),
      color: cleanText(style.color, 40) || '#0f172a',
      textAlign: ['left', 'center', 'right'].includes(style.textAlign) ? style.textAlign : 'left',
      backgroundColor: cleanText(style.backgroundColor, 40) || 'transparent',
      backgroundImageUrl: cleanText(style.backgroundImageUrl, 300),
      backgroundSize: ['cover', 'contain', 'auto'].includes(style.backgroundSize) ? style.backgroundSize : 'cover',
      backgroundPosition: cleanText(style.backgroundPosition, 80) || 'center',
      objectFit: ['cover', 'contain', 'fill'].includes(style.objectFit) ? style.objectFit : 'cover',
      objectPosition: cleanText(style.objectPosition, 80) || 'center',
      borderColor: cleanText(style.borderColor, 40) || 'transparent',
      borderWidth: clamp(style.borderWidth, 0, 0, 16),
      borderRadius: clamp(style.borderRadius, 16, 0, 120),
      padding: clamp(style.padding, 20, 0, 120),
      overlayColor: cleanText(style.overlayColor, 40) || '#0f172a',
      overlayOpacity: clamp(style.overlayOpacity, 0, 0, 0.95),
      opacity: clamp(style.opacity, 1, 0.05, 1)
    };
  };
  const cleanCanvasElement = (element = {}, index = 0) => {
    const allowedTypes = new Set(['text', 'image', 'shape', 'card', 'activity']);
    const type = allowedTypes.has(element.type) ? element.type : 'text';
    const content = element.content || {};
    const base = {
      id: cleanText(element.id, 64) || crypto.randomUUID(),
      type,
      visible: element.visible !== false,
      content: {},
      style: cleanCanvasStyle(element.style || {}, index)
    };
    if (type === 'text') {
      base.content.text = cleanLocalizedText(content.text, { zh: '新文本', en: 'New text' }, 1200);
    } else if (type === 'image') {
      base.content.title = cleanLocalizedText(content.title, {}, 120);
      base.content.alt = cleanLocalizedText(content.alt, {}, 160);
      base.content.url = cleanText(content.url, 300);
    } else if (type === 'shape') {
      base.content.label = cleanLocalizedText(content.label, {}, 160);
    } else if (type === 'card') {
      base.content.title = cleanLocalizedText(content.title, { zh: '信息卡片', en: 'Info card' }, 160);
      base.content.body = cleanLocalizedText(content.body, {}, 1600);
    } else if (type === 'activity') {
      base.content.kicker = cleanLocalizedText(content.kicker, { zh: 'ACTIVITY', en: 'ACTIVITY' }, 80);
      base.content.title = cleanLocalizedText(content.title, { zh: '新活动', en: 'New activity' }, 160);
      base.content.body = cleanLocalizedText(content.body, {}, 1400);
      base.content.date = cleanLocalizedText(content.date, {}, 80);
    }
    return base;
  };
  const incomingPages = Array.isArray(payload.pages) ? payload.pages : [];
  const pages = incomingPages.slice(0, 12).map((page, index) => {
    const elements = Array.isArray(page.elements) ? page.elements : [];
    return {
      id: cleanText(page.id, 64) || crypto.randomUUID(),
      title: cleanLocalizedText(page.title, { zh: `页面 ${index + 1}`, en: `Page ${index + 1}` }, 120),
      width: Math.max(640, Math.min(2400, Number(page.width) || 1440)),
      height: Math.max(420, Math.min(1800, Number(page.height) || 900)),
      backgroundColor: cleanText(page.backgroundColor, 40) || '#f8fafc',
      backgroundImageUrl: cleanText(page.backgroundImageUrl, 300),
      backgroundSize: ['cover', 'contain', 'auto'].includes(page.backgroundSize) ? page.backgroundSize : 'cover',
      backgroundPosition: cleanText(page.backgroundPosition, 80) || 'center',
      overlayColor: cleanText(page.overlayColor, 40) || '#0f172a',
      overlayOpacity: Math.max(0, Math.min(0.95, Number(page.overlayOpacity) || 0)),
      transition: ['fade', 'slide', 'rise', 'none'].includes(page.transition) ? page.transition : 'rise',
      elements: elements.slice(0, 80).map(cleanCanvasElement)
    };
  });

  const incomingBlocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  const blocks = incomingBlocks
    .slice(0, 24)
    .map(normalizeIntroductionBlock)
    .filter(block => block.visible !== false || block.data);

  return {
    ...(pages.length ? { pages } : {}),
    blocks: blocks.length ? blocks : createDefaultDepartmentIntroduction(assignment.organization, assignment.department).blocks
  };
};

const serializeDepartmentIntroduction = (doc, assignment, mode = 'published') => {
  const intro = doc?.toObject ? doc.toObject() : doc;
  const fallback = createDefaultDepartmentIntroduction(assignment.organization, assignment.department);
  const content = mode === 'editor'
    ? (intro?.draftContent || intro?.publishedContent || fallback)
    : (intro?.publishedContent || fallback);

  return {
    organization: assignment.organization,
    department: assignment.department,
    organizationLabel: ORGANIZATIONS[assignment.organization]?.label || '',
    departmentLabel: getDepartment(assignment.organization, assignment.department) || '',
    status: intro?.status || 'draft',
    draftVersion: intro?.draftVersion || 0,
    publishedVersion: intro?.publishedVersion || 0,
    publishedAt: intro?.publishedAt || null,
    hasPublished: Boolean(intro?.publishedContent),
    content
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
    current = await SystemConfig.create({ key: 'currentSemester', value: DEFAULT_CURRENT_SEMESTER });
  }
  return current.value;
};

const createChinaBoundaryDate = (year, monthIndex, day = 1) => new Date(Date.UTC(year, monthIndex, day, -8));

const getSemesterDateRange = (semesterName, now = new Date()) => {
  const normalizedSemesterName = String(semesterName || '');
  const yearMatch = normalizedSemesterName.match(/(\d{4})\D+(\d{4})/);
  const termMatch = normalizedSemesterName.match(/(?:\u7b2c)?\s*([\u4e00\u4e8c12])\s*\u5b66\u671f/);
  if (yearMatch && termMatch) {
    const firstYear = Number(yearMatch[1]);
    const secondYear = Number(yearMatch[2]);
    const term = termMatch[1];
    if (term === '\u4e00' || term === '1') {
      return {
        start: createChinaBoundaryDate(firstYear, 7),
        end: createChinaBoundaryDate(secondYear, 1)
      };
    }
    return {
      start: createChinaBoundaryDate(secondYear, 1),
      end: createChinaBoundaryDate(secondYear, 7)
    };
  }

  const match = String(semesterName || '').match(/(\d{4})\s*[-—至]\s*(\d{4}).*第?([一二12])学期/);
  if (match) {
    const firstYear = Number(match[1]);
    const secondYear = Number(match[2]);
    const term = match[3];
    if (term === '一' || term === '1') {
      return {
        start: createChinaBoundaryDate(firstYear, 7),
        end: createChinaBoundaryDate(secondYear, 1)
      };
    }
    return {
      start: createChinaBoundaryDate(secondYear, 1),
      end: createChinaBoundaryDate(secondYear, 7)
    };
  }

  const chinaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const year = chinaNow.getFullYear();
  const month = chinaNow.getMonth();
  return month >= 7
    ? { start: createChinaBoundaryDate(year, 7), end: createChinaBoundaryDate(year + 1, 1) }
    : { start: createChinaBoundaryDate(year, 1), end: createChinaBoundaryDate(year, 7) };
};

const FEEDBACK_CATEGORY_LABELS = {
  academic: '教学教务',
  accommodation: '宿舍住宿',
  catering: '餐饮服务',
  safety: '安全保卫',
  comprehensive: '综合服务与其他'
};

const FEEDBACK_STATUS_LABELS = {
  pending: '待受理',
  processing: '处理中',
  resolved: '已解决',
  rejected: '已拒绝'
};

const FEEDBACK_PRIORITY_LABELS = {
  low: '较低',
  normal: '一般',
  high: '紧急',
  urgent: '加急'
};

const getChinaDateParts = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    dateText: `${parts.year}-${parts.month}-${parts.day}`
  };
};

const getSemesterInfoFromDate = (value) => {
  const { year, month } = getChinaDateParts(value);
  let academicStartYear;
  let term;
  if (month >= 8) {
    academicStartYear = year;
    term = 1;
  } else if (month === 1) {
    academicStartYear = year - 1;
    term = 1;
  } else {
    academicStartYear = year - 1;
    term = 2;
  }
  const academicEndYear = academicStartYear + 1;
  const academicYear = `${academicStartYear}-${academicEndYear}学年`;
  const termLabel = term === 1 ? '第一学期' : '第二学期';
  return {
    academicStartYear,
    academicEndYear,
    academicYear,
    term,
    termLabel,
    semester: `${academicYear} ${termLabel}`,
    sortKey: `${academicStartYear}-${term}`
  };
};

const getFirstAdminResponseAt = (feedback = {}) => {
  const times = (feedback.responses || [])
    .filter(resp => ['admin', 'superadmin'].includes(resp.senderType) && resp.isRecalled !== true && resp.createdAt)
    .map(resp => new Date(resp.createdAt))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return times[0] || null;
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildAdminFeedbackQueryFromRequest = (req, { forceExcludeRevoked = false, ignoreTimeRange = false } = {}) => {
  const {
    status,
    category,
    priority,
    search,
    startDate,
    endDate,
    semester
  } = req.query || {};
  const query = {};

  if (forceExcludeRevoked || !hasSuperadminAccess(req.user)) {
    query.isRevoked = { $ne: true };
  }
  if (status) query.status = sanitizeInput(status);
  if (category) query.category = sanitizeInput(category);
  if (priority) query.priority = sanitizeInput(priority);

  if (req.user.role === 'superadmin' && !req.user.isUltimateAdmin) {
    Object.assign(query, buildDepartmentScopedQuery(req.user));
  }

  if (!ignoreTimeRange) {
    if (semester) {
      const { start, end } = getSemesterDateRange(sanitizeInput(semester));
      query.createdAt = { $gte: start, $lt: end };
    } else if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
  }

  if (search) {
    const keywords = sanitizeInput(search).trim().split(/\s+/).filter(Boolean);
    if (keywords.length > 0) {
      query.$and = keywords.map(kw => {
        const pattern = escapeRegExp(kw);
        return {
          $or: [
            { title: { $regex: pattern, $options: 'i' } },
            { content: { $regex: pattern, $options: 'i' } },
            { subCategory: { $regex: pattern, $options: 'i' } }
          ]
        };
      });
    }
  }

  return query;
};

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
};

const formatDateTimeForReport = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
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
const hasSievoxSemesterAccess = (user) => {
  if (!user) return false;
  if (user.isUltimateAdmin) return true;
  return (getHubModuleAccess(user) || []).some(module => (
    module.moduleId === 'sievox' &&
    (
      module.accessLevel === 'manage' ||
      module.accessLevel === 'ultimate' ||
      module.capabilities?.includes('manage_module') ||
      module.capabilities?.includes('enter_manage_portal')
    )
  ));
};

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
  const ids = await User.find({ memberRole: 'volunteer', ...scopeQuery }).distinct('_id');
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
  phone: user.phone || '',
  avatarUrl: user.avatarUrl || ''
});

const getDepartmentMemberSortRank = (member = {}) => {
  const positionTitle = member.positionTitle || member.user?.positionTitle || 'student';
  const memberRole = member.memberRole || member.user?.memberRole || 'student';
  if (['presidium_member', 'youth_league_deputy_secretary'].includes(positionTitle)) return 0;
  if (['department_head', 'youth_league_cadre'].includes(positionTitle)) return 1;
  if (memberRole === 'volunteer' || positionTitle === 'volunteer') return 2;
  return 3;
};

const serializeDepartmentMember = (member, cohort = null, source = 'archive') => {
  const account = member.accountSnapshot || {};
  const user = member.user || {};
  const positionTitle = member.positionTitle || user.positionTitle || 'student';
  const memberRole = member.memberRole || user.memberRole || 'student';
  const showPerformance = memberRole === 'volunteer' || positionTitle === 'volunteer';
  return {
    id: member._id || user._id,
    userId: user._id || member.user || null,
    source,
    cohort: cohort ? serializeCohort(cohort) : null,
    name: account.name || user.name || '',
    studentId: account.studentId || user.studentId || '',
    email: account.email || user.email || '',
    phone: account.phone || user.phone || '',
    avatarUrl: account.avatarUrl || user.avatarUrl || '',
    systemRole: member.systemRole || user.role || 'student',
    memberRole,
    memberRoleLabel: MEMBER_ROLES[memberRole] || '',
    positionTitle,
    identityLabel: POSITION_TITLES[positionTitle] || '',
    organization: member.organization || user.organization || null,
    organizationLabel: ORGANIZATIONS[member.organization || user.organization]?.label || '',
    department: member.department || user.department || null,
    departmentLabel: getDepartmentLabel(member.organization || user.organization, member.department || user.department),
    managedDepartments: (member.managedDepartments || user.managedDepartments || []).map(serializeManagedDepartment),
    performanceSnapshot: showPerformance ? (member.performanceSnapshot || {}) : null,
    showPerformance,
    archivedAt: member.archivedAt || null,
    createdAt: member.createdAt || user.createdAt || null
  };
};

const sortDepartmentMembers = (a, b) => {
  const rankDiff = getDepartmentMemberSortRank(a) - getDepartmentMemberSortRank(b);
  if (rankDiff !== 0) return rankDiff;
  const aPerformance = Number(a.performanceSnapshot?.total || 0);
  const bPerformance = Number(b.performanceSnapshot?.total || 0);
  if (getDepartmentMemberSortRank(a) === 2 && aPerformance !== bPerformance) {
    return bPerformance - aPerformance;
  }
  return String(a.studentId || a.accountSnapshot?.studentId || a.user?.studentId || '')
    .localeCompare(String(b.studentId || b.accountSnapshot?.studentId || b.user?.studentId || ''), 'zh-Hans-CN');
};

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

app.get('/api/privacy/notice-status', async (req, res) => {
  try {
    const ipHash = hashPrivacyValue(getClientIp(req));
    const accepted = await PrivacyNoticeAcceptance.exists({ ipHash, noticeVersion: PRIVACY_NOTICE_VERSION });
    res.json({
      success: true,
      required: !accepted,
      accepted: Boolean(accepted),
      noticeVersion: PRIVACY_NOTICE_VERSION
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '隐私条款状态查询失败' });
  }
});

app.post('/api/privacy/notice-acceptance', async (req, res) => {
  try {
    const ipHash = hashPrivacyValue(getClientIp(req));
    const userAgentHash = hashPrivacyValue(req.get('user-agent') || '');
    await PrivacyNoticeAcceptance.updateOne(
      { ipHash, noticeVersion: PRIVACY_NOTICE_VERSION },
      { $set: { acceptedAt: new Date(), userAgentHash } },
      { upsert: true }
    );
    res.json({ success: true, accepted: true, noticeVersion: PRIVACY_NOTICE_VERSION });
  } catch (error) {
    res.status(500).json({ success: false, message: '隐私条款确认失败' });
  }
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

app.get('/api/hub/wechat-mp', authenticate, (req, res) => {
  res.json({ success: true, wechatMp: getWechatMpPublicConfig(hasUltimateAccess(req.user)) });
});

app.post('/api/hub/wechat-mp/sync', authenticate, ultimateOnly, async (req, res) => {
  try {
    const result = await syncWechatMpArticles();
    res.json({ success: true, result, wechatMp: getWechatMpPublicConfig(true) });
  } catch (error) {
    wechatMpSyncState.lastError = error.message || 'wechat_sync_failed';
    res.status(502).json({ success: false, message: '微信公众号同步失败，请检查凭据、接口权限和服务器 IP 白名单', wechatMp: getWechatMpPublicConfig(true) });
  }
});

app.get('/api/hub/notices', authenticate, async (req, res) => {
  const query = { status: 'published' };
  if (req.query.organization || req.query.department) {
    const assignment = { organization: req.query.organization, department: req.query.department };
    if (!isValidManagedDepartment(assignment)) return res.status(404).json({ success: false, message: '部门模块不存在' });
    query.organization = assignment.organization;
    query.department = assignment.department;
  }
  if (['manual', 'wechat_mp'].includes(req.query.source)) query.source = req.query.source;
  if (req.query.dateFrom || req.query.dateTo) {
    query.publishedAt = {};
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
    const dateTo = normalizeDateToEndOfDay(req.query.dateTo);
    if (dateFrom && !Number.isNaN(dateFrom.getTime())) query.publishedAt.$gte = dateFrom;
    if (dateTo && !Number.isNaN(dateTo.getTime())) query.publishedAt.$lte = dateTo;
    if (!Object.keys(query.publishedAt).length) delete query.publishedAt;
  }

  try {
    const notices = await DepartmentNotice.find(query)
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(Math.min(Number(req.query.limit || 100), 200))
      .populate('createdBy updatedBy publishedBy', 'name studentId')
      .lean();
    res.json({ success: true, notices: notices.map(serializeDepartmentNotice) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门通知失败' });
  }
});

app.get('/api/hub/departments/:organization/:department/notices', authenticate, async (req, res) => {
  const assignment = { organization: req.params.organization, department: req.params.department };
  if (!isValidManagedDepartment(assignment)) return res.status(404).json({ success: false, message: '部门模块不存在' });
  const access = getDepartmentNoticeAccess(req.user, assignment);
  if (!access) return res.status(403).json({ success: false, message: '无权访问该部门通知' });

  const requestedStatus = ['draft', 'published', 'archived'].includes(req.query.status) ? req.query.status : 'published';
  const query = { ...assignment, status: access.canEdit ? requestedStatus : 'published' };
  if (['manual', 'wechat_mp'].includes(req.query.source)) query.source = req.query.source;
  if (req.query.dateFrom || req.query.dateTo) {
    query.publishedAt = {};
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
    const dateTo = normalizeDateToEndOfDay(req.query.dateTo);
    if (dateFrom && !Number.isNaN(dateFrom.getTime())) query.publishedAt.$gte = dateFrom;
    if (dateTo && !Number.isNaN(dateTo.getTime())) query.publishedAt.$lte = dateTo;
    if (!Object.keys(query.publishedAt).length) delete query.publishedAt;
  }

  try {
    const notices = await DepartmentNotice.find(query)
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(Math.min(Number(req.query.limit || 30), 100))
      .populate('createdBy updatedBy publishedBy', 'name studentId')
      .lean();
    res.json({ success: true, access, notices: notices.map(serializeDepartmentNotice) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门通知失败' });
  }
});

app.get('/api/hub/departments/:organization/:department/notices/:id', authenticate, async (req, res) => {
  const assignment = { organization: req.params.organization, department: req.params.department };
  if (!isValidManagedDepartment(assignment)) return res.status(404).json({ success: false, message: '部门模块不存在' });
  const access = getDepartmentNoticeAccess(req.user, assignment);
  if (!access) return res.status(403).json({ success: false, message: '无权访问该部门通知' });

  try {
    const notice = await DepartmentNotice.findOne({ _id: req.params.id, ...assignment })
      .populate('createdBy updatedBy publishedBy', 'name studentId');
    if (!notice || (!access.canEdit && notice.status !== 'published')) {
      return res.status(404).json({ success: false, message: '部门通知不存在' });
    }
    res.json({ success: true, access, notice: serializeDepartmentNotice(notice) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门通知失败' });
  }
});

app.post(
  '/api/hub/departments/:organization/:department/notices/cover',
  authenticate,
  (req, res, next) => {
    departmentNoticeUpload.single('file')(req, res, (error) => {
      if (error) {
        return res.status(400).json({ success: false, message: error.message || 'Department notice cover upload failed' });
      }
      next();
    });
  },
  async (req, res) => {
    const assignment = { organization: req.params.organization, department: req.params.department };
    if (!isValidManagedDepartment(assignment)) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: '部门模块不存在' });
    }

    const access = getDepartmentNoticeAccess(req.user, assignment);
    if (!access?.canCreate && !access?.canEdit) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, message: '当前身份不能上传该部门通知封面' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的图片' });
    }

    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype);
    if (!isImage) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: '仅支持 jpg、png、webp 图片' });
    }

    const media = {
      url: `/api/department-notice-assets/${req.file.filename}`,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size
    };
    await logAction(req.user._id, 'upload_department_notice_cover', 'departmentNotice', null, { ...assignment, size: media.size, mimeType: media.mimeType }, req);
    res.json({ success: true, media, access });
  }
);

app.post('/api/hub/departments/:organization/:department/notices', authenticate, async (req, res) => {
  const assignment = { organization: req.params.organization, department: req.params.department };
  if (!isValidManagedDepartment(assignment)) return res.status(404).json({ success: false, message: '部门模块不存在' });
  const access = getDepartmentNoticeAccess(req.user, assignment);
  if (!access?.canCreate) return res.status(403).json({ success: false, message: '当前身份不能创建该部门通知' });

  const payload = normalizeNoticePayload(req.body || {});
  if (!payload.title.zh && !payload.title.en) return res.status(400).json({ success: false, message: '请填写通知标题' });
  if (payload.status === 'published' && !payload.publishedAt) payload.publishedAt = new Date();

  try {
    const notice = await DepartmentNotice.create({
      ...assignment,
      ...payload,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      publishedBy: payload.status === 'published' ? req.user._id : undefined
    });
    await logAction(req.user._id, 'create_department_notice', 'departmentNotice', notice._id, { ...assignment, status: notice.status, source: notice.source }, req);
    res.status(201).json({ success: true, notice: serializeDepartmentNotice(notice), access });
  } catch (error) {
    res.status(error?.code === 11000 ? 409 : 500).json({ success: false, message: error?.code === 11000 ? '该外部文章已同步' : '创建部门通知失败' });
  }
});

app.patch('/api/hub/departments/:organization/:department/notices/:id', authenticate, async (req, res) => {
  const assignment = { organization: req.params.organization, department: req.params.department };
  if (!isValidManagedDepartment(assignment)) return res.status(404).json({ success: false, message: '部门模块不存在' });
  const access = getDepartmentNoticeAccess(req.user, assignment);
  if (!access?.canEdit) return res.status(403).json({ success: false, message: '当前身份不能编辑该部门通知' });

  try {
    const existing = await DepartmentNotice.findOne({ _id: req.params.id, ...assignment });
    if (!existing) return res.status(404).json({ success: false, message: '部门通知不存在' });
    const payload = normalizeNoticePayload(req.body || {}, existing);
    if (!payload.title.zh && !payload.title.en) return res.status(400).json({ success: false, message: '请填写通知标题' });

    Object.assign(existing, payload, { updatedBy: req.user._id });
    if (payload.status === 'published' && existing.isModified('status')) existing.publishedBy = req.user._id;
    await existing.save();
    await existing.populate('createdBy updatedBy publishedBy', 'name studentId');
    await logAction(req.user._id, 'update_department_notice', 'departmentNotice', existing._id, { ...assignment, status: existing.status, source: existing.source }, req);
    res.json({ success: true, notice: serializeDepartmentNotice(existing), access });
  } catch (error) {
    res.status(error?.code === 11000 ? 409 : 500).json({ success: false, message: error?.code === 11000 ? '该外部文章已同步' : '更新部门通知失败' });
  }
});

app.get('/api/public/hub/departments/:organization/:department/introduction', async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  try {
    const intro = await DepartmentIntroduction.findOne(assignment).lean();
    const payload = serializeDepartmentIntroduction(intro, assignment, 'published');
    res.json({
      success: true,
      introduction: {
        ...payload,
        hasPublished: Boolean(intro?.publishedContent),
        content: intro?.publishedContent || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门介绍失败' });
  }
});

app.get('/api/hub/departments/:organization/:department/introduction', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getDepartmentIntroductionAccess(req.user, assignment);
  if (!access) {
    return res.status(403).json({ success: false, message: '无权访问该部门介绍页' });
  }

  try {
    const intro = await DepartmentIntroduction.findOne(assignment).lean();
    res.json({
      success: true,
      introduction: serializeDepartmentIntroduction(intro, assignment, 'published')
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门介绍失败' });
  }
});

app.get('/api/hub/departments/:organization/:department/introduction/editor', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getDepartmentIntroductionAccess(req.user, assignment);
  if (!access?.canEdit) {
    return res.status(403).json({ success: false, message: '当前身份不能编辑该部门介绍页' });
  }

  try {
    const intro = await DepartmentIntroduction.findOne(assignment).lean();
    const revisions = await DepartmentIntroductionRevision
      .find(assignment)
      .sort({ version: -1 })
      .limit(12)
      .populate('actor', 'name studentId')
      .lean();
    res.json({
      success: true,
      introduction: serializeDepartmentIntroduction(intro, assignment, 'editor'),
      access,
      revisions: revisions.map(item => ({
        id: item._id,
        version: item.version,
        action: item.action,
        reason: item.reason || '',
        createdAt: item.createdAt,
        actor: item.actor ? { name: item.actor.name, studentId: item.actor.studentId } : null
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门介绍编辑数据失败' });
  }
});

app.put('/api/hub/departments/:organization/:department/introduction/draft', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getDepartmentIntroductionAccess(req.user, assignment);
  if (!access?.canEdit) {
    return res.status(403).json({ success: false, message: '当前身份不能编辑该部门介绍页' });
  }

  try {
    const existing = await DepartmentIntroduction.findOne(assignment).lean();
    const baseVersion = Number(req.body?.baseVersion ?? existing?.draftVersion ?? 0);
    if (existing && Number.isFinite(baseVersion) && baseVersion !== existing.draftVersion) {
      return res.status(409).json({
        success: false,
        message: '草稿已被其他成员更新，请刷新后再继续编辑',
        currentVersion: existing.draftVersion
      });
    }

    const draftContent = normalizeIntroductionContent(req.body?.content || {}, assignment);
    const intro = await DepartmentIntroduction.findOneAndUpdate(
      assignment,
      {
        ...assignment,
        draftContent,
        status: existing?.publishedContent ? existing.status : 'draft',
        draftVersion: (existing?.draftVersion || 0) + 1,
        updatedBy: req.user._id
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    await logAction(req.user._id, 'save_department_introduction_draft', 'departmentIntroduction', intro._id, assignment, req);
    res.json({
      success: true,
      message: '部门介绍草稿已保存',
      introduction: serializeDepartmentIntroduction(intro, assignment, 'editor'),
      access
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '保存部门介绍草稿失败' });
  }
});

app.post('/api/hub/departments/:organization/:department/introduction/publish', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getDepartmentIntroductionAccess(req.user, assignment);
  if (!access?.canPublish) {
    return res.status(403).json({ success: false, message: '当前身份不能发布该部门介绍页' });
  }

  try {
    const existing = await DepartmentIntroduction.findOne(assignment).lean();
    const hasIncomingContent = Object.prototype.hasOwnProperty.call(req.body || {}, 'content');
    const contentToPublish = hasIncomingContent
      ? normalizeIntroductionContent(req.body.content || {}, assignment)
      : (existing?.draftContent || existing?.publishedContent || createDefaultDepartmentIntroduction(assignment.organization, assignment.department));

    const intro = await DepartmentIntroduction.findOneAndUpdate(
      assignment,
      {
        ...assignment,
        draftContent: contentToPublish,
        draftVersion: (existing?.draftVersion || 0) + (hasIncomingContent ? 1 : 0),
        publishedContent: contentToPublish,
        publishedVersion: (existing?.publishedVersion || 0) + 1,
        status: 'published',
        updatedBy: req.user._id,
        publishedBy: req.user._id,
        publishedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    await DepartmentIntroductionRevision.create({
      ...assignment,
      version: intro.publishedVersion,
      content: intro.publishedContent,
      action: 'publish',
      actor: req.user._id,
      reason: cleanText(req.body?.reason, 160)
    });
    await logAction(req.user._id, 'publish_department_introduction', 'departmentIntroduction', intro._id, { ...assignment, version: intro.publishedVersion }, req);
    res.json({
      success: true,
      message: '部门介绍页已发布',
      introduction: serializeDepartmentIntroduction(intro, assignment, 'editor'),
      access
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '发布部门介绍页失败' });
  }
});

app.post('/api/hub/departments/:organization/:department/introduction/media', authenticate, departmentIntroUpload.single('file'), async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }

  const access = getDepartmentIntroductionAccess(req.user, assignment);
  if (!access?.canEdit) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    return res.status(403).json({ success: false, message: '当前身份不能上传该部门介绍页媒体' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: '请选择要上传的文件' });
  }

  const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype);
  const isVideo = req.file.mimetype === 'video/mp4';
  if (!isImage && !isVideo) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: '仅支持 jpg、png、webp 图片与 mp4 视频' });
  }

  try {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');
    const media = await DepartmentIntroductionMedia.create({
      ...assignment,
      uploader: req.user._id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      url: `/api/department-intro-assets/${req.file.filename}`,
      mimeType: req.file.mimetype,
      type: isVideo ? 'video' : 'image',
      size: req.file.size,
      hash
    });
    await logAction(req.user._id, 'upload_department_introduction_media', 'departmentIntroductionMedia', media._id, { ...assignment, type: media.type, size: media.size }, req);
    res.json({
      success: true,
      media: {
        id: media._id,
        url: media.url,
        type: media.type,
        originalName: media.originalName,
        size: media.size
      }
    });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, message: '上传部门介绍媒体失败' });
  }
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
      memberRole: 'volunteer',
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
      memberRole: 'volunteer',
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
      memberRole: 'volunteer',
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

app.get('/api/hub/departments/:organization/:department/members', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }
  if (!hasDepartmentCapability(req.user, assignment, 'manage_department_members')) {
    return res.status(403).json({ success: false, message: '当前身份不能查看该部门成员' });
  }

  try {
    const directDepartmentMemberQuery = {
      organization: assignment.organization,
      department: assignment.department,
      $or: [
        { memberRole: { $in: ['volunteer', 'department_head'] } },
        { positionTitle: { $in: ['volunteer', 'department_head', 'youth_league_cadre'] } }
      ]
    };
    const managedDepartmentLeaderQuery = {
      managedDepartments: {
        $elemMatch: {
          organization: assignment.organization,
          department: assignment.department
        }
      },
      $or: [
        { memberRole: 'presidium' },
        { positionTitle: { $in: ['presidium_member', 'youth_league_deputy_secretary'] } }
      ]
    };

    const currentUsers = await User.find({
      $or: [directDepartmentMemberQuery, managedDepartmentLeaderQuery]
    }).select('-password').lean();

    const currentMembers = await Promise.all(
      currentUsers
        .map(user => ({
          _id: user._id,
          user,
          systemRole: user.role,
          memberRole: user.memberRole || 'student',
          positionTitle: user.positionTitle || 'student',
          organization: user.organization,
          department: user.department,
          managedDepartments: user.managedDepartments || [],
          createdAt: user.createdAt
        }))
        .map(async member => {
          const shouldShowPerformance = member.memberRole === 'volunteer' || member.positionTitle === 'volunteer';
          if (shouldShowPerformance) {
            member.performanceSnapshot = await buildPerformanceSnapshot(member.user._id, []);
          }
          return serializeDepartmentMember(member, null, 'current');
        })
    ).then(items => items.sort(sortDepartmentMembers));

    const archivedMemberships = await CohortMembership.find({
      $or: [
        {
          organization: assignment.organization,
          department: assignment.department
        },
        {
          managedDepartments: {
            $elemMatch: {
              organization: assignment.organization,
              department: assignment.department
            }
          }
        }
      ],
      memberRole: { $ne: 'student' },
      archivedAt: { $ne: null }
    })
      .populate('cohort')
      .populate('user', 'name studentId email phone avatarUrl role memberRole positionTitle organization department managedDepartments createdAt')
      .sort({ archivedAt: -1, createdAt: -1 });

    const groupMap = new Map();
    archivedMemberships.forEach(member => {
      const cohort = member.cohort;
      const key = String(cohort?._id || member.cohort || 'unknown');
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          cohort: cohort ? serializeCohort(cohort) : { id: key, name: '未知届次', status: 'archived', semesters: [] },
          members: []
        });
      }
      groupMap.get(key).members.push(serializeDepartmentMember(member, cohort, 'archive'));
    });

    const cohorts = Array.from(groupMap.values()).map(group => ({
      ...group,
      members: group.members.sort(sortDepartmentMembers)
    })).sort((a, b) => {
      const aTime = new Date(a.cohort?.archivedAt || a.cohort?.endDate || a.cohort?.createdAt || 0).getTime();
      const bTime = new Date(b.cohort?.archivedAt || b.cohort?.endDate || b.cohort?.createdAt || 0).getTime();
      return bTime - aTime;
    });

    res.json({
      success: true,
      access: getDepartmentCapabilityAccess(req.user, assignment, 'manage_department_members'),
      current: currentMembers,
      cohorts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门成员失败' });
  }
});

app.post('/api/hub/departments/:organization/:department/members', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }
  if (!hasDepartmentCapability(req.user, assignment, 'manage_department_members')) {
    return res.status(403).json({ success: false, message: '当前身份不能管理该部门成员' });
  }

  try {
    const cleanStudentId = sanitizeInput(req.body?.studentId || '');
    if (!isValidStudentId(cleanStudentId)) {
      return res.status(400).json({ success: false, message: '请输入10位成员学号' });
    }

    const user = await User.findOne({ studentId: cleanStudentId });
    if (!user) return res.status(404).json({ success: false, message: '成员账号不存在，请先完成账号注册或由终极管理员创建账号' });
    if (user.isUltimateAdmin) return res.status(400).json({ success: false, message: '终极管理员账号不能被设为部门志愿者' });

    const identity = buildIdentityUpdate({
      memberRole: 'volunteer',
      positionTitle: 'volunteer',
      organization: assignment.organization,
      department: assignment.department,
      managedDepartments: []
    }, req.user._id);
    if (!identity.valid) return res.status(400).json({ success: false, message: identity.message });

    Object.assign(user, identity.update);
    await user.save();

    const activeCohort = await Cohort.findOne({ status: 'active' }).sort({ startDate: -1, createdAt: -1 });
    let membership = null;
    if (activeCohort) {
      membership = await CohortMembership.findOneAndUpdate(
        { cohort: activeCohort._id, user: user._id },
        {
          $set: {
            cohort: activeCohort._id,
            user: user._id,
            accountSnapshot: buildMemberSnapshot(user),
            systemRole: user.role,
            memberRole: user.memberRole,
            positionTitle: user.positionTitle,
            organization: user.organization,
            department: user.department,
            managedDepartments: []
          },
          $push: {
            appointmentHistory: {
              memberRole: user.memberRole,
              positionTitle: user.positionTitle,
              organization: user.organization,
              department: user.department,
              startDate: new Date()
            }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    await logAction(req.user._id, 'add_department_volunteer', 'user', user._id, {
      ...assignment,
      cohortId: activeCohort?._id || null
    }, req);
    res.json({
      success: true,
      user: serializeUser(user),
      member: membership ? serializeCohortMember(membership) : null,
      message: activeCohort ? '已添加为本部门志愿者' : '已添加为本部门志愿者；当前没有 active 届次，未写入届次归档名单'
    });
  } catch (error) {
    console.error('添加部门志愿者失败:', error);
    res.status(500).json({ success: false, message: '添加部门志愿者失败' });
  }
});

app.delete('/api/hub/departments/:organization/:department/members/:id', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }
  if (!hasDepartmentCapability(req.user, assignment, 'manage_department_members')) {
    return res.status(403).json({ success: false, message: '当前身份不能管理该部门成员' });
  }

  try {
    const rawId = sanitizeInput(req.params.id || '');
    const target = mongoose.Types.ObjectId.isValid(rawId)
      ? await User.findById(rawId)
      : await User.findOne({ studentId: rawId });
    if (!target) return res.status(404).json({ success: false, message: '成员账号不存在' });
    if (target.isUltimateAdmin) return res.status(400).json({ success: false, message: '不能删除终极管理员账号身份' });

    const isDepartmentVolunteer = (target.memberRole === 'volunteer' || target.positionTitle === 'volunteer') &&
      target.organization === assignment.organization &&
      target.department === assignment.department;
    if (!isDepartmentVolunteer) {
      return res.status(400).json({ success: false, message: '只能删除本部门当前志愿者' });
    }
    if (!ensureVolunteerDepartmentAccess(req.user, target)) {
      return res.status(403).json({ success: false, message: '当前身份不能删除该志愿者' });
    }

    const activeCohortIds = await Cohort.find({ status: { $ne: 'archived' } }).distinct('_id');
    let deletedMemberships = { deletedCount: 0 };
    if (activeCohortIds.length > 0) {
      deletedMemberships = await CohortMembership.deleteMany({
        user: target._id,
        cohort: { $in: activeCohortIds },
        organization: assignment.organization,
        department: assignment.department,
        $or: [
          { memberRole: 'volunteer' },
          { positionTitle: 'volunteer' }
        ]
      });
    }

    target.role = 'student';
    target.memberRole = 'student';
    target.positionTitle = 'student';
    target.organization = null;
    target.department = null;
    target.managedDepartments = [];
    target.moduleCapabilities = [];
    await target.save();

    await logAction(req.user._id, 'remove_department_volunteer', 'user', target._id, {
      ...assignment,
      removedCurrentMemberships: deletedMemberships.deletedCount || 0
    }, req);

    res.json({ success: true, user: serializeUser(target), message: '已删除本部门志愿者，并降级为普通学生' });
  } catch (error) {
    console.error('删除部门志愿者失败', error);
    res.status(500).json({ success: false, message: '删除部门志愿者失败' });
  }
});

app.get('/api/hub/departments/:organization/:department/accounts', authenticate, async (req, res) => {
  const assignment = {
    organization: req.params.organization,
    department: req.params.department
  };
  if (!isValidManagedDepartment(assignment)) {
    return res.status(404).json({ success: false, message: '部门模块不存在' });
  }
  if (!hasDepartmentCapability(req.user, assignment, 'manage_department_accounts')) {
    return res.status(403).json({ success: false, message: '当前身份不能管理该部门账号' });
  }

  try {
    const users = await User.find({
      organization: assignment.organization,
      department: assignment.department
    }).select('-password').sort({ positionTitle: 1, studentId: 1 });
    res.json({
      success: true,
      access: getDepartmentCapabilityAccess(req.user, assignment, 'manage_department_accounts'),
      users: users.map(serializeUser)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取部门账号失败' });
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

app.delete('/api/ultimate/cohorts/:id', authenticate, ultimateOnly, async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });

    const typedName = sanitizeInput(req.body?.cohortName || '');
    const confirmation = sanitizeInput(req.body?.confirmation || '');
    if (typedName !== cohort.name || confirmation !== '确认删除') {
      return res.status(400).json({
        success: false,
        message: '删除确认信息不匹配，请完整输入届次名称和“确认删除”'
      });
    }

    const memberCount = await CohortMembership.countDocuments({ cohort: cohort._id });
    await CohortMembership.deleteMany({ cohort: cohort._id });
    await Cohort.deleteOne({ _id: cohort._id });
    await logAction(req.user._id, 'delete_cohort', 'cohort', cohort._id, {
      name: cohort.name,
      status: cohort.status,
      deletedMembers: memberCount
    }, req);

    res.json({ success: true, message: '届次已删除', deletedMembers: memberCount });
  } catch (error) {
    console.error('删除届次失败:', error);
    res.status(500).json({ success: false, message: '删除届次失败' });
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
    const cleanStudentId = sanitizeInput(studentId);
    const cleanEmail = normalizeEmail(email);
    if (!cohortId || !studentId) return res.status(400).json({ success: false, message: '缺少届次或学号' });
    if (!isValidStudentId(cleanStudentId)) return res.status(400).json({ success: false, message: '成员账号学号必须为唯一的10位数字' });
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) return res.status(404).json({ success: false, message: '届次不存在' });
    if (cohort.status === 'archived') return res.status(400).json({ success: false, message: '已归档届次不可继续编辑成员' });

    const identity = buildIdentityUpdate(req.body, req.user._id);
    if (!identity.valid) return res.status(400).json({ success: false, message: identity.message });

    let user = await User.findOne({ studentId: cleanStudentId });
    if (!user) {
      if (!password || !name || !email) {
        return res.status(400).json({ success: false, message: '新成员账号需要姓名、邮箱和初始密码' });
      }
      if (!isValidEmail(cleanEmail)) return res.status(400).json({ success: false, message: '邮箱格式不正确' });
      const duplicatedEmail = await User.findOne({ email: cleanEmail });
      if (duplicatedEmail) return res.status(400).json({ success: false, message: '该邮箱已被其他账号绑定' });
      user = await User.create({
        studentId: cleanStudentId,
        password,
        name: sanitizeInput(name),
        email: cleanEmail,
        phone: sanitizeInput(phone),
        ...identity.update
      });
    } else {
      if (name) user.name = sanitizeInput(name);
      if (email) {
        if (!isValidEmail(cleanEmail)) return res.status(400).json({ success: false, message: '邮箱格式不正确' });
        const duplicatedEmail = await User.findOne({ _id: { $ne: user._id }, email: cleanEmail });
        if (duplicatedEmail) return res.status(400).json({ success: false, message: '该邮箱已被其他账号绑定' });
        user.email = cleanEmail;
      }
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
      if (member.user) {
        member.accountSnapshot = buildMemberSnapshot(member.user);
        member.performanceSnapshot = await buildPerformanceSnapshot(member.user?._id || member.user, cohort.semesters || []);
        if (!member.user.isUltimateAdmin) {
          member.user.role = 'student';
          member.user.memberRole = 'student';
          member.user.positionTitle = 'student';
          member.user.organization = null;
          member.user.department = null;
          member.user.managedDepartments = [];
          await member.user.save();
        }
      } else {
        member.performanceSnapshot = await buildPerformanceSnapshot(member.user?._id || member.user, cohort.semesters || []);
      }
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

installSieBridgeRoutes({ app, authenticate, logAction, Notification });

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

app.post('/api/auth/email-code/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: '请输入有效邮箱' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '该邮箱已被绑定' });
    }
    const result = await issueEmailVerification({ email, purpose: 'register' });
    if (!result.ok) return res.status(result.status || 400).json({ success: false, message: result.message });
    res.json({
      success: true,
      message: result.devMode ? '验证码已生成，请查看后端运行日志' : '验证码已发送至邮箱',
      devMode: result.devMode,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('发送注册验证码失败:', error);
    res.status(500).json({ success: false, message: '验证码发送失败，请稍后重试' });
  }
});

app.post('/api/auth/email-code/password-reset', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: '请输入有效邮箱' });
    }
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(404).json({ success: false, message: '未找到绑定该邮箱的账号' });
    }
    const result = await issueEmailVerification({ email, purpose: 'reset_password' });
    if (!result.ok) return res.status(result.status || 400).json({ success: false, message: result.message });
    res.json({
      success: true,
      message: result.devMode ? '验证码已生成，请查看后端运行日志' : '验证码已发送至绑定邮箱',
      devMode: result.devMode,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('发送找回密码验证码失败:', error);
    res.status(500).json({ success: false, message: '验证码发送失败，请稍后重试' });
  }
});

app.post('/api/auth/password-reset', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { code, password } = req.body;
    if (!email || !isValidEmail(email)) return res.status(400).json({ success: false, message: '请输入有效邮箱' });
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: '新密码至少6位' });

    const verification = await verifyEmailCode({ email, purpose: 'reset_password', code, consume: true });
    if (!verification.ok) return res.status(400).json({ success: false, message: verification.message });

    const user = await User.findOne({ email, isActive: true });
    if (!user) return res.status(404).json({ success: false, message: '未找到绑定该邮箱的账号' });

    user.password = password;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    await logAction(user._id, 'reset_password_by_email', 'user', user._id, { email }, req);
    res.json({ success: true, message: '密码已重置，请使用新密码登录' });
  } catch (error) {
    console.error('找回密码失败:', error);
    res.status(500).json({ success: false, message: '密码重置失败，请稍后重试' });
  }
});

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { studentId, password, name, email, phone, emailCode } = req.body;
    const cleanStudentId = sanitizeInput(studentId);
    const cleanEmail = normalizeEmail(email);
    
    // 验证必填字段
    if (!studentId || !password || !name || !email) {
      return res.status(400).json({ success: false, message: '请填写所有必填字段' });
    }
    if (!isValidStudentId(cleanStudentId)) {
      return res.status(400).json({ success: false, message: '学生账号学号必须为唯一的10位数字' });
    }
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: '邮箱格式不正确' });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ studentId: cleanStudentId }, { email: cleanEmail }]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: existingUser.studentId === cleanStudentId ? '学号已被注册' : '邮箱已被注册'
      });
    }

    const verification = await verifyEmailCode({ email: cleanEmail, purpose: 'register', code: emailCode, consume: true });
    if (!verification.ok) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    
    // 创建用户
    const user = await User.create({
      studentId: cleanStudentId,
      password,
      name: sanitizeInput(name),
      email: cleanEmail,
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
    const remember = req.body?.remember === true || req.body?.remember === 'true' || req.body?.remember === 1 || req.body?.remember === '1';
    const persistLogin = shouldPersistLogin(remember, req.get('user-agent'));
    
    if (!studentId || !password) {
      return res.status(400).json({ success: false, message: '请输入学号和密码' });
    }
    
    const user = await User.findOne({ studentId }).select('+password');
    const loginStudentId = studentId;
    if (!user) await recordLoginEvent({ studentId: loginStudentId, success: false, reason: 'user_not_found' }, req);
    
    if (!user) {
      return res.status(401).json({ success: false, message: '学号或密码错误' });
    }
    
    // 检查账户锁定
    if (user.isLocked()) await recordLoginEvent({ user, studentId: loginStudentId, success: false, reason: 'locked' }, req);
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
      await recordLoginEvent({ user, studentId: loginStudentId, success: false, reason: user.loginAttempts >= 5 ? 'locked_after_failures' : 'password_mismatch' }, req);
      
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
      { expiresIn: getLoginTokenExpiresIn(persistLogin) }
    );
    
    await logAction(user._id, 'login', 'user', user._id, {}, req);
    await recordLoginEvent({ user, studentId: loginStudentId, success: true, reason: 'success' }, req);
    
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
    const cleanStudentId = sanitizeInput(studentId);
    const cleanEmail = normalizeEmail(email);

    // 基本验证
    if (!name || !email || !studentId) {
      return res.status(400).json({ success: false, message: '姓名、邮箱和学号为必填项' });
    }
    if (!req.user.isUltimateAdmin && req.user.role === 'student' && !isValidStudentId(cleanStudentId)) {
      return res.status(400).json({ success: false, message: '学生账号学号必须为唯一的10位数字' });
    }
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: '邮箱格式不正确' });
    }

    // 检查学号或邮箱是否被其他用户占用
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: req.user._id } }, // 排除当前用户自己
        { $or: [{ studentId: cleanStudentId }, { email: cleanEmail }] }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.studentId === cleanStudentId ? '该学号已被其他账号使用' : '该邮箱已被其他账号绑定'
      });
    }

    // 更新用户信息 (禁止修改 role 权限)
    const user = await User.findById(req.user._id);
    user.name = sanitizeInput(name);
    user.email = cleanEmail;
    user.phone = sanitizeInput(phone);
    user.studentId = cleanStudentId;
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
app.post('/api/auth/avatar', authenticate, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未检测到头像文件' });
    }
    const user = await User.findById(req.user._id);
    user.avatarUrl = `/api/uploads/avatars/${req.file.filename}`;
    await user.save();
    await logAction(req.user._id, 'update_avatar', 'user', req.user._id, { avatarUrl: user.avatarUrl }, req);
    res.json({ success: true, user: serializeUser(user), avatarUrl: user.avatarUrl });
  } catch (error) {
    console.error('avatar upload failed:', error);
    res.status(500).json({ success: false, message: '头像上传失败' });
  }
});

app.get('/api/my/login-logs', authenticate, async (req, res) => {
  try {
    if (!canUseSensitiveSecurityTools(req.user)) {
      return res.status(403).json({ success: false, message: '当前身份不能查看登录日志' });
    }
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 30)));
    const logs = await LoginEvent.find({
      $or: [
        { user: req.user._id },
        { studentId: req.user.studentId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      success: true,
      logs: logs.map(item => ({
        id: item._id,
        success: item.success,
        reason: item.reason,
        ip: item.ip,
        userAgent: item.userAgent,
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取登录日志失败' });
  }
});

app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ user: req.user._id, isRead: false })
    ]);
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/service-metrics', authenticate, async (req, res) => {
  try {
    const semester = await getCurrentSemesterName();
    const { start, end } = getSemesterDateRange(semester);
    const [result = {}] = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
          isRevoked: { $ne: true }
        }
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          firstResponses: [
            { $unwind: '$responses' },
            {
              $match: {
                'responses.senderType': { $in: ['admin', 'superadmin'] },
                'responses.isRecalled': { $ne: true },
                'responses.createdAt': { $type: 'date' }
              }
            },
            {
              $group: {
                _id: '$_id',
                createdAt: { $first: '$createdAt' },
                firstResponseAt: { $min: '$responses.createdAt' }
              }
            },
            {
              $project: {
                hours: {
                  $divide: [{ $subtract: ['$firstResponseAt', '$createdAt'] }, 1000 * 60 * 60]
                }
              }
            },
            { $match: { hours: { $gte: 0 } } },
            {
              $group: {
                _id: null,
                averageHours: { $avg: '$hours' },
                respondedFeedbackCount: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const total = result.total?.[0]?.count || 0;
    const responseStats = result.firstResponses?.[0] || {};
    const averageHours = Number.isFinite(responseStats.averageHours)
      ? Math.round(responseStats.averageHours * 10) / 10
      : null;

    res.json({
      success: true,
      metrics: {
        channelStatus: 'operational',
        semester,
        semesterStart: start,
        semesterEnd: end,
        averageFirstResponseHours: averageHours,
        respondedFeedbackCount: responseStats.respondedFeedbackCount || 0,
        feedbackCount: total,
        measuredAt: new Date()
      }
    });
  } catch (error) {
    console.error('service metrics failed:', error);
    res.status(500).json({ success: false, message: '服务指标获取失败' });
  }
});

// [新增] 标记通知为已读
app.put('/api/notifications/read', authenticate, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (ids.length > 0) {
      await Notification.updateMany({ user: req.user._id, _id: { $in: ids } }, { isRead: true });
    } else {
      await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    }
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ success: true, unreadCount });
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
      feedbackId: feedback._id,
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
      feedbackId: feedback._id,
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

app.get('/api/admin/feedback-archives', authenticate, adminOnly, async (req, res) => {
  try {
    const query = buildAdminFeedbackQueryFromRequest(req, {
      forceExcludeRevoked: true,
      ignoreTimeRange: true
    });
    const feedbacks = await Feedback.find(query)
      .select('createdAt updatedAt status category priority responses resolvedAt')
      .lean();

    const semesterMap = new Map();
    feedbacks.forEach(feedback => {
      const info = getSemesterInfoFromDate(feedback.createdAt);
      if (!semesterMap.has(info.semester)) {
        const range = getSemesterDateRange(info.semester);
        const inclusiveEnd = new Date(range.end.getTime() - 24 * 60 * 60 * 1000);
        semesterMap.set(info.semester, {
          ...info,
          startDate: getChinaDateParts(range.start).dateText,
          endDate: getChinaDateParts(inclusiveEnd).dateText,
          total: 0,
          pending: 0,
          processing: 0,
          resolved: 0,
          rejected: 0,
          highPriority: 0,
          responded: 0,
          responseHoursTotal: 0,
          categories: {}
        });
      }
      const target = semesterMap.get(info.semester);
      target.total += 1;
      target[feedback.status] = (target[feedback.status] || 0) + 1;
      if (feedback.priority === 'high' || feedback.priority === 'urgent') target.highPriority += 1;
      target.categories[feedback.category] = (target.categories[feedback.category] || 0) + 1;

      const firstResponseAt = getFirstAdminResponseAt(feedback);
      if (firstResponseAt) {
        const hours = (firstResponseAt.getTime() - new Date(feedback.createdAt).getTime()) / (1000 * 60 * 60);
        if (hours >= 0) {
          target.responded += 1;
          target.responseHoursTotal += hours;
        }
      }
    });

    const currentSemester = await getCurrentSemesterName();
    if (!semesterMap.has(currentSemester)) {
      const range = getSemesterDateRange(currentSemester);
      const info = getSemesterInfoFromDate(range.start);
      const inclusiveEnd = new Date(range.end.getTime() - 24 * 60 * 60 * 1000);
      semesterMap.set(currentSemester, {
        ...info,
        semester: currentSemester,
        startDate: getChinaDateParts(range.start).dateText,
        endDate: getChinaDateParts(inclusiveEnd).dateText,
        total: 0,
        pending: 0,
        processing: 0,
        resolved: 0,
        rejected: 0,
        highPriority: 0,
        responded: 0,
        responseHoursTotal: 0,
        categories: {}
      });
    }

    const semesters = Array.from(semesterMap.values()).map(item => ({
      ...item,
      averageFirstResponseHours: item.responded > 0
        ? Math.round((item.responseHoursTotal / item.responded) * 10) / 10
        : null,
      responseHoursTotal: undefined
    })).sort((a, b) => {
      if (a.academicStartYear !== b.academicStartYear) return b.academicStartYear - a.academicStartYear;
      return a.term - b.term;
    });

    const yearMap = new Map();
    semesters.forEach(semester => {
      if (!yearMap.has(semester.academicYear)) {
        yearMap.set(semester.academicYear, {
          academicYear: semester.academicYear,
          academicStartYear: semester.academicStartYear,
          total: 0,
          pending: 0,
          processing: 0,
          resolved: 0,
          rejected: 0,
          semesters: []
        });
      }
      const year = yearMap.get(semester.academicYear);
      year.total += semester.total;
      year.pending += semester.pending || 0;
      year.processing += semester.processing || 0;
      year.resolved += semester.resolved || 0;
      year.rejected += semester.rejected || 0;
      year.semesters.push(semester);
    });

    const academicYears = Array.from(yearMap.values())
      .sort((a, b) => b.academicStartYear - a.academicStartYear);

    res.json({ success: true, currentSemester, academicYears });
  } catch (error) {
    console.error('获取反馈归档失败:', error);
    res.status(500).json({ success: false, message: '获取反馈归档失败' });
  }
});

// [修改] 获取所有反馈（管理员）- 支持高级检索与时间归档
app.get('/api/admin/feedbacks', authenticate, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const query = buildAdminFeedbackQueryFromRequest(req);
    
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

app.get('/api/admin/feedbacks/export', authenticate, adminOnly, async (req, res) => {
  try {
    const query = buildAdminFeedbackQueryFromRequest(req);
    const feedbacks = await Feedback.find(query)
      .populate('user', 'studentId name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      '反馈编号',
      '标题',
      '问题类别',
      '具体分类',
      '状态',
      '优先级',
      '提交人',
      '学号',
      '是否匿名',
      '处理组织',
      '处理部门',
      '提交时间',
      '更新时间',
      '解决时间',
      '首次响应时间',
      '首次响应小时数',
      '回复数',
      '正文摘要'
    ];

    const rows = feedbacks.map(feedback => {
      const firstResponseAt = getFirstAdminResponseAt(feedback);
      const firstResponseHours = firstResponseAt
        ? Math.max(0, Math.round(((firstResponseAt.getTime() - new Date(feedback.createdAt).getTime()) / (1000 * 60 * 60)) * 10) / 10)
        : '';
      return [
        feedback._id,
        feedback.title,
        FEEDBACK_CATEGORY_LABELS[feedback.category] || feedback.category,
        feedback.subCategory || '',
        feedback.isRevoked ? '已撤回' : (FEEDBACK_STATUS_LABELS[feedback.status] || feedback.status),
        FEEDBACK_PRIORITY_LABELS[feedback.priority] || feedback.priority,
        feedback.isAnonymous ? '匿名学生' : (feedback.user?.name || ''),
        feedback.isAnonymous ? '匿名' : (feedback.user?.studentId || ''),
        feedback.isAnonymous ? '是' : '否',
        ORGANIZATIONS[feedback.handlingOrganization]?.label || '',
        getDepartmentLabel(feedback.handlingOrganization, feedback.handlingDepartment) || '',
        formatDateTimeForReport(feedback.createdAt),
        formatDateTimeForReport(feedback.updatedAt),
        formatDateTimeForReport(feedback.resolvedAt),
        formatDateTimeForReport(firstResponseAt),
        firstResponseHours,
        (feedback.responses || []).filter(resp => resp.isRecalled !== true).length,
        String(feedback.content || '').slice(0, 500)
      ].map(csvCell).join(',');
    });

    const csv = `\uFEFF${headers.map(csvCell).join(',')}\n${rows.join('\n')}`;
    const filename = `SIEVOX反馈报表-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(csv);
  } catch (error) {
    console.error('导出反馈报表失败:', error);
    res.status(500).json({ success: false, message: '导出反馈报表失败' });
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

    if (!canUseSensitiveSecurityTools(req.user)) {
      return res.status(403).json({ success: false, message: '权限不足：仅超级管理员、主席/团副可重置他人密码' });
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
    if (!config) config = await SystemConfig.create({ key: 'currentSemester', value: DEFAULT_CURRENT_SEMESTER });
    const perfSemesters = await PerformanceRecord.distinct('semester');
    const rosterSemesters = await SemesterMember.distinct('semester');
    const semesters = Array.from(new Set([...perfSemesters, ...rosterSemesters]));
    if (!semesters.includes(config.value)) semesters.push(config.value);
    res.json({ success: true, currentSemester: config.value, semesters });
  } catch (error) { res.status(500).json({ success: false }); }
});

// [新增] 归档并开启新学期 (仅超管)
app.post('/api/admin/system/semester', authenticate, adminOnly, async (req, res) => {
  if (!hasSievoxSemesterAccess(req.user)) return res.status(403).json({ success: false, message: '仅 SIEVOX 管理权限者可开启新学期' });
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
  if (!hasSievoxSemesterAccess(req.user)) return res.status(403).json({ success: false, message: '仅 SIEVOX 管理权限者可重命名学期' });
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
    const currentSemester = config ? config.value : DEFAULT_CURRENT_SEMESTER;
    
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
    const memberships = await CohortMembership.find({ cohort: cohort._id }).populate('user');
    for (const membership of memberships) {
      if (membership.user) {
        membership.accountSnapshot = buildMemberSnapshot(membership.user);
        membership.performanceSnapshot = await buildPerformanceSnapshot(membership.user._id, cohort.semesters || []);
        if (!membership.user.isUltimateAdmin) {
          membership.user.role = 'student';
          membership.user.memberRole = 'student';
          membership.user.positionTitle = 'student';
          membership.user.organization = null;
          membership.user.department = null;
          membership.user.managedDepartments = [];
          await membership.user.save();
        }
      } else {
        membership.performanceSnapshot = await buildPerformanceSnapshot(membership.user, cohort.semesters || []);
      }
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
let wechatMpSchedulerStarted = false;

const startWechatMpSyncScheduler = () => {
  if (wechatMpSchedulerStarted) return;
  const config = getWechatMpConfig();
  if (!isWechatMpSyncConfigured(config)) return;
  wechatMpSchedulerStarted = true;
  const run = () => {
    syncWechatMpArticles().catch(error => {
      wechatMpSyncState.lastError = error.message || 'wechat_sync_failed';
    });
  };
  setTimeout(run, 10_000).unref?.();
  const timer = setInterval(run, config.syncIntervalMinutes * 60 * 1000);
  timer.unref?.();
};

const startServer = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB 连接成功');
    
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
      const privateKey = fs.readFileSync(config.sslKeyPath, 'utf8');
      const certificate = fs.readFileSync(config.sslCertPath, 'utf8');
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

    startWechatMpSyncScheduler();
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

app.buildWechatNoticePayload = buildWechatNoticePayload;
app.normalizeDateToEndOfDay = normalizeDateToEndOfDay;
app.getLoginTokenExpiresIn = getLoginTokenExpiresIn;
app.isMobileUserAgent = isMobileUserAgent;
app.shouldPersistLogin = shouldPersistLogin;

if (require.main === module) {
  startServer();
}

module.exports = app;
