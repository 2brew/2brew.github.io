import {writable, get} from 'svelte/store';
import {fetchRecipes, recipes} from './recipes';

export const timer = writable({
  steps: [],
  ingridients: {},
  time: null,
  step: {},
  error: null,
  isFetching: false
});

export const fetchCurrentRecipe = async (type, name) => {
  let recipe = null;
  timer.set({steps: [], ingridients: {}, time: null, step: {}, error: null, isFetching: true});
  await fetchRecipes(type);
  console.log(get(recipes), type, get(recipes)[type]);
  recipe = get(recipes)[type] ? get(recipes)[type].find((item) => item.name === name) : null;
  if (recipe) {
    timer.set({steps: recipe.steps, time: recipe.ingridients.time, ingridients: recipe.ingridients, error: null, isFetching: false});
  } else {
    timer.set({steps: [], ingridients: {}, error: {response: {status: 404, statusText: 'Not Found'}}, isFetching: false});
  }
};
