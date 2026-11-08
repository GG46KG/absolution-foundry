# Absolution

A game system for [Foundry Virtual Tabletop](https://foundryvtt.com/).

## Development

Styles are written in SCSS and compiled to `css/absolution.css`:

```
npm install
npm run build   # compile once
npm run watch   # recompile on change
```

## Layout

| Path | Contents |
| --- | --- |
| `system.json` | Manifest, including the actor and item types |
| `module/absolution.mjs` | Entry point: `init` hook, document and sheet registration |
| `module/data/` | DataModel schemas for each actor and item type |
| `module/documents/` | Actor and Item document classes |
| `module/sheets/` | Actor and item sheets |
| `module/helpers/config.mjs` | `CONFIG.ABSOLUTION` constants |
| `templates/` | Handlebars templates for the sheets |
| `src/scss/` | Style sources |
| `lang/en.json` | English strings |

## License

MIT, see [LICENSE.txt](LICENSE.txt). The upstream copyright notice is retained as the license requires.
