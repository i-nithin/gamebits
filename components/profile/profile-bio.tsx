"use client";

import { useState } from "react";

const PREVIEW_LENGTH = 140;

export function ProfileBio({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false);

  if (bio.length <= PREVIEW_LENGTH) {
    return <p className="text-sm leading-6 whitespace-pre-wrap text-fog">{bio}</p>;
  }

  const preview = `${bio.slice(0, PREVIEW_LENGTH).trimEnd()}…`;

  return (
    <p className="text-sm leading-6 whitespace-pre-wrap text-fog">
      {expanded ? bio : preview}{" "}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="font-medium text-paper-white transition-colors hover:text-ice-signal focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice-signal"
      >
        {expanded ? "less" : "more"}
      </button>
    </p>
  );
}
