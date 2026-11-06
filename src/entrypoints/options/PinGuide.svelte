<script lang="ts">
// Looping animation: click the extensions (puzzle) icon, then the pin next to our extension.
// Toolbar glyphs: Material Symbols "extension" and "keep" (Apache-2.0), as used by Chrome.
const PUZZLE =
  'M352-120H200q-33 0-56.5-23.5T120-200v-152q48 0 84-30.5t36-77.5q0-47-36-77.5T120-568v-152q0-33 23.5-56.5T200-800h160q0-42 29-71t71-29q42 0 71 29t29 71h160q33 0 56.5 23.5T800-720v160q42 0 71 29t29 71q0 42-29 71t-71 29v160q0 33-23.5 56.5T720-120H568q0-50-31.5-85T460-240q-45 0-76.5 35T352-120Zm-152-80h85q24-66 77-93t98-27q45 0 98 27t77 93h85v-240h80q8 0 14-6t6-14q0-8-6-14t-14-6h-80v-240H480v-80q0-8-6-14t-14-6q-8 0-14 6t-6 14v80H200v88q54 20 87 67t33 105q0 57-33 104t-87 68v88Zm260-260Z';
const PIN =
  'm640-480 80 80v80H520v240l-40 40-40-40v-240H240v-80l80-80v-280h-40v-80h400v80h-40v280Zm-286 80h252l-46-46v-314H400v314l-46 46Zm126 0Z';
const icon = '/icon/32.png';
let { title, other }: { title: string; other: string } = $props();
</script>

<div class="pg" aria-hidden="true">
  <div class="bar">
    <div class="url">twitch.tv</div>
    <img class="mine" src={icon} alt="" width="18" height="18" />
    <svg class="tb puzzle" viewBox="0 -960 960 960"><path d={PUZZLE} /></svg>
    <span class="avatar"></span>
  </div>
  <div class="menu">
    <div class="mh">{title}</div>
    <div class="row">
      <img src={icon} alt="" width="16" height="16" /><span>Hide Channels for Twitch &amp; Kick</span>
      <svg class="pin" viewBox="0 -960 960 960"><path d={PIN} /></svg>
    </div>
    <div class="row dim"><span class="sq"></span><span>{other}</span><svg class="pin off" viewBox="0 -960 960 960"><path d={PIN} /></svg></div>
  </div>
  <svg class="cursor" viewBox="0 0 24 34"><path d="M0 0V30L8 23L13.5 34L19 31.5L13.5 21H24Z" fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round" /></svg>
</div>

<style>
  .pg {
    position: relative;
    height: 170px;
    margin-top: 12px;
    border-radius: 10px;
    background: #0e0f12;
    overflow: hidden;
    font-size: 12px;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 12px;
    background: #2a2c31;
  }
  .url {
    flex: 1;
    height: 28px;
    padding: 0 12px;
    border-radius: 14px;
    background: #1d1e22;
    color: #9aa0aa;
    line-height: 28px;
  }
  .tb {
    width: 20px;
    height: 20px;
    fill: #c4c7cc;
  }
  .avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #5f6b7a;
  }
  .mine {
    width: 18px;
    height: 0;
    opacity: 0;
    animation: mine 8s infinite;
  }
  .menu {
    position: absolute;
    top: 46px;
    right: 26px;
    width: 250px;
    padding: 6px 0;
    border-radius: 8px;
    background: #2a2c31;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
    color: #e8eaed;
    opacity: 0;
    animation: menu 8s infinite;
  }
  .mh {
    padding: 4px 12px 6px;
    color: #9aa0aa;
    font-size: 11px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 30px;
    padding: 0 12px;
  }
  .row span:not(.sq) {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row.dim {
    color: #9aa0aa;
  }
  .sq {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    background: #4a505b;
  }
  .pin {
    width: 16px;
    height: 16px;
    fill: #c4c7cc;
    animation: pin 8s infinite;
  }
  .pin.off {
    animation: none;
  }
  .cursor {
    position: absolute;
    top: 0;
    right: 0;
    width: 16px;
    transform-origin: 0 0;
    height: 22px;
    animation: cursor 8s infinite;
  }
  /* timeline: move to puzzle, click, menu opens, move to pin, click, icon appears in toolbar */
  @keyframes cursor {
    0% { transform: translate(-260px, 130px); }
    18%, 24% { transform: translate(-36px, 22px); }
    21% { transform: translate(-36px, 22px) scale(0.85); }
    42%, 50% { transform: translate(-30px, 90px); }
    46% { transform: translate(-30px, 90px) scale(0.85); }
    70%, 100% { transform: translate(-10px, 140px); }
  }
  @keyframes menu {
    0%, 23% { opacity: 0; transform: translateY(-4px); }
    26%, 60% { opacity: 1; transform: none; }
    66%, 100% { opacity: 0; }
  }
  @keyframes pin {
    0%, 47% { fill: #c4c7cc; }
    49%, 100% { fill: #8ab4f8; }
  }
  @keyframes mine {
    0%, 48% { opacity: 0; height: 0; width: 0; }
    52%, 92% { opacity: 1; height: 18px; width: 18px; outline: 2px solid transparent; }
    60%, 80% { outline: 2px solid #f2a33a; outline-offset: 3px; border-radius: 4px; }
    100% { opacity: 0; height: 0; width: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cursor { display: none; }
    .menu { animation: none; opacity: 1; }
    .mine { animation: none; opacity: 1; height: 18px; width: 18px; }
    .pin { animation: none; fill: #8ab4f8; }
  }
</style>
