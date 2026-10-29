#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN
@interface ConsumerMapNetwork : NSObject
+ (BOOL)install;
+ (void)prepare:(NSDictionary *)options completion:(void (^)(NSError *_Nullable))completion;
+ (void)stop:(nullable NSString *)area;
+ (void)finish:(NSString *)area;
+ (void)setForeground:(BOOL)foreground;
+ (nullable NSString *)blockedReason;
@end
NS_ASSUME_NONNULL_END
