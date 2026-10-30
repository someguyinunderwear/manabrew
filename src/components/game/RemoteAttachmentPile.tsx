import { useState } from "react";
import type { CardDto } from "@/protocol/game";
import { GeneratedCardImage } from "@/components/game/GeneratedCardImage";
import { cn } from "@/lib/utils";
import { useLongPressPreview } from "@/hooks/useLongPressPreview";

export interface RemoteAttachmentReference {
  card: CardDto;
  target: CardDto;
  playerId: string;
}

export function RemoteAttachmentPile({
  cards,
  onHighlight,
  onHover,
  onRightClick,
  onLongPress,
  onLeave,
}: {
  cards: RemoteAttachmentReference[];
  onHighlight: (card: RemoteAttachmentReference | null) => void;
  onHover: (card: CardDto, anchor: DOMRect) => void;
  onRightClick?: (card: CardDto, anchor: DOMRect) => void;
  onLongPress?: (card: CardDto, anchor: DOMRect) => void;
  onLeave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const leaveCard = () => {
    onHighlight(null);
    onLeave();
  };
  const collapse = () => {
    setExpanded(false);
    leaveCard();
  };
  const longPress = useLongPressPreview<RemoteAttachmentReference>({
    resolve: (event) => {
      const anchor =
        event.target instanceof HTMLElement
          ? event.target.closest<HTMLButtonElement>("[data-attachment-proxy]")
          : null;
      const item = cards.find((reference) => reference.card.id === anchor?.dataset.attachmentProxy);
      return anchor && item ? { item, anchor } : null;
    },
    show: (reference, anchor) => {
      onHighlight(reference);
      onLongPress?.(reference.card, anchor);
    },
    hide: onLeave,
    hideOnRelease: false,
  });
  if (cards.length === 0) return null;
  return (
    <section
      aria-label="Your attachments on other boards"
      className={cn(
        "absolute right-0 top-1/2 z-40 flex max-w-[min(70vw,32rem)] -translate-y-1/2 rounded-l-lg border border-border bg-background/80 shadow-lg transition-transform duration-150 motion-reduce:transition-none",
        expanded ? "translate-x-0" : "translate-x-[calc(100%-2.25rem)]",
      )}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
      onClickCapture={longPress.onClickCapture}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setExpanded(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch" && !event.currentTarget.contains(document.activeElement))
          collapse();
      }}
      onFocusCapture={(event) => {
        if (event.target.matches(":focus-visible")) setExpanded(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) collapse();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          collapse();
        }
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        className="w-9 shrink-0 rounded-l-lg px-2 py-3 text-ui-meta font-medium text-foreground [writing-mode:vertical-rl] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => (expanded ? collapse() : setExpanded(true))}
      >
        Your attachments elsewhere · {cards.length}
      </button>
      <div inert={!expanded} className="flex gap-2 overflow-x-auto p-2">
        {cards.map((reference) => (
          <button
            key={reference.card.id}
            type="button"
            data-attachment-proxy={reference.card.id}
            aria-label={`${reference.card.identity.name}, attached to ${reference.target.identity.name}. Visual reference.`}
            className="relative w-24 shrink-0 rounded border border-border text-left opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            onPointerEnter={(event) => {
              if (event.pointerType === "touch") return;
              onHighlight(reference);
              onHover(reference.card, event.currentTarget.getBoundingClientRect());
            }}
            onPointerLeave={(event) => {
              if (event.pointerType !== "touch") leaveCard();
            }}
            onFocus={(event) => {
              onHighlight(reference);
              onHover(reference.card, event.currentTarget.getBoundingClientRect());
            }}
            onBlur={leaveCard}
            onContextMenu={(event) => {
              longPress.onContextMenu(event);
              if (event.defaultPrevented || !onRightClick) return;
              event.preventDefault();
              onHighlight(reference);
              onRightClick(reference.card, event.currentTarget.getBoundingClientRect());
            }}
          >
            <GeneratedCardImage card={reference.card} className="aspect-[5/7] w-full rounded" />
            {expanded && (
              <span className="block max-w-24 truncate bg-background px-1 py-1 text-ui-meta text-foreground">
                {reference.target.identity.name}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
