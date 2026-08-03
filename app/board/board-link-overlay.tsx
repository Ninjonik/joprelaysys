"use client";

type LinkEndpoint = {
  pieceId: string;
  kind: string;
  partIndex: number;
};

type PieceLink = {
  a: LinkEndpoint;
  b: LinkEndpoint;
};

type LinkPoint = {
  x: number;
  y: number;
};

type DraftLine = {
  start: LinkEndpoint;
  currentPoint: {
    x: number;
    y: number;
  };
};

type Props = {
  columns: number;
  rows: number;
  tileSize: number;
  links: PieceLink[];
  linkCenters: Map<string, LinkPoint>;
  className: string;
  lineClassName: string;
  draftLineClassName: string;
  draftLine?: DraftLine | null;
};

function getLinkKey(endpoint: LinkEndpoint) {
  return `${endpoint.pieceId}:${endpoint.kind}:${endpoint.partIndex}`;
}

export function BoardLinkOverlay({
  columns,
  rows,
  tileSize,
  links,
  linkCenters,
  className,
  lineClassName,
  draftLineClassName,
  draftLine,
}: Props) {
  if (links.length === 0 && !draftLine) {
    return null;
  }

  const draftStart = draftLine ? linkCenters.get(getLinkKey(draftLine.start)) : null;

  return (
    <svg className={className} viewBox={`0 0 ${columns * tileSize} ${rows * tileSize}`} aria-hidden="true">
      {links.map((link) => {
        const start = linkCenters.get(getLinkKey(link.a));
        const end = linkCenters.get(getLinkKey(link.b));

        if (!start || !end) {
          return null;
        }

        return (
          <line
            key={`${getLinkKey(link.a)}-${getLinkKey(link.b)}`}
            className={lineClassName}
            x1={start.x * tileSize}
            y1={start.y * tileSize}
            x2={end.x * tileSize}
            y2={end.y * tileSize}
          />
        );
      })}

      {draftLine && draftStart ? (
        <line
          className={draftLineClassName}
          x1={draftStart.x * tileSize}
          y1={draftStart.y * tileSize}
          x2={draftLine.currentPoint.x}
          y2={draftLine.currentPoint.y}
        />
      ) : null}
    </svg>
  );
}
