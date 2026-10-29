#import "ConsumerMapNetwork.h"
#import <objc/message.h>
#import <math.h>
#import <CFNetwork/CFNetwork.h>

@protocol ConsumerMapStyleStorage <NSObject>
- (void)preloadData:(NSData *)data forURL:(NSURL *)url modificationDate:(NSDate *)modified
    expirationDate:(NSDate *)expires eTag:(NSString *)eTag mustRevalidate:(BOOL)mustRevalidate
    completionHandler:(void (^)(NSURL *, NSError *))completion;
@end

static const int64_t MaxBytes = 50000000;
static const NSUInteger MaxTiles = 3000;
static NSMutableDictionary *policy;
static NSString *lease;
static NSString *blocked;
static BOOL foreground = YES, suspended = YES, installed = NO;
static BOOL mobileDataAllowed = NO;
static NSUInteger generation = 0;
static NSOperationQueue *transfers;
static NSHashTable *requests;

static NSError *Failure(NSString *message) { return [NSError errorWithDomain:@"ConsumerOfflineMaps" code:1 userInfo:@{NSLocalizedDescriptionKey: message}]; }
static NSUserDefaults *Budgets(void) { return [[NSUserDefaults alloc] initWithSuiteName:@"consumer-offline-map-budgets-v1"]; }
static id Shared(NSString *className, NSString *selector) {
  Class cls = NSClassFromString(className);
  SEL method = NSSelectorFromString(selector);
  return cls && [cls respondsToSelector:method] ? ((id (*)(id, SEL))objc_msgSend)(cls, method) : nil;
}
static void PausePacks(void) {
  dispatch_async(dispatch_get_main_queue(), ^{
    id storage = Shared(@"MLNOfflineStorage", @"sharedOfflineStorage");
    for (id pack in [storage valueForKey:@"packs"]) {
      NSData *context = [pack valueForKey:@"context"];
      NSString *encoded = [NSKeyedUnarchiver unarchivedObjectOfClass:NSString.class fromData:context error:nil];
      NSDictionary *envelope = encoded ? [NSJSONSerialization JSONObjectWithData:[encoded dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil] : nil;
      NSString *metadata = envelope[@"metadata"];
      NSDictionary *scope = [metadata isKindOfClass:NSString.class] ? [NSJSONSerialization JSONObjectWithData:[metadata dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil] : nil;
      if ([scope[@"app"] isEqual:@"aleconnect-mobile"] && [[pack valueForKey:@"state"] integerValue] == 2 && [pack respondsToSelector:@selector(suspend)]) ((void (*)(id, SEL))objc_msgSend)(pack, @selector(suspend));
    }
  });
}
static BOOL Approved(NSString *value) {
  if (![value isKindOfClass:NSString.class]) return NO;
  NSURL *url = [NSURL URLWithString:[[value stringByReplacingOccurrencesOfString:@"{" withString:@"%7B"] stringByReplacingOccurrencesOfString:@"}" withString:@"%7D"]];
  return [url.scheme isEqual:@"https"] && [url.host isEqual:@"tiles.openfreemap.org"] && !url.user && !url.password;
}
static NSDictionary *MatchTemplate(NSString *template, NSString *value) {
  NSString *normalized = [template stringByRemovingPercentEncoding] ?: template;
  NSRegularExpression *tokens = [NSRegularExpression regularExpressionWithPattern:@"\\{(z|x|y|fontstack|range)\\}" options:0 error:nil];
  NSMutableString *pattern = [NSMutableString stringWithString:@"^"];
  NSMutableArray *keys = [NSMutableArray array];
  NSUInteger offset = 0;
  for (NSTextCheckingResult *token in [tokens matchesInString:normalized options:0 range:NSMakeRange(0, normalized.length)]) {
    [pattern appendString:[NSRegularExpression escapedPatternForString:[normalized substringWithRange:NSMakeRange(offset, token.range.location - offset)]]];
    NSString *key = [normalized substringWithRange:[token rangeAtIndex:1]];
    [keys addObject:key];
    [pattern appendString:[key isEqual:@"fontstack"] ? @"([^/?]+)" : [key isEqual:@"range"] ? @"(\\d+-\\d+)" : @"(\\d+)"];
    offset = NSMaxRange(token.range);
  }
  [pattern appendString:[NSRegularExpression escapedPatternForString:[normalized substringFromIndex:offset]]];
  [pattern appendString:@"$"];
  NSTextCheckingResult *match = [[NSRegularExpression regularExpressionWithPattern:pattern options:0 error:nil] firstMatchInString:value options:0 range:NSMakeRange(0, value.length)];
  if (!match) return nil;
  NSMutableDictionary *result = [NSMutableDictionary dictionary];
  for (NSUInteger i = 0; i < keys.count; i++) result[keys[i]] = [value substringWithRange:[match rangeAtIndex:i + 1]];
  return result;
}
static NSInteger TileX(double longitude, double n) { return floor((longitude + 180) / 360 * n); }
static NSInteger TileY(double latitude, double n) { return floor((1 - asinh(tan(latitude * M_PI / 180)) / M_PI) / 2 * n); }

@interface ConsumerMapProtocol : NSURLProtocol
@property(nonatomic, strong) NSBlockOperation *operation;
@property(nonatomic) CFReadStreamRef stream;
@property(nonatomic) NSUInteger token;
@property(nonatomic) BOOL counted;
@property(nonatomic) BOOL timedOut;
@end

@implementation ConsumerMapProtocol
+ (BOOL)canInitWithRequest:(NSURLRequest *)request { return [@[@"https", @"http"] containsObject:request.URL.scheme]; }
+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest *)request { return request; }
- (void)startLoading {
  __weak ConsumerMapProtocol *weakSelf = self;
  self.operation = [NSBlockOperation blockOperationWithBlock:^{
    ConsumerMapProtocol *strongSelf = weakSelf;
    if (!strongSelf || strongSelf.operation.cancelled) return;
    NSError *error = nil;
    @synchronized (ConsumerMapNetwork.class) {
      if (suspended) error = Failure(@"Map download paused.");
      strongSelf.token = generation;
      strongSelf.counted = policy != nil;
      if (policy && !error) {
        NSString *url = strongSelf.request.URL.absoluteString;
        BOOL allowed = [policy[@"resources"] containsObject:url];
        BOOL tile = NO;
        for (NSString *template in policy[@"tiles"]) {
          NSDictionary *match = MatchTemplate(template, url);
          if (!match) continue;
          NSInteger z = [match[@"z"] integerValue], x = [match[@"x"] integerValue], y = [match[@"y"] integerValue];
          NSArray *bounds = policy[@"bounds"]; double n = pow(2, z);
          allowed = z >= 9 && z <= 14 && x >= TileX([bounds[0] doubleValue], n) && x <= TileX([bounds[2] doubleValue], n) && y >= TileY([bounds[3] doubleValue], n) && y <= TileY([bounds[1] doubleValue], n);
          tile = YES; break;
        }
        if (!allowed && !tile) for (NSString *template in policy[@"glyphs"]) if (MatchTemplate(template, url)) { allowed = YES; break; }
        if (!Approved(url) || !allowed) error = Failure(@"Map resource is outside the approved Albay style.");
        NSInteger usedTiles = [Budgets() integerForKey:[@"tiles:" stringByAppendingString:lease]];
        if (tile && usedTiles >= MaxTiles) error = Failure(@"Map tile limit reached. The original download is saved.");
        if (tile && !error) { [Budgets() setInteger:usedTiles + 1 forKey:[@"tiles:" stringByAppendingString:lease]]; if (![Budgets() synchronize]) error = Failure(@"Map quota could not be saved."); }
      }
      if (error) blocked = error.localizedDescription;
    }
    if (error) { [strongSelf.client URLProtocol:strongSelf didFailWithError:error]; return; }
    @synchronized (ConsumerMapNetwork.class) { [requests addObject:strongSelf]; }
    CFHTTPMessageRef message = CFHTTPMessageCreateRequest(kCFAllocatorDefault, CFSTR("GET"), (__bridge CFURLRef)strongSelf.request.URL, kCFHTTPVersion1_1);
    CFHTTPMessageSetHeaderFieldValue(message, CFSTR("User-Agent"), CFSTR("ALEConnect-Mobile/1.0 (offline-maps; iOS)"));
    CFHTTPMessageSetHeaderFieldValue(message, CFSTR("Accept-Encoding"), CFSTR("identity"));
    CFReadStreamRef stream = CFReadStreamCreateForHTTPRequest(kCFAllocatorDefault, message);
    CFRelease(message);
    if (!stream) { [strongSelf.client URLProtocol:strongSelf didFailWithError:Failure(@"Map stream is unavailable.")]; return; }
    @synchronized (strongSelf) { strongSelf.stream = stream; }
    CFReadStreamSetProperty(stream, kCFStreamPropertyHTTPShouldAutoredirect, kCFBooleanFalse);
    if (strongSelf.counted) CFReadStreamSetProperty(stream, kCFStreamPropertyAllowExpensiveNetworkAccess, mobileDataAllowed ? kCFBooleanTrue : kCFBooleanFalse);
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 30 * NSEC_PER_SEC), dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
      ConsumerMapProtocol *request = weakSelf;
      @synchronized (request) { if (request.stream == stream) { request.timedOut = YES; CFReadStreamClose(stream); } }
    });
    BOOL opened = CFReadStreamOpen(stream), responseSent = NO;
    if (!opened) error = Failure(@"Map connection could not open.");
    while (!error && !strongSelf.operation.cancelled) {
      // Reserve before each bounded payload read, including unknown-length/chunked responses.
      @synchronized (ConsumerMapNetwork.class) {
        if (strongSelf.token != generation || suspended) error = Failure(@"Map download paused.");
        if (strongSelf.counted && !error) {
          NSString *key = [@"bytes:" stringByAppendingString:lease];
          int64_t used = [Budgets() integerForKey:key];
          if (used < 0 || used > MaxBytes - 8192) error = Failure(@"Map byte limit reached. The original download is saved.");
          else { [Budgets() setInteger:used + 8192 forKey:key]; if (![Budgets() synchronize]) error = Failure(@"Map quota could not be saved."); }
        }
      }
      if (error) break;
      UInt8 buffer[8192];
      CFIndex count = CFReadStreamRead(stream, buffer, sizeof(buffer));
      if (count < 0 || strongSelf.timedOut) { error = strongSelf.timedOut ? Failure(@"Map transfer timed out. Resume when connected.") : CFBridgingRelease(CFReadStreamCopyError(stream)) ?: Failure(@"Map transfer was interrupted."); break; }
      @synchronized (ConsumerMapNetwork.class) {
        if (strongSelf.token != generation || suspended) error = Failure(@"Map download paused.");
        if (strongSelf.counted && !error) {
          NSString *key = [@"bytes:" stringByAppendingString:lease];
          int64_t used = [Budgets() integerForKey:key];
          [Budgets() setInteger:used - (8192 - count) forKey:key];
          if (![Budgets() synchronize]) error = Failure(@"Map quota could not be saved.");
        }
      }
      if (error) break;
      if (!responseSent) {
        CFHTTPMessageRef header = (CFHTTPMessageRef)CFReadStreamCopyProperty(stream, kCFStreamPropertyHTTPResponseHeader);
        if (!header) { error = Failure(@"Map response headers are unavailable."); break; }
        NSInteger status = CFHTTPMessageGetResponseStatusCode(header);
        NSDictionary *headers = CFBridgingRelease(CFHTTPMessageCopyAllHeaderFields(header));
        NSString *encoding = CFBridgingRelease(CFHTTPMessageCopyHeaderFieldValue(header, CFSTR("Content-Encoding")));
        CFRelease(header);
        if (strongSelf.counted && (status != 200 || (encoding && ![encoding.lowercaseString isEqual:@"identity"]))) { error = Failure(@"Map server returned an unavailable or encoded resource."); break; }
        NSHTTPURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:strongSelf.request.URL statusCode:status HTTPVersion:@"HTTP/1.1" headerFields:headers];
        [strongSelf.client URLProtocol:strongSelf didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
        responseSent = YES;
      }
      if (count == 0) break;
      [strongSelf.client URLProtocol:strongSelf didLoadData:[NSData dataWithBytes:buffer length:(NSUInteger)count]];
    }
    @synchronized (strongSelf) { CFReadStreamClose(stream); strongSelf.stream = NULL; }
    CFRelease(stream);
    @synchronized (ConsumerMapNetwork.class) { if (error && strongSelf.counted) blocked = error.localizedDescription; [requests removeObject:strongSelf]; }
    if (strongSelf.operation.cancelled) return;
    if (error) [strongSelf.client URLProtocol:strongSelf didFailWithError:error];
    else [strongSelf.client URLProtocolDidFinishLoading:strongSelf];
  }];
  [transfers addOperation:self.operation];
}
- (void)stopLoading { [self.operation cancel]; @synchronized (self) { if (self.stream) CFReadStreamClose(self.stream); } }
@end

@implementation ConsumerMapNetwork
+ (BOOL)install {
  @synchronized (self) {
    if (installed) return YES;
    id configuration = Shared(@"MLNNetworkConfiguration", @"sharedManager");
    if (!configuration || ![configuration respondsToSelector:NSSelectorFromString(@"setSessionConfiguration:")]) return NO;
    transfers = [NSOperationQueue new]; transfers.maxConcurrentOperationCount = 4;
    requests = [NSHashTable weakObjectsHashTable];
    NSURLSessionConfiguration *session = NSURLSessionConfiguration.defaultSessionConfiguration;
    session.protocolClasses = @[ConsumerMapProtocol.class]; session.HTTPMaximumConnectionsPerHost = 4;
    [configuration setValue:session forKey:@"sessionConfiguration"];
    installed = YES; suspended = NO;
    PausePacks();
    return YES;
  }
}
+ (void)prepare:(NSDictionary *)options completion:(void (^)(NSError *))completion {
  if (![self install]) return completion(Failure(@"Native map downloads are unavailable in this build."));
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
    NSError *error = nil;
    NSString *area = options[@"areaId"], *styleUrl = options[@"styleUrl"];
    NSArray *bounds = options[@"bounds"];
    NSURL *file = [NSURL URLWithString:styleUrl];
    NSString *documents = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject;
    if (![area isKindOfClass:NSString.class] || area.length > 80 || !area.length || ![bounds isKindOfClass:NSArray.class] || bounds.count != 4 || !file.isFileURL || ![file.URLByResolvingSymlinksInPath.path hasPrefix:[documents stringByAppendingString:@"/"]]) return completion(Failure(@"Invalid app-owned map scope."));
    for (id point in bounds) if (![point isKindOfClass:NSNumber.class] || !isfinite([point doubleValue])) return completion(Failure(@"Invalid Albay map bounds."));
    if ([bounds[0] doubleValue] != 123.280548 || [bounds[1] doubleValue] != 12.986185 || [bounds[2] doubleValue] != 124.220096 || [bounds[3] doubleValue] != 13.523255) return completion(Failure(@"Map must cover all of Albay."));
    NSData *data = [NSData dataWithContentsOfURL:file options:0 error:&error];
    if (!data || data.length > 512000) return completion(error ?: Failure(@"Map style is unavailable."));
    NSMutableDictionary *style = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingMutableContainers error:&error];
    if (![style isKindOfClass:NSDictionary.class] || ![style[@"sources"] isKindOfClass:NSDictionary.class] || !Approved(style[@"glyphs"]) || !Approved(style[@"sprite"])) return completion(error ?: Failure(@"Invalid Albay map style."));
    @synchronized (self) {
      if (!foreground || policy || lease) return completion(Failure(@"Return to the app and pause the current download first."));
      lease = area; blocked = nil; generation++; suspended = NO; mobileDataAllowed = [options[@"mobileData"] boolValue];
      policy = [@{@"resources": [NSMutableSet set], @"tiles": [NSMutableArray array], @"glyphs": [NSMutableArray arrayWithObject:style[@"glyphs"] ?: @""] , @"bounds": bounds} mutableCopy];
      for (NSString *suffix in @[@".json", @".png", @"@2x.json", @"@2x.png"]) [policy[@"resources"] addObject:[style[@"sprite"] stringByAppendingString:suffix]];
      for (NSDictionary *source in [style[@"sources"] allValues]) if (source[@"url"]) [policy[@"resources"] addObject:source[@"url"]];
    }
    for (NSMutableDictionary *source in [style[@"sources"] allValues]) {
      if (![source[@"type"] isEqual:@"vector"]) { error = Failure(@"Unsupported offline map source."); break; }
      if (source[@"url"]) {
        NSURLSessionConfiguration *configuration = NSURLSessionConfiguration.ephemeralSessionConfiguration;
        configuration.protocolClasses = @[ConsumerMapProtocol.class];
        NSURLSession *session = [NSURLSession sessionWithConfiguration:configuration];
        dispatch_semaphore_t done = dispatch_semaphore_create(0);
        __block NSData *metadata; __block NSError *failure;
        [[session dataTaskWithURL:[NSURL URLWithString:source[@"url"]] completionHandler:^(NSData *body, NSURLResponse *response, NSError *requestError) { metadata = body; failure = requestError; dispatch_semaphore_signal(done); }] resume];
        dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER); [session finishTasksAndInvalidate];
        if (failure || metadata.length > 512000) { error = failure ?: Failure(@"Map source metadata is too large."); break; }
        NSDictionary *tileJson = metadata ? [NSJSONSerialization JSONObjectWithData:metadata options:0 error:&error] : nil;
        if (![tileJson isKindOfClass:NSDictionary.class] || ![tileJson[@"maxzoom"] isKindOfClass:NSNumber.class] || [tileJson[@"maxzoom"] integerValue] != 14) { error = error ?: Failure(@"Map source detail changed. Update the app before downloading."); break; }
        [source removeObjectForKey:@"url"];
        for (NSString *field in @[@"tiles", @"minzoom", @"maxzoom", @"bounds", @"scheme", @"attribution"]) if (tileJson[field]) source[field] = tileJson[field];
      }
      @synchronized (self) {
        if (!policy || !foreground) { error = Failure(@"Map download paused."); break; }
        if (![source[@"tiles"] isKindOfClass:NSArray.class] || ![source[@"tiles"] count]) { error = Failure(@"Map source has no tiles."); break; }
        for (NSString *tile in source[@"tiles"]) if (Approved(tile)) [policy[@"tiles"] addObject:tile]; else error = Failure(@"Unapproved map resource host.");
      }
      if (error) break;
    }
    NSData *resolved = nil;
    if (!error) {
      resolved = [NSJSONSerialization dataWithJSONObject:style options:0 error:&error];
      if (resolved) [resolved writeToURL:file options:NSDataWritingAtomic error:&error];
    }
    if (error) { [self stop:area]; completion(error); return; }
    NSUInteger preparedGeneration;
    @synchronized (self) { preparedGeneration = generation; }
    dispatch_async(dispatch_get_main_queue(), ^{
      id<ConsumerMapStyleStorage> storage = Shared(@"MLNOfflineStorage", @"sharedOfflineStorage");
      SEL selector = @selector(preloadData:forURL:modificationDate:expirationDate:eTag:mustRevalidate:completionHandler:);
      if (![(id)storage respondsToSelector:selector]) {
        [self stop:area]; completion(Failure(@"Map style could not be prepared. Update the app and retry.")); return;
      }
      // Seed the pinned file before the offline engine tries its HTTP loader.
      [storage preloadData:resolved forURL:file modificationDate:nil
          expirationDate:[NSDate dateWithTimeIntervalSinceNow:365.0 * 24 * 60 * 60]
          eTag:nil mustRevalidate:NO completionHandler:^(NSURL *url, NSError *cacheError) {
        @synchronized (self) {
          if (!cacheError && (!foreground || !policy || generation != preparedGeneration || ![lease isEqual:area]))
            cacheError = Failure(@"Map download paused.");
        }
        if (cacheError) [self stop:area];
        completion(cacheError);
      }];
    });
  });
}
+ (void)stop:(NSString *)area { @synchronized (self) { if (area && lease && ![lease isEqual:area]) return; policy = nil; suspended = YES; generation++; for (ConsumerMapProtocol *request in requests) [request stopLoading]; [transfers cancelAllOperations]; } }
+ (void)finish:(NSString *)area { @synchronized (self) { if (!policy && [lease isEqual:area]) lease = nil; if (foreground && !lease) suspended = NO; } }
+ (void)setForeground:(BOOL)value { @synchronized (self) { foreground = value; if (!value) { [self stop:nil]; PausePacks(); } else if (!lease) suspended = NO; } }
+ (NSString *)blockedReason { @synchronized (self) { return blocked; } }
@end
