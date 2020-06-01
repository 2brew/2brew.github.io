<script>
  import {onMount} from 'svelte';
  export let error;

  onMount(() => console.error(error));
</script>

<div class="error">
  <div class="heading">
    ⚠️
    {#if error.response}
      {error.response.status}: {error.response.statusText}
    {:else}
      Error
    {/if}
  </div>
  {#if error.message}
    <p class="info">
      {error.name ? error.name + ': ' : ''}{error.message}
    </p>
  {/if}
</div>

<style>
  .error {
    color: var(--error-color);
    background: #5a1313;
    width: 100%;
    padding: 20px 30px;
    margin: 5px 0;
    border-radius: 10px;
  }
  .heading{
    font-size: 18px;
    font-weight: bold;
  }
  .info {
    margin-top: 10px;
  }
</style>
