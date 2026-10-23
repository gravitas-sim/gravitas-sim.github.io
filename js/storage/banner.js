// The visible state of a preview as a student (Prompt 175): one line on the
// page, in the reader's language. Fetched only for an address that carries
// `preview=student` (js/storage/local.js and each page's entry), so no other
// visit pays for it.

import { KEY_LOCALE } from '../names.js';

const el = document.createElement('p');
el.id = 'previewBanner';
el.setAttribute('role', 'status');
const es =
  (localStorage.getItem(KEY_LOCALE) || document.documentElement.lang) === 'es';
el.textContent = es
  ? 'Vista previa como estudiante: nada de esto se guarda.'
  : 'Preview as a student: nothing here is saved.';
el.style.cssText =
  'position:fixed;left:8px;bottom:8px;z-index:2147483000;margin:0;padding:6px 12px;border-radius:99px;font:600 14px/1.3 system-ui,sans-serif;background:#0b3d63;color:#fff;pointer-events:none;max-width:calc(100vw - 16px)';
const show = () => document.body.append(el);
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', show);
else show();
