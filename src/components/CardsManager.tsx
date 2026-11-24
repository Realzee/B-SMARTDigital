import React, { useState } from 'react';
import { CreditCard, Search, Edit, Trash2, Smartphone, Building2 } from 'lucide-react';
import { BusinessCard, Company, User } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { useTheme } from '../context/ThemeContext';
import { isMasterTemplateCard } from '../utils/linking';

interface CardsManagerProps {
  cards: BusinessCard[];
  companies: Company[];
  users?: User[];
  onEditCard: (card: BusinessCard) => void;
  onDeleteCard: (cardId: string) => void;
}

export const CardsManager: React.FC<CardsManagerProps> = ({
  cards,
  companies,
  users = [],
  onEditCard,
  onDeleteCard,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'date' | 'views' | 'name'>('date');
  const [cardToDelete, setCardToDelete] = useState<BusinessCard | null>(null);

  const filtered = cards.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.businessName.toLowerCase().includes(q) ||
      c.contactPersonName.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (sort === 'name') return a.businessName.localeCompare(b.businessName);
    if (sort === 'views') return b.viewsCount - a.viewsCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // date
  });

  return (
    <div className={`max-w-5xl mx-auto p-3 sm:p-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 dark:border-slate-800/80 border-slate-200 mb-6">
        <h2 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
          <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
          <span>Cards Management</span>
        </h2>
        
        {/* Sort Dropdown */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500'
              : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500 shadow-sm'
          } focus:outline-none`}
        >
          <option value="date">Sort by Date Created</option>
          <option value="views">Sort by View Count</option>
          <option value="name">Sort by Business Name</option>
        </select>
      </div>

      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search by business name, person, or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 shadow-sm'
          } border text-xs focus:outline-none transition-colors`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((card) => {
          const company = companies.find((c) => c.id === card.companyId);
          const isMaster = isMasterTemplateCard(card);
          const owner = card.assignedMemberId ? users.find((u) => u.id === card.assignedMemberId) : undefined;
          const subtitleLabel = isMaster
            ? 'Company Master Template'
            : card.contactPersonName || owner?.name || 'Unassigned Employee Card';

          return (
            <div
              key={card.id}
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              } flex flex-col gap-3`}
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-11 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 p-0.5 flex items-center justify-center shrink-0">
                  <img src={card.logoUrl || ''} alt={card.businessName} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.businessName}</h4>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        isMaster
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : owner
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isMaster ? 'Template' : owner ? 'Assigned' : 'Unassigned'}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitleLabel}</p>
                </div>
              </div>
              
              <div className={`text-[11px] p-2 rounded-lg ${isDark ? 'bg-slate-950/50 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                <div className="flex items-center gap-1.5 truncate"><Building2 className="w-3 h-3 shrink-0"/> <span className="truncate">{company?.name || 'Standalone Card'}</span></div>
                <div className="flex items-center gap-1.5 mt-1 font-mono"><Smartphone className="w-3 h-3 shrink-0"/> /{card.slug}</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/50">
                <button
                  onClick={() => onEditCard(card)}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                  title="Edit Card"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCardToDelete(card)}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-950/50 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                  title="Delete Card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {cardToDelete && (
        <ConfirmationModal
          isOpen={!!cardToDelete}
          onClose={() => setCardToDelete(null)}
          onConfirm={() => {
            if (cardToDelete) onDeleteCard(cardToDelete.id);
            setCardToDelete(null);
          }}
          title="Delete Smart Card"
          message={`Are you sure you want to permanently delete the card for "${cardToDelete.businessName}"?`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          type="danger"
        />
      )}
    </div>
  );
};
