const KR_TIME_DIFF = 9 * 60 * 60 * 1000;

export const convertToKoreaDate = (date: Date) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + (KR_TIME_DIFF));
};