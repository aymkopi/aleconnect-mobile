import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createNativeMapSetup } from "@/features/onboarding/map-setup-policy";
import { offlineMaps } from "./offline-map-native";

export const nativeMapSetup = createNativeMapSetup({
  storage: AsyncStorage,
  status: () => offlineMaps().status(),
  online: async () => {
    const network = await NetInfo.fetch();
    return network.isConnected === true && network.isInternetReachable !== false;
  },
});
