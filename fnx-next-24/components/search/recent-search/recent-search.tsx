'use client';

import React from 'react';
import { MoreVertical } from 'lucide-react';

interface RecentSearchItem {
  id: number;
  tab: 'people' | 'companies';
  criteria: string[];
}

interface RecentSearchesDisplayProps {
  recentSearches: RecentSearchItem[];
}

export const RecentSearchesDisplay: React.FC<RecentSearchesDisplayProps> = ({ recentSearches }) => {
  const peopleSearches = recentSearches.filter(search => search.tab === 'people');
  const companySearches = recentSearches.filter(search => search.tab === 'companies');
  const hasSearches = peopleSearches.length > 0 || companySearches.length > 0;
  const recentSearchLogo = "https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/Saved_searches.svg";

  const renderSearchCard = (search: RecentSearchItem, index: number, type: 'People' | 'Company') => (
    <div key={search.id} className="relative bg-white border border-gray-200 rounded-md p-4 mb-3 shadow-sm flex justify-between items-center">
      <div>
        <h4 className="font-semibold text-blue-700">
          {type} - Search {index + 1}
        </h4>
        <div className="flex flex-wrap gap-2 mt-2">
          {search.criteria.map((item, i) => (
            <span key={i} className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200">
              {item}
            </span>
          ))}
        </div>
      </div>
      <button className="text-gray-500 hover:text-gray-700 absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100">
        <MoreVertical className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <div className="flex justify-center items-center h-full w-full p-4">
      {hasSearches ? (
        <div className="w-full max-w-md">
          {peopleSearches.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">People Recent Searches</h3>
              {peopleSearches.map((search, index) => renderSearchCard(search, index, 'People'))}
            </div>
          )}
          {companySearches.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Company Recent Searches</h3>
              {companySearches.map((search, index) => renderSearchCard(search, index, 'Company'))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
          <img src={recentSearchLogo} alt="No Saved Searches" className="mb-6" />
          <p className="text-xl font-semibold text-gray-800 mb-2">No Recent Search Found</p>
          <p className="text-base text-gray-600 mb-6">Start Searching Now!</p>
          <a
            href="/search"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Go To Search Page
          </a>
        </div>
      )}
    </div>
  );
};