import {useEvent} from "expo";
import {useVideoPlayer, VideoView} from "expo-video";
import {useEffect} from "react";

export function ExerciseVideo({url, name, onError}: {url: string; name: string; onError: () => void}) {
  const player = useVideoPlayer(url, instance => {instance.muted = true; instance.loop = true;});
  const status = useEvent(player, "statusChange", {status: player.status});
  useEffect(() => {if (status.status === "error") onError();}, [status.status, onError]);
  return <VideoView accessibilityLabel={name} player={player} nativeControls contentFit="contain" style={{height: 240, width: "100%"}}/>;
}
