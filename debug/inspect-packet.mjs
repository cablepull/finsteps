import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:5173/examples/packet/');
await page.waitForSelector('svg', { timeout: 5000 });
await page.waitForTimeout(1000);

const svgContent = await page.evaluate(() => {
  const svg = document.querySelector('svg');
  const texts = Array.from(svg.querySelectorAll('text'));
  const groups = Array.from(svg.querySelectorAll('g[id]'));
  const dataIds = Array.from(svg.querySelectorAll('[data-id]'));
  
  return {
    textElements: texts.slice(0, 20).map(t => ({
      text: t.textContent,
      id: t.id,
      class: t.className.baseVal,
      parent: t.parentElement?.tagName + (t.parentElement?.id ? '#' + t.parentElement.id : '')
    })),
    groupsWithIds: groups.slice(0, 20).map(g => ({
      id: g.id,
      class: g.className.baseVal,
      children: g.children.length
    })),
    dataIdElements: dataIds.slice(0, 20).map(el => ({
      dataId: el.getAttribute('data-id'),
      tag: el.tagName,
      class: el.className.baseVal
    }))
  };
});

console.log('=== Packet SVG Structure ===');
console.log('\nText elements:');
console.log(JSON.stringify(svgContent.textElements, null, 2));
console.log('\nGroups with IDs:');
console.log(JSON.stringify(svgContent.groupsWithIds, null, 2));
console.log('\nElements with data-id:');
console.log(JSON.stringify(svgContent.dataIdElements, null, 2));

await browser.close();
