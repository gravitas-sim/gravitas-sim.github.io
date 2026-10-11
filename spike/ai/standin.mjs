// A loopback stand-in for an instructor-supplied endpoint. It answers with what
// the harness scripts, in the shape of either adapter, and records every body
// it is sent. It is not a model; nothing here leaves 127.0.0.1.
import http from 'node:http';

export async function startStandin() {
  const state = { next: null, seen: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      state.seen.push(body);
      const plan = state.next || { text: 'ok' };
      const send = () => {
        if (plan.status) res.statusCode = plan.status;
        res.setHeader('content-type', 'application/json');
        if (plan.raw !== undefined) return res.end(plan.raw);
        const shaped =
          plan.shape === 'plain'
            ? { text: plan.text, model: 'standin-1' }
            : {
                model: 'standin-1',
                choices: [{ message: { content: plan.text } }],
              };
        res.end(JSON.stringify(shaped));
      };
      if (plan.delay) setTimeout(send, plan.delay);
      else send();
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return {
    url: `http://127.0.0.1:${port}/draft`,
    port,
    state,
    plan: p => (state.next = p),
    close: () =>
      new Promise(r => {
        server.closeAllConnections?.();
        server.close(r);
      }),
  };
}
