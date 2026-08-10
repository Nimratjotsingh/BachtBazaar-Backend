export function getQuestTimeframeBounds(quest) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  if (quest.timeframeType === "DAILY") {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (quest.timeframeType === "WEEKLY") {
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    startDate.setDate(now.getDate() - distanceToMonday);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (quest.timeframeType === "MONTHLY") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (quest.timeframeType === "CUSTOM") {
    startDate = quest.startDate ? new Date(quest.startDate) : new Date(0);
    endDate = quest.endDate ? new Date(quest.endDate) : new Date("2099-12-31");
  }

  return { startDate, endDate };
}