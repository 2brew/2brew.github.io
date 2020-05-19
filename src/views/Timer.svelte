<script>
  import {onMount} from 'svelte';
  import Error from '../components/Error.svelte';
  import Back from '../components/Back.svelte';
  import {toMSS} from '../utils/common';
  import {timer, fetchCurrentRecipe} from '../store/timer';

  import time from '../assets/icons/time.svg'

  export let params = {};

  let recipe = {}

  onMount(() => {
    fetchCurrentRecipe(params.type, params.name);
	});
</script>
<Back href="/{params.type}"/>

{#if $timer.error}
  <Error error={$timer.error}/>
{:else if $timer.isFetching}
  Loading...
{:else}
  <div class="page">
    <div class="timer">
      <div class="timer-content">
        <div class="counter">{toMSS($timer.ingridients.time)}</div>
      </div>
    </div>
  </div>
  <div class="steps">
    {#each $timer.steps as step}
    <div class="step">
      <div class="step-type">
        <div class="step-icon"></div>
        {step.type}
      </div>
      <div class="step-time">
        <div class="step-icon">{@html time}</div>
        {toMSS(step.time)}
      </div>
    </div>
  {/each}
  </div>
{/if}

<style>
.page {
  display: flex;
  justify-content: center;
  padding-top: 50px;
}
.timer {
  width: 50%;
  border-radius: 50%;
  box-shadow: 0px 0px 2px 0px rgba(0,0,0,0.2);
  position: relative;
}

.timer:after {
  content: "";
  display: block;
  padding-bottom: 100%;
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
  height: 92px;
}
.steps {
  margin-top: 20px;
}
.step {
  width: 100%;
  padding: 15px 10px;
  margin: 10px;
  border-radius: 10px;
  box-shadow: 0px 0px 2px 0px rgba(0,0,0,0.2);
  text-decoration: none;
  display: flex;
  justify-content: space-between;
}
.step-type, .step-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.step-icon {
  width: 30px;
  margin: 0 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

