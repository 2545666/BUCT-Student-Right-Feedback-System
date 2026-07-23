const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getIdentityLabel,
  listDepartments,
  validateAssignment
} = require('./organization');

test('团委学生兼职团干部只能归属团委部门', () => {
  assert.equal(validateAssignment({
    memberRole: 'department_lead',
    positionTitle: 'youth_league_cadre',
    organization: 'youth_league',
    department: 'organization'
  }).valid, true);
  assert.equal(validateAssignment({
    memberRole: 'department_lead',
    positionTitle: 'youth_league_cadre',
    organization: 'student_union',
    department: 'general_office'
  }).valid, false);
});

test('学生会部门负责人只能归属学生会部门', () => {
  assert.equal(validateAssignment({
    memberRole: 'department_lead',
    positionTitle: 'department_head',
    organization: 'student_union',
    department: 'student_rights'
  }).valid, true);
  assert.equal(validateAssignment({
    memberRole: 'department_lead',
    positionTitle: 'department_head',
    organization: 'youth_league',
    department: 'publicity'
  }).valid, false);
});

test('主席团层级暂不直接绑定组织和部门', () => {
  const result = validateAssignment({
    memberRole: 'presidium',
    positionTitle: 'youth_league_deputy_secretary'
  });
  assert.equal(result.valid, true);
  assert.equal(result.accessRole, 'superadmin');
});

test('终极管理员标签优先于具体职务标签', () => {
  assert.equal(getIdentityLabel({
    isUltimateAdmin: true,
    positionTitle: 'presidium_member'
  }), '终极管理员');
});

test('组织框架包含团委 4 个部门和学生会 5 个部门', () => {
  const departments = listDepartments();
  assert.equal(departments.filter(d => d.organization === 'youth_league').length, 4);
  assert.equal(departments.filter(d => d.organization === 'student_union').length, 5);
});
