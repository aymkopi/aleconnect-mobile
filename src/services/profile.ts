import { supabase } from "@/services/supabase";

import { toConsumerProfileView, type ConsumerProfileView } from "@/models/consumer-profile-view";

export async function fetchCurrentConsumerProfileView(): Promise<ConsumerProfileView | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("v_consumer_details")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toConsumerProfileView(data as Record<string, unknown>);
}