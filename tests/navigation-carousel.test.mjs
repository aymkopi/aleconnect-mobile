import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('Home carousel uses screen-edge track, 24px gaps, equal-height cards, no indicators and 3-second autoplay',async()=>{
 const source=await read('src/features/home/home-screen.tsx');
 assert.ok(source.includes('gap={24}'));
 assert.ok(source.includes('autoplayInterval={3000}'));
 assert.ok(source.includes('itemSize={width - 32}'));
 assert.ok(source.includes('height={carouselCardHeight}'));
 assert.ok(!source.includes('cardHeights'));
 assert.ok(!source.includes('<Carousel.Dots'));
});
test('list cards get exactly one compact separator instead of duplicated list gap',async()=>{
 for(const path of ['reports/main-screen','advisories/advisories-screen']) {
 const source=await read('src/features/'+path+'.tsx');
 const style=source.slice(source.indexOf('contentContainerStyle={{'),source.indexOf('ListHeaderComponent='));
 assert.ok(source.includes('ItemSeparatorComponent={() => <View style={{ height: 8 }} />}'));
 assert.ok(!style.includes('gap: 12'));
 }
});
