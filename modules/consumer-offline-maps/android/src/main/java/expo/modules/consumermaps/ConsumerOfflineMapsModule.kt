package expo.modules.consumermaps

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.IOException
import java.net.URI
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import okhttp3.Dispatcher
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import org.maplibre.android.MapLibre
import org.maplibre.android.module.http.HttpRequestUtil
import org.maplibre.android.offline.OfflineManager
import org.maplibre.android.offline.OfflineRegion

class ConsumerOfflineMapsModule: Module() {
 private lateinit var guard: MapDownloadGuard
 private lateinit var client: OkHttpClient
 private var installed = false
 @Volatile private var foreground = true
 @Volatile private var mobileDataAllowed = false
 private fun pausePacks(complete: (Exception?) -> Unit) {
  val context = appContext.reactContext ?: return complete(IOException("Map context is unavailable."))
  Handler(Looper.getMainLooper()).post {
   try {
    MapLibre.getInstance(context)
    OfflineManager.getInstance(context).listOfflineRegions(object: OfflineManager.ListOfflineRegionsCallback {
     override fun onList(regions: Array<OfflineRegion>?) {
      try {
       for (region in regions.orEmpty()) {
        val metadata = JSONObject(JSONObject(String(region.metadata)).optString("metadata", "{}"))
        if (metadata.optString("app") == "aleconnect-mobile") region.setDownloadState(OfflineRegion.STATE_INACTIVE)
       }
       complete(null)
      } catch (error: Exception) { complete(error) }
     }
     override fun onError(error: String) { complete(IOException(error)) }
    })
   } catch (error: Exception) { complete(error) }
  }
 }
 private fun suspend() {
  foreground = false
  if (!::client.isInitialized) return
  guard.setForeground(false)
  client.dispatcher.cancelAll()
  pausePacks { error -> if (error == null && foreground) guard.allowOnline() }
 }
 @Synchronized private fun install() {
  if (installed) return
  val context = appContext.reactContext ?: throw IOException("Map context is unavailable.")
  val prefs = context.getSharedPreferences("consumer-offline-map-budgets-v1", Context.MODE_PRIVATE)
  guard = MapDownloadGuard(object: DownloadBudgetStore {
   override fun load(area: String) = Pair(prefs.getLong("bytes:$area", 0), prefs.getInt("tiles:$area", 0))
   override fun save(area: String, usedBytes: Long, usedTiles: Int) = prefs.edit().putLong("bytes:$area", usedBytes).putInt("tiles:$area", usedTiles).commit()
  }, networkAllowed = {
   val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
   val network = connectivity.getNetworkCapabilities(connectivity.activeNetwork)
   network != null && (mobileDataAllowed || network.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))
  })
  val dispatcher = Dispatcher().apply { maxRequests = 4; maxRequestsPerHost = 4 }
  client = OkHttpClient.Builder().dispatcher(dispatcher).followRedirects(false).followSslRedirects(false).addInterceptor(guard).build()
  guard.setForeground(foreground)
  guard.suspendDownloads()
  HttpRequestUtil.setOkHttpClient(client)
  val paused = CountDownLatch(1)
  var failure: Exception? = null
  pausePacks { error -> failure = error; paused.countDown() }
  if (!paused.await(10, TimeUnit.SECONDS) || failure != null) throw IOException("Saved maps could not be paused safely.", failure)
  if (foreground) guard.allowOnline()
  installed = true
 }
 private fun json(url: String): JSONObject {
  client.newCall(Request.Builder().url(url).build()).execute().use { response ->
   if (!response.isSuccessful) throw IOException("Map source is unavailable.")
   val body = response.body ?: throw IOException("Map source is empty.")
   val source = body.source()
   if (!source.request(512_001) || source.buffer.size <= 512_000) return JSONObject(source.readUtf8())
   throw IOException("Map source metadata is too large.")
  }
 }
 override fun definition() = ModuleDefinition {
  Name("ConsumerOfflineMaps")
  OnActivityEntersBackground { suspend() }
  OnActivityEntersForeground { foreground = true; if (::guard.isInitialized) { guard.setForeground(true); guard.allowOnline() } }
  OnDestroy { suspend() }
  AsyncFunction("capabilities") { install(); mapOf("version" to 1, "platform" to "android") }
  AsyncFunction("prepare") { options: Map<String, Any> ->
   install()
   val context = appContext.reactContext ?: throw IOException("Map context is unavailable.")
   val area = options["areaId"] as String
   val bounds = (options["bounds"] as List<*>).map { (it as Number).toDouble() }.toDoubleArray()
   val styleUrl = options["styleUrl"] as String
   mobileDataAllowed = options["mobileData"] == true
   val styleFile = File(URI(styleUrl)).canonicalFile
   if (!styleFile.path.startsWith(context.filesDir.canonicalPath + File.separator) || styleFile.length() > 512_000) throw IOException("Map style must be owned by this app.")
   val ticket = guard.claim(area)
   try {
    val ready = guard.begin(area, bounds, styleUrl, expected = ticket)
    val style = JSONObject(styleFile.readText())
    val sprite = style.getString("sprite")
    val sources = style.getJSONObject("sources")
    val resources = listOf(".json", ".png", "@2x.json", "@2x.png").map { sprite + it }.toMutableList()
    for (key in sources.keys()) {
     val source = sources.getJSONObject(key)
     if (source.getString("type") != "vector") throw IOException("Unsupported offline map source.")
     if (source.has("url")) resources.add(source.getString("url"))
    }
    guard.addResources(resources, emptyList(), listOf(style.getString("glyphs")))
    val templates = mutableListOf<String>()
    for (key in sources.keys()) {
     val source = sources.getJSONObject(key)
     if (source.has("url")) {
      val metadata = json(source.getString("url"))
      if (metadata.getInt("maxzoom") != 14) throw IOException("Map source detail changed. Update the app before downloading.")
      source.remove("url")
      for (field in listOf("tiles", "minzoom", "maxzoom", "attribution", "bounds", "scheme")) if (metadata.has(field)) source.put(field, metadata.get(field))
     }
     val tiles = source.getJSONArray("tiles")
     for (index in 0 until tiles.length()) templates.add(tiles.getString(index))
    }
    guard.addResources(emptyList(), templates, emptyList())
    val temporary = File(styleFile.parentFile, styleFile.name + ".tmp")
    temporary.writeText(style.toString())
    if (!temporary.renameTo(styleFile)) throw IOException("Map style could not be saved.")
    guard.assertReady(ready)
    mapOf("ready" to true)
   } catch (error: Exception) { guard.end(area); client.dispatcher.cancelAll(); throw error }
  }
  AsyncFunction("stop") { area: String? -> install(); if (guard.ownsLease(area)) { guard.end(area); client.dispatcher.cancelAll() } }
  AsyncFunction("finish") { area: String -> install(); guard.finish(area); if (foreground) guard.allowOnline() }
  AsyncFunction("status") { install(); mapOf("blockedReason" to guard.blockedReason) }
 }
}
