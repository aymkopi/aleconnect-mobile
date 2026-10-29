package expo.modules.consumermaps

import java.io.IOException
import java.net.InetAddress
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.*
import org.junit.Test

class MapDownloadGuardTest {
 private class Store(var bytes: Long = 0, var tiles: Int = 0): DownloadBudgetStore {
  override fun load(area: String) = Pair(bytes, tiles)
  override fun save(area: String, usedBytes: Long, usedTiles: Int): Boolean { bytes = usedBytes; tiles = usedTiles; return true }
 }
 private fun url(server: MockWebServer, path: String) = server.url(path).newBuilder().host("127.0.0.1").build()
 @Test fun wifiRequirementRemainsNativeAfterConnectivityChanges() {
  var wifi = true
  val guard = MapDownloadGuard(Store(), true, networkAllowed = { wifi })
  guard.begin("area", doubleArrayOf(-.001, -.001, .001, .001), "file:///documents/albay.json")
  guard.addResources(listOf("http://127.0.0.1/style"), emptyList(), emptyList())
  guard.checkRequest("http://127.0.0.1/style")
  wifi = false
  try { guard.checkRequest("http://127.0.0.1/style"); fail("Cellular transfer without consent") } catch (_: IOException) {}
 }
 private fun guard(store: Store, server: MockWebServer, maxBytes: Long = 50_000_000): MapDownloadGuard {
  val guard = MapDownloadGuard(store, true)
  guard.begin("area", doubleArrayOf(-.001, -.001, .001, .001), "file:///documents/albay.json", maxBytes)
  guard.addResources(listOf(url(server, "/style").toString()), listOf(url(server, "/tile/{z}/{x}/{y}.pbf").toString()), emptyList())
  return guard
 }
 @Test fun fullDetailBoundsAndUniqueIdentityAreEnforcedBeforeTransfer() {
  MockWebServer().use { server ->
   server.start(InetAddress.getByName("127.0.0.1"), 0)
   val store = Store(); val guard = guard(store, server)
   val client = OkHttpClient.Builder().addInterceptor(guard).build()
   server.enqueue(MockResponse().setBody("tile"))
   client.newCall(Request.Builder().url(url(server, "/tile/9/256/256.pbf")).build()).execute().use { assertEquals("tile", it.body!!.string()) }
   assertTrue(server.takeRequest().getHeader("User-Agent")!!.startsWith("ALEConnect-Mobile/"))
   for (path in listOf("/tile/8/128/128.pbf", "/tile/14/0/0.pbf", "/other")) {
    try { client.newCall(Request.Builder().url(url(server, path)).build()).execute(); fail("Out-of-scope transfer") } catch (_: IOException) {}
   }
   assertEquals(1, server.requestCount); assertEquals(1, store.tiles)
  }
 }
 @Test fun unknownLengthChunksRemainWithinDurableByteBudgetAcrossResume() {
  MockWebServer().use { server ->
   server.start(InetAddress.getByName("127.0.0.1"), 0)
   val store = Store(); val guard = guard(store, server, 16_384)
   server.enqueue(MockResponse().setChunkedBody("x".repeat(30_000), 3000))
   try { OkHttpClient.Builder().addInterceptor(guard).build().newCall(Request.Builder().url(url(server, "/style")).build()).execute(); fail("Budget overflow") } catch (_: IOException) {}
   assertTrue(store.bytes in 8193..16_384)
   guard.end("area")
   val restored = guard(store, server, 16_384)
   try { OkHttpClient.Builder().addInterceptor(restored).build().newCall(Request.Builder().url(url(server, "/style")).build()).execute(); fail("Original budget must survive resume") } catch (_: IOException) {}
   assertEquals(1, server.requestCount)
  }
 }
 @Test fun fourTransferCapAndBackgroundCancellationApplyNatively() {
  MockWebServer().use { server ->
   server.start(InetAddress.getByName("127.0.0.1"), 0)
   val guard = guard(Store(), server); val active = AtomicInteger(); val peak = AtomicInteger()
   server.dispatcher = object: okhttp3.mockwebserver.Dispatcher() {
    override fun dispatch(request: okhttp3.mockwebserver.RecordedRequest): MockResponse {
     val count = active.incrementAndGet(); peak.updateAndGet { maxOf(it, count) }
     Thread.sleep(30); active.decrementAndGet(); return MockResponse().setBody("style")
    }
   }
   val client = OkHttpClient.Builder().addInterceptor(guard).build(); val pool = Executors.newFixedThreadPool(8)
   val work = (0..7).map { pool.submit { client.newCall(Request.Builder().url(url(server, "/style")).build()).execute().close() } }
   work.forEach { it.get(10, TimeUnit.SECONDS) }; pool.shutdownNow(); assertTrue(peak.get() <= 4)
   guard.setForeground(false)
   try { guard.checkRequest(url(server, "/style").toString()); fail("Background transfer") } catch (_: IOException) {}
  }
 }
}
