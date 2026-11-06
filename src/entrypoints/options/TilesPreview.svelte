<script lang="ts">
// Looping animation of what happens to a hidden tile in each mode.
let { mode, label }: { mode: 'remove' | 'placeholder'; label: string } = $props();
const tiles = ['#3b5bdb', '#c2255c', '#2b8a3e', '#e67700', '#5f3dc4'];
</script>

<div class="pv {mode}" aria-hidden="true">
  {#each tiles as c, i}
    <div class="tile" class:target={i === 1}>
      <div class="body">
        <div class="thumb" style="background:{c}"></div>
        <div class="ln"></div>
        <div class="ln short"></div>
      </div>
      {#if i === 1}
        <span class="x">✕</span>
        {#if mode === 'placeholder'}<span class="ph">{label}</span>{/if}
      {/if}
    </div>
  {/each}
</div>

<style>
  .pv {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-radius: 10px;
    background: #0e0f12;
    overflow: hidden;
  }
  .tile {
    position: relative;
    flex: none;
    width: 72px;
  }
  .thumb {
    height: 40px;
    border-radius: 5px;
    opacity: 0.85;
  }
  .ln {
    height: 5px;
    margin-top: 5px;
    border-radius: 3px;
    background: #3a3f4a;
  }
  .ln.short {
    width: 60%;
  }
  .x {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: rgba(14, 16, 20, 0.85);
    color: #e8eaed;
    font-size: 10px;
    line-height: 16px;
    text-align: center;
    opacity: 0;
    animation: x 5s infinite;
  }
  .ph {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: 1px dashed rgba(140, 146, 156, 0.45);
    border-radius: 6px;
    background: rgba(140, 146, 156, 0.08);
    color: rgb(140, 146, 156);
    font-size: 10px;
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
    opacity: 0;
    animation: ph 5s infinite;
  }
  .placeholder .target .body {
    animation: fade 5s infinite;
  }
  .remove .target {
    animation: collapse 5s infinite;
  }
  @keyframes x {
    0%, 10% { opacity: 0; }
    14%, 26% { opacity: 1; transform: scale(1); }
    22% { transform: scale(0.8); }
    30%, 100% { opacity: 0; }
  }
  @keyframes fade {
    0%, 26% { opacity: 1; }
    34%, 88% { opacity: 0; }
    96%, 100% { opacity: 1; }
  }
  @keyframes ph {
    0%, 30% { opacity: 0; }
    38%, 86% { opacity: 1; }
    94%, 100% { opacity: 0; }
  }
  @keyframes collapse {
    0%, 26% { opacity: 1; width: 72px; margin-right: 0; }
    34% { opacity: 0; width: 72px; margin-right: 0; }
    44%, 86% { opacity: 0; width: 0; margin-right: -8px; }
    94% { opacity: 0; width: 72px; margin-right: 0; }
    100% { opacity: 1; width: 72px; margin-right: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .x, .ph, .target, .target .body {
      animation: none !important;
    }
    .placeholder .ph {
      opacity: 1;
    }
    .placeholder .target .body,
    .remove .target {
      opacity: 0.25;
    }
  }
</style>
