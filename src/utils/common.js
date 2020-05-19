import aeropress from '../assets/icons/aeropress.svg';
import moka from '../assets/icons/moka.svg';
import v60 from '../assets/icons/v60.svg';

export function toMSS(time) {
  let total = parseInt(time, 10);
  let minutes = Math.floor(total / 60);
  let seconds = total - (minutes * 60);
  return minutes + ':' + ((seconds < 10) ? '0'+seconds : seconds);
}

export function resolveIcon(type) {
  switch (type) {
    case 'v60':
      return v60;
    case 'moka':
      return moka;
    case 'aeropress':
      return aeropress;
  }
}

export function getGrindLevel(level) {
  if (Number.isInteger(level)){
    return ['Espresso', 'Extra Fine', 'Fine', 'Medium Fine', 'Medium', 'Medium Coarse', 'Coarse'][level-1];
  }
  return 'Medium';
}