import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import { Thermometer, ShieldAlert, CheckCircle2, AlertOctagon } from "lucide-react";

export default function TemperatureChart({
  readings = [],
  minTemp = 2,
  maxTemp = 8,
  vaccineName = "Vaccine Batch",
}) {
  // If no readings yet, show helpful empty state
  if (!readings || readings.length === 0) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-6 text-center">
        <Thermometer className="w-10 h-10 text-slate-600 mb-2 animate-bounce" />
        <h4 className="text-sm font-semibold text-slate-300">No Temperature Samples Yet</h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Start the software temperature simulator or submit a manual test reading to stream simulated telemetry in real time.
        </p>
      </div>
    );
  }

  // Calculate live statistics
  const temps = readings.map((r) => r.temperature);
  const minObserved = Math.min(...temps);
  const maxObserved = Math.max(...temps);
  const avgObserved = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
  const excursionCount = readings.filter((r) => r.isExcursion).length;
  const currentTemp = temps[temps.length - 1];

  // Calculate chart Y-domain with padding
  const yMin = Math.floor(Math.min(minTemp - 3, minObserved - 2));
  const yMax = Math.ceil(Math.max(maxTemp + 3, maxObserved + 2));

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md text-xs">
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="text-slate-400 font-mono text-[11px]">{data.timeLabel || data.timestamp}</span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                data.isExcursion
                  ? "bg-rose-950 text-rose-400 border border-rose-800"
                  : "bg-emerald-950 text-emerald-400 border border-emerald-800"
              }`}
            >
              {data.status}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-sky-400" />
            <span>{data.temperature}°C</span>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
            <div>Stage: <strong className="text-slate-300">{data.checkpointReference || "Checkpoint"}</strong></div>
            <div>Source: <span className="text-slate-400 italic">{data.source}</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Current Reading
          </span>
          <span
            className={`text-lg font-bold font-mono ${
              currentTemp < minTemp || currentTemp > maxTemp
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {currentTemp}°C
          </span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Permitted Band
          </span>
          <span className="text-base font-bold font-mono text-sky-400">
            {minTemp}°C to {maxTemp}°C
          </span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Observed Min / Max
          </span>
          <span className="text-sm font-semibold font-mono text-slate-200">
            {minObserved}°C / {maxObserved}°C
          </span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Average Temp
          </span>
          <span className="text-base font-bold font-mono text-slate-200">
            {avgObserved}°C
          </span>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
            Excursions
          </span>
          <div className="flex items-center gap-1.5">
            {excursionCount > 0 ? (
              <>
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span className="text-base font-bold font-mono text-rose-400">
                  {excursionCount}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-base font-bold font-mono text-emerald-400">
                  0 (Optimal)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative h-72 w-full pt-2">
        {/* Software Simulation Disclaimer Watermark */}
        <div className="absolute top-2 right-4 z-10 pointer-events-none opacity-40 flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-700 text-[10px] text-slate-300">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span>SIMULATED SENSOR TELEMETRY</span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={readings} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />

            {/* Shaded Permitted Safe Temperature Band */}
            <ReferenceArea
              y1={minTemp}
              y2={maxTemp}
              fill="#0ea5e9"
              fillOpacity={0.08}
              strokeOpacity={0.2}
            />

            {/* Min and Max Limit Lines */}
            <ReferenceLine
              y={maxTemp}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Max Limit: ${maxTemp}°C`,
                fill: "#f43f5e",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            <ReferenceLine
              y={minTemp}
              stroke="#38bdf8"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Min Limit: ${minTemp}°C`,
                fill: "#38bdf8",
                fontSize: 10,
                position: "insideBottomRight",
              }}
            />

            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              unit="°C"
            />
            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#38bdf8"
              strokeWidth={2.5}
              isAnimationActive={false}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isExcursion) {
                  return (
                    <circle
                      key={props.key}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="animate-pulse"
                    />
                  );
                }
                return (
                  <circle
                    key={props.key}
                    cx={cx}
                    cy={cy}
                    r={2.5}
                    fill="#0ea5e9"
                  />
                );
              }}
              activeDot={{ r: 6, fill: "#38bdf8", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
