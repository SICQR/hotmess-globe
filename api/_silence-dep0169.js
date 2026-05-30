/**
 * Silence DEP0169 ("Insecure url.parse()") which is emitted on every Vercel
 * serverless invocation by web-push@3.6.7's internal url.parse() usage.
 *
 * web-push has not been updated past 3.6.7 (latest as of 2026-05); upstream is
 * tracked at https://github.com/web-push-libs/web-push/issues/827. Until they
 * cut a new release, the runtime warning floods Vercel logs across every
 * endpoint that bootstraps the dispatcher / channels / process cron.
 *
 * This module re-attaches a single warning listener that suppresses ONLY
 * DEP0169. Every other deprecation passes through unchanged, so we don't lose
 * visibility into anything new. Idempotent — safe to import from multiple
 * entry points.
 *
 * Side-effect import; no exports.
 */
const FLAG = '__hm_silence_dep0169_attached';

if (!globalThis[FLAG]) {
  globalThis[FLAG] = true;

  process.removeAllListeners('warning');
  process.on('warning', (warn) => {
    if (warn?.code === 'DEP0169') return;
    if (typeof process.emitWarning === 'function' && warn?.code) {
      process.stderr.write(`(node:${process.pid}) [${warn.code}] ${warn.message}\n`);
    } else {
      process.stderr.write(`(node:${process.pid}) ${warn?.stack || warn}\n`);
    }
  });
}
