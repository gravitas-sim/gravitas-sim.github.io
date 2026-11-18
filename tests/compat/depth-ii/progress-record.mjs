import { backupFor, lessons } from './_ws.mjs';
export default {
  async make(load) {
    return (await backupFor(load)).backup;
  },
  async read(load, fx) {
    const { validateBackup, restoreProgress } = await load(
      'js/investigations/progressBackup.js'
    );
    const v = validateBackup(fx);
    if (v && v.ok === false) return { accepted: false, problems: [v.reason] };
    const { at } = await lessons(load);
    const r = restoreProgress(fx, at);
    const want = Object.keys(fx.progress?.responses || {});
    const lost = want.filter(
      k => r.responses?.[k] !== fx.progress.responses[k]
    );
    return {
      accepted: true,
      lost,
      quarantined: Object.keys(r.quarantined || {}),
      moved: r.moved?.length ?? 0,
      dropped: r.dropped?.length ?? 0,
    };
  },
};
