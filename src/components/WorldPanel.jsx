// Right Panel Tab 4 — World State (Reputation, Events, City, Registry)

import React from 'react';

function reputationLevel(value) {
  if (!value) return { label: '—', color: 'text-system-text-dim' };
  const v = value.toLowerCase();
  if (v.includes('hostile') || v.includes('enemy')) return { label: value, color: 'text-system-red' };
  if (v.includes('wary') || v.includes('suspicious')) return { label: value, color: 'text-yellow-500' };
  if (v.includes('neutral') || v.includes('unknown')) return { label: value, color: 'text-system-text-dim' };
  if (v.includes('friendly') || v.includes('positive')) return { label: value, color: 'text-system-green' };
  if (v.includes('allied') || v.includes('trusted')) return { label: value, color: 'text-system-blue' };
  if (v.includes('revered') || v.includes('legend')) return { label: value, color: 'text-system-gold' };
  return { label: value, color: 'text-system-text' };
}

function zoneStatusColor(status) {
  if (!status) return 'text-system-text-dim';
  const s = status.toLowerCase();
  if (/quarantined/.test(s)) return 'text-system-red';
  if (/damaged/.test(s))     return 'text-orange-400';
  if (/disrupted/.test(s))   return 'text-yellow-400';
  return 'text-system-green';
}

function dangerLevelColor(level) {
  if (!level) return 'text-system-text-dim';
  const l = level.toLowerCase();
  if (/critical/.test(l)) return 'text-system-red';
  if (/high/.test(l))     return 'text-orange-400';
  if (/elevated/.test(l)) return 'text-yellow-400';
  return 'text-system-green';
}

export default function WorldPanel({ playerState, worldEvents, cityState, hunterRegistry }) {
  const rep = playerState?.reputation || {};
  const events = worldEvents || [];
  const city = cityState || {};
  const registry = hunterRegistry || [];

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">

      {/* Reputation */}
      <div>
        <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">REPUTATION</div>
        <div className="system-window p-3 space-y-2">
          {[
            { label: 'Hunter Association', value: rep.hunterAssociation },
            { label: 'Guilds', value: rep.guilds },
            { label: 'Civilian Public', value: rep.civilianPublic },
          ].map(({ label, value }) => {
            const { label: displayVal, color } = reputationLevel(value);
            return (
              <div key={label} className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-system-text-dim">{label}</span>
                <span className={`font-mono text-[10px] ${color} text-right max-w-[140px] truncate`}>
                  {displayVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* City State */}
      {(city.dangerLevel || city.zones?.length > 0 || city.overflowEvents?.length > 0) && (
        <div>
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">CITY STATE</div>
          <div className="system-window p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] text-system-text-dim">Danger Level</span>
              <span className={`font-mono text-[10px] ${dangerLevelColor(city.dangerLevel)}`}>
                {city.dangerLevel || 'Low'}
              </span>
            </div>

            {/* Zones */}
            {city.zones?.length > 0 && (
              <div>
                <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1 mt-1">ZONES</div>
                <div className="space-y-1">
                  {city.zones.map((z, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="font-mono text-[10px] text-system-text truncate max-w-[120px]">{z.name}</span>
                      <span className={`font-mono text-[9px] ${zoneStatusColor(z.status)}`}>
                        {z.status || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Overflow Events */}
            {city.overflowEvents?.some((e) => e.status === 'active') && (
              <div className="border border-system-red border-opacity-40 p-2 mt-1">
                <div className="font-mono text-[9px] text-system-red tracking-wider mb-1">⚠ OVERFLOW ACTIVE</div>
                {city.overflowEvents
                  .filter((e) => e.status === 'active')
                  .map((e, i) => (
                    <div key={i} className="font-mono text-[10px] text-system-text leading-relaxed">
                      {e.zone}: {e.damage || 'Breach in progress'}
                    </div>
                  ))}
              </div>
            )}

            {/* Gate Activity */}
            {city.gateActivity?.length > 0 && (
              <div>
                <div className="font-mono text-[9px] text-system-text-dim tracking-wider mb-1 mt-1">GATE ACTIVITY</div>
                {city.gateActivity.slice(0, 3).map((g, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-system-text truncate max-w-[120px]">{g.zone}</span>
                    <span className={`font-mono text-[9px] ${g.status === 'overflow' ? 'text-system-red' : g.status === 'active' ? 'text-yellow-400' : 'text-system-green'}`}>
                      {g.rank}-rank {g.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* World Events */}
      <div>
        <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">WORLD EVENTS</div>
        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map((evt, i) => (
              <div key={i} className="border border-system-border p-2 bg-system-bg">
                <div className="font-mono text-[10px] text-system-text leading-relaxed">
                  {typeof evt === 'string' ? evt : evt.description || '—'}
                </div>
                {typeof evt === 'object' && evt.timestamp && (
                  <div className="font-mono text-[9px] text-system-text-dim mt-1">
                    {new Date(evt.timestamp).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="font-mono text-[10px] text-system-muted py-2">
            No active world events recorded.
          </div>
        )}
      </div>

      {/* Hunter Registry */}
      {registry.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">HUNTER REGISTRY</div>
          <div className="system-window p-2 space-y-1">
            {registry.slice(0, 8).map((entry, i) => (
              <div key={i} className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-1 truncate">
                  <span className={`font-mono text-[9px] flex-shrink-0 ${entry.rank === 'S' ? 'text-system-gold' : entry.rank === 'A' ? 'text-orange-400' : 'text-system-text-dim'}`}>
                    [{entry.rank || '?'}]
                  </span>
                  <span className="font-mono text-[10px] text-system-text truncate">{entry.name}</span>
                </div>
                <span className={`font-mono text-[9px] flex-shrink-0 ${entry.status === 'Deceased' ? 'text-system-red' : entry.status === 'Missing' ? 'text-yellow-400' : 'text-system-text-dim'}`}>
                  {entry.status || 'Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      {playerState?.location && (
        <div>
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">CURRENT LOCATION</div>
          <div className="font-mono text-xs text-system-text">{playerState.location}</div>
          {playerState.currentTime && (
            <div className="font-mono text-[10px] text-system-text-dim mt-1">{playerState.currentTime}</div>
          )}
        </div>
      )}

    </div>
  );
}
