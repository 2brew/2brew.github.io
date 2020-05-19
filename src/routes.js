import Home from './views/Home.svelte';
import Recipes from './views/Recipes.svelte';
import Timer from './views/Timer.svelte';
import NotFound from './views/NotFound.svelte';

export default {
  '/': Home,
  '/:type': Recipes,
  '/:type/:name': Timer,
  '*': NotFound
};
