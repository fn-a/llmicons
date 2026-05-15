[**中文**](README.zh.md) | **English**

# LLM Icons

A curated collection of AI/LLM model brand icons, packaged in [Iconify](https://iconify.design/) JSON format for universal compatibility.

<p align="center">
  <img src="docs/brand_preview.png" alt="Brand Preview" width="45%" />
  &nbsp;&nbsp;
  <img src="docs/brand_search.png" alt="Brand Search" width="45%" />
</p>

## Icon Sets [ <img src="https://registry.npmmirror.com/@lobehub/assets-logo/1.2.0/files/assets/logo-3d.webp" height="20px" /> [Lobe Icons](https://icons.lobehub.com/), <img src="https://github.com/anomalyco/models.dev/raw/dev/logo-light.svg" width="120px" height="20px" />[Models.dev](https://models.dev/) ]

| Package | Prefix | Icons | Source |
|---------|--------|-------|--------|
| [`llmicons`](./package.json) (root) | `lobe` / `mdev` | 950+ | combined |
| [`@llmicons-json/lobe`](./icons/lobe) | `lobe` | 850+ | [lobe-icons](https://github.com/lobehub/lobe-icons) |
| [`@llmicons-json/mdev`](./icons/mdev) | `mdev` | 100+ | [models.dev](https://github.com/anomalyco/models.dev) |



## Installation

Choose the installation method that fits your project:

### Option A: Root package (multi-collection)

```bash
pnpm add llmicons
# or
npm install llmicons
```

Import via subpath exports:

```ts
import lobeIcons from 'llmicons/lobe/icons.json';
import mdevIcons from 'llmicons/mdev/icons.json';
```

### Option B: Individual package (single collection)

```bash
pnpm add @llmicons-json/lobe
# or
pnpm add @llmicons-json/mdev
```

```ts
import lobeIcons from '@llmicons-json/lobe/icons.json';
```

## Usage

### With `@iconify/react` (recommended for React)

```tsx
import { Icon, addCollection } from '@iconify/react';
import lobeIcons from 'llmicons/lobe/icons.json';
// import { icons as lobeIcons } from 'llmicons/lobe';

// Register the collection once
addCollection(lobeIcons);

function App() {
  return (
    <div>
      {/* Use with prefix:icon-name syntax */}
      <Icon icon="lobe:openai" width={24} />
      <Icon icon="lobe:deepseek" width={24} />
      <Icon icon="mdev:anthropic" width={24} />
    </div>
  );
}
```

### With `@iconify/vue` / `@iconify/svelte` / `@iconify/web`

The same `addCollection` + `Icon` pattern works across all frameworks:

```vue
<script setup>
import { Icon, addCollection } from '@iconify/vue';
import lobeIcons from '@llmicons-json/lobe/icons.json';
// import { icons as lobeIcons } from '@llmicons-json/lobe';

addCollection(lobeIcons);
</script>

<template>
  <Icon icon="lobe:openai" :width="24" />
</template>
```

### With UnoCSS

Install UnoCSS with the icons preset:

```bash
pnpm add -D unocss @unocss/preset-icons
```

Register the collection in `uno.config.ts`:

```ts
import { defineConfig, presetIcons } from 'unocss';
import { icons as lobeIcons } from 'llmicons/lobe';
// import lobeIcons from 'llmicons/lobe/icons.json';

export default defineConfig({
  presets: [
    presetIcons({
      collections: {
        lobe: () => lobeIcons,
      },
    }),
  ],
});
```

Then use in templates:

```html
<!-- Prefix:icon-name -->
<span class="i-lobe:openai text-2xl" />
<span class="i-lobe:deepseek text-2xl text-blue-500" />
<span class="i-mdev:anthropic text-2xl" />
```

### With Vite + `unplugin-icons`

```bash
pnpm add -D unplugin-icons
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';
import { ExternalPackageIconLoader } from 'unplugin-icons/loaders';

export default defineConfig({
  plugins: [
    Icons({
      customCollections: {
        ...ExternalPackageIconLoader('@llmicons-json/lobe'),
        ...ExternalPackageIconLoader('@llmicons-json/mdev'),
      },
    }),
  ],
});
```

Then auto-import icons in components:

```tsx
// Auto-imported by unplugin-icons
import IconLobeOpenai from '~icons/lobe/openai';
import IconMdevAnthropic from '~icons/mdev/anthropic';

function App() {
  return (
    <div>
      <IconLobeOpenai style={{ fontSize: '24px' }} />
      <IconMdevAnthropic style={{ fontSize: '24px', color: '#6366f1' }} />
    </div>
  );
}
```

### Direct JSON import (framework-agnostic)

```ts
import lobeIcons from 'llmicons/lobe/icons.json';
// import { icons as lobeIcons } from 'llmicons/lobe';

// lobeIcons is an IconifyJSON object
console.log(lobeIcons.icons['openai']); // SVG body
console.log(lobeIcons.icons['openai'].body); // Raw SVG path data

// Render inline SVG
function renderIcon(name: string): string {
  const icon = lobeIcons.icons[name];
  if (!icon) return '';
  return `<svg viewBox="0 0 24 24" width="24" height="24">${icon.body}</svg>`;
}
```

## Build

### Setup

```bash
git clone https://github.com/fn-a/llmicons
cd llmicons
pnpm install
git submodule update --init --recursive
pnpm run build
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm run build` | Build all icon sets |
| `pnpm run build:lobe` | Build only the lobe set |
| `pnpm run build:mdev` | Build only the mdev set |
| `pnpm run pullup` | Pull latest submodules |
| `pnpm run chain` | Pull submodules then build all |
| `pnpm run board` | Start a local server to preview the icons |

## License

MIT