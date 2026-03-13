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

// [新增] 开放 uploads 静态目录供前端直接访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ============================================
// 环境配置
// ============================================
const config = {
  port: process.env.PORT || 3001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/buct_feedback',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-buct-2024-secure',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  nodeEnv: process.env.NODE_ENV || 'development'
};

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
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
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
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminName: String,
    // [新增] 允许管理员回复携带附件
    attachments: [{ filename: String, path: String, mimetype: String }],
    createdAt: { type: Date, default: Date.now }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  tags: [String]
}, {
  timestamps: true
});

// 创建索引以优化查询性能
feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ category: 1, status: 1 });
feedbackSchema.index({ status: 1, priority: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

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
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
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

// [新增] 通用文件上传接口
app.post('/api/upload', authenticate, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: '未检测到文件' });
    }
    const files = req.files.map(file => ({
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'), // 修复中文名乱码
      path: `/uploads/${file.filename}`,
      mimetype: file.mimetype
    }));
    res.json({ success: true, files });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ success: false, message: '文件上传失败' });
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
      user: {
        id: user._id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        role: user.role
      }
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
    user: {
      id: req.user._id,
      studentId: req.user.studentId,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
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

// ================== 反馈相关 ==================

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
    
    const query = { user: req.user._id };
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
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

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
    const { status, response, attachments } = req.body;
    
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ success: false, message: '反馈不存在' });
    }
    
    feedback.status = status;
    
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
    
    await logAction(req.user._id, 'update_status', 'feedback', feedback._id, { status }, req);
    
    res.json({ success: true, message: '状态更新成功', feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新状态失败' });
  }
});
// ================== 超级管理员账号管理专属 API ==================

// 1. 获取所有用户列表（区分角色）
app.get('/api/admin/users', authenticate, adminOnly, async (req, res) => {
  try {
    // 仅限超级管理员访问
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: '仅超级管理员可用' });
    }
    // 获取所有用户，去除密码字段
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

// 2. 获取特定学生提交的所有反馈（包含匿名）
app.get('/api/admin/users/:id/feedbacks', authenticate, adminOnly, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: '仅超级管理员可用' });
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
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: '仅超级管理员可用' });
    }
    // 查询 AuditLog 表中的操作记录
    const logs = await AuditLog.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
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
    // 只有超级管理员可以修改角色
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: '权限不足：只有超级管理员可操作' });
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
    const [
      totalFeedbacks,
      pendingCount,
      processingCount,
      resolvedCount,
      categoryStats
    ] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: 'pending' }),
      Feedback.countDocuments({ status: 'processing' }),
      Feedback.countDocuments({ status: 'resolved' }),
      Feedback.aggregate([
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
    
    // 创建管理员账户
    const adminExists = await User.findOne({ role: 'superadmin' });
    if (!adminExists) {
      await User.create({
        studentId: '20240901007',
        password: 'SIEVOX2026.',
        name: '系统管理员',
        email: '2024090107@buct.edu.cn',
        role: 'superadmin'
      });
      console.log('✅ 默认管理员账户已创建');
    }
    
    app.listen(config.port, () => {
      console.log(`🚀 服务器运行在 http://localhost:${config.port}`);
      console.log(`📝 环境: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
