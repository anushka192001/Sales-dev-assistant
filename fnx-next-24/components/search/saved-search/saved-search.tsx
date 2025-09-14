'use client';

import React from 'react';
import { MoreVertical } from 'lucide-react';

export interface SavedSearchItem {
    id: number;
    name: string;
    tab: 'people' | 'companies';
    criteria: string[];
    savedAt: string;
}

interface SavedSearchesDisplayProps {
    savedSearches: SavedSearchItem[];
}

export const SavedSearchesDisplay: React.FC<SavedSearchesDisplayProps> = ({ savedSearches }) => {
    const savedSearchLogo = "https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/Saved_searches.svg";

    const renderSavedSearchCard = (search: SavedSearchItem) => (
        <div key={search.id} className="relative bg-white border border-gray-200 rounded-md p-4 mb-3 shadow-sm flex justify-between items-center">
            <div>
                <h4 className="font-semibold text-blue-700 mb-1">{search.name}</h4>
                <p className="text-xs text-gray-500 mb-2">
                    {search.tab === 'people' ? 'People Search' : 'Company Search'} saved on {new Date(search.savedAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                    {search.criteria.map((item, i) => (
                        <span key={i} className="bg-green-50 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200">
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
        <div className={`p-4 w-full md:w-1/2 mx-auto ${savedSearches.length === 0
                ? 'flex flex-col items-center justify-center h-full' : ''}`}
        >
            {savedSearches.length > 0 ? (
                <>
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">Your Saved Searches</h3>
                    {savedSearches.map(renderSavedSearchCard)}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <img src={savedSearchLogo} alt="No Saved Searches" className="mb-6" />
                    <p className="text-xl font-semibold text-gray-800 mb-2">No Saved Search Found</p>
                    <p className="text-base text-gray-600 mb-6">Start Saving Now!</p>
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