"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function ProfileBio({ bio }: { bio: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const node = textRef.current;
    if (!node || expanded) return;
    setOverflows(node.scrollHeight > node.clientHeight + 1);
  }, [bio, expanded]);

  return (
    <div className="mt-1">
      <p
        ref={textRef}
        className={
          expanded
            ? "text-sm leading-6 whitespace-pre-wrap text-fog"
            : "line-clamp-2 text-sm leading-6 whitespace-pre-wrap text-fog"
        }
      >
        {bio}
      </p>
      {overflows ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-sm font-medium text-paper-white transition-colors hover:text-ice-signal focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice-signal"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
