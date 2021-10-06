import {tt} from '../store/tt';

import aeropress from '../assets/icons/aeropress.svg';
import moka from '../assets/icons/moka.svg';
import frenchPress from '../assets/icons/frenchpress.svg';
import v60 from '../assets/icons/v60.svg';
import _invert from '../assets/icons/_invert.svg';
import _lid from '../assets/icons/_lid.svg';
import _temp from '../assets/icons/_temp.svg';
import _add from '../assets/icons/_add.svg';
import _place from '../assets/icons/_place.svg';
import _pour from '../assets/icons/_pour.svg';
import _bloom from '../assets/icons/_bloom.svg';
import _swirl from '../assets/icons/_swirl.svg';
import _stir from '../assets/icons/_stir.svg';
import _wait from '../assets/icons/_wait.svg';
import _press from '../assets/icons/_press.svg';

const DEFAULT_GRIND = ['Espresso', 'Extra Fine', 'Fine', 'Medium Fine', 'Medium', 'Medium Coarse', 'Coarse'];

export function toMSS(time) {
  let total = parseInt(time, 10);
  let minutes = Math.floor(total / 60);
  let seconds = total - (minutes * 60);
  return minutes + ':' + ((seconds < 10) ? '0'+seconds : seconds);
}

export function resolveSystemIcon(type) {
  switch (type) {
    case 'v_60':
    case 'v60':
      return v60;
    case 'moka':
      return moka;
    case 'aeropress':
      return aeropress;
    case 'frenchPress':
      return frenchPress;
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
    case 'heat':
    case 'cool':
    case 'brew':
      return _temp;
    case 'add':
      return _add;
    case 'swirl':
      return _swirl;
    case 'bloom':
      return _bloom;
    default:
      return _add // just coffee icon
  }
}

export function getGrindLevel(level, translations) {
  if (Number.isInteger(level)){
    return (tt(translations, 'grind', DEFAULT_GRIND)[level-1]);
  }
  return tt(translations, 'grind', DEFAULT_GRIND)[5]; //medium
}

function stringToPath(path) {
  if (typeof path !== 'string') return path;
  const output = [];
  path.split('.').forEach(item => {
    item.split(/\[([^}]+)\]/g).forEach(key => {
      if (key.length > 0) {
        output.push(key);
      }
    });
  });
  return output;
};

export function pathOr(obj, path, defaultVal) {
	path = stringToPath(path);
	let current = obj;
	for (let i = 0; i < path.length; i++) {
		if (!current[path[i]]) return defaultVal;
		current = current[path[i]];
	}
	return current;
};
