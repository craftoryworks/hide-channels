import { load } from '../core/store';

export async function exportJson(): Promise<void> {
  const d = await load();
  const blob = new Blob([JSON.stringify({ app: 'hide-channels', ...d }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hide-channels-${new Date().toLocaleDateString('sv')}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
