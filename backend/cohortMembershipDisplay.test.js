const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('./server');

test('filters stale volunteer memberships from non-archived cohort displays', () => {
  const staleVolunteer = {
    _id: 'membership-1',
    memberRole: 'volunteer',
    positionTitle: 'volunteer',
    organization: 'student_union',
    department: 'student_rights',
    user: {
      _id: 'user-1',
      memberRole: 'student',
      positionTitle: 'student',
      organization: null,
      department: null
    }
  };

  const currentVolunteer = {
    _id: 'membership-2',
    memberRole: 'volunteer',
    positionTitle: 'volunteer',
    organization: 'student_union',
    department: 'student_rights',
    user: {
      _id: 'user-2',
      memberRole: 'volunteer',
      positionTitle: 'volunteer',
      organization: 'student_union',
      department: 'student_rights'
    }
  };

  const visible = app.filterCohortMembershipsForDisplay(
    [staleVolunteer, currentVolunteer],
    { status: 'active' }
  );

  assert.deepEqual(visible.map(member => member._id), ['membership-2']);
});

test('keeps archived cohort membership snapshots even after account downgrade', () => {
  const archivedVolunteer = {
    _id: 'membership-1',
    memberRole: 'volunteer',
    positionTitle: 'volunteer',
    organization: 'student_union',
    department: 'student_rights',
    user: {
      _id: 'user-1',
      memberRole: 'student',
      positionTitle: 'student',
      organization: null,
      department: null
    }
  };

  const visible = app.filterCohortMembershipsForDisplay(
    [archivedVolunteer],
    { status: 'archived' }
  );

  assert.deepEqual(visible.map(member => member._id), ['membership-1']);
});
