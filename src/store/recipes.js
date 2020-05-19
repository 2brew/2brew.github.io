import {get, writable} from 'svelte/store';
import {remote, createRemoteData} from '../utils/remote';

export const recipes = writable(createRemoteData());

export const fetchRecipes = (type, reset) => {
  const actualRecipes = get(recipes);
  if (!reset && actualRecipes[type]) {
    return Promise.resolve();
  }
  return remote(`/public/${type}.json`, {}, recipes, type);
};