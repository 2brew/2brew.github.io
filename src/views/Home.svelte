<script>
const systems = [
  {name: 'Аэропресс', url: 'aeropress', icon: 'aeropress'},
  {name: 'V60', url: 'v60', icon: 'v60'},
  {name: 'Мока', url: 'moka', icon: 'moka'}
]
</script>

{#each systems as item}
  <div class="item">
    <a class="system-button" href="#/{item.url}" title={item.name}>
      <img class="system-icon" src={`/public/icons/${item.icon}.svg`} alt={item.name}>
      
      <div class="system-name">{item.name}</div>
    </a>
  </div>
{/each}

<style>
  .item {
    width: 33.3%;
    box-sizing: border-box;
    padding: 10px;
    float: left;
    margin-top: 10px;
    position: relative;
  }
  .system-button {
    display: flex;
    border-radius: 10px;
    box-shadow: 0px 0px 2px 0px rgba(0,0,0,0.2);
    text-decoration: none;
    flex-direction: column;
    align-items: center;
  }
  .system-button:hover, .system-button:active{
    background: rgba(0,0,0, 0.04);
  }
  .system-icon {
    width: 50%;
    margin: 14px;
    display: block;
  }
  .system-name {
    color: var(--default-text-color);
    text-align: center;
    display: block;
    font-size: 20px;
    padding: 15px 0;
  }
</style>
