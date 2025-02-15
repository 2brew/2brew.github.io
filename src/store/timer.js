import NoSleep from 'nosleep.js';
import {writable, get} from 'svelte/store';

import {fetchRecipes, recipes} from './recipes';

export const noSleep = new NoSleep();
let interval;

const stage = new Audio('/public/audio/stage.wav');
const end = new Audio('/public/audio/end.wav');

export const recipe = writable({
  title: null,
  notes: null,
  steps: [],
  ingridients: {},
  error: null,
  isFetching: false
});

export const timer = writable({
  time: null,
  step: null,
  water: 0
});

export function calculateWater(current, stepNumber) {
  return current.steps.reduce((acc, step, index) => {
    if (step.type === 'pour' && index < stepNumber) {
      return acc + step.amount;
    }
    return acc;
  }, 0)
}

export const clearRecipe = () => {
  recipe.set({steps: [], ingridients: {}, error: null, isFetching: true});
};

export const fetchCurrentRecipe = async (type, name, recipeRatio=1) => {
  let currentRecipe = null;
  recipe.set({title: null, notes: null, steps: [], ingridients: {}, error: null, isFetching: true});
  await fetchRecipes(type);
  currentRecipe = get(recipes)[type] ? get(recipes)[type].find((item) => item.name === name) : null;

  const calculatedIngredients = {
    ...currentRecipe.ingridients,
    water: currentRecipe.ingridients.water * recipeRatio,
    coffee: currentRecipe.ingridients.coffee * recipeRatio,
  }
  console.log("calculatedIngredients: ", calculatedIngredients);
  const calculatedSteps = currentRecipe.steps.map((step) => {
    if (step.type === 'pour') {
      return {
        ...step,
        amount: step.amount * recipeRatio
      };
    }
    return step;
  });
  console.log("currentRecipe: ", currentRecipe);
  console.log("calculatedSteps: ", calculatedSteps);
  if (currentRecipe) {
    recipe.set({
      title: currentRecipe.title,
      notes: currentRecipe.notes,
      ingridients: calculatedIngredients,
      steps: calculatedSteps,
      error: null,
      isFetching: false,
      ratios: [
        1,
        0.5,
        1.5,
        2,
      ]
    });
  } else {
    recipe.set({steps: [], ingridients: {}, error: {response: {status: 404, statusText: 'Not Found'}}, isFetching: false});
  }
};

export const startTimer = (initialStep = 0, time) => {
  clearInterval(interval);
  const current = get(recipe);
  const stepNumber = initialStep;
  const tick = new Audio('/public/audio/tick.wav');
  const tock = new Audio('/public/audio/tick.wav');

  if (current.steps.length && current.steps[stepNumber]) {
    timer.set({
      time: time === undefined ? current.steps[stepNumber].time : time, 
      water: time === undefined ? calculateWater(current, stepNumber) : get(timer).water,
      step: stepNumber
    });
    interval = setInterval(() => {
      const ct = get(timer);
      let nextTime = ct.time;
      let water = ct.water;
      if (nextTime > 0) {
        nextTime = nextTime - 1;
        if (nextTime <= 3) {
          // to avoid the situation when sound isn't play because it's still not ended
          (nextTime % 2 == 0) ? tick.play() : tock.play();
        }
        const currentStep = current.steps[ct.step];
        if (currentStep.type === 'pour') { // show water level
          water = ct.water + currentStep.amount/(currentStep.time);
        }
        timer.set({time: nextTime, water, step: ct.step});
        return;
      }
      if (ct.step >= current.steps.length - 1) {
        clearInterval(interval);
        timer.set({time: null, step: null, water, done: true});
        noSleep.disable();
        end.play();
      } else {
        timer.set({time: current.steps[ct.step+1].time, water, step: ct.step+1});
        stage.play();
      }
    }, 1000);
  } else {
    stopTimer();
  }
}

export const stopTimer = () => {
  clearInterval(interval);
  timer.set({time: null, water: 0, step: null});
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
