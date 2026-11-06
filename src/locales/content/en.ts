// Source texts injected into Twitch/Kick pages. Other languages: ./<code>.json with the same keys.
// {0} = channel/category/section name.
export default {
  hide: 'Hide',
  hideChannel: 'Hide channel {0}',
  hideCategory: 'Hide category {0}',
  hideCarousel: 'Hide the whole carousel',
  showChannel: 'Show channel {0} (remove from hidden)',
  showCategory: 'Show category {0} (remove from hidden)',
  pendingChannel: 'Channel {0} will be hidden after refresh',
  pendingCategory: 'Category {0} will be hidden after refresh',
  pendingRow: '{0}: hidden after refresh',
  undo: 'Undo',
  phChannel: 'Channel hidden',
  phCategory: 'Category hidden',
  phWhy: 'Why am I seeing this?',
  phChange: 'You can change this →',
  phWhyText:
    'You hid a lot at once. When the list gets short, the site keeps loading more tiles - endlessly. That floods the server with requests and may look like unnatural traffic from your account. So the rest of the hidden tiles stay as blank spots. You can change this in the extension settings (at your own risk).',
  toastChannel: 'Channel {0} hidden on Twitch and Kick. It disappears from lists after refresh.',
  toastCategory: 'Category {0} hidden on Twitch and Kick. It disappears after refresh.',
  toastSkip: 'Channel {0} hidden on Twitch and Kick. The carousel will skip it.',
  toastShown: '{0} removed from hidden.',
  hideSection: 'Hide section "{0}"',
  toastSection: 'Section "{0}" hidden. You can bring it back in the extension settings.',
  carousel: 'Home page carousel',
} as const;
