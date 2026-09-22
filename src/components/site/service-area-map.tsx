"use client";

import { useEffect, useState } from "react";
import type { ServiceArea } from "@/lib/site";
import { cn } from "@/lib/utils";

// Equirectangular projection over the NWA bounding box, corrected for latitude.
const BOUNDS = { north: 36.53, south: 35.93, west: -94.36, east: -93.96 };
const LAT_SCALE = Math.cos((36.2 * Math.PI) / 180);
const W = 480;
const H = Math.round((W * (BOUNDS.north - BOUNDS.south)) / ((BOUNDS.east - BOUNDS.west) * LAT_SCALE));

function project(lat: number, lng: number) {
  return {
    x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W,
    y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * H,
  };
}

// Approximate I-49 alignment, south to north.
const I49: [number, number][] = [
  [35.95, -94.18], [36.06, -94.19], [36.13, -94.17], [36.2, -94.16], [36.26, -94.15],
  [36.33, -94.17], [36.38, -94.2], [36.5, -94.25],
];
const COUNTY_LINE_LAT = 36.2;

function path(points: [number, number][]) {
  return points
    .map(([lat, lng], i) => {
      const { x, y } = project(lat, lng);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ServiceAreaMap({ areas }: { areas: ServiceArea[] }) {
  const [selected, setSelected] = useState<string>("bentonville");

  // Footer links arrive as /service-areas#rogers.
  useEffect(() => {
    const sync = () => {
      const slug = window.location.hash.slice(1);
      if (areas.some((a) => a.slug === slug)) setSelected(slug);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [areas]);

  const current = areas.find((a) => a.slug === selected)!;
  const coreCorridor = path(
    areas
      .filter((a) => a.core)
      .sort((a, b) => a.lat - b.lat)
      .map((a) => [a.lat, a.lng]),
  );
  const countyY = project(COUNTY_LINE_LAT, BOUNDS.west).y;
  const byCounty = (["Benton", "Washington"] as const).map((county) => ({
    county,
    areas: areas.filter((a) => a.county === county).sort((a, b) => Number(b.core) - Number(a.core) || a.name.localeCompare(b.name)),
  }));

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <figure className="overflow-hidden rounded-photo border border-navy-200 bg-white">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-labelledby="map-title"
            className="mx-auto block max-h-[70vh] w-full"
          >
            <title id="map-title">
              Map of Hill &amp; Stone service areas along the I-49 corridor in Benton and Washington counties
            </title>

            {/* Counties */}
            <rect x="0" y="0" width={W} height={countyY} className="fill-stone-50" />
            <rect x="0" y={countyY} width={W} height={H - countyY} className="fill-stone-100" />
            <line x1="0" x2={W} y1={countyY} y2={countyY} className="stroke-navy-300" strokeDasharray="6 6" />
            <text x="16" y={countyY - 12} className="fill-navy-600 text-[13px]">
              Benton County
            </text>
            <text x="16" y={countyY + 24} className="fill-navy-600 text-[13px]">
              Washington County
            </text>

            {/* Primary area corridor */}
            <path d={coreCorridor} className="stroke-copper-500/15" strokeWidth="64" strokeLinecap="round" strokeLinejoin="round" fill="none" />

            {/* I-49 */}
            <path d={path(I49)} className="stroke-navy-400" strokeWidth="3" fill="none" />
            <g transform={`translate(${project(35.99, -94.18).x + 30} ${project(35.99, -94.18).y})`}>
              <rect x="-16" y="-11" width="32" height="22" rx="4" className="fill-navy-900" />
              <text textAnchor="middle" y="5" className="fill-stone-50 text-[12px] font-bold">
                I-49
              </text>
            </g>

            {areas.map((a) => {
              const { x, y } = project(a.lat, a.lng);
              const active = a.slug === selected;
              const labelLeft = x > W * 0.62;
              return (
                <g
                  key={a.slug}
                  onClick={() => setSelected(a.slug)}
                  className="cursor-pointer"
                  aria-hidden
                >
                  {active && <circle cx={x} cy={y} r={a.core ? 16 : 12} className="fill-copper-500/25" />}
                  <circle
                    cx={x}
                    cy={y}
                    r={a.core ? 8 : 5}
                    className={cn(
                      "transition-colors",
                      active ? "fill-copper-500 stroke-navy-950" : a.core ? "fill-navy-950 stroke-white" : "fill-white stroke-navy-700",
                    )}
                    strokeWidth="2"
                  />
                  <text
                    x={labelLeft ? x - 14 : x + 14}
                    y={y + 5}
                    textAnchor={labelLeft ? "end" : "start"}
                    className={cn(
                      "stroke-white stroke-[4px]",
                      a.core ? "text-[16px] font-bold" : "text-[13px]",
                      active ? "fill-copper-700" : a.core ? "fill-navy-950" : "fill-navy-700",
                    )}
                    style={{ paintOrder: "stroke" }}
                  >
                    {a.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </figure>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-navy-600">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="size-3 rounded-full bg-navy-950" /> Primary area
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full border-2 border-navy-700 bg-white" /> Also served
          </span>
          <span>Approximate map, not to survey scale</span>
        </p>
      </div>

      <div>
        <div aria-live="polite" className="rounded-panel bg-navy-950 p-6 text-stone-50 sm:p-8">
          <p className="text-navy-300">{current.county} County</p>
          <h2 className="mt-1 font-wide text-3xl font-extrabold">{current.name}</h2>
          <p className="mt-3 text-navy-300">
            {current.core
              ? "Primary service area, usually the quickest to schedule."
              : "Also served. We book visits here alongside nearby jobs, so scheduling can take a few extra days."}
          </p>
          <p className="mt-4 text-sm text-navy-300">
            ZIP codes: <span className="font-semibold text-stone-50">{current.zips.join(", ")}</span>
          </p>
        </div>

        {byCounty.map(({ county, areas: list }) => (
          <section key={county} aria-labelledby={`county-${county}`} className="mt-10">
            <h2 id={`county-${county}`} className="font-semiwide text-xl font-bold">
              {county} County
            </h2>
            <ul className="mt-3 border-t border-navy-200">
              {list.map((a) => (
                <li key={a.slug} id={a.slug} className="scroll-mt-28 border-b border-navy-200">
                  <button
                    type="button"
                    onClick={() => setSelected(a.slug)}
                    aria-pressed={a.slug === selected}
                    className="flex w-full cursor-pointer items-baseline justify-between gap-4 px-1 py-3.5 text-left transition-colors hover:bg-white aria-pressed:bg-white"
                  >
                    <span className={cn("text-lg", a.core ? "font-bold" : "font-medium", a.slug === selected && "text-copper-700")}>
                      {a.name}
                    </span>
                    <span className="text-sm text-navy-600">{a.core ? "Primary area" : a.zips.join(", ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
