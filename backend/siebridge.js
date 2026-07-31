const crypto = require('crypto');
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const SIEBRIDGE_ASSIGNMENT = Object.freeze({
  organization: 'student_union',
  department: 'academic_technology'
});

const SIEBRIDGE_MAJORS = Object.freeze([
  '机械设计制造及其自动化',
  '生物工程',
  '工业设计'
]);

const SIEBRIDGE_GRADES = Object.freeze(['大一', '大二', '大三', '大四']);

const SIEBRIDGE_SECTIONS = Object.freeze([
  { key: 'past_exams', label: '往年真题' },
  { key: 'courseware', label: '课件' },
  { key: 'notes', label: '笔记整理' },
  { key: 'other', label: '其他资料' }
]);

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const MAX_FILE_COUNT = 100;

const cleanText = (value, max = 160) => String(value || '').trim().replace(/<[^>]*>/g, '').slice(0, max);
const normalizeCourseCode = (value) => cleanText(value, 40).replace(/\s+/g, '').toUpperCase();
const escapeRegex = (value) => cleanText(value, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DELETE_CONFIRMATION_PHRASE = '确认删除';

const isValidDeleteConfirmation = (resource, confirmation) => {
  const value = cleanText(confirmation, 160);
  const title = cleanText(resource?.title, 160);
  return Boolean(value && (value === title || value === DELETE_CONFIRMATION_PHRASE));
};

const isValidFileDeleteConfirmation = (file, confirmation) => {
  const value = cleanText(confirmation, 300);
  const fileName = cleanText(decodeOriginalName(file?.originalName), 300);
  const relativePath = cleanText(displayStoredRelativePath(file?.relativePath, fileName), 300);
  return Boolean(value && (value === fileName || value === relativePath || value === DELETE_CONFIRMATION_PHRASE));
};

const hasReadableCjk = (value = '') => /[\u3400-\u9fff]/.test(value);
const hasUnreadableChars = (value = '') => /[\u0000-\u001f\u007f-\u009f\ufffd]/.test(value);

const decodeOriginalName = (name = '') => {
  const value = String(name || '');
  if (!value) return 'resource-file';
  if (hasReadableCjk(value) && !hasUnreadableChars(value)) return value;
  try {
    const decoded = Buffer.from(value, 'latin1').toString('utf8');
    if (!decoded || hasUnreadableChars(decoded)) return value;
    if (hasReadableCjk(decoded)) return decoded;
    return value;
  } catch {
    return value;
  }
};

const normalizeRelativePath = (value = '', fallback = '') => {
  const decoded = decodeOriginalName(value || fallback || '');
  const normalized = decoded
    .replace(/\\/g, '/')
    .split('/')
    .map(part => cleanText(part, 160))
    .filter(Boolean)
    .join('/');
  if (!normalized || normalized.includes('..')) return cleanText(decodeOriginalName(fallback), 160);
  return normalized.slice(0, 600);
};

const displayStoredRelativePath = (relativePath = '', fallback = '') => {
  const normalized = normalizeRelativePath(relativePath || fallback, fallback);
  if (hasUnreadableChars(normalized)) return decodeOriginalName(fallback);
  return normalized;
};

const parseFilePaths = (value = []) => {
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return Array.isArray(value) ? value : [value];
  }
};

const isAllowedSiebridgeUploadFile = (file = {}) => {
  const rawName = String(file.originalname || file.name || '');
  if (!rawName.trim()) return false;
  const originalName = decodeOriginalName(rawName);
  return Boolean(cleanText(originalName, 300));
};

const formatSiebridgeUploadError = (error) => {
  if (!error) return null;
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return { status: 413, message: '单个文件不能超过 200MB，请压缩后重新上传' };
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return { status: 413, message: `单次最多上传 ${MAX_FILE_COUNT} 个文件，请分批上传` };
    }
    return { status: 400, message: error.message || '上传文件失败' };
  }
  if (error.message === '文件名无效') return { status: 400, message: '存在文件名无效的文件，请检查后重新上传' };
  return null;
};

const parseList = (value, allowed) => {
  const raw = Array.isArray(value)
    ? value
    : (() => {
      try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : String(value || '').split(',');
      } catch {
        return String(value || '').split(',');
      }
    })();
  return [...new Set(raw.map(item => cleanText(item, 80)).filter(item => allowed.includes(item)))];
};

const statusSchema = {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'pending',
  index: true
};

const reviewerFields = {
  status: statusSchema,
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewComment: { type: String, default: '' }
};

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  normalizedCode: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  courseNature: { type: String, required: true, trim: true, maxlength: 80 },
  majors: [{ type: String, enum: SIEBRIDGE_MAJORS }],
  gradeLevels: [{ type: String, enum: SIEBRIDGE_GRADES }],
  description: { type: String, default: '', maxlength: 500 },
  ...reviewerFields
}, { timestamps: true });

courseSchema.index({ name: 1 });
courseSchema.index({ status: 1, updatedAt: -1 });

const resourceSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'SiebridgeCourse', required: true, index: true },
  section: { type: String, enum: SIEBRIDGE_SECTIONS.map(item => item.key), required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 500 },
  files: [{
    storedName: String,
    originalName: String,
    relativePath: String,
    mimetype: String,
    size: Number,
    extension: String,
    checksum: String
  }],
  downloadCount: { type: Number, default: 0 },
  ...reviewerFields
}, { timestamps: true });

resourceSchema.index({ status: 1, updatedAt: -1 });

const SiebridgeCourse = mongoose.models.SiebridgeCourse || mongoose.model('SiebridgeCourse', courseSchema);
const SiebridgeResource = mongoose.models.SiebridgeResource || mongoose.model('SiebridgeResource', resourceSchema);

const serializeUserBrief = (user) => user ? ({
  id: user._id || user.id,
  name: user.name || '',
  studentId: user.studentId || ''
}) : null;

const serializeCourse = (course) => {
  const item = course?.toObject ? course.toObject() : course;
  if (!item) return null;
  return {
    id: item._id,
    _id: item._id,
    code: item.code,
    name: item.name,
    courseNature: item.courseNature,
    majors: item.majors || [],
    gradeLevels: item.gradeLevels || [],
    description: item.description || '',
    status: item.status,
    submittedBy: serializeUserBrief(item.submittedBy),
    reviewedBy: serializeUserBrief(item.reviewedBy),
    reviewedAt: item.reviewedAt || null,
    reviewComment: item.reviewComment || '',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const serializeResource = (resource, exposeFiles = true) => {
  const item = resource?.toObject ? resource.toObject() : resource;
  if (!item) return null;
  return {
    id: item._id,
    _id: item._id,
    course: item.course && typeof item.course === 'object' ? serializeCourse(item.course) : item.course,
    section: item.section,
    title: item.title,
    description: item.description || '',
    files: exposeFiles ? (item.files || []).map((file, index) => {
      const originalName = decodeOriginalName(file.originalName);
      return ({
      index,
      originalName,
      filename: originalName,
      relativePath: displayStoredRelativePath(file.relativePath, originalName),
      mimetype: file.mimetype,
      size: file.size,
      extension: file.extension,
      previewUrl: `/api/siebridge/resources/${item._id}/preview?file=${index}`,
      downloadUrl: `/api/siebridge/resources/${item._id}/download?file=${index}`
    });
    }) : [],
    downloadCount: item.downloadCount || 0,
    status: item.status,
    submittedBy: serializeUserBrief(item.submittedBy),
    reviewedBy: serializeUserBrief(item.reviewedBy),
    reviewedAt: item.reviewedAt || null,
    reviewComment: item.reviewComment || '',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const canReviewSieBridge = (user = {}) => {
  if (user.isUltimateAdmin) return true;
  if (!['presidium_member', 'youth_league_deputy_secretary'].includes(user.positionTitle)) return false;
  return Array.isArray(user.managedDepartments) && user.managedDepartments.some(item =>
    item?.organization === SIEBRIDGE_ASSIGNMENT.organization &&
    item?.department === SIEBRIDGE_ASSIGNMENT.department
  );
};

const canReadPrivateResource = async (user, resource) => {
  if (!resource) return false;
  if (canReviewSieBridge(user)) return true;
  if (String(resource.submittedBy?._id || resource.submittedBy) === String(user._id)) return true;
  if (resource.status !== 'approved') return false;
  const course = resource.course?.status ? resource.course : await SiebridgeCourse.findById(resource.course).lean();
  return course?.status === 'approved';
};

const buildCoursePayload = (body = {}) => {
  const code = normalizeCourseCode(body.code);
  const name = cleanText(body.name, 120);
  const courseNature = cleanText(body.courseNature || body.nature, 80);
  const majors = parseList(body.majors, SIEBRIDGE_MAJORS);
  const gradeLevels = parseList(body.gradeLevels || body.grades, SIEBRIDGE_GRADES);
  const description = cleanText(body.description, 500);
  if (!code || !name || !courseNature) return { valid: false, message: '请完整填写课程代码、课程名称和课程性质' };
  if (!majors.length || !gradeLevels.length) return { valid: false, message: '请至少选择一个专业和一个年级' };
  return { valid: true, payload: { code, normalizedCode: code, name, courseNature, majors, gradeLevels, description } };
};

const buildResourcePayload = (body = {}) => {
  const section = cleanText(body.section, 40);
  const title = cleanText(body.title, 120);
  const description = cleanText(body.resourceDescription || body.description, 500);
  if (!SIEBRIDGE_SECTIONS.some(item => item.key === section)) return { valid: false, message: '资料分区无效' };
  if (!title) return { valid: false, message: '请填写资料标题' };
  return { valid: true, payload: { section, title, description } };
};

const cleanupFiles = (files = []) => {
  files.forEach(file => {
    if (file?.path && fs.existsSync(file.path)) fs.unlink(file.path, () => {});
  });
};

const resolveStoredResourcePath = (uploadDir, storedName = '') => {
  if (!storedName || path.basename(storedName) !== storedName) return null;
  const uploadRoot = path.resolve(uploadDir);
  const absolutePath = path.resolve(uploadRoot, storedName);
  const relativePath = path.relative(uploadRoot, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return absolutePath;
};

const getResourceFileByIndex = (resource, value) => {
  const files = resource?.files || [];
  const index = Number.isInteger(Number(value)) ? Number(value) : 0;
  if (index < 0 || index >= files.length) return null;
  return files[index];
};

const createFileChecksum = (filePath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  stream.on('data', chunk => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});

const toStoredFiles = async (files = [], relativePaths = []) => Promise.all(files.map(async (file, index) => {
  const originalName = decodeOriginalName(file.originalname);
  return {
    storedName: file.filename,
    originalName,
    relativePath: normalizeRelativePath(relativePaths[index], originalName),
    mimetype: file.mimetype,
    size: file.size,
    extension: path.extname(file.originalname || file.filename || '').toLowerCase(),
    checksum: await createFileChecksum(file.path)
  };
}));

const populateResource = (query) => query
  .populate('course')
  .populate('submittedBy', 'name studentId')
  .populate('reviewedBy', 'name studentId');

const createNotification = async (Notification, user, type, content) => {
  if (!Notification || !user) return;
  await Notification.create({ user, type, content });
};

const installSieBridgeRoutes = ({ app, authenticate, logAction, Notification }) => {
  const privateUploadDir = path.join(__dirname, 'siebridge_uploads');
  if (!fs.existsSync(privateUploadDir)) fs.mkdirSync(privateUploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, privateUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    }
  });

  const siebridgeUpload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILE_COUNT },
    fileFilter: (req, file, cb) => {
      const allowed = isAllowedSiebridgeUploadFile(file);
      cb(allowed ? null : new Error('文件名无效'), allowed);
    }
  });
  const handleSiebridgeUpload = (req, res, next) => {
    siebridgeUpload.array('files', MAX_FILE_COUNT)(req, res, (error) => {
      const uploadError = formatSiebridgeUploadError(error);
      if (uploadError) {
        cleanupFiles(req.files || []);
        return res.status(uploadError.status).json({ success: false, message: uploadError.message });
      }
      if (error) return next(error);
      return next();
    });
  };

  app.get('/api/siebridge/meta', authenticate, (req, res) => {
    res.json({
      success: true,
      majors: SIEBRIDGE_MAJORS,
      gradeLevels: SIEBRIDGE_GRADES,
      sections: SIEBRIDGE_SECTIONS,
      maxFileSize: MAX_FILE_SIZE,
      maxFileCount: MAX_FILE_COUNT,
      canReview: canReviewSieBridge(req.user)
    });
  });

  app.get('/api/siebridge/courses', authenticate, async (req, res) => {
    try {
      const query = { status: 'approved' };
      if (req.query.major && SIEBRIDGE_MAJORS.includes(req.query.major)) query.majors = req.query.major;
      if (req.query.grade && SIEBRIDGE_GRADES.includes(req.query.grade)) query.gradeLevels = req.query.grade;
      if (req.query.search) {
        const escaped = escapeRegex(req.query.search);
        query.$or = [
          { normalizedCode: { $regex: escaped, $options: 'i' } },
          { name: { $regex: escaped, $options: 'i' } }
        ];
      }
      const courses = await SiebridgeCourse.find(query)
        .sort({ updatedAt: -1 })
        .limit(Math.min(Number(req.query.limit || 60), 100))
        .lean();
      res.json({ success: true, courses: courses.map(serializeCourse) });
    } catch (error) {
      res.status(500).json({ success: false, message: '获取课程失败' });
    }
  });

  app.get('/api/siebridge/courses/:id', authenticate, async (req, res) => {
    try {
      const course = await SiebridgeCourse.findById(req.params.id)
        .populate('submittedBy', 'name studentId')
        .populate('reviewedBy', 'name studentId');
      if (!course || course.status !== 'approved') return res.status(404).json({ success: false, message: '课程不存在' });
      const resources = await populateResource(SiebridgeResource.find({ course: course._id, status: 'approved' }).sort({ updatedAt: -1 }));
      res.json({ success: true, course: serializeCourse(course), resources: resources.map(item => serializeResource(item)) });
    } catch (error) {
      res.status(500).json({ success: false, message: '获取课程详情失败' });
    }
  });

  app.post('/api/siebridge/courses', authenticate, handleSiebridgeUpload, async (req, res) => {
    const files = req.files || [];
    try {
      const courseData = buildCoursePayload(req.body);
      if (!courseData.valid) {
        cleanupFiles(files);
        return res.status(400).json({ success: false, message: courseData.message });
      }
      const resourceData = buildResourcePayload(req.body);
      if (!resourceData.valid || !files.length) {
        cleanupFiles(files);
        return res.status(400).json({ success: false, message: resourceData.message || '请上传至少一份课程资料' });
      }
      const existing = await SiebridgeCourse.findOne({ normalizedCode: courseData.payload.normalizedCode });
      if (existing) {
        cleanupFiles(files);
        return res.status(409).json({ success: false, message: '该课程代码已存在，请在已有课程内上传资料' });
      }
      const course = await SiebridgeCourse.create({ ...courseData.payload, submittedBy: req.user._id });
      const resource = await SiebridgeResource.create({
        course: course._id,
        ...resourceData.payload,
        files: await toStoredFiles(files, parseFilePaths(req.body.filePaths)),
        submittedBy: req.user._id
      });
      await logAction(req.user._id, 'submit_siebridge_course', 'siebridgeCourse', course._id, { code: course.code, resource: resource._id }, req);
      res.status(201).json({ success: true, message: '课程与资料已提交审核', course: serializeCourse(course), resource: serializeResource(resource) });
    } catch (error) {
      cleanupFiles(files);
      const duplicate = error?.code === 11000;
      res.status(duplicate ? 409 : 500).json({ success: false, message: duplicate ? '该课程代码已存在' : '提交课程失败' });
    }
  });

  app.post('/api/siebridge/courses/:courseId/resources', authenticate, handleSiebridgeUpload, async (req, res) => {
    const files = req.files || [];
    try {
      const course = await SiebridgeCourse.findById(req.params.courseId);
      if (!course || course.status !== 'approved') {
        cleanupFiles(files);
        return res.status(404).json({ success: false, message: '课程不存在或尚未通过审核' });
      }
      const resourceData = buildResourcePayload(req.body);
      if (!resourceData.valid || !files.length) {
        cleanupFiles(files);
        return res.status(400).json({ success: false, message: resourceData.message || '请上传至少一份资料' });
      }
      const resource = await SiebridgeResource.create({
        course: course._id,
        ...resourceData.payload,
        files: await toStoredFiles(files, parseFilePaths(req.body.filePaths)),
        submittedBy: req.user._id
      });
      await logAction(req.user._id, 'submit_siebridge_resource', 'siebridgeResource', resource._id, { course: course._id }, req);
      res.status(201).json({ success: true, message: '资料已提交审核', resource: serializeResource(resource) });
    } catch (error) {
      cleanupFiles(files);
      res.status(500).json({ success: false, message: '提交资料失败' });
    }
  });

  app.get('/api/siebridge/submissions/mine', authenticate, async (req, res) => {
    try {
      const [courses, resources] = await Promise.all([
        SiebridgeCourse.find({ submittedBy: req.user._id }).populate('reviewedBy', 'name studentId').sort({ updatedAt: -1 }),
        populateResource(SiebridgeResource.find({ submittedBy: req.user._id }).sort({ updatedAt: -1 }))
      ]);
      res.json({
        success: true,
        courses: courses.map(serializeCourse),
        resources: resources.map(item => serializeResource(item))
      });
    } catch (error) {
      res.status(500).json({ success: false, message: '获取提交记录失败' });
    }
  });

  app.get('/api/siebridge/reviews', authenticate, async (req, res) => {
    if (!canReviewSieBridge(req.user)) return res.status(403).json({ success: false, message: '无权审核 SIEBridge 内容' });
    try {
      const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
      const [courses, resources] = await Promise.all([
        SiebridgeCourse.find({ status }).populate('submittedBy', 'name studentId').populate('reviewedBy', 'name studentId').sort({ updatedAt: -1 }),
        populateResource(SiebridgeResource.find({ status }).sort({ updatedAt: -1 }))
      ]);
      res.json({
        success: true,
        canReview: true,
        courses: courses.map(serializeCourse),
        resources: resources.map(item => serializeResource(item))
      });
    } catch (error) {
      res.status(500).json({ success: false, message: '获取审核队列失败' });
    }
  });

  app.patch('/api/siebridge/reviews/:type/:id', authenticate, async (req, res) => {
    if (!canReviewSieBridge(req.user)) return res.status(403).json({ success: false, message: '无权审核 SIEBridge 内容' });
    const nextStatus = cleanText(req.body.status, 20);
    const reviewComment = cleanText(req.body.reviewComment, 300);
    if (!['approved', 'rejected'].includes(nextStatus)) return res.status(400).json({ success: false, message: '审核状态无效' });
    if (nextStatus === 'rejected' && !reviewComment) return res.status(400).json({ success: false, message: '驳回时必须填写原因' });

    try {
      if (req.params.type === 'course') {
        const course = await SiebridgeCourse.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: '课程不存在' });
        course.status = nextStatus;
        course.reviewedBy = req.user._id;
        course.reviewedAt = new Date();
        course.reviewComment = reviewComment;
        await course.save();
        await SiebridgeResource.updateMany(
          { course: course._id, status: 'pending' },
          { status: nextStatus, reviewedBy: req.user._id, reviewedAt: new Date(), reviewComment }
        );
        await createNotification(Notification, course.submittedBy, 'siebridge_course_review', `SIEBridge 课程「${course.name}」审核${nextStatus === 'approved' ? '通过' : '被驳回'}。`);
        await logAction(req.user._id, 'review_siebridge_course', 'siebridgeCourse', course._id, { status: nextStatus }, req);
        return res.json({ success: true, course: serializeCourse(course) });
      }

      if (req.params.type === 'resource') {
        const resource = await populateResource(SiebridgeResource.findById(req.params.id));
        if (!resource) return res.status(404).json({ success: false, message: '资料不存在' });
        resource.status = nextStatus;
        resource.reviewedBy = req.user._id;
        resource.reviewedAt = new Date();
        resource.reviewComment = reviewComment;
        await resource.save();
        await createNotification(Notification, resource.submittedBy, 'siebridge_resource_review', `SIEBridge 资料「${resource.title}」审核${nextStatus === 'approved' ? '通过' : '被驳回'}。`);
        await logAction(req.user._id, 'review_siebridge_resource', 'siebridgeResource', resource._id, { status: nextStatus }, req);
        return res.json({ success: true, resource: serializeResource(resource) });
      }

      return res.status(400).json({ success: false, message: '审核对象无效' });
    } catch (error) {
      res.status(500).json({ success: false, message: '审核失败' });
    }
  });

  app.delete('/api/siebridge/resources/:id', authenticate, async (req, res) => {
    if (!canReviewSieBridge(req.user)) return res.status(403).json({ success: false, message: '无权删除 SIEBridge 资料' });
    try {
      const resource = await populateResource(SiebridgeResource.findById(req.params.id));
      if (!resource) return res.status(404).json({ success: false, message: '资料不存在' });
      if (resource.status !== 'approved') return res.status(400).json({ success: false, message: '仅可删除已通过审核的资料' });
      if (!isValidDeleteConfirmation(resource, req.body?.confirmation)) {
        return res.status(400).json({ success: false, message: '删除确认信息不匹配，请输入资料标题或“确认删除”' });
      }

      const filePaths = [];
      for (const file of resource.files || []) {
        const absolutePath = resolveStoredResourcePath(privateUploadDir, file.storedName);
        if (!absolutePath) return res.status(409).json({ success: false, message: '资料文件路径异常，已阻止删除' });
        filePaths.push(absolutePath);
      }

      for (const absolutePath of filePaths) {
        try {
          await fs.promises.unlink(absolutePath);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }

      await logAction(req.user._id, 'delete_siebridge_approved_resource', 'siebridgeResource', resource._id, {
        title: resource.title,
        course: resource.course?._id || resource.course
      }, req);
      await resource.deleteOne();
      return res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: '删除资料失败' });
    }
  });

  app.delete('/api/siebridge/resources/:id/files/:fileIndex', authenticate, async (req, res) => {
    if (!canReviewSieBridge(req.user)) return res.status(403).json({ success: false, message: '无权删除 SIEBridge 资料文件' });
    try {
      const resource = await populateResource(SiebridgeResource.findById(req.params.id));
      if (!resource) return res.status(404).json({ success: false, message: '资料不存在' });
      if (resource.status !== 'approved') return res.status(400).json({ success: false, message: '仅可删除已通过审核的资料文件' });
      if ((resource.files || []).length <= 1) {
        return res.status(400).json({ success: false, message: '该资料仅剩一个文件，请使用整条资料删除' });
      }

      const fileIndex = Number(req.params.fileIndex);
      const file = getResourceFileByIndex(resource, fileIndex);
      if (!file) return res.status(404).json({ success: false, message: '文件不存在' });
      if (!isValidFileDeleteConfirmation(file, req.body?.confirmation)) {
        return res.status(400).json({ success: false, message: '删除确认信息不匹配，请输入文件名或“确认删除”' });
      }

      const absolutePath = resolveStoredResourcePath(privateUploadDir, file.storedName);
      if (!absolutePath) return res.status(409).json({ success: false, message: '资料文件路径异常，已阻止删除' });
      try {
        await fs.promises.unlink(absolutePath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }

      resource.files.splice(fileIndex, 1);
      await resource.save();
      await logAction(req.user._id, 'delete_siebridge_resource_file', 'siebridgeResource', resource._id, {
        title: resource.title,
        file: decodeOriginalName(file.originalName),
        course: resource.course?._id || resource.course
      }, req);
      return res.json({ success: true, resource: serializeResource(resource) });
    } catch (error) {
      res.status(500).json({ success: false, message: '删除资料文件失败' });
    }
  });

  app.delete('/api/siebridge/resources/:id/files', authenticate, async (req, res) => {
    if (!canReviewSieBridge(req.user)) return res.status(403).json({ success: false, message: '无权批量删除 SIEBridge 资料文件' });
    try {
      const resource = await populateResource(SiebridgeResource.findById(req.params.id));
      if (!resource) return res.status(404).json({ success: false, message: '资料不存在' });
      if (resource.status !== 'approved') return res.status(400).json({ success: false, message: '仅可删除已通过审核的资料文件' });
      if (cleanText(req.body?.confirmation, 160) !== DELETE_CONFIRMATION_PHRASE) {
        return res.status(400).json({ success: false, message: '批量删除请准确输入“确认删除”' });
      }

      const files = resource.files || [];
      const fileIndexes = [...new Set((Array.isArray(req.body?.fileIndexes) ? req.body.fileIndexes : [])
        .map(Number)
        .filter(index => Number.isInteger(index) && index >= 0 && index < files.length))]
        .sort((a, b) => b - a);
      if (!fileIndexes.length) return res.status(400).json({ success: false, message: '请选择要删除的文件' });
      if (files.length - fileIndexes.length < 1) {
        return res.status(400).json({ success: false, message: '不能批量删除全部文件，请使用整条资料删除' });
      }

      const targetFiles = [];
      for (const fileIndex of fileIndexes) {
        const file = files[fileIndex];
        const absolutePath = resolveStoredResourcePath(privateUploadDir, file?.storedName);
        if (!absolutePath) return res.status(409).json({ success: false, message: '资料文件路径异常，已阻止删除' });
        targetFiles.push({ fileIndex, file, absolutePath });
      }

      const deletedFiles = [];
      for (const { file, absolutePath } of targetFiles) {
        try {
          await fs.promises.unlink(absolutePath);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
        deletedFiles.push(decodeOriginalName(file.originalName));
      }
      for (const { fileIndex } of targetFiles) {
        resource.files.splice(fileIndex, 1);
      }

      await resource.save();
      await logAction(req.user._id, 'batch_delete_siebridge_resource_files', 'siebridgeResource', resource._id, {
        title: resource.title,
        files: deletedFiles,
        count: deletedFiles.length,
        course: resource.course?._id || resource.course
      }, req);
      return res.json({ success: true, resource: serializeResource(resource) });
    } catch (error) {
      res.status(500).json({ success: false, message: '批量删除资料文件失败' });
    }
  });

  app.get('/api/siebridge/resources/:id/preview', authenticate, async (req, res) => {
    try {
      const resource = await populateResource(SiebridgeResource.findById(req.params.id));
      if (!resource || !await canReadPrivateResource(req.user, resource)) return res.status(404).json({ success: false, message: '资料不存在' });
      const file = getResourceFileByIndex(resource, req.query.file);
      const isPdf = file?.extension === '.pdf';
      const isMarkdown = ['.md', '.markdown'].includes(file?.extension);
      if (!file || (!isPdf && !isMarkdown)) return res.status(400).json({ success: false, message: '仅 PDF 与 Markdown 支持在线预览' });
      const absolutePath = resolveStoredResourcePath(privateUploadDir, file.storedName);
      if (!absolutePath || !fs.existsSync(absolutePath)) return res.status(404).json({ success: false, message: '文件不存在' });
      if (isMarkdown) {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
        return res.send(await fs.promises.readFile(absolutePath, 'utf8'));
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
      return res.sendFile(absolutePath);
    } catch (error) {
      res.status(500).json({ success: false, message: '预览失败' });
    }
  });

  app.get('/api/siebridge/resources/:id/download', authenticate, async (req, res) => {
    try {
      const resource = await populateResource(SiebridgeResource.findById(req.params.id));
      if (!resource || !await canReadPrivateResource(req.user, resource)) return res.status(404).json({ success: false, message: '资料不存在' });
      const file = getResourceFileByIndex(resource, req.query.file);
      const absolutePath = file ? resolveStoredResourcePath(privateUploadDir, file.storedName) : '';
      if (!file || !absolutePath || !fs.existsSync(absolutePath)) return res.status(404).json({ success: false, message: '文件不存在' });
      resource.downloadCount += 1;
      await resource.save();
      return res.download(absolutePath, file.originalName);
    } catch (error) {
      res.status(500).json({ success: false, message: '下载失败' });
    }
  });
};

module.exports = {
  SIEBRIDGE_ASSIGNMENT,
  SIEBRIDGE_GRADES,
  SIEBRIDGE_MAJORS,
  SIEBRIDGE_SECTIONS,
  canReviewSieBridge,
  decodeOriginalName,
  formatSiebridgeUploadError,
  isAllowedSiebridgeUploadFile,
  isValidFileDeleteConfirmation,
  isValidDeleteConfirmation,
  normalizeRelativePath,
  installSieBridgeRoutes
};
