import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { createServer } from 'vite';

// Run the actual React component in Chrome: DOM geometry and ResizeObserver cannot be checked with model mocks.
const projectPath = fileURLToPath(new URL('../', import.meta.url));
const harnessPath = '/Cameos/__test_carousel_loading';
const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"></head><body style="margin:0">
<div id="root"></div><script type="module">
import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Carousel from '/src/components/Carousel.jsx';
import MediaCarousel from '/src/components/media/MediaCarousel.jsx';
import CastCarousel from '/src/components/media/CastCarousel.jsx';
import TVSeasonSelection from '/src/components/tv/TVSeasonSelection.jsx';
import TrendingMediaCardSlider from '/src/components/media/TrendingMediaCardSlider.jsx';
import { Movie } from '/src/models/Movie.js';
/** @type {(type: string|React.JSXElementConstructor<any>, props: Object|null, ...children: React.ReactNode[]) => React.ReactElement} */
const h = React.createElement;
const root = createRoot(document.getElementById('root'));
let generation = 0;
let stats = {calls:0,inFlight:0,maxInFlight:0};
function Fixture(config) {
  const [fixtureStats] = useState(() => stats);
  const [items, setItems] = useState(() => Array.from({length:config.initial}, (_, id) => ({id:id+1,title:'Film '+(id+1),name:'Person '+(id+1),role:'Regia'})));
  const [loading, setLoading] = useState(Boolean(config.loading));
  const [hasMore, setHasMore] = useState(config.hasMore !== false);
  window.finishLoading = () => setLoading(false);
  const onLoadMore = async () => {
    fixtureStats.calls++;
    fixtureStats.inFlight++;
    fixtureStats.maxInFlight = Math.max(fixtureStats.maxInFlight, fixtureStats.inFlight);
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, config.delay || 50));
    if (!config.noProgress) setItems(previous => [...previous, ...Array.from({length:config.batch || 1}, (_, index) => ({id:previous.length+index+1,title:'Film '+(previous.length+index+1),name:'Person '+(previous.length+index+1),role:'Regia'}))]);
    if (fixtureStats.calls >= (config.maxLoads ?? Infinity)) setHasMore(false);
    fixtureStats.inFlight--;
    setLoading(false);
  };
  const shared = {onLoadMore,hasMore,isLoadingMore:loading};
  const carousel = config.media
    ? h(MediaCarousel, {...shared,title:'Film',items})
    : config.cast ? h(CastCarousel, {...shared,title:'Registi',cast:items,limit:items.length,showRoles:config.showRoles})
    : h(Carousel, {...shared,header:h('h2',null,'Film'),itemCount:items.length},
        ...items.map(item => h('div',{key:item.id,'data-id':item.id,style:{flex:'0 0 150px',width:150,height:60,scrollSnapAlign:'start',scrollMarginInlineStart:item.id === 1 ? '12px' : undefined}},item.title)),
        loading && h('div',{className:'carousel-loading',style:{flex:'0 0 150px'}},'Loading'));
  return h('div',{className:config.cast ? 'carousel-page-padding' : undefined,style:{padding:config.cast ? undefined : '0 20px','--media-card-width':'150px'}},carousel);
}
window.mountFixture = config => {
  stats = {calls:0,inFlight:0,maxInFlight:0};
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,h(Fixture,config))));
};
window.mountTouchWidget = kind => {
  const widget = kind === 'seasons'
    ? h(TVSeasonSelection,{seasonsCount:30,onSelectSeason:()=>{}})
    : h(TrendingMediaCardSlider,{items:[1,2,3].map(id=>new Movie({id,title:'Swipe Film '+id,release_date:'2020-01-01'}))});
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,widget)));
};
window.snapshot = () => {
  const track = document.querySelector('.carousel-track');
  const cards = [...(track?.children || [])].filter(child => !child.classList.contains('carousel-loading'));
  const style = track && getComputedStyle(track);
  return {...stats,count:cards.length,scrollLeft:track?.scrollLeft,
    available:track?.clientWidth-(parseFloat(style?.paddingLeft)||0)-(parseFloat(style?.paddingRight)||0),
    occupied:cards.length ? cards.at(-1).getBoundingClientRect().right-cards[0].getBoundingClientRect().left : 0,
    labels:cards.map(card=>card.innerText),nextEnabled:!document.querySelector('.carousel-navigation button:last-child')?.disabled};
};
</script><style>.carousel-track:not(.media-carousel-track):not(.cast-carousel-track){gap:10px;padding:0 12px}</style></body></html>`;

const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const profile = await mkdtemp(join(tmpdir(), 'cameos-carousel-test-'));
const server = await createServer({
  root: projectPath,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 },
  plugins: [/** @type {import('vite').Plugin} */ ({ name: 'carousel-test-harness', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url !== harnessPath) return next();
      res.setHeader('Content-Type', 'text/html');
      res.end(await vite.transformIndexHtml(harnessPath, html));
    });
  } })]
});
let chrome;
let socket;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  await server.listen();
  const port = server.httpServer.address().port;
  chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let launchError;
  chrome.on('error', error => { launchError = error; });
  let debugPort;
  for (let i = 0; i < 100 && !debugPort; i++) {
    if (launchError) throw launchError;
    await sleep(50);
    try { debugPort = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { /* Chrome is starting. */ }
  }
  assert.ok(debugPort, 'Chrome must expose a debugging port');
  /** @type {{type: string, url: string, webSocketDebuggerUrl: string}[]} */
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page' && target.url === 'about:blank').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome timed out: ${method}`)); }, 10000);
    pending.set(id, message => { clearTimeout(timeout); message.error ? reject(new Error(message.error.message)) : resolve(message.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text + ': ' + response.exceptionDetails.exception?.description);
    return response.result.value;
  };
  const viewport = width => send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  const until = async (expression, message) => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await sleep(20); }
    assert.fail(`${message}: ${JSON.stringify(await evaluate('window.snapshot?.()'))}`);
  };
  const mount = async (width, config) => {
    await viewport(width);
    await evaluate(`window.mountFixture(${JSON.stringify(config)})`);
    await until(`window.snapshot().count === ${config.initial}`, 'Fixture must render its initial cards');
  };
  /** @returns {Promise<{calls: number, inFlight: number, maxInFlight: number, count: number, scrollLeft: number, available: number, occupied: number, labels: string[], nextEnabled: boolean}>} */
  const stable = async () => { await sleep(250); return evaluate('window.snapshot()'); };
  const next = () => evaluate(`document.querySelector('.carousel-navigation button:last-child').click()`);
  await send('Page.enable');
  await viewport(1500);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}${harnessPath}` });
  await until(`typeof window.mountFixture === 'function'`, 'React harness must load');

  await mount(1600, { initial: 5, batch: 2, media: true });
  await until('window.snapshot().calls === 3 && window.snapshot().inFlight === 0', 'Sparse media carousel must fetch enough cards');
  let state = await stable();
  assert.equal(state.count, 11);
  assert.ok(state.occupied >= state.available);
  assert.equal(state.maxInFlight, 1, 'StrictMode and resize notifications must not duplicate requests');
  assert.equal(state.scrollLeft, 0, 'Automatic fill must preserve the scroll position');
  assert.deepEqual(state.labels.map(label => label.split('\n').find(line => line.startsWith('Film '))), Array.from({ length: 11 }, (_, i) => `Film ${i + 1}`));
  console.log('PASS sparse MediaCarousel fills available width and preserves order/position');

  await mount(2048, { initial: 1, batch: 1, cast: true, showRoles: false });
  await until('window.snapshot().occupied >= window.snapshot().available && window.snapshot().inFlight === 0', 'Sparse director results must fill the viewport even when each page adds only one person');
  state = await stable();
  assert.ok(state.calls > 3);
  assert.equal(state.maxInFlight, 1);
  assert.equal(state.scrollLeft, 0);
  assert.equal(await evaluate(`document.querySelectorAll('.cast-card-character, .cast-card-roles-toggle').length`), 0);
  assert.deepEqual(state.labels.map(label => label.split('\n')[0]), Array.from({ length: state.count }, (_, i) => `Person ${i + 1}`));
  console.log('PASS sparse director CastCarousel continues beyond three loads and preserves order');

  await next();
  await until('window.snapshot().scrollLeft >= window.snapshot().available * 0.75 && window.snapshot().inFlight === 0', 'The first next click must reach a full new viewport after sparse pagination');
  state = await stable();
  assert.equal(state.maxInFlight, 1);
  assert.ok(state.scrollLeft < state.available * 1.25, 'Loading more results must not advance multiple viewports');
  console.log('PASS first next click advances a full viewport with sparse director pages');

  await mount(1000, { initial: 7, batch: 10, delay: 100 });
  await stable();
  await next();
  await next();
  await until('window.snapshot().scrollLeft >= window.snapshot().available * 0.75 && window.snapshot().inFlight === 0', 'Repeated clicks while loading must keep the first destination');
  state = await stable();
  assert.equal(state.calls, 1);
  assert.ok(state.scrollLeft < state.available * 1.25);
  console.log('PASS repeated next clicks keep one pending destination and request');

  await mount(1000, { initial: 7, batch: 10, loading: true });
  assert.equal((await stable()).nextEnabled, true);
  await next();
  assert.equal((await stable()).calls, 0, 'Navigation must wait for the existing request');
  await evaluate('window.finishLoading()');
  await until('window.snapshot().scrollLeft >= window.snapshot().available * 0.75 && window.snapshot().inFlight === 0', 'Navigation must resume after the existing load');
  assert.equal((await stable()).calls, 1);
  console.log('PASS next click waits for an existing in-flight load');

  await mount(1000, { initial: 7, batch: 2, maxLoads: 1 });
  await stable();
  await next();
  await until('window.snapshot().scrollLeft > 100 && window.snapshot().inFlight === 0 && !window.snapshot().nextEnabled', 'An exhausted source must show its remaining tail');
  assert.equal((await stable()).calls, 1);
  console.log('PASS final partial viewport stops at the real end of the list');

  await mount(375, { initial: 5, cast: true, hasMore: false });
  await stable();
  assert.equal(await evaluate(`document.querySelectorAll('.cast-card-character').length`), 5, 'Cast credits retain their character captions by default');
  console.log('PASS character captions remain available outside search results');

  await mount(375, { initial: 5, batch: 2 });
  assert.equal((await stable()).calls, 0, 'Mobile overflow needs no automatic fetch');
  await viewport(1200);
  await until('window.snapshot().calls === 2 && window.snapshot().inFlight === 0', 'Widening must fill the new viewport');
  state = await stable();
  assert.ok(state.occupied >= state.available);
  await viewport(375);
  assert.equal((await stable()).calls, 2, 'Narrowing needs no new results');
  console.log('PASS mobile overflow and responsive resizing');

  await mount(2400, { initial: 1 });
  await until('window.snapshot().calls === 14 && window.snapshot().inFlight === 0', 'Automatic loading must fill the missing visible slots');
  state = await stable();
  assert.equal(state.calls, 14, 'Automatic loading must stop once the viewport is filled');
  assert.equal(state.count, 15);
  assert.ok(state.nextEnabled, 'The user can continue after automatic filling');
  await next();
  await until('window.snapshot().calls > 14 && window.snapshot().inFlight === 0', 'Manual navigation must remain available');
  console.log('PASS bounded viewport filling and manual continuation');

  await mount(1200, { initial: 2, noProgress: true });
  await until('window.snapshot().calls === 1 && window.snapshot().inFlight === 0', 'An empty or failed page must settle');
  state = await stable();
  assert.equal(state.calls, 1, 'No progress must not cause automatic retries');
  assert.equal(state.count, 2);
  await next();
  await until('window.snapshot().calls === 2 && window.snapshot().inFlight === 0', 'Manual retry must still work');
  assert.equal((await stable()).calls, 2);
  console.log('PASS no-progress guard and manual retry');

  await mount(1200, { initial: 2, hasMore: false });
  state = await stable();
  assert.equal(state.calls, 0);
  assert.equal(state.nextEnabled, false);
  await mount(1200, { initial: 2, batch: 1, maxLoads: 1 });
  await until('window.snapshot().calls === 1 && window.snapshot().inFlight === 0', 'The last page must load');
  state = await stable();
  assert.equal(state.calls, 1);
  assert.equal(state.nextEnabled, false);
  console.log('PASS exhausted pages stop automatic loading');

  await mount(1200, { initial: 2, batch: 10, loading: true });
  assert.equal((await stable()).calls, 0);
  await evaluate('window.finishLoading()');
  await until('window.snapshot().calls === 1 && window.snapshot().inFlight === 0', 'Fill must resume after an existing load');
  assert.equal((await stable()).calls, 1);
  await mount(374, { initial: 2 });
  state = await stable();
  assert.equal(state.occupied, state.available);
  assert.equal(state.calls, 0, 'An exactly filled row must not fetch more');
  console.log('PASS in-flight loading and exact fit');

  const swipe = (selector, from, to) => evaluate(`(()=>{const target=document.querySelector(${JSON.stringify(selector)});for(const [type,point] of [['touchstart',${JSON.stringify(from)}],['touchmove',${JSON.stringify(to)}],['touchend',null]]){const event=new Event(type,{bubbles:true});Object.defineProperty(event,'touches',{value:point?[{clientX:point[0],clientY:point[1]}]:[]});target.dispatchEvent(event);}})()`);
  await viewport(375);
  await evaluate(`window.mountTouchWidget('seasons')`);
  await until(`document.querySelector('.tv-season-selection-track')?.scrollWidth > document.querySelector('.tv-season-selection-track')?.clientWidth`, 'Season pills must render a scrollable track');
  await swipe('.tv-season-selection-viewport', [280,100], [50,102]);
  await until(`document.querySelector('.tv-season-selection-track').scrollLeft > 50`, 'Season navigation must preserve horizontal swipe behavior');
  console.log('PASS shared touch helpers preserve season navigation');

  await evaluate(`window.mountTouchWidget('trending')`);
  await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Swipe Film 1'`, 'Trending slider must render');
  await swipe('.trending-carousel-wrapper', [280,100], [50,102]);
  await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Swipe Film 2'`, 'A left swipe must show the next trending film');
  await swipe('.trending-carousel-wrapper', [50,100], [280,102]);
  await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Swipe Film 1'`, 'A right swipe must show the previous trending film');
  await swipe('.trending-carousel-wrapper', [100,100], [102,280]);
  await sleep(100);
  assert.equal(await evaluate(`document.querySelector('.trending-card-active .trending-card-title').textContent`), 'Swipe Film 1');
  console.log('PASS shared touch helpers preserve trending swipe direction and ignore vertical gestures');

  if (process.argv.includes('--live')) {
    const moviePages = new Set();
    const personPages = new Set();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method !== 'Network.requestWillBeSent') return;
      const url = new URL(message.params.request.url);
      if (url.hostname === 'api.themoviedb.org' && url.pathname === '/3/search/movie') moviePages.add(Number(url.searchParams.get('page')));
      if (url.hostname === 'api.themoviedb.org' && url.pathname === '/3/search/person') personPages.add(Number(url.searchParams.get('page')));
    });
    await send('Network.enable');
    await viewport(2048);
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/Cameos/search?q=transform&filter=title` });
    await until(`document.querySelectorAll('main .media-carousel:first-child .media-carousel-item').length > 5 && !document.querySelector('main .carousel-loading')`, 'Live search must load further filtered results');
    await sleep(500);
    const live = await evaluate(`(()=>{const track=document.querySelector('main .media-carousel-track');const cards=[...track.children];return {count:cards.length,available:track.clientWidth,occupied:cards.at(-1).getBoundingClientRect().right-cards[0].getBoundingClientRect().left,scrollLeft:track.scrollLeft,ids:cards.map(card=>card.querySelector('a')?.getAttribute('href'))};})()`);
    assert.ok(live.occupied >= live.available - 1, 'The live carousel must fill the screenshot viewport');
    assert.equal(live.scrollLeft, 0);
    assert.equal(new Set(live.ids).size, live.ids.length);
    console.log('PASS live transform search: ' + JSON.stringify({ ...live, ids: undefined, moviePages: [...moviePages] }));

    await send('Page.navigate', { url: `http://127.0.0.1:${port}/Cameos/search?q=chris&filter=all` });
    const directorSnapshot = `(()=>{const track=document.querySelector('main section[aria-label="Registi"] .cast-carousel-track');if(!track)return null;const cards=[...track.children];const style=getComputedStyle(track);return {count:cards.length,available:track.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0),occupied:cards.at(-1).getBoundingClientRect().right-cards[0].getBoundingClientRect().left,scrollLeft:track.scrollLeft,ids:cards.map(card=>card.querySelector('a')?.getAttribute('href'))};})()`;
    await until(`(()=>{const state=${directorSnapshot};return state && state.occupied >= state.available-1;})()`, 'Live director carousel must fill the screenshot viewport');
    await sleep(500);
    const directors = await evaluate(directorSnapshot);
    assert.ok(directors.occupied >= directors.available - 1);
    assert.equal(directors.scrollLeft, 0);
    assert.equal(new Set(directors.ids).size, directors.ids.length);
    assert.equal(await evaluate(`document.querySelectorAll('main .cast-card-character, main .cast-card-roles-toggle').length`), 0);
    console.log('PASS live chris directors: ' + JSON.stringify({ ...directors, ids: undefined, personPages: [...personPages] }));

    await evaluate(`document.querySelector('main section[aria-label="Registi"] .carousel-navigation button:last-child').click()`);
    await until(`(()=>{const state=${directorSnapshot};return state && state.scrollLeft >= state.available*0.75;})()`, 'The live director next click must reach the next viewport');
    await sleep(500);
    const nextDirectors = await evaluate(directorSnapshot);
    assert.ok(nextDirectors.scrollLeft < nextDirectors.available * 1.25);
    console.log('PASS live director first next click: ' + JSON.stringify({ count: nextDirectors.count, scrollLeft: nextDirectors.scrollLeft, available: nextDirectors.available }));
  }
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (chrome?.pid) {
    chrome.kill();
    await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(2000)]);
  }
  await server.close();
  // Remove only the unique test profile created above, within the OS temporary directory.
  assert.equal(resolve(profile, '..'), resolve(tmpdir()));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
