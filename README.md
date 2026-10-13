# Grant Andrews Portfolio

React, TypeScript, Vite, and Tailwind CSS version of the original single-file portfolio.

## Start locally

```sh
npm install
npm run dev
```

## Add a project

Append a `Project` object to `src/data/projects.ts`. The room cards and project journal are generated from that list. Use one of the existing `illustration` values (`game`, `cad`, or `web`) or provide a `cover` image URL. `github` is optional. Add sections in display order; each becomes a journal chapter and table-of-contents entry.

The presentation and interactions are organized in `src/components`, with the scene state coordinated in `src/App.tsx` and the original paper-room styling in `src/styles.css`.
