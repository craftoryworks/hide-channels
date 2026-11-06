export const CSS = `
[data-hc-hidden]{display:none!important}
[data-hc-item="tile"],[data-hc-item="row"]{position:relative}
[data-hc-ghost]{visibility:hidden!important}
[data-hc-rel]{position:relative}
[data-hc-sec-host]{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between}
[data-hc-ph]{pointer-events:none!important}
[data-hc-ph]>:not(.hc-ph){visibility:hidden!important}
.hc-ph{position:absolute;inset:0;z-index:2147483000;box-sizing:border-box;display:flex;align-items:center;justify-content:center;
  padding:8px;border:1px dashed rgba(140,146,156,.45);border-radius:8px;background:rgba(140,146,156,.08);color:rgb(140,146,156);
  flex-direction:column;gap:8px;font:600 13px/1.3 Inter,"Roobert",system-ui,sans-serif;text-align:center}
.hc-ph button{all:unset;pointer-events:auto;cursor:pointer;padding:4px 10px;border-radius:6px;border:1px solid rgba(140,146,156,.45);
  font:600 12px/1.3 Inter,"Roobert",system-ui,sans-serif;color:rgb(170,176,186)}
.hc-ph button:hover{border-color:#f2a33a;color:#f2a33a}
[data-hc-item="row"][data-hc-pending]>:not(.hc-pending){opacity:.35}
[data-hc-item="mini"][data-hc-pending],[data-hc-item="search"][data-hc-pending]{opacity:.35}

.hc-x{position:absolute;top:6px;right:6px;z-index:2147483000;width:26px;height:26px;padding:0;margin:0;border:0;border-radius:6px;
  background:rgba(14,16,20,.85);color:#e8eaed;display:flex;align-items:center;justify-content:center;cursor:pointer;
  opacity:0;transition:opacity .12s,background .12s}
[data-hc-item]:hover>.hc-x,.hc-x:focus-visible,.hc-x[aria-expanded="true"]{opacity:1}
.hc-x:hover{background:#f2a33a;color:#14110b}
.hc-x--carousel{top:10px;right:10px;width:30px;height:30px}
:hover>.hc-x--carousel{opacity:1}
.hc-x--row{top:50%;right:4px;width:22px;height:22px;margin-top:-11px;border-radius:5px;background:#2c313a}

.hc-menu{position:absolute;top:36px;right:6px;z-index:2147483002;display:flex;flex-direction:column;min-width:190px;max-width:260px;padding:4px;
  background:#22262e;border:1px solid #3a3f4a;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.5)}
.hc-menu button{all:unset;box-sizing:border-box;padding:8px 10px;border-radius:6px;cursor:pointer;color:#e8eaed;
  font:500 13px/1.3 Inter,"Roobert",system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hc-menu button:hover,.hc-menu button:focus-visible{background:#2c313a}

.hc-pending{position:absolute;inset:0;z-index:2147483001;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:10px;padding:12px;text-align:center;background:rgba(14,16,20,.93);border:1px dashed #f2a33a;
  border-radius:6px;color:#e8eaed;font:600 13px/1.35 Inter,"Roobert",system-ui,sans-serif}
.hc-pending button{all:unset;cursor:pointer;padding:6px 14px;border-radius:6px;background:#f2a33a;color:#14110b;font-weight:700}
.hc-pending span{overflow:hidden;text-overflow:ellipsis;max-width:100%}
.hc-pending--row{flex-direction:row;justify-content:flex-end;padding:0 4px;background:transparent;border-radius:4px;pointer-events:none}
.hc-pending--row span{display:none}
.hc-pending--row button{pointer-events:auto;padding:3px 8px;font-size:12px}

.hc-sec{width:22px;height:22px;margin-left:8px;padding:0;border:0;border-radius:5px;flex-shrink:0;background:transparent;
  color:#9aa0aa;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity .12s}
[role="group"]:hover .hc-sec,section:hover .hc-sec,[data-hc-sec-host]:hover>.hc-sec,.hc-sec:focus-visible{opacity:1}
.hc-sec:hover{background:#2c313a;color:#f2a33a}

.hc-eye{order:-1;width:36px;height:36px;margin-right:6px;padding:0;border:0;border-radius:8px;background:transparent;
  color:#7d838e;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;align-self:center}
.hc-eye:hover{background:rgba(127,127,127,.15);color:#c4c8cf}
.hc-eye--on{color:#f2a33a}
.hc-catx{width:20px;height:20px;margin-left:4px;padding:0;border:0;border-radius:4px;background:transparent;color:#7d838e;
  display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;cursor:pointer}
.hc-catx:hover{background:rgba(127,127,127,.15);color:#c4c8cf}

.hc-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483646;box-sizing:border-box;
  width:min(560px,calc(100vw - 32px));display:flex;align-items:center;gap:14px;padding:12px 12px 12px 18px;background:#22262e;
  border:1px solid #f2a33a;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);color:#e8eaed;
  font:500 14px/1.4 Inter,"Roobert",system-ui,sans-serif}
.hc-toast span{flex-grow:1}
.hc-toast button{all:unset;cursor:pointer;padding:10px 18px;border-radius:8px;background:#f2a33a;color:#14110b;font-weight:700}
`;

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  x: { size: 12, width: 3, paths: ['M6 6l12 12M18 6L6 18'] },
  eyeOff: {
    size: 18,
    width: 2,
    paths: [
      'M3 3l18 18',
      'M10.6 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-3.2 4.3',
      'M6.6 6.6C4.4 8 2.8 10.2 2 12c1 2.5 5 7 10 7 1.7 0 3.3-.5 4.7-1.3',
      'M9.9 9.9a3 3 0 0 0 4.2 4.2',
    ],
  },
} as const;
export type IconName = keyof typeof ICONS;

/** Stroke icon as a real SVG element (no HTML parsing). */
export function icon(name: IconName): SVGSVGElement {
  const spec = ICONS[name];
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs: Record<string, string> = {
    width: String(spec.size),
    height: String(spec.size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': String(spec.width),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
  for (const d of spec.paths) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}
