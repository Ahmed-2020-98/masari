/**
 * Abstract Saudi route network: Riyadh as the hub, animated dashed routes flowing to major cities,
 * and parcels travelling along a few lanes. Purely decorative.
 */
const cities = [
  { name: "الرياض", x: 360, y: 272, hub: true },
  { name: "جدة", x: 138, y: 322 },
  { name: "مكة", x: 176, y: 344 },
  { name: "المدينة", x: 196, y: 222 },
  { name: "الدمام", x: 492, y: 206 },
  { name: "تبوك", x: 104, y: 92 },
  { name: "حائل", x: 262, y: 142 },
  { name: "بريدة", x: 318, y: 190 },
  { name: "أبها", x: 250, y: 452 },
  { name: "جازان", x: 222, y: 506 },
  { name: "نجران", x: 318, y: 472 },
];

function lane(from: { x: number; y: number }, to: { x: number; y: number }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - Math.abs(from.x - to.x) * 0.18 - 20;
  return `M${from.x} ${from.y} Q${mx} ${my} ${to.x} ${to.y}`;
}

export function RouteMap({ className }: { className?: string }) {
  const hub = cities[0];
  const lanes = cities.slice(1).map((city) => ({ city, d: lane(hub, city) }));
  const moving = [lanes[0], lanes[3], lanes[7], lanes[5]];

  return (
    <svg viewBox="0 0 600 560" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id="rm-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#00C48C" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#00C48C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rm-lane" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00C48C" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4DDCB2" stopOpacity="0.25" />
        </linearGradient>
        <pattern id="rm-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" fill="#ffffff" fillOpacity="0.08" />
        </pattern>
      </defs>

      <rect width="600" height="560" fill="url(#rm-dots)" />
      <circle cx={hub.x} cy={hub.y} r="150" fill="url(#rm-glow)" opacity="0.35" />

      {lanes.map(({ city, d }, index) => (
        <g key={city.name}>
          <path d={d} stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1.5" />
          <path d={d} stroke="url(#rm-lane)" strokeWidth="1.8" strokeDasharray="4 9" strokeLinecap="round">
            <animate attributeName="stroke-dashoffset" from="0" to="-130" dur={`${6 + (index % 4)}s`} repeatCount="indefinite" />
          </path>
        </g>
      ))}

      {moving.map(({ d, city }, index) => (
        <g key={`p-${city.name}`}>
          <rect x="-6" y="-5" width="12" height="10" rx="2.5" fill="#00C48C" stroke="#0F2741" strokeWidth="1.5">
            <animateMotion dur={`${7 + index * 1.7}s`} repeatCount="indefinite" path={d} rotate="auto" begin={`${index * 1.1}s`} />
          </rect>
        </g>
      ))}

      {cities.map((city) => (
        <g key={city.name} transform={`translate(${city.x} ${city.y})`}>
          {city.hub ? (
            <>
              <circle r="16" fill="#00C48C" fillOpacity="0.15">
                <animate attributeName="r" values="12;26;12" dur="3s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle r="8" fill="#00C48C" stroke="#0F2741" strokeWidth="3" />
            </>
          ) : (
            <circle r="4.5" fill="#0F2741" stroke="#4DDCB2" strokeWidth="2" />
          )}
          <text
            y={city.hub ? -22 : -12}
            textAnchor="middle"
            fill="#ffffff"
            fillOpacity={city.hub ? 0.95 : 0.55}
            fontSize={city.hub ? 15 : 12}
            fontWeight={city.hub ? 800 : 500}
            fontFamily="var(--font-tajawal)"
          >
            {city.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
