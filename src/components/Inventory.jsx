// Right Panel Tab 2 — Inventory

import React from 'react';

function ItemCard({ item }) {
  const name = typeof item === 'string' ? item : item.name;
  const desc = typeof item === 'object' ? item.description : null;
  const rarity = typeof item === 'object' ? item.rarity : null;

  const rarityColor = {
    Common: 'text-system-text-dim',
    Uncommon: 'text-system-green',
    Rare: 'text-system-blue',
    Epic: 'text-purple-400',
    Legendary: 'text-system-gold',
  };

  return (
    <div className="border border-system-border p-2 bg-system-bg space-y-1">
      <div className="flex justify-between items-start">
        <div className={`font-mono text-xs ${rarity ? rarityColor[rarity] || 'text-system-text' : 'text-system-text'}`}>
          {name || '—'}
        </div>
        {rarity && (
          <span className={`font-mono text-[9px] ${rarityColor[rarity] || 'text-system-text-dim'}`}>
            {rarity}
          </span>
        )}
      </div>
      {desc && (
        <div className="font-mono text-[10px] text-system-text-dim leading-relaxed">{desc}</div>
      )}
      {typeof item === 'object' && item.effect && (
        <div className="font-mono text-[10px] text-system-blue">{item.effect}</div>
      )}
      {typeof item === 'object' && item.quantity && item.quantity > 1 && (
        <div className="font-mono text-[9px] text-system-text-dim">x{item.quantity}</div>
      )}
    </div>
  );
}

function Section({ title, items, emptyText }) {
  return (
    <div>
      <div className="font-mono text-[9px] text-system-text-dim tracking-widest mb-2">{title}</div>
      {items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, i) => <ItemCard key={i} item={item} />)}
        </div>
      ) : (
        <div className="font-mono text-[10px] text-system-muted py-2">{emptyText}</div>
      )}
    </div>
  );
}

export default function Inventory({ inventory }) {
  const inv = inventory || {};

  const isEmpty = !inv.equipment?.length && !inv.consumables?.length && !inv.artifacts?.length;

  if (isEmpty) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="font-mono text-xs text-system-text-dim">[ INVENTORY EMPTY ]</div>
          <div className="font-mono text-[10px] text-system-muted">
            Items acquired in the field will appear here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {/* Currency */}
      {(inv.currency?.gold > 0 || inv.currency?.crystals > 0) && (
        <div className="system-window p-3">
          <div className="flex justify-between font-mono text-xs">
            <div>
              <span className="text-system-text-dim">Gold: </span>
              <span className="text-system-gold">{inv.currency.gold?.toLocaleString() || 0}</span>
            </div>
            <div>
              <span className="text-system-text-dim">Crystals: </span>
              <span className="text-system-blue">{inv.currency.crystals?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      )}

      <Section
        title="EQUIPMENT"
        items={inv.equipment}
        emptyText="No equipment."
      />
      <Section
        title="CONSUMABLES"
        items={inv.consumables}
        emptyText="No consumables."
      />
      <Section
        title="ARTIFACTS"
        items={inv.artifacts}
        emptyText="No artifacts."
      />
    </div>
  );
}
