import test from "node:test";
import assert from "node:assert/strict";
import { getHomeLayout } from "../src/features/home/home-layout.ts";
test("Home keeps a one-third header and readable two/three-row grids without resizing its cards", () => {
  for (const height of [640, 740, 800, 874, 932, 1024, 1200]) for (const fontScale of [1, 1.2, 1.3, 1.5]) for (const preview of [false, true]) {
    const top=height===640?24:62, bottom=111;
    const layout=getHomeLayout({height,top,bottom,fontScale,preview});
    const {rows,tileHeight,cardHeight,headingHeight,gridPadding,gridLabelHeight,ctaHeight,gap,rowGap,headerHeight}=layout;
    const used=headerHeight+rows*tileHeight+(rows-1)*rowGap+cardHeight+headingHeight+8+gridPadding*2+gridLabelHeight+ctaHeight+gap*4+(preview?Math.ceil(16*Math.max(1,fontScale))+gap:0);
    assert.ok(Math.abs(headerHeight+top-height/3)<0.001, "Header keeps one-third of screen");
    assert.ok(rows===2||rows===3);
    assert.equal(layout.iconTileSize,48);
    assert.ok(gap>=8 && gap<=16);
    assert.equal(gridPadding,layout.compact ? 8 : 14);
    assert.ok(tileHeight>=48+4+Math.ceil(28*Math.max(1,fontScale)), "Icons and two-line labels fit");
    assert.equal(layout.scrollRequired,used>height-top-bottom+0.5,"Only tiny/accessibility layouts need the compact-screen fallback");
    assert.equal(cardHeight,112);
    assert.equal(ctaHeight,64);
  }
  for (const preview of [false,true]) assert.equal(getHomeLayout({height:874,top:62,bottom:111,fontScale:1,preview}).scrollRequired,false);
  assert.equal(getHomeLayout({height:874,top:62,bottom:111,fontScale:1,preview:false}).rows,2);
  assert.equal(getHomeLayout({height:1024,top:62,bottom:111,fontScale:1,preview:false}).rows,2);
  assert.equal(getHomeLayout({height:1200,top:62,bottom:111,fontScale:1,preview:false}).rows,3);
});
