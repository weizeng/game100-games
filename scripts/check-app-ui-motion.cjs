// Browser-only motion/interaction checks. Never compiles or starts the Android app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname,'..');
  fs.mkdirSync(path.join(root,'.artifacts'),{recursive:true});
  const browser = await chromium.launch({headless:true,
    ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:1100}});
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root,'docs/app-ui-preview.html')).href);
    await page.waitForSelector('.featured.stage-visible');
    await page.waitForTimeout(650); // Let the orchestrated page entrance settle first.
    // Check real computed animation movement, rather than just the presence of CSS.
    const first = await page.locator('.orbit').first().evaluate(el=>getComputedStyle(el).transform);
    await page.waitForTimeout(160);
    const second = await page.locator('.orbit').first().evaluate(el=>getComputedStyle(el).transform);
    assert.notEqual(first,second,'The orbit should move while visible');
    const hero = await page.locator('#featured').boundingBox();
    await page.mouse.move(hero.x+hero.width*.8,hero.y+hero.height*.25);
    await page.mouse.down();
    await page.waitForTimeout(140);
    assert.ok((await page.locator('#featured').evaluate(el=>getComputedStyle(el).transform)).startsWith('matrix3d'),'Featured card tilts toward the touch');
    await page.mouse.up();
    await page.waitForTimeout(420);
    assert.equal(await page.locator('#featured').evaluate(el=>getComputedStyle(el).transform),'none','Card settles after releasing');
    await page.waitForTimeout(1200);
    await page.screenshot({path:path.join(root,'.artifacts/app-ui-motion-desktop.png'),fullPage:true});
    await page.getByRole('button',{name:'精品',exact:true}).click();
    assert.equal(await page.locator('#discovery').isVisible(),false);
    await page.getByRole('button',{name:'全部',exact:true}).click();
    await page.locator('#query').fill('zzzz-no-game');
    assert.equal(await page.locator('.game-row').count(),0);
    await page.getByRole('button',{name:'查看全部游戏',exact:true}).click();
    assert.ok(await page.locator('.game-row').count()>0);
    await page.locator('#favorite').click();
    assert.equal(await page.locator('#favorite').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.heart-spark').count(),8,'Favorite addition emits one burst');
    await page.waitForTimeout(650);
    assert.equal(await page.locator('.heart-spark').count(),0,'Burst nodes must be removed');
    await page.locator('#favorite').click();
    assert.equal(await page.locator('.heart-spark').count(),0,'Removing a favorite has no celebration');
    await page.getByRole('button',{name:'评为4星',exact:true}).click();
    assert.equal(await page.locator('#rating-note').textContent(),'你的评分：4 星');
    assert.equal(await page.locator('#rating button').evaluateAll(els=>els.filter(el=>el.textContent==='★').length),4);
    await page.getByRole('button',{name:'精品',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#featured').classList.contains('stage-visible'));
    await page.getByRole('button',{name:'全部',exact:true}).click();
    await page.waitForSelector('.featured.stage-visible');

    // Changing the OS preference during a running session stops both CSS and JS motion.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForTimeout(50);
    assert.equal(await page.locator('.orbit').first().evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.locator('#favorite').click();
    await page.getByRole('button',{name:'评为5星',exact:true}).click();
    assert.equal(await page.locator('.heart-spark').count(),0);
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    assert.equal(await page.locator('#favorite').getAttribute('aria-pressed'),'true');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForSelector('.featured.stage-visible');

    for(const width of [320,390]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.waitForTimeout(500);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow at '+width);
      await page.locator('#query').fill('2048');
      assert.equal(await page.locator('.game-row').count(),1);
      await page.locator('#query').fill('');
    }
    await page.screenshot({path:path.join(root,'.artifacts/app-ui-motion-mobile.png'),fullPage:true});
    assert.deepEqual(errors,[],'No browser errors');
    console.log('Passed: moving orbit, filters, search/reset, favorite burst cleanup, rating, offscreen pause, reduced motion, 320/390/1280 widths. No Android compilation.');
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
