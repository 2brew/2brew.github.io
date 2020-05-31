<script>
  import {onMount, onDestroy} from 'svelte';

  import Error from '../components/Error.svelte';
  import Back from '../components/Back.svelte';
  import {toMSS, resolveStepIcon, getGrindLevel} from '../utils/common';
  import {recipe, timer, startTimer, stopTimer, nextStep, fetchCurrentRecipe} from '../store/timer';

  import time from '../assets/icons/time.svg'
  import coffee from '../assets/icons/coffee.svg'
  import grind from '../assets/icons/grind.svg'
  import water from '../assets/icons/water.svg'
  import play from '../assets/icons/play.svg'
  import stop from '../assets/icons/stop.svg'

  export let params = {};

  onMount(() => {
    fetchCurrentRecipe(params.type, params.name);
  });

  onDestroy(() => {
    stopTimer();
  });
  function toggleTime() {
    if ($timer.step !== null) {
      stopTimer();
    } else {
      startTimer();
    }
  }
</script>
<Back href="/{params.type}"/>

{#if $recipe.error}
  <Error error={$recipe.error}/>
{:else if $recipe.isFetching}
  Loading...
{:else}
  <div class="recipe-info">
    <div class="recipe-pad recipe-coffee"><i>{@html coffee}</i>{$recipe.ingridients.coffee}g</div>
    <div class="recipe-pad recipe-water"><i>{@html water}</i>{$recipe.ingridients.water}ml</div>
    <div class="recipe-pad recipe-grind"><i>{@html grind}</i>{getGrindLevel($recipe.ingridients.grind)}</div>
    <div class="recipe-pad recipe-temp">{$recipe.ingridients.temp}°</div>
    <div class="recipe-pad recipe-time"><i>{@html time}</i>{toMSS($recipe.ingridients.time)}</div>
  </div>
  <div class="timer-wrapper">
   {#if $timer.step !== null && $timer.step < $recipe.steps.length-1}
      <div class="next-step" on:click={nextStep}>
        Next
      </div>
    {/if}
    <div class="timer" on:click={toggleTime}>
     {#if $timer.step !== null }
        <div class="stop-timer">
          {@html stop}
        </div>
      {/if}
      <div class="timer-content">
        {#if $timer.time}
          <div class="counter">{toMSS($timer.time)}</div>
        {:else if $timer.done }
          Enjoy your coffee
        {:else if $timer.time === 0 }
          ...
        {:else}
          <div class="timer-button">{@html play}</div>
        {/if}
      </div>
    </div>
  </div>
  <div class="steps">
    {#each $recipe.steps as step, index}
      {#if index >= $timer.step}
        <div class="step" class:active="{$timer.step === index}">
          <div class="step-type">
            <div class="step-icon">{@html resolveStepIcon(step.type)}</div>
            {step.type}
          </div>
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
.timer-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 50px;
  position: relative;
}
.timer {
  width: 50%;
  border-radius: 50%;
  box-shadow: 0px 0px 2px 0px rgba(0,0,0,0.2);
  position: relative;
  cursor: pointer;
}
.timer-button {
  width: 140px;
}
.timer:after {
  content: "";
  display: block;
  padding-bottom: 100%;
}

.next-step {
  position: absolute;
  right: 0;
  height: 60px;
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0px 0px 2px 0px rgba(0,0,0,0.2);
  top: 50%;
  margin-top: -30px;
  cursor: pointer;
}

.stop-timer {
  position: absolute;
  bottom: 20px;
  left: 50%;
  width: 40px;
  margin-left: -20px;
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
  border-radius: 10px;
  box-shadow: 0px 0px 2px 0px rgba(0,0,0,0.2);
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
.step-icon {
  margin: 0 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.step-type .step-icon {
  width: 30px;
}
.step-time .step-icon {
  width: 15px;
}
.recipe-info {
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  padding: 0 1%;
  margin-top: 20px;
}
.recipe-pad {
  width: 19%;
  border-radius: 10px;
  box-shadow: 0px 0px 2px 0px rgba(0,0,0,0.2);
  min-height: 45px;
  display: flex;
  align-items: center;
  justify-content: center ;
  font-size: 14px;
}
.recipe-pad i {
  width: 15px;
  display: block;
  height: 15px;
  margin-right: 5px;
}
</style>

