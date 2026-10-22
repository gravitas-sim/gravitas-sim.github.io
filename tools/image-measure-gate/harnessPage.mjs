// The gate's harness page, served by server.mjs at tools/image-measure-gate/harness.html.
// It is a string and not an .html file because the site's page checks (the shell,
// the content-security policy, the navigation inventory) take every .html file in
// the tree for a page of the site, and this is spike code that is no page. The
// text is exactly the file that was measured; digest.mjs hashes it under the name
// harness.html. Spike code.
export const HARNESS_HTML = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Image marks gate harness</title>
    <style>
      body { font: 16px/1.4 system-ui, sans-serif; margin: 0; padding: 8px; background: #fff; color: #111; }
      .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
      button, select, input { min-height: 24px; min-width: 24px; font: inherit; }
      .im-tools, .im-pad { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0; }
      .im-stage { position: relative; max-width: 1024px; line-height: 0; }
      .im-img, .im-over { width: 100%; height: auto; display: block; }
      .im-over { position: absolute; left: 0; top: 0; outline-offset: 2px; touch-action: manipulation; }
      .im-loupe { border: 2px solid #fff; border-radius: 50%; pointer-events: none; }
      .im-help, .im-status, .im-scale { margin: 4px 0; font-size: 14px; }
      .im-tablewrap { overflow-x: auto; }
      .im-table { border-collapse: collapse; font-size: 14px; table-layout: fixed; min-width: 760px; width: 100%; }
      .im-table th, .im-table td { border: 1px solid #888; padding: 2px 4px; }
      .im-table input[type='number'] { width: 7em; }
      tr[aria-selected='true'] { background: #ffe9a8; }
    </style>
  </head>
  <body>
    <div id="srStatus" class="sr-only" role="status" aria-live="polite"></div>
    <main><h1 class="sr-only">Image marks</h1><div id="root"></div></main>
    <script type="module" src="./harness.js"></script>
  </body>
</html>
`;
