// `yarn start` и `yarn dev`: поднять сервер, а если он уже идёт — перезапустить.
//
// Без этого повторный `yarn start` падал с EADDRINUSE, а `node --watch`,
// брошенный в другой вкладке, оставался жить без порта (передача 24.08). Здесь
// сперва снимаются свои же серверы, потом стартует новый. «Свои» — по двум
// признакам сразу: команда `node [--watch] server.js` и рабочий каталог — этот
// репозиторий. Чужой процесс на том же порту не трогается: о нём сообщается,
// и запуск останавливается.
//
// Список процессов читается из `/proc`, без `ss`, `lsof` и `fuser`: образ
// боевой машины — `node:22-bookworm-slim`, и лишних пакетов там нет. Там
// снимать и нечего — в контейнере сервер один, — так что шаг проходит впустую.
//
// Сигналы пробрасываются: `Ctrl+C` в терминале гасит сервер, а не только
// эту обёртку, и код выхода — его.
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, readlinkSync } from 'node:fs';
import net from 'node:net';
import { resolve } from 'node:path';

const here = resolve('.');
const port = Number(process.env.PORT || 3000);
const watch = process.argv.includes('--watch');
const sleep = ms => new Promise(done => setTimeout(done, ms));

// Свои серверы: `node server.js` или `node --watch server.js` из этого каталога.
function ours() {
  const found = [];
  let pids = [];
  try {
    pids = readdirSync('/proc').filter(name => /^\d+$/.test(name));
  } catch {
    return found;
  }
  for (const name of pids) {
    const pid = Number(name);
    if (pid === process.pid) continue;
    try {
      const argv = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').filter(Boolean);
      const cmd = argv.map(a => a.split('/').pop());
      const isServer =
        cmd[0] === 'node' && cmd[cmd.length - 1] === 'server.js' && cmd.slice(1, -1).every(a => a.startsWith('--'));
      if (isServer && readlinkSync(`/proc/${pid}/cwd`) === here) found.push(pid);
    } catch {
      // процесс исчез или не наш пользователь — не наш
    }
  }
  return found;
}

const alive = pid => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const busy = () =>
  new Promise(done => {
    const sock = net.connect({ port, host: '127.0.0.1' });
    sock.once('connect', () => (sock.destroy(), done(true)));
    sock.once('error', () => done(false));
  });

async function stop(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
  }
  for (let i = 0; i < 30 && pids.some(alive); i++) await sleep(100);
  for (const pid of pids.filter(alive)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {}
  }
  for (let i = 0; i < 20 && pids.some(alive); i++) await sleep(100);
}

const previous = ours();
if (previous.length) {
  console.log(`Tessarum: перезапуск, снимаю ${previous.join(', ')}`);
  await stop(previous);
}
for (let i = 0; i < 30 && (await busy()); i++) await sleep(100);
if (await busy()) {
  console.error(`Tessarum: порт ${port} занят чужим процессом — снимите его сами или задайте PORT.`);
  process.exit(1);
}

const child = spawn(process.execPath, [...(watch ? ['--watch'] : []), 'server.js'], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => child.kill(signal));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
