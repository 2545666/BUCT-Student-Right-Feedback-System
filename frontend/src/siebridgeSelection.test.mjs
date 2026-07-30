import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSieBridgeEntityId,
  shouldApplyCourseDetailResponse
} from './siebridgeSelection.js';

test('SIEBridge course detail only applies the latest matching course response', () => {
  assert.equal(getSieBridgeEntityId({ _id: 'course-a' }), 'course-a');
  assert.equal(getSieBridgeEntityId({ id: 'course-b' }), 'course-b');

  assert.equal(
    shouldApplyCourseDetailResponse({
      requestId: 1,
      activeRequestId: 2,
      requestedCourseId: 'course-a',
      responseCourse: { id: 'course-a' }
    }),
    false
  );

  assert.equal(
    shouldApplyCourseDetailResponse({
      requestId: 2,
      activeRequestId: 2,
      requestedCourseId: 'course-b',
      responseCourse: { id: 'course-a' }
    }),
    false
  );

  assert.equal(
    shouldApplyCourseDetailResponse({
      requestId: 2,
      activeRequestId: 2,
      requestedCourseId: 'course-b',
      responseCourse: { _id: 'course-b' }
    }),
    true
  );
});
