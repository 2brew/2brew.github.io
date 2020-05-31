import aeropress from '../assets/icons/aeropress.svg';
import moka from '../assets/icons/moka.svg';
import v60 from '../assets/icons/v60.svg';

import _invert from '../assets/icons/_invert.svg';
import _lid from '../assets/icons/_lid.svg';
import _place from '../assets/icons/_place.svg';
import _pour from '../assets/icons/_pour.svg';
import _stir from '../assets/icons/_stir.svg';
import _wait from '../assets/icons/_wait.svg';
import _press from '../assets/icons/_press.svg';

export function toMSS(time) {
  let total = parseInt(time, 10);
  let minutes = Math.floor(total / 60);
  let seconds = total - (minutes * 60);
  return minutes + ':' + ((seconds < 10) ? '0'+seconds : seconds);
}

export function resolveSystemIcon(type) {
  switch (type) {
    case 'v60':
      return v60;
    case 'moka':
      return moka;
    case 'aeropress':
      return aeropress;
  }
}

export function resolveStepIcon(type) {
  // looks ugly but works faster
  switch (type) {
    case 'invert':
      return _invert;
    case 'lid':
      return _lid;
    case 'place':
      return _place;
    case 'pour':
      return _pour;
    case 'stir':
      return _stir;
    case 'wait':
      return _wait;
    case 'press':
      return _press;
    case 'swirl':
      return _swirl;
  }
}

export function getGrindLevel(level) {
  if (Number.isInteger(level)){
    return ['Espresso', 'Extra Fine', 'Fine', 'Medium Fine', 'Medium', 'Medium Coarse', 'Coarse'][level-1];
  }
  return 'Medium';
}