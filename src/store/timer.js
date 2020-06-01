import NoSleep from 'nosleep.js';
import {writable, get} from 'svelte/store';

import {fetchRecipes, recipes} from './recipes';

const noSleep = new NoSleep();
let interval;

const stage = new Audio('/public/audio/stage.wav');
const end = new Audio('/public/audio/end.wav');

export const recipe = writable({
  steps: [],
  ingridients: {},
  error: null,
  isFetching: false
});

export const timer = writable({
  time: null,
  step: null,
});

export const clearRecipe = () => {
  recipe.set({steps: [], ingridients: {}, error: null, isFetching: true});
};

export const fetchCurrentRecipe = async (type, name) => {
  let currentRecipe = null;
  recipe.set({steps: [], ingridients: {}, error: null, isFetching: true});
  await fetchRecipes(type);
  currentRecipe = get(recipes)[type] ? get(recipes)[type].find((item) => item.name === name) : null;
  if (currentRecipe) {
    recipe.set({steps: currentRecipe.steps, ingridients: currentRecipe.ingridients, error: null, isFetching: false});
  } else {
    recipe.set({steps: [], ingridients: {}, error: {response: {status: 404, statusText: 'Not Found'}}, isFetching: false});
  }
};

export const startTimer = (initialStep = 0, time) => {
  clearInterval(interval);
  const current = get(recipe);
  const stepNumber = initialStep;
  if (current.steps.length && current.steps[stepNumber]) {
    noSleep.enable();
    timer.set({time: time || current.steps[stepNumber].time, step: stepNumber});

    interval = setInterval(() => {
      const ct = get(timer);
      let nextTime = ct.time;
      if (nextTime > 0) {
        nextTime = nextTime - 1;
        if (nextTime < 4) {
          const tick = new Audio('/public/audio/tick.wav');
          tick.play();
        }
        timer.set({time: nextTime, step: ct.step});
        return;
      }
      if (ct.step >= current.steps.length - 1) {
        clearInterval(interval);
        timer.set({time: null, step: null, done: true});
        noSleep.disable();
        end.play();
      } else {
        timer.set({time: current.steps[ct.step+1].time, step: ct.step+1});
        stage.play();
      }
    }, 1000);
  } else {
    stopTimer();
  }
}

export const stopTimer = () => {
  clearInterval(interval);
  timer.set({time: null, step: null});
  noSleep.disable();
}

export const destroyTimer = () => {
  stopTimer();
  interval = null;
  clearRecipe();
}

export const pauseTimer = () => {
  clearInterval(interval);
  noSleep.disable();
  return get(timer).time;
}

export const nextStep = () => {
  const ct = get(timer);
  startTimer(ct.step+1);
}
