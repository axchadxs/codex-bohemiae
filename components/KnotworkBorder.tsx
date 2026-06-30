interface KnotworkBorderProps {
  id: string;
}

export default function KnotworkBorder({ id }: KnotworkBorderProps) {
  const patId = `${id}-pat`;

  return (
    <svg
      width="100%"
      height="22"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/*
         * Tile: 44×22px, 2-strand braid.
         * Strands: A runs (0,4)→(22,18)→(44,4); B runs (0,18)→(22,4)→(44,18).
         * They cross at (11,11) and (33,11).
         * Interlace technique: draw both strands, then mask+redraw at each crossing
         * so the correct strand appears on top.
         */}
        <pattern id={patId} x="0" y="0" width="44" height="22" patternUnits="userSpaceOnUse">
          {/* Lapis background */}
          <rect width="44" height="22" fill="#1B5080" />

          {/* Both strands — gold, drawn together as base layer */}
          {/* Strand A: oscillates top-bottom-top (y: 4→18→4) */}
          <path
            d="M 0,4 C 8,4 14,18 22,18 C 30,18 36,4 44,4"
            fill="none"
            stroke="#C8A84B"
            strokeWidth="2.5"
          />
          {/* Strand B: oscillates bottom-top-bottom (y: 18→4→18) */}
          <path
            d="M 0,18 C 8,18 14,4 22,4 C 30,4 36,18 44,18"
            fill="none"
            stroke="#C8A84B"
            strokeWidth="2.5"
          />

          {/* Crossing 1 at (11,11): Strand A over Strand B */}
          {/* Mask erases both strands in the crossing zone */}
          <rect x="7" y="7" width="8" height="8" fill="#1B5080" />
          {/* Redraw Strand A segment 1 — it is now on top */}
          <path
            d="M 0,4 C 8,4 14,18 22,18"
            fill="none"
            stroke="#C8A84B"
            strokeWidth="2.5"
          />

          {/* Crossing 2 at (33,11): Strand B over Strand A */}
          <rect x="29" y="7" width="8" height="8" fill="#1B5080" />
          {/* Redraw Strand B segment 2 — it is now on top */}
          <path
            d="M 22,4 C 30,4 36,18 44,18"
            fill="none"
            stroke="#C8A84B"
            strokeWidth="2.5"
          />

          {/* Gold border lines at top and bottom edges */}
          <line x1="0" y1="1.5" x2="44" y2="1.5" stroke="#C8A84B" strokeWidth="1.5" />
          <line x1="0" y1="20.5" x2="44" y2="20.5" stroke="#C8A84B" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="22" fill={`url(#${patId})`} />
    </svg>
  );
}
