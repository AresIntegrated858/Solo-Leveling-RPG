// Right Panel Tab — Economy (Expenses, Contracts, Market Prices)

import React, { useState } from 'react';

const RANK_COLORS = { S: 'text-system-gold', A: 'text-orange-400', B: 'text-purple-400', C: 'text-system-blue', D: 'text-system-green', E: 'text-system-text-dim' };
const STONE_RANKS = ['S', 'A', 'B', 'C', 'D', 'E'];

function formatWon(amount) {
  if (!amount || amount === 0) return '0';
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000)    return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000)       return `${(amount / 1000).toFixed(0)}K`;
  return String(amount);
}

function TrendArrow({ direction }) {
  if (!direction || direction === 'stable') return <span className="text-system-text-dim text-[10px]">—</span>;
  if (/rising/i.test(direction)) return <span className="text-system-red text-[10px]">↑</span>;
  return <span className="text-system-green text-[10px]">↓</span>;
}

function ContractCard({ contract }) {
  const [expanded, setExpanded] = useState(false);
  const rankColor = RANK_COLORS[contract.rank] || 'text-system-text-dim';
  const statusColor = contract.status === 'available' ? 'text-system-gold' : 'text-system-text-dim';

  return (
    <div
      className="border border-system-border border-opacity-40 bg-system-bg cursor-pointer hover:border-opacity-70 transition-all"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-2 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 truncate">
          <span className={`font-mono text-[9px] flex-shrink-0 ${rankColor}`}>[{contract.rank}]</span>
          <span className="font-mono text-[10px] text-system-text truncate">{contract.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {contract.reward > 0 && (
            <span className="font-mono text-[9px] text-system-gold">{formatWon(contract.reward)}₩</span>
          )}
          <span className={`font-mono text-[9px] ${statusColor} uppercase`}>{contract.status}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-system-border px-3 pb-2 pt-1 space-y-1 bg-system-panel">
          {contract.deadline && (
            <div className="flex justify-between">
              <span className="font-mono text-[9px] text-system-text-dim">DEADLINE</span>
              <span className="font-mono text-[10px] text-system-text">{contract.deadline}</span>
            </div>
          )}
          {contract.sponsor && (
            <div className="flex justify-between">
              <span className="font-mono text-[9px] text-system-text-dim">SPONSOR</span>
              <span className="font-mono text-[10px] text-system-text">{contract.sponsor}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EconomyPanel({ economy, market, inventory }) {
  const eco = economy || {};
  const mkt = market || {};
  const inv = inventory || {};
  const expenses = eco.expenses || {};
  const activeContracts = eco.activeContracts || [];
  const contractHistory = eco.contractHistory || [];
  const stonePrices = mkt.stonePrices || {};
  const priceIndex = mkt.priceIndex || {};
  const trend = mkt.trend || {};
  const cash = inv.currency?.cash ?? 0;
  const stones = inv.currency?.magicStones || {};

  const monthlyBurn = (expenses.rent || 0) + (expenses.associationLicense || 0) + (expenses.food ? expenses.food * 4 : 0);

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">

      {/* Cash Balance */}
      <div>
        <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">BALANCE</div>
        <div className="system-window p-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-system-text-dim">Cash on hand</span>
            <span className="font-mono text-xs text-system-gold">{formatWon(cash)} won</span>
          </div>
          {monthlyBurn > 0 && (
            <div className="flex justify-between items-center mt-1">
              <span className="font-mono text-[10px] text-system-text-dim">Monthly burn</span>
              <span className="font-mono text-[10px] text-system-red">-{formatWon(monthlyBurn)}/mo</span>
            </div>
          )}
        </div>
      </div>

      {/* Expenses */}
      {(expenses.rent || expenses.associationLicense || expenses.food || expenses.medical || expenses.maintenance) && (
        <div>
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">EXPENSES</div>
          <div className="system-window p-3 space-y-2">
            {expenses.rent > 0 && (
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-system-text-dim">Rent</span>
                <span className="font-mono text-[10px] text-system-text">{formatWon(expenses.rent)}/mo</span>
              </div>
            )}
            {expenses.associationLicense > 0 && (
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-system-text-dim">Association License</span>
                <span className="font-mono text-[10px] text-system-text">{formatWon(expenses.associationLicense)}/mo</span>
              </div>
            )}
            {expenses.food > 0 && (
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-system-text-dim">Food</span>
                <span className="font-mono text-[10px] text-system-text">{formatWon(expenses.food)}/wk</span>
              </div>
            )}
            {expenses.medical > 0 && (
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-system-text-dim">Medical Bills</span>
                <span className="font-mono text-[10px] text-system-red">{formatWon(expenses.medical)} owed</span>
              </div>
            )}
            {expenses.maintenance > 0 && (
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-system-text-dim">Gear Maintenance</span>
                <span className="font-mono text-[10px] text-system-text">{formatWon(expenses.maintenance)}/gate</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Contracts */}
      {activeContracts.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">ACTIVE CONTRACTS</div>
          <div className="space-y-2">
            {activeContracts.map((c, i) => (
              <ContractCard key={i} contract={c} />
            ))}
          </div>
        </div>
      )}

      {/* Magic Stone Market */}
      <div>
        <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">STONE MARKET</div>
        <div className="system-window p-2 space-y-1">
          {STONE_RANKS.map((rank) => {
            const basePrice = stonePrices[rank] || 0;
            const idx = priceIndex[rank] || 100;
            const adjPrice = basePrice > 0 ? Math.round(basePrice * idx / 100) : null;
            const owned = stones[rank] || 0;
            const rankColor = RANK_COLORS[rank] || 'text-system-text-dim';
            if (!adjPrice && owned === 0) return null;
            return (
              <div key={rank} className="flex items-center gap-2">
                <span className={`font-mono text-[9px] w-4 flex-shrink-0 ${rankColor}`}>{rank}</span>
                <span className="font-mono text-[10px] text-system-text flex-1">
                  {adjPrice ? `~${formatWon(adjPrice)}₩` : '—'}
                </span>
                <TrendArrow direction={trend[rank]} />
                {owned > 0 && (
                  <span className="font-mono text-[9px] text-system-text-dim">×{owned}</span>
                )}
              </div>
            );
          })}
          {STONE_RANKS.every((r) => !stonePrices[r] && !(stones[r] > 0)) && (
            <div className="font-mono text-[10px] text-system-muted">No market data on record.</div>
          )}
        </div>
      </div>

      {/* Contract History */}
      {contractHistory.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">CONTRACT HISTORY</div>
          <div className="space-y-1">
            {contractHistory.slice(-5).reverse().map((c, i) => (
              <div key={i} className="flex justify-between items-center border border-system-border p-2 bg-system-bg">
                <span className="font-mono text-[10px] text-system-text truncate max-w-[120px]">{c.name}</span>
                <div className="flex items-center gap-2">
                  {c.reward > 0 && (
                    <span className="font-mono text-[9px] text-system-gold">{formatWon(c.reward)}₩</span>
                  )}
                  <span className={`font-mono text-[9px] ${c.outcome === 'Completed' ? 'text-system-green' : 'text-system-red'}`}>
                    {c.outcome || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
