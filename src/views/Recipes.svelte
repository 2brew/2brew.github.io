<script>
  import {link} from 'svelte-spa-router';
  
  import Error from '../components/Error.svelte';
  import Back from '../components/Back.svelte';
  import Loader from '../components/Loader.svelte';
  import {toMSS, resolveSystemIcon, getGrindLevel} from '../utils/common';
  import {fetchRecipes, recipes} from '../store/recipes';
  import {tt, translations} from '../store/tt';

  import time from '../assets/icons/time.svg'
  import coffee from '../assets/icons/coffee.svg'
  import grind from '../assets/icons/grind.svg'
  
  export let params = {};

  $: {
    fetchRecipes(params.type);
  }
</script>
<Back href="/"/>
{#if $recipes.error}
  <Error error={$recipes.error}/>
{:else if $recipes.isFetching}
  <Loader/>
{:else}
<div class="list">
  {#each $recipes[params.type] as recipe}
    <a class="recipe-button bh" href="/{params.type}/{recipe.name}" use:link>
      <div class="recipe-icon" class:inverted={recipe.ingridients.inverted}>
        {@html resolveSystemIcon(params.type)}
      </div>
      <div class="recipe-data">
          <div class="recipe-name">{recipe.title}</div>
          <div class="recipe-ingridients">
          <div class="ingridient-data">{recipe.ingridients.water}{tt($translations, 'global.ml')}</div>
            <i>{@html coffee}</i><div class="ingridient-data">{recipe.ingridients.coffee}{tt($translations, 'global.g')}</div>
            <i>{@html time}</i><div class="ingridient-data">{toMSS(recipe.ingridients.time)}</div>
            <i>{@html grind}</i><div class="ingridient-data">{getGrindLevel(recipe.ingridients.grind, $translations)}</div>
            <div class="ingridient-data">{recipe.ingridients.temp}°</div>
          </div>
        </div>
    </a>
  {/each}
</div>
{/if}

<style>
  .recipe-button {
    width: 100%;
    padding: 15px 10px;
    margin: 10px 0;
    text-decoration: none;
    display: flex;
    justify-content: flex-start;
    box-sizing: border-box;
  }
  .recipe-icon {
    width: 50px;
    height: 50px;
    margin-right: 10px
  }
  .recipe-icon.inverted {
    transform: rotate(180deg);
  }
  .recipe-data {
    min-height: 50px;
    flex-grow: 1;
  }
  .recipe-name {
    font-size: 18px;
  }
  .recipe-ingridients {
      font-size: 13px;
      margin-top: 10px;
      line-height: 1.5;
  }
  i {
    display: block;
    height: 14px;
    width: 14px;
    float: left;
    margin-top: 2px;
    margin-right: 8px;
  }
  .ingridient-data {
    float: left;
    margin-right: 15px;
  }
</style>