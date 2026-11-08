# Absolution

A game system for [Foundry Virtual Tabletop](https://foundryvtt.com/).

Scaffolded from the [Boilerplate system](https://github.com/asacolips-projects/boilerplate) by Asacolips (`v12` branch, DataModel variant). The actor types, item types, abilities and sheets are still the generic Boilerplate examples.

## Development

Foundry requires the system folder to match the `id` in `system.json`, so this repo must appear in your Foundry data folder as `systems/absolution`, not `systems/absolution-foundry`. Link it from PowerShell, replacing the path with your own Foundry user data path:

```powershell
New-Item -ItemType Junction -Path "<FoundryData>\Data\systems\absolution" -Target "C:\Code\absolution-foundry"
```

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
