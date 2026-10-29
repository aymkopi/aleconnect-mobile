import ExpoModulesCore

public final class ConsumerOfflineMapsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ConsumerOfflineMaps")
    OnAppEntersBackground { ConsumerMapNetwork.setForeground(false) }
    OnAppEntersForeground { ConsumerMapNetwork.setForeground(true) }
    OnDestroy { ConsumerMapNetwork.setForeground(false) }
    AsyncFunction("capabilities") { () -> [String: Any] in
      guard ConsumerMapNetwork.install() else { throw Exception(name: "MapUnavailable", description: "Native map downloads are unavailable in this build.") }
      return ["version": 1, "platform": "ios"]
    }
    AsyncFunction("prepare") { (options: [String: Any], promise: Promise) in
      ConsumerMapNetwork.prepare(options) { error in
        if let error { promise.reject("MapPreparation", error.localizedDescription) }
        else { promise.resolve(["ready": true]) }
      }
    }
    AsyncFunction("stop") { (area: String?) in ConsumerMapNetwork.stop(area) }
    AsyncFunction("finish") { (area: String) in ConsumerMapNetwork.finish(area) }
    AsyncFunction("status") { () -> [String: Any] in
      ["blockedReason": ConsumerMapNetwork.blockedReason() as Any? ?? NSNull()]
    }
  }
}
