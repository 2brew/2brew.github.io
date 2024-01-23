<script>
  import {onMount, onDestroy} from 'svelte';
  import {scale, fade} from 'svelte/transition';
  import NoSleep from 'nosleep.js';

  import Error from '../components/Error.svelte';
  import Loader from '../components/Loader.svelte';
  import Back from '../components/Back.svelte';
  import {toMSS, resolveStepIcon, getGrindLevel} from '../utils/common';
  import {
    recipe,
    timer,
    noSleep,
    startTimer,
    stopTimer,
    pauseTimer,
    nextStep,
    destroyTimer,
    fetchCurrentRecipe,
    calculateWater
  } from '../store/timer';
  import {tt, translations} from '../store/tt';

  import time from '../assets/icons/time.svg'
  import coffee from '../assets/icons/coffee.svg'
  import grind from '../assets/icons/grind.svg'
  import water from '../assets/icons/water.svg'
  import play from '../assets/icons/play.svg'
  import stop from '../assets/icons/stop.svg'
  import next from '../assets/icons/next.svg'
  import pause from '../assets/icons/pause.svg'

  export let params = {};

  let pausedTime = false;

  let selectedRatio;

  onMount(() => {
    fetchCurrentRecipe(params.type, params.name);
  });

  onDestroy(() => {
    destroyTimer();
  });

  function selectRatio(event) {
    fetchCurrentRecipe(params.type, params.name, event.target.value);
  }

  function goToNext() {
    pausedTime = false;
    nextStep();
  }

  function toggleTime() {
    if ($timer.step !== null) {
      if (pausedTime !== false) {
        noSleep.enable();
        startTimer($timer.step, pausedTime);
        pausedTime = false;
      } else {
        pausedTime = pauseTimer();
      }
    } else {
      noSleep.enable();
      startTimer();
      pausedTime = false;
    }
  }
</script>
<div class="back-container">
  <Back nomargin={true} href="/{params.type}"/>
</div>

{#if $recipe.error}
  <Error error={$recipe.error}/>
{:else if $recipe.isFetching}
  <Loader/>
{:else if $recipe.ingridients.coffee}
  <div class="recipe-info">
    <div class="recipe-pad recipe-coffee"><i>{@html coffee}</i>{$recipe.ingridients.coffee}{tt($translations, 'global.g')}</div>
    <div class="recipe-pad recipe-water"><i>{@html water}</i>{$recipe.ingridients.water}{tt($translations, 'global.ml')}</div>
    <div class="recipe-pad recipe-grind"><i>{@html grind}</i><span>{getGrindLevel($recipe.ingridients.grind, $translations)}</span></div>
    <div class="recipe-pad recipe-temp">{$recipe.ingridients.temp}°</div>
    <div class="recipe-pad recipe-time"><i>{@html time}</i>{toMSS($recipe.ingridients.time)}</div>
    {#if $recipe.ingridients.inverted}
      <div class="recipe-pad recipe-inverted">{tt($translations, 'global.inverted')}</div>
    {/if}
  </div>
  <h1 class="recipe-title">
    {$recipe.title}
  </h1>
  {#if $recipe.notes}
    <div class="recipe-notes">
      {$recipe.notes}
    </div>
  {/if}
  <div>
    <span class="recipe-ratio">{tt( $translations, "global.ratio" )}</span>
    <select
      class="recipe-ratio-select"
      bind:value={selectedRatio}
      on:change={selectRatio}
    >
      {#each $recipe.ratios as ratio}
        <option value={ratio}>{ratio}</option>
      {/each}
    </select>
  </div>
  <div class="timer-wrapper">
   {#if $timer.step !== null && $timer.step < $recipe.steps.length-1}
      <div class="actions bh next-step" on:click={goToNext} transition:scale|local>
        <i>{@html next}</i>
      </div>
    {/if}
    {#if $timer.step !== null}
      <div class="actions bh stop" on:click={stopTimer} transition:scale|local>
        <i>{@html stop}</i>
      </div>
    {/if}
    <div class="actions timer-water">
        {parseInt($timer.water)}{tt($translations, 'global.ml')}
      </div>
    <div class="timer" on:click={toggleTime}>
      {#if $timer.step !== null }
        {#if pausedTime !== false}
          <div class="timer-top" transition:scale|local>
            {tt($translations, 'global.paused')}
          </div>
          <div class="timer-bottom" transition:scale|local>
            {@html play}
          </div>
        {:else}
          {#if $timer.step !== null && $recipe.steps[$timer.step].type === 'pour'}
            <div class="timer-top" transition:scale|local>
              <span class="step-water" class:inverted={($timer.water - calculateWater($recipe, $timer.step))/$recipe.steps[$timer.step].amount > 0.9}>
                {parseInt($timer.water - calculateWater($recipe, $timer.step))}
                {tt($translations, 'global.ml')}
              </span>
            </div>
          {/if}
          <div class="timer-bottom" transition:scale|local>
            {@html pause}
          </div>
        {/if}
      {/if}
      <div class="timer-content">
        {#if $timer.time}
          <div class="counter">{toMSS($timer.time)}</div>
        {:else if $timer.done }
          {tt($translations, 'global.enjoy')}
        {:else if $timer.time === 0 }
          ...
        {:else}
          <div class="timer-button">{@html play}</div>
        {/if}
      </div>
      {#if $timer.step !== null && $recipe.steps[$timer.step].type === 'pour'}
        <div 
          class="water-level"
          out:fade|local
          style="height: {(($timer.water - calculateWater($recipe, $timer.step))/$recipe.steps[$timer.step].amount) * 100}%"
        ></div>
      {/if}
    </div>
  </div>
  <div class="steps">
    {#each $recipe.steps as step, index}
      {#if index >= $timer.step}
        <div class="step b" class:active="{$timer.step === index}" out:scale|local>
          <div class="step-type">
            <div class="step-icon">{@html resolveStepIcon(step.type)}</div>
            {tt($translations, `step.${step.type}`)}
          </div>
          {#if step.amount}
            <div class="step-amount">{step.amount}{tt($translations, 'global.ml')}</div>
          {:else if step.notes}
            <div class="step-amount">{step.notes}</div>
          {/if}
          <div class="step-time">
            <div class="step-icon">{@html time}</div>
            {toMSS(step.time)}
          </div>
        </div>
      {/if}
    {/each}
  </div>
{/if}

<style>
.back-container {
  float: left;
  width: 20%;
}
.timer-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  position: relative;
}
.timer {
  width: 50%;
  border-radius: 50%;
  box-shadow: 0 0 60px -10px #3e2000;
  background-color: var(--default-box-color);
  position: relative;
  cursor: pointer;
  overflow: hidden;
}
.timer-button {
  width: 23vw;
  max-width: 140px;
}
.timer:after {
  content: "";
  display: block;
  padding-bottom: 100%;
}
.timer-content {
  z-index: 2;
}
.water-level {
  width: 100%;
  height: 0%;
  background-color: var(--water-color);
  position: absolute;
  bottom: 0%;
  z-index: 1;
  transition: height 1s;
  transition-timing-function: linear;
}
.step-water {
  color: var(--water-color);
}
.step-water.inverted {
   color: var(--second-text-color);
}
.actions {
  position: absolute;
  height: 60px;
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
}

.next-step {
  right: 0;
  top: 50%;
  margin-top: -30px;
}
.stop {
  left: 0;
  bottom: 10px;
}

.timer-water {
  color: var(--water-color);
  left: 0;
  align-items: flex-start;
  font-size: 30px;
  justify-content: flex-start;
}

.actions i {
  width: 25px;
  height: 25px;
}

.timer-bottom {
  position: absolute;
  bottom: 5%;
  left: 50%;
  width: 15%;
  margin-left: -7.5%;
  z-index: 2;
}

.timer-top {
  position: absolute;
  top: 6%;
  width: 100%;
  text-align: center;
  z-index: 2;
}

.timer-content {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.counter {
  font-size: 72px;
  height: 150px;
  padding-top: 30px;
}
.steps {
  margin-top: 20px;
}
.step {
  width: 100%;
  padding: 15px 10px;
  margin: 10px 0;
  text-decoration: none;
  display: flex;
  justify-content: space-between;
}

.step.active {
  background: var(--active-color);
}
.step-type, .step-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.step-type {
  min-width: 150px;
  justify-content: flex-start;
}
.step-icon {
  margin: 0 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.step-amount {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 13px;
  flex-grow: 1;
  padding-left: 5px;
}
.step-type .step-icon {
  width: 30px;
}
.step-time .step-icon {
  width: 15px;
}
.recipe-notes, .recipe-title, .recipe-ratio {
  width: 100%;
  color: var(--second-text-color);
  margin: 10px 0;
}
.recipe-notes {
  font-size: 11px;
}
.recipe-title {
  font-size: 20px;
  padding-top: 10px;
}
.recipe-info {
  display: flex;
  width: 78%;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  margin-top: 20px;
  min-height: 49px;
  flex-flow: wrap;
  padding-left: 2%;
}
.recipe-ratio-select {
  font-size: large;
}
.recipe-pad {
  width: 30%;
  min-height: 25px;
  color: var(--second-text-color);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 14px;
}
.recipe-pad.recipe-grind {
  width: 36%;
}
.recipe-pad :global(svg g), .recipe-pad :global(svg path) {
  fill: var(--default-box-color);
}
.recipe-pad i {
  width: 15px;
  display: block;
  height: 15px;
  margin-right: 5px;
}
</style>

