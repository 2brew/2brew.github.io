import {writable} from 'svelte/store';
import {remote, createRemoteData} from '../services/remote';

export const recipes = writable(createRemoteData());

export const fetchRecipes = () => {
  return remote('/public/recipes.json', {}, recipes);
};
