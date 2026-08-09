import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
import { useEffect, useState, type ComponentProps } from "react";

type ProfileAvatarProps = ComponentProps<typeof Avatar> & {
  fallback: string;
  fallbackClassName?: string;
  uri?: string | null;
};

export function ProfileAvatar({
  fallback,
  fallbackClassName,
  uri,
  ...avatarProps
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  const showFallback = !uri || imageFailed;

  return (
    <Avatar {...avatarProps}>
      {uri && !imageFailed ? (
        <AvatarImage
          key={uri}
          source={{ uri }}
          onLoad={() => setImageFailed(false)}
          onError={() => setImageFailed(true)}
        />
      ) : null}
      {showFallback ? (
        <AvatarFallbackText className={fallbackClassName}>
          {fallback}
        </AvatarFallbackText>
      ) : null}
    </Avatar>
  );
}
