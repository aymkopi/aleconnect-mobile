package expo.modules.consumermaps

import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.ResponseBody
import okio.Buffer
import okio.BufferedSource
import okio.ForwardingSource
import okio.buffer
import java.util.concurrent.atomic.AtomicBoolean
import okhttp3.ResponseBody.Companion.asResponseBody
import java.io.IOException
import java.util.concurrent.Semaphore
import kotlin.math.*

interface DownloadBudgetStore {
 fun load(area:String):Pair<Long,Int>
 fun save(area:String,usedBytes:Long,usedTiles:Int):Boolean
}
class MapDownloadGuard(private val store:DownloadBudgetStore,private val allowLoopback:Boolean=false,private val networkAllowed:()->Boolean={true}):Interceptor {
 companion object {const val MAX_BYTES=50_000_000L;const val READ_CHUNK_BYTES=8192L;const val MAX_TILES=3000;const val USER_AGENT="ALEConnect-Mobile/1.0 (offline-maps; Android)"}
 private data class Policy(val area:String,val bounds:DoubleArray,val maxBytes:Long,val maxTiles:Int,val generation:Long,
  var bytes:Long,var tiles:Int,val resources:MutableSet<String>,val tileTemplates:MutableList<String>,val glyphs:MutableList<String>)
 private var policy:Policy?=null
 private var generation=0L
 private var foreground=true
 private var suspended=false
 private var leaseArea:String?=null
 private val requests=Semaphore(4,true)
 @Volatile var blockedReason:String?=null;private set
 @Synchronized fun claim(area:String):Long {
  if(!foreground)throw IOException("Return to the app before downloading maps.")
  if(policy!=null||leaseArea!=null)throw IOException("Pause the current map download first.")
  leaseArea=area;return ++generation
 }
 @Synchronized fun assertReady(token:Long){if(!foreground||suspended||policy?.generation!=token)throw IOException("Map download paused.")}
 @Synchronized fun setForeground(value:Boolean){foreground=value;if(!value)suspendDownloads()}
 @Synchronized fun begin(area:String,bounds:DoubleArray,styleUrl:String,maxBytes:Long=MAX_BYTES,maxTiles:Int=MAX_TILES,expected:Long?=null):Long {
  require(area.matches(Regex("[A-Za-z0-9-]{1,80}")))
  require(bounds.size==4&&bounds.all{it.isFinite()}&&bounds[0]>=-180&&bounds[2]<=180&&bounds[1]>=-85&&bounds[3]<=85&&bounds[0]<bounds[2]&&bounds[1]<bounds[3])
  require(maxBytes in 1..MAX_BYTES&&maxTiles in 1..MAX_TILES)
  if(!foreground)throw IOException("Return to the app before downloading maps.")
  if(expected!=null){if(expected!=generation||leaseArea!=area||policy!=null)throw IOException("Map preparation was cancelled.")}
  else if(policy!=null||leaseArea!=null)throw IOException("Pause the current map download first.")
  require(styleUrl.startsWith("file://"))
  val (bytes,tiles)=store.load(area);if(bytes<0||tiles<0)throw IOException("Saved map quota is invalid.")
  policy=Policy(area,bounds.copyOf(),maxBytes,maxTiles,++generation,bytes,tiles,mutableSetOf(styleUrl),mutableListOf(),mutableListOf());blockedReason=null;suspended=false;leaseArea=area
  return generation
 }
 @Synchronized fun addResources(resources:List<String>,tiles:List<String>,glyphs:List<String>) {
  val p=policy?:throw IOException("Map download paused.")
  (resources+tiles+glyphs).forEach{validateResource(it)}
  p.resources.addAll(resources);p.tileTemplates.addAll(tiles);p.glyphs.addAll(glyphs)
 }
 private fun validateResource(value:String) {
  val url=value.toHttpUrlOrNull()?:throw IOException("Unsupported map resource.")
  val test=allowLoopback&&url.host in listOf("127.0.0.1","localhost")
  if(!test&&(url.scheme!="https"||url.host !in listOf("aleconnect.app","api.aleconnect.app","tiles.openfreemap.org")))throw IOException("Unapproved map resource host.")
  if(url.username.isNotEmpty()||url.password.isNotEmpty())throw IOException("Private map resource is not allowed.")
 }
 private fun templateMatch(template:String,url:String):Pair<List<String>,MatchResult?> {
  val normalized=template.replace("%7B","{",true).replace("%7D","}",true)
  val pattern=Regex("\\{(z|x|y|fontstack|range)\\}")
  val keys=mutableListOf<String>();val expression=StringBuilder("^");var at=0
  for(match in pattern.findAll(normalized)) {
   expression.append(Regex.escape(normalized.substring(at,match.range.first)))
   val key=match.groupValues[1];keys.add(key);expression.append(when(key){"fontstack"->"([^/?]+)";"range"->"(\\d+-\\d+)";else->"(\\d+)"});at=match.range.last+1
  }
  expression.append(Regex.escape(normalized.substring(at))).append("$")
  return Pair(keys,Regex(expression.toString()).matchEntire(url))
 }
 @Synchronized fun checkRequest(url:String):Long {
  val p=policy?:throw IOException("Map download paused.")
  if(!networkAllowed())throw blocked("Connect to Wi-Fi or allow mobile data, then resume the Albay map.")
  var tile=false
  if(url !in p.resources) {
   for(template in p.tileTemplates) {
    val (keys,match)=templateMatch(template,url);if(match==null)continue
    fun coordinate(key:String)=match.groupValues.getOrNull(keys.indexOf(key)+1)?.toIntOrNull()?:-1
    val z=coordinate("z");val x=coordinate("x");val y=coordinate("y")
    if(z !in 9..14)throw blocked("Map tile is outside zoom levels 9–14.")
    val n=2.0.pow(z)
    fun tx(lon:Double)=floor((lon+180)/360*n).toInt().coerceIn(0,n.toInt()-1)
    fun ty(lat:Double)=floor((1-asinh(tan(lat*PI/180))/PI)/2*n).toInt().coerceIn(0,n.toInt()-1)
    if(x !in tx(p.bounds[0])..tx(p.bounds[2])||y !in ty(p.bounds[3])..ty(p.bounds[1]))throw blocked("Map tile is outside the selected area.")
    tile=true;break
   }
   if(!tile&&!p.glyphs.any{templateMatch(it,url).second!=null})throw blocked("Map resource is outside the approved style.")
  }
  if(tile) {
   if(p.tiles>=p.maxTiles)throw blocked("Map tile limit reached. The original area remains paused.")
   if(!store.save(p.area,p.bytes,p.tiles+1))throw blocked("Map quota could not be saved.")
   p.tiles++
  }
  return p.generation
 }
 private fun blocked(message:String):IOException {blockedReason=message;return IOException(message)}
 @Synchronized private fun reserve(generation:Long,length:Long) {
  val p=policy
  if(p==null||p.generation!=generation)throw IOException("Map download paused.")
  if(!networkAllowed())throw blocked("Connect to Wi-Fi or allow mobile data, then resume the Albay map.")
  if(length<0)throw blocked("Map server did not provide a bounded resource length.")
  if(length>p.maxBytes-p.bytes)throw blocked("Map byte limit reached. The original area remains paused.")
  if(!store.save(p.area,p.bytes+length,p.tiles))throw blocked("Map quota could not be saved.")
  p.bytes+=length
 }
 @Synchronized private fun settle(generation:Long,reserved:Long,used:Long) {
  val p=policy
  if(p==null||p.generation!=generation)throw IOException("Map download paused.")
  require(used in 0..reserved)
  val next=p.bytes-(reserved-used)
  if(next!=p.bytes&&!store.save(p.area,next,p.tiles))throw blocked("Map quota could not be saved.")
  p.bytes=next
 }
 @Synchronized private fun checkLength(generation:Long,length:Long) {
  val p=policy
  if(p==null||p.generation!=generation)throw IOException("Map download paused.")
  if(length>=0&&length>p.maxBytes-p.bytes+READ_CHUNK_BYTES)throw blocked("Map byte limit reached. The original area remains paused.")
 }
 @Synchronized fun end(area:String?) {
  if(area==null||policy?.area==area||leaseArea==area){leaseArea=policy?.area?:leaseArea;policy=null;suspended=true;generation++}
 }
 @Synchronized fun suspendDownloads(){leaseArea=policy?.area?:leaseArea;policy=null;suspended=true;generation++}
 @Synchronized fun finish(area:String){if(policy==null&&leaseArea==area)leaseArea=null}
 @Synchronized fun allowOnline(){if(foreground&&policy==null&&leaseArea==null)suspended=false}
 @Synchronized fun ownsLease(area:String?)=area==null||policy?.area==area||leaseArea==area
 @Synchronized fun activeArea()=policy?.area
 override fun intercept(chain:Interceptor.Chain):Response {
  requests.acquire()
  var release=true
  try {
   val request=chain.request().newBuilder().header("User-Agent",USER_AGENT).header("Accept-Encoding","identity").build()
   val requestGeneration=synchronized(this){
    if(suspended)throw IOException("Map downloads are paused.")
    if(policy!=null)checkRequest(request.url.toString())else null
   }
   if(requestGeneration!=null)reserve(requestGeneration,READ_CHUNK_BYTES)
   val response=chain.proceed(request)
   if(requestGeneration==null) {
    val body=response.body?:return response
    val closed=AtomicBoolean(false)
    fun finishBody(){if(closed.compareAndSet(false,true))requests.release()}
    val source=object:ForwardingSource(body.source()){
     override fun read(sink:Buffer,byteCount:Long):Long {
      try{return super.read(sink,byteCount).also{if(it<0)finishBody()}}catch(error:Exception){finishBody();throw error}
     }
     override fun close(){try{super.close()}finally{finishBody()}}
    }.buffer()
    release=false
    return response.newBuilder().body(object:ResponseBody(){
     override fun contentType()=body.contentType()
     override fun contentLength()=body.contentLength()
     override fun source():BufferedSource=source
    }).build()
   }
   try {
    if(response.code !in listOf(200,304))throw blocked("Map server returned an unavailable resource ("+response.code+").")
    if(response.header("Content-Encoding")?.lowercase() !in listOf(null,"identity"))throw blocked("Map server returned an unbounded encoded resource.")
    val body=response.body?:throw blocked("Map resource is empty.")
    val length=body.contentLength()
    checkLength(requestGeneration,length)
    val contentType=body.contentType()
    val buffer=Buffer()
    var received=0L
    val source=body.source()
    while(true) {
     val count=if(length==0L)-1L else source.read(buffer,READ_CHUNK_BYTES)
     if(count<0&&length>=0&&received!=length)throw blocked("Map resource length changed during download.")
     val used=maxOf(0L,count)
     received+=used
     // Reserve one Okio read before fetching; cancellation keeps any outstanding reservation.
     settle(requestGeneration,READ_CHUNK_BYTES,used)
     if(count<0||(length>=0&&received==length))break
     reserve(requestGeneration,READ_CHUNK_BYTES)
    }
    source.close()
    synchronized(this){if(policy?.generation!=requestGeneration)throw IOException("Map download paused.")}
    return response.newBuilder().body(buffer.asResponseBody(contentType,received)).build()
   }catch(error:Exception){chain.call().cancel();response.close();throw error}
  }finally{if(release)requests.release()}
 }
}
