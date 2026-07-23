const ORGANIZATIONS = Object.freeze({
  youth_league: {
    label: '团委',
    departments: Object.freeze({
      organization: '组织部',
      publicity: '宣传部',
      practice: '实践部',
      volunteer_service: '志愿者工作部'
    })
  },
  student_union: {
    label: '学生会',
    departments: Object.freeze({
      general_office: '综合办公室',
      student_rights: '学生权益部',
      culture_sports_arts: '文体艺术部',
      academic_technology: '学术科技部',
      new_media: '新媒体工作部'
    })
  }
});

const MEMBER_ROLES = Object.freeze({
  student: '学生',
  volunteer: '志愿者',
  department_lead: '部门负责人层级',
  presidium: '主席团层级'
});

const POSITION_TITLES = Object.freeze({
  student: '学生',
  volunteer: '志愿者',
  department_head: '部门负责人',
  youth_league_cadre: '团委学生兼职团干部',
  presidium_member: '主席团成员',
  youth_league_deputy_secretary: '团委学生兼职副书记'
});

const ACCESS_ROLE_BY_MEMBER_ROLE = Object.freeze({
  student: 'student',
  volunteer: 'admin',
  department_lead: 'superadmin',
  presidium: 'superadmin'
});

const TITLES_BY_MEMBER_ROLE = Object.freeze({
  student: ['student'],
  volunteer: ['volunteer'],
  department_lead: ['department_head', 'youth_league_cadre'],
  presidium: ['presidium_member', 'youth_league_deputy_secretary']
});

const getDepartment = (organization, department) => ORGANIZATIONS[organization]?.departments?.[department];

const listDepartments = () => Object.entries(ORGANIZATIONS).flatMap(([organizationKey, organization]) =>
  Object.entries(organization.departments).map(([departmentKey, departmentLabel]) => ({
    organization: organizationKey,
    organizationLabel: organization.label,
    department: departmentKey,
    departmentLabel
  }))
);

const isValidManagedDepartment = (assignment = {}) =>
  Boolean(getDepartment(assignment.organization, assignment.department));

const normalizeManagedDepartments = (assignments = []) => {
  if (!Array.isArray(assignments)) return [];
  const seen = new Set();
  return assignments
    .filter(isValidManagedDepartment)
    .map(({ organization, department }) => ({ organization, department }))
    .filter((assignment) => {
      const key = `${assignment.organization}:${assignment.department}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const getDepartmentLabel = (organization, department) => {
  const organizationLabel = ORGANIZATIONS[organization]?.label || '';
  const departmentLabel = getDepartment(organization, department) || '';
  return [organizationLabel, departmentLabel].filter(Boolean).join(' · ');
};

function validateAssignment(input = {}) {
  const { memberRole, positionTitle } = input;
  const organization = input.organization || null;
  const department = input.department || null;

  if (!MEMBER_ROLES[memberRole]) return { valid: false, message: '组织身份无效' };
  if (!TITLES_BY_MEMBER_ROLE[memberRole]?.includes(positionTitle)) {
    return { valid: false, message: '具体职务与组织身份不匹配' };
  }

  if (memberRole === 'student') {
    if (organization || department) return { valid: false, message: '学生身份不能绑定团委或学生会部门' };
    return { valid: true, accessRole: 'student', organization: null, department: null };
  }

  if (memberRole === 'presidium') {
    if (organization || department) return { valid: false, message: '主席团层级职务暂不直接归属单一部门' };
    return { valid: true, accessRole: 'superadmin', organization: null, department: null };
  }

  if (!ORGANIZATIONS[organization]) return { valid: false, message: '请选择团委或学生会' };
  if (!getDepartment(organization, department)) return { valid: false, message: '所选部门不属于当前组织' };

  if (positionTitle === 'youth_league_cadre' && organization !== 'youth_league') {
    return { valid: false, message: '团委学生兼职团干部只能归属团委部门' };
  }
  if (positionTitle === 'department_head' && organization !== 'student_union') {
    return { valid: false, message: '部门负责人只能归属学生会部门' };
  }

  return {
    valid: true,
    accessRole: ACCESS_ROLE_BY_MEMBER_ROLE[memberRole],
    organization,
    department
  };
}

function getIdentityLabel(user = {}) {
  if (user.isUltimateAdmin) return '终极管理员';
  if (POSITION_TITLES[user.positionTitle]) return POSITION_TITLES[user.positionTitle];
  if (user.role === 'admin') return '志愿者';
  if (user.role === 'superadmin') return '超级管理员 · 职务待确认';
  return '学生';
}

function getAssignableScope(user = {}) {
  if (user.isUltimateAdmin) return null;

  const managedDepartments = normalizeManagedDepartments(user.managedDepartments || []);
  if (managedDepartments.length > 0) return managedDepartments;

  if (user.role === 'superadmin' && isValidManagedDepartment(user)) {
    return [{ organization: user.organization, department: user.department }];
  }

  return [];
}

module.exports = {
  ORGANIZATIONS,
  MEMBER_ROLES,
  POSITION_TITLES,
  ACCESS_ROLE_BY_MEMBER_ROLE,
  TITLES_BY_MEMBER_ROLE,
  getDepartment,
  getDepartmentLabel,
  getIdentityLabel,
  getAssignableScope,
  isValidManagedDepartment,
  listDepartments,
  normalizeManagedDepartments,
  validateAssignment
};
