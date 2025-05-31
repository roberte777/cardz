'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Card {
  id: string;
  name: string;
  manaCost?: string;
  cmc: number;
  typeLine: string;
  oracleText?: string;
  power?: string;
  toughness?: string;
  setName: string;
  rarity: string;
  imageUris?: {
    normal?: string;
    small?: string;
  };
  colors: string[];
  prices?: {
    usd?: string;
  };
}

interface SearchResponse {
  cards: Card[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<SearchResponse['pagination'] | null>(null);
  const [selectedRarity, setSelectedRarity] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const fetchCards = async (query = '', page = 1, rarity = '', colors: string[] = []) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '12',
        page: page.toString(),
      });

      if (query) params.append('q', query);
      if (rarity) params.append('rarity', rarity);
      if (colors.length > 0) params.append('colors', JSON.stringify(colors));

      const response = await fetch(`/api/cards?${params}`);
      const data: SearchResponse = await response.json();

      setCards(data.cards);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCards(searchQuery, 1, selectedRarity, selectedColors);
  };

  const handleColorToggle = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const colorSymbols = {
    W: '⚪', // White
    U: '🔵', // Blue
    B: '⚫', // Black
    R: '🔴', // Red
    G: '🟢', // Green
  };

  const rarityColors = {
    common: 'text-gray-600',
    uncommon: 'text-gray-400',
    rare: 'text-yellow-600',
    mythic: 'text-orange-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-white">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Cardz
              </span>
            </h1>
            <p className="text-gray-300 text-lg">MTG Deck Building Platform</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for cards..."
                className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Rarity Filter */}
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="mythic">Mythic</option>
              </select>

              {/* Color Filter */}
              <div className="flex gap-2">
                <span className="text-gray-300 text-sm self-center">Colors:</span>
                {Object.entries(colorSymbols).map(([color, symbol]) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorToggle(color)}
                    className={`w-8 h-8 rounded-full text-lg transition-all ${selectedColors.includes(color)
                        ? 'ring-2 ring-white scale-110'
                        : 'opacity-60 hover:opacity-100'
                      }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Results */}
        {pagination && (
          <div className="mb-6">
            <p className="text-gray-300">
              Showing {cards.length} of {pagination.totalCount} cards
            </p>
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-white/20 hover:border-white/40 transition-all hover:scale-105"
            >
              {card.imageUris?.normal && (
                <div className="aspect-[5/7] relative">
                  <Image
                    src={card.imageUris.normal}
                    alt={card.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-bold text-white mb-2 line-clamp-2">{card.name}</h3>
                <p className="text-gray-300 text-sm mb-2">{card.setName}</p>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${rarityColors[card.rarity as keyof typeof rarityColors] || 'text-gray-400'}`}>
                    {card.rarity}
                  </span>
                  {card.prices?.usd && (
                    <span className="text-green-400 text-sm font-medium">
                      ${card.prices.usd}
                    </span>
                  )}
                </div>
                {card.colors.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {card.colors.map((color) => (
                      <span key={color} className="text-sm">
                        {colorSymbols[color as keyof typeof colorSymbols]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => fetchCards(searchQuery, pagination.page - 1, selectedRarity, selectedColors)}
              disabled={!pagination.hasPrevPage || loading}
              className="px-4 py-2 bg-white/20 text-white rounded-lg disabled:opacity-50 hover:bg-white/30 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-white">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchCards(searchQuery, pagination.page + 1, selectedRarity, selectedColors)}
              disabled={!pagination.hasNextPage || loading}
              className="px-4 py-2 bg-white/20 text-white rounded-lg disabled:opacity-50 hover:bg-white/30 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && cards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No cards found. Try adjusting your search criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}
