export const getSieBridgeEntityId = (item) => String(item?.id || item?._id || '');

export const shouldApplyCourseDetailResponse = ({
  requestId,
  activeRequestId,
  requestedCourseId,
  responseCourse
}) => {
  if (requestId !== activeRequestId) return false;
  const responseCourseId = getSieBridgeEntityId(responseCourse);
  return !responseCourseId || responseCourseId === String(requestedCourseId || '');
};
