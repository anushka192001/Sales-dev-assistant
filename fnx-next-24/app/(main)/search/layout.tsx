'use client';

import { useState, ReactNode } from 'react';
import { SidebarFilters } from "@/components/search/SearchFilters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RecentSearchesDisplay } from '@/components/search/recent-search/recent-search';
import { SavedSearchItem, SavedSearchesDisplay } from '@/components/search/saved-search/saved-search';
import { SaveSearchModal } from '@/components/ui/save-search-modal';
import SearchPage from './page';

interface RecentSearchItem {
  id: number;
  tab: 'people' | 'companies';
  criteria: string[];
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'people' | 'companies' | 'recent' | 'saved'>('people');
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [nextSearchId, setNextSearchId] = useState(1);
  const [nextSavedSearchId, setNextSavedSearchId] = useState(1);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [criteriaToSave, setCriteriaToSave] = useState<string[]>([]);

  const buttonTopOffset = '3px';

  const toggleFilters = () => {
    setIsFiltersOpen(!isFiltersOpen);
  };

  const showFilterSidebarAndButton = activeTab === 'people' || activeTab === 'companies';

  const handleSearch = (criteria: string[]) => {
    if (criteria.length > 0) {
      setRecentSearches((prevSearches) => [
        { id: nextSearchId, tab: activeTab as ('people' | 'companies'), criteria },
        ...prevSearches,
      ]);
      setNextSearchId((prevId) => prevId + 1);
    }
  };

  const handleSaveSearchClick = (criteria: string[]) => {
    if (criteria.length === 0) {
      return;
    }
    setCriteriaToSave(criteria);
    setShowSaveModal(true);
  };

  const handleSaveSearch = (searchName: string) => {
    if (searchName.trim()) {
      const newSavedSearch: SavedSearchItem = {
        id: nextSavedSearchId,
        name: searchName.trim(),
        tab: activeTab as ('people' | 'companies'),
        criteria: criteriaToSave,
        savedAt: new Date().toISOString(),
      };

      setSavedSearches((prevSavedSearches) => [...prevSavedSearches, newSavedSearch]);
      setNextSavedSearchId((prevId) => prevId + 1);
    }
    setShowSaveModal(false);
    setCriteriaToSave([]);
  };

  const renderMainContent = (): ReactNode => {
    switch (activeTab) {
      case 'people':
        return <SearchPage activeTab="people" />;
      case 'companies':
        return <SearchPage activeTab="companies" />;
      case 'recent':
        return <RecentSearchesDisplay recentSearches={recentSearches} />;
      case 'saved':
        return <SavedSearchesDisplay savedSearches={savedSearches} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <h2 className="text-2xl font-semibold mb-2">Search</h2>
            <p className="text-gray-600">Search and discover potential leads</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b bg-[#E9F5FE]">
        <Tabs
          value={activeTab}
          className="w-full px-3 py-3"
          onValueChange={(value) => setActiveTab(value as ('people' | 'companies' | 'recent' | 'saved'))}
        >
          <TabsList className="flex h-10 items-center bg-[#E9F5FE] gap-2 px-2 py-1">
            <TabsTrigger
              value="people"
              className="rounded-full px-4 cursor-pointer py-1.5 text-sm font-medium text-muted-foreground hover:text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              People
            </TabsTrigger>
            <TabsTrigger
              value="companies"
              className="rounded-full px-4 py-1.5 cursor-pointer text-sm font-medium text-muted-foreground hover:text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Companies
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="rounded-full px-4 py-1.5 cursor-pointer text-sm font-medium text-muted-foreground hover:text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Recent Searches
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-full px-4 py-1.5 cursor-pointer text-sm font-medium text-muted-foreground hover:text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Saved Searches
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`flex-shrink-0 h-full relative 
            ${showFilterSidebarAndButton && isFiltersOpen ? 'w-80 border-r' : 'w-12'}
            ${!showFilterSidebarAndButton ? 'w-0 hidden' : ''}`}
        >
          {showFilterSidebarAndButton && isFiltersOpen && (
            <div className="h-full space-y-6">
              <SidebarFilters activeTab={activeTab} onSearch={handleSearch} onSaveSearchClick={handleSaveSearchClick} />
            </div>
          )}

          {showFilterSidebarAndButton && (
            <button
              onClick={toggleFilters}
              className={`absolute z-20 p-2 cursor-pointer text-white bg-orange-500 shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center
                ${isFiltersOpen
                  ? 'right-0 rounded-l-md w-8'
                  : 'left-0 rounded-r-md w-full h-25 flex-col'}`}
              style={{ top: buttonTopOffset }}
              aria-label={isFiltersOpen ? "Collapse filters" : "Expand filters"}
            >
              {isFiltersOpen ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <div className="flex flex-col gap-4 items-center">
                  <ChevronRight className="h-5 w-5 mb-1" />
                  <span className="text-xs font-semibold transform -rotate-90 whitespace-nowrap -translate-y-1">
                    Filters
                  </span>
                </div>
              )}
            </button>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto p-2 relative`}>
          {renderMainContent()}

          {showSaveModal && (
            <SaveSearchModal
              isOpen={showSaveModal}
              onClose={() => setShowSaveModal(false)}
              onSave={handleSaveSearch}
            />
          )}
        </div>
      </div>
    </div>
  );
}