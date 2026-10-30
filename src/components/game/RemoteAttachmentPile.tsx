import { useState } from "react";
import type { CardDto } from "@/protocol/game";
import { GeneratedCardImage } from "@/components/game/GeneratedCardImage";
import { cn } from "@/lib/utils";

export interface RemoteAttachmentReference {
  card: CardDto;
  target: CardDto;
  playerId: string;
}

export function RemoteAttachmentPile({
  cards,
  onHighlight,
  onInspect,
  onLeave,
}: {
  cards: RemoteAttachmentReference[];
  onHighlight: (card: RemoteAttachmentReference | null) => void;
  onInspect: (card: CardDto, anchor: DOMRect) => void;
  onLeave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapse = () => {
    setExpanded(false);
    onHighlight(null);
    onLeave();
  };
  if (cards.length === 0) return null;
  return (
    <section
      aria-label="Your attachments on other boards"
      className="absolute right-3 top-[calc(50%+2rem)] z-40 max-w-[min(70vw,32rem)] rounded-lg border border-border bg-background/80 p-2 shadow-lg"
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setExpanded(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch" && !event.currentTarget.contains(document.activeElement))
          collapse();
      }}
      onFocusCapture={() => setExpanded(true)}
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
        className="block w-full rounded px-1 py-1 text-left text-ui-meta font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => (expanded ? collapse() : setExpanded(true))}
      >
        Your attachments elsewhere · {cards.length}
      </button>
      <div
        className={cn(
          "relative mt-1 transition-[width,height] duration-150 motion-reduce:transition-none",
          expanded ? "flex gap-2 overflow-x-auto pb-1" : "h-20 w-20",
        )}
      >
        {cards.map((reference, index) => (
          <button
            key={reference.card.id}
            type="button"
            data-attachment-proxy={reference.card.id}
            aria-label={`${reference.card.identity.name}, attached to ${reference.target.identity.name}. Visual reference.`}
            title={`You control ${reference.card.identity.name}. Attached to ${reference.target.identity.name}.`}
            className={cn(
              "shrink-0 rounded border border-border text-left transition-[transform,opacity] duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
              expanded ? "relative w-24 opacity-95" : "absolute left-0 top-0 w-12 opacity-35",
            )}
            style={
              expanded
                ? undefined
                : {
                    transform: `translate(${Math.min(index, 4) * 6}px, ${Math.min(index, 4) * 2}px)`,
                  }
            }
            onPointerEnter={(event) => {
              if (event.pointerType === "touch") return;
              onHighlight(reference);
              onInspect(reference.card, event.currentTarget.getBoundingClientRect());
            }}
            onFocus={(event) => {
              onHighlight(reference);
              onInspect(reference.card, event.currentTarget.getBoundingClientRect());
            }}
            onClick={(event) => {
              setExpanded(true);
              onHighlight(reference);
              onInspect(reference.card, event.currentTarget.getBoundingClientRect());
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
