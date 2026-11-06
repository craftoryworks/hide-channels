import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  // MV3 everywhere (WXT would build Firefox as MV2 by default).
  manifestVersion: 3,
  modules: ['@wxt-dev/module-svelte'],
  manifest: ({ browser }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'hide-channels@craftory.works',
              // data_collection_permissions needs Firefox 140 (current ESR) / 142 on Android.
              strict_min_version: '140.0',
              // Required by AMO for new add-ons since 2025-11: we collect nothing.
              data_collection_permissions: { required: ['none'] },
            },
            gecko_android: { strict_min_version: '142.0' },
          },
        }
      : {}),
  }),
});
