# @do-it/markdown-loader

> markdown-loader

## Usage

```js
const rule = config.module
    .rule('markdown')
      .test(/\.md$/)

rule
  .use('vue-loader')
    .loader('vue-loader')
    .options({ /* ... */ })

rule
  .use('markdown-loader')
    .loader(require.resolve('@do-it/markdown-loader'))
    .options({
       markdown: /* instance created by @do-it/markdown */,
       sourceDir: /* root source directory of your docs */,
    })
```
