import type { Theme } from "@/hooks/useTheme";
import { OPPONENT_SEATS } from "@/components/game/game.types";
import { stripUsernameTag } from "@/lib/username";
import type { PromptOverlaySpec } from "@/pixi/prompts/prompt.types";

export function promptActionOwner(spec: PromptOverlaySpec, theme: Theme) {
  const decidingPlayerId = spec.currentPrompt?.decidingPlayerId;
  const pendingPrompt =
    spec.currentPrompt &&
    !spec.action.isWaitingForResponse &&
    (!spec.action.isWaitingForOthers ||
      (decidingPlayerId && decidingPlayerId !== spec.localPlayerId));
  const playerId = pendingPrompt
    ? (decidingPlayerId ?? spec.localPlayerId)
    : spec.gameView.priorityPlayerId;
  const player = spec.gameView.players.find((entry) => entry.id === playerId);
  if (!player) return null;
  const local = player.id === spec.localPlayerId;
  const opponents = spec.gameView.players.filter((entry) => entry.id !== spec.localPlayerId);
  const seat = local
    ? "self"
    : OPPONENT_SEATS[opponents.findIndex((entry) => entry.id === player.id)];
  return {
    label: local ? "Your" : `${stripUsernameTag(player.name)}'s`,
    color: seat ? theme.gameTheme.playerColors[seat] : theme.gameTheme.textMuted,
  };
}
