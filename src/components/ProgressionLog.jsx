// Progression Log — full campaign history viewer with recharts visualization

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <div className="font-mono text-[9px] text-system-text-dim tracking-widest border-b border-system-border pb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

export default function ProgressionLog({ gameState, onClose }) {
  const [activeSection, setActiveSection] = useState('overview');
  const gs = gameState;

  const totalPlayTimeHours = ((gs.sessionMeta?.totalPlayTime || 0) / 3600000).toFixed(1);
  const sessionCount = gs.sessionMeta?.sessionNumber || 1;
  const levelHistory = gs.levelHistory || [];
  const skills = gs.skills || [];
  const titles = gs.titles || [];

  // Build reputation history chart data from level history
  const chartData = levelHistory.map((entry, i) => ({
    session: entry.sessionNumber || i + 1,
    level: entry.to || 0,
  }));

  const sections = ['overview', 'levels', 'skills', 'titles'];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-80">
      <div
        className="system-window w-full mx-6 flex flex-col"
        style={{ maxWidth: '800px', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="system-header flex items-center justify-between">
          <span>CAMPAIGN PROGRESSION LOG</span>
          <button
            onClick={onClose}
            className="font-mono text-[10px] text-system-text-dim hover:text-system-text"
          >
            [CLOSE]
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-system-border flex-shrink-0">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`font-mono text-[10px] tracking-wider px-4 py-2 transition-colors ${
                activeSection === s
                  ? 'tab-active'
                  : 'text-system-text-dim hover:text-system-text'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {activeSection === 'overview' && (
            <>
              <Section title="CAMPAIGN SUMMARY">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Sessions', value: sessionCount },
                    { label: 'Total Play Time', value: `${totalPlayTimeHours}h` },
                    { label: 'Current Level', value: gs.playerState?.level || 1 },
                    { label: 'Hunter Rank', value: `${gs.playerState?.rank || 'E'} Rank` },
                    { label: 'Skills', value: skills.length },
                    { label: 'Titles', value: titles.length },
                  ].map(({ label, value }) => (
                    <div key={label} className="system-window p-3 text-center">
                      <div className="font-mono text-lg text-system-blue">{value}</div>
                      <div className="font-mono text-[9px] text-system-text-dim mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </Section>

              {chartData.length > 1 && (
                <Section title="LEVEL PROGRESSION">
                  <div style={{ height: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                        <XAxis
                          dataKey="session"
                          tick={{ fill: '#7a7a8a', fontSize: 10, fontFamily: 'monospace' }}
                          label={{ value: 'Session', position: 'insideBottom', fill: '#7a7a8a', fontSize: 10 }}
                        />
                        <YAxis
                          tick={{ fill: '#7a7a8a', fontSize: 10, fontFamily: 'monospace' }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#0f0f1a',
                            border: '1px solid #2a2a3a',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            color: '#c8c8d4',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="level"
                          stroke="#4A90D9"
                          strokeWidth={2}
                          dot={{ fill: '#4A90D9', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}

              <Section title="CURRENT STATUS">
                <div className="font-mono text-xs space-y-1">
                  <div className="flex gap-2">
                    <span className="text-system-text-dim">Location:</span>
                    <span className="text-system-text">{gs.playerState?.location || '—'}</span>
                  </div>
                  {gs.playerState?.statusEffects?.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-system-text-dim">Status:</span>
                      <span className="text-system-red">{gs.playerState.statusEffects.join(', ')}</span>
                    </div>
                  )}
                </div>
              </Section>
            </>
          )}

          {activeSection === 'levels' && (
            <Section title="LEVEL HISTORY">
              {levelHistory.length === 0 ? (
                <div className="font-mono text-[10px] text-system-muted">No level-up events recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {levelHistory.map((entry, i) => (
                    <div key={i} className="flex items-center gap-4 border-b border-system-border pb-2">
                      <div className="font-mono text-xs text-system-blue min-w-[80px]">
                        {entry.from} → {entry.to}
                      </div>
                      <div className="font-mono text-[10px] text-system-text-dim">
                        Session {entry.sessionNumber || '?'}
                      </div>
                      <div className="font-mono text-[10px] text-system-muted flex-1 text-right">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {activeSection === 'skills' && (
            <Section title={`SKILLS (${skills.length})`}>
              {skills.length === 0 ? (
                <div className="font-mono text-[10px] text-system-muted">No skills recorded.</div>
              ) : (
                <div className="space-y-3">
                  {skills.map((skill, i) => (
                    <div key={i} className="border border-system-border p-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-mono text-xs text-system-text">{skill.name}</span>
                        <span className="font-mono text-[9px] text-system-text-dim">
                          {skill.type} · Rank {skill.rank}
                        </span>
                      </div>
                      {skill.currentEffect && (
                        <div className="font-mono text-[10px] text-system-text-dim">{skill.currentEffect}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {activeSection === 'titles' && (
            <Section title={`TITLES (${titles.length})`}>
              {titles.length === 0 ? (
                <div className="font-mono text-[10px] text-system-muted">No titles earned.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {titles.map((title, i) => (
                    <div
                      key={i}
                      className="font-mono text-sm text-system-gold border border-system-gold border-opacity-30 px-3 py-2"
                    >
                      「{title}」
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}
