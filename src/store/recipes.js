import {writable} from 'svelte/store';
import {remote, createRemoteData} from '../utils/remote';

export const recipes = writable(createRemoteData());

export const fetchRecipes = (type) => {
  return remote(`/public/${type}.json`, {}, recipes);
};