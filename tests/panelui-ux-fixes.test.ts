import test from "node:test";
import assert from "node:assert/strict";
import { consumerTicketStatusColors } from "../src/features/reports/status.ts";
import { normalizeUnreadReportNotificationIds } from "../src/features/reports/data.ts";
import { encodeQr } from "../src/components/panelui/qr-encode.ts";

test("canonical status colors are distinct and readable in both themes", () => {
  const statuses = ["under_review", "verified", "dispatched", "in_progress", "resolved", "rejected"];
  const luminance = (hex: string) => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
    .map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4)
    .reduce((sum,v,i) => sum + v*[.2126,.7152,.0722][i],0);
  for (const dark of [false,true]) {
    const colors = statuses.map(status => consumerTicketStatusColors(status,dark));
    assert.equal(new Set(colors.map(c => c.background)).size, statuses.length);
    for (const { background, foreground } of colors) {
      const a=luminance(background),b=luminance(foreground);
      assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);
    }
  }
});

test("unread report metadata safely accepts legacy, malformed and bounded payloads", () => {
  for (const value of [undefined,null,{}, "notification"]) assert.deepEqual(normalizeUnreadReportNotificationIds(value),[]);
  assert.deepEqual(normalizeUnreadReportNotificationIds(["one","one",42,"","x".repeat(37),"two"]),["one","two"]);
  assert.equal(normalizeUnreadReportNotificationIds(Array.from({length:150},(_,i)=>String(i))).length,100);
});

test("PanelUI QR encoder renders an account identifier with a standard square matrix", () => {
  const qr=encodeQr("10004821",{errorCorrection:"M"});
  assert.equal(qr.modules.length,qr.size);
  assert.ok(qr.modules.every(row=>row.length===qr.size));
  assert.ok(qr.size>=21 && (qr.size-17)%4===0);
});
