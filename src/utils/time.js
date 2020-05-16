export function toMSS(time) {
  let total = parseInt(time, 10);
  let minutes = Math.floor(total / 60);
  let seconds = total - (minutes * 60);
  return minutes + ':' + ((seconds < 10) ? '0'+seconds : seconds);
}
