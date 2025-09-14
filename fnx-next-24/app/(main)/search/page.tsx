'use client';

import { Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loader';

const fetchSearchResults = (tab: string, type: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (tab === 'all') {
        resolve(Math.random() > 0.5);
      } else if (tab === 'saved' && type === 'people') {
        resolve(Math.random() > 0.7);
      } else if (tab === 'saved' && type === 'companies') {
        resolve(Math.random() > 0.6);
      } else if (tab === 'restricted') {
        resolve(Math.random() > 0.8);
      }
      resolve(false);
    }, 1500);
  });
};

function SearchPageContent() {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('type') as 'people' | 'companies') || 'people';
  
  const illustrationUrl = 'https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/empty%20state%20illustration%20(2).svg';
  const arrowUrl = 'https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/Left-Arrow.svg';

  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('all');
  const [hasAllSearchResults, setHasAllSearchResults] = useState(false);
  const [hasSavedPeopleResults, setHasSavedPeopleResults] = useState(false);
  const [hasSavedCompanyResults, setHasSavedCompanyResults] = useState(false);
  const [hasRestrictedResults, setHasRestrictedResults] = useState(false);

  const savedPeopleCount = 8;
  const savedCompanyCount = 5;
  const restrictedCount = 3;

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      let results;

      if (currentTab === 'all') {
        results = await fetchSearchResults('all', activeTab);
        setHasAllSearchResults(results as boolean);
      } else if (currentTab === 'saved' && activeTab === 'people') {
        results = await fetchSearchResults('saved', 'people');
        setHasSavedPeopleResults(results as boolean);
      } else if (currentTab === 'saved' && activeTab === 'companies') {
        results = await fetchSearchResults('saved', 'companies');
        setHasSavedCompanyResults(results as boolean);
      } else if (currentTab === 'restricted' && activeTab === 'companies') {
        results = await fetchSearchResults('restricted', 'companies');
        setHasRestrictedResults(results as boolean);
      }
      setLoading(false);
    };

    loadResults();
  }, [currentTab, activeTab]);

  const EmptyStateUI = () => (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <div className="relative flex items-center justify-center w-full">
        <div className="absolute z-10 left-0 bottom-[120%] transform -translate-x-1/2 ml-[80px]">
          <p className="text-sm text-foreground whitespace-nowrap">Start your search</p>
          <p className="text-sm text-foreground whitespace-nowrap">by adding filters</p>
          <img
            src={arrowUrl}
            alt="Left Arrow"
            width={50}
            height={50}
            className="mt-2 object-contain"
          />
        </div>

        <div className="relative">
          <img
            src={illustrationUrl}
            alt="Empty Search State Illustration"
            width={700}
            height={300}
            className="object-contain"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Filter className="mb-0.5 text-blue-500 flex items-center gap-2
        bg-white
        border border-gray-200
        rounded-md
        shadow-md
        py-2 px-2
        w-fit" size={35} />
        <p>Use personalized filters on the left to find people.</p>
      </div>
    </div>
  );

  const RestrictedEmptyStateUI = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
      <p className="text-xl font-semibold mb-2">No Restricted Companies</p>
      <p>There are no restricted company found to display at the moment.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="all" className="flex-1 flex flex-col" onValueChange={setCurrentTab}>
        <TabsList className="!bg-transparent !text-gray-700 !h-auto !w-full !p-0 !rounded-none !justify-start">
          <TabsTrigger
            value="all"
            className="!bg-transparent cursor-pointer !text-gray-700 !border-0 !rounded-none !px-4 !py-3 !font-medium !shadow-none !h-auto data-[state=active]:!bg-transparent data-[state=active]:!text-black data-[state=active]:!shadow-none !border-b-2 !border-transparent data-[state=active]:!border-orange-500 data-[state=active]:!border-b-2 !flex-none relative"
          >
            All
          </TabsTrigger>

          {activeTab === 'people' && (
            <TabsTrigger
              value="saved"
              className="!bg-transparent cursor-pointer !text-gray-700 !border-0 !rounded-none !px-4 !py-3 !font-medium !shadow-none !h-auto data-[state=active]:!bg-transparent data-[state=active]:!text-black data-[state=active]:!shadow-none !border-b-2 !border-transparent data-[state=active]:!border-orange-500 data-[state=active]:!border-b-2 !flex-none relative"
            >
              Saved People ({savedPeopleCount})
            </TabsTrigger>
          )}

          {activeTab === 'companies' && (
            <>
              <TabsTrigger
                value="saved"
                className="!bg-transparent cursor-pointer !text-gray-700 !border-0 !rounded-none !px-4 !py-3 !font-medium !shadow-none !h-auto data-[state=active]:!bg-transparent data-[state=active]:!text-black data-[state=active]:!shadow-none !border-b-2 !border-transparent data-[state=active]:!border-orange-500 data-[state=active]:!border-b-2 !flex-none relative"
              >
                Saved Companies ({savedCompanyCount})
              </TabsTrigger>
              <TabsTrigger
                value="restricted"
                className="!bg-transparent cursor-pointer !text-gray-700 !border-0 !rounded-none !px-4 !py-3 !font-medium !shadow-none !h-auto data-[state=active]:!bg-transparent data-[state=active]:!text-black data-[state=active]:!shadow-none !border-b-2 !border-transparent data-[state=active]:!border-orange-500 data-[state=active]:!border-b-2 !flex-none relative"
              >
                Restricted ({restrictedCount})
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="all" className="flex-1 flex flex-col mt-0">
          {loading ? (
            <LoadingSpinner />
          ) : hasAllSearchResults ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Display all search results based on filters here...</p>
            </div>
          ) : (
            <EmptyStateUI />
          )}
        </TabsContent>

        {activeTab === 'people' && (
          <TabsContent value="saved" className="flex-1 flex flex-col mt-0">
            {loading ? (
              <LoadingSpinner />
            ) : hasSavedPeopleResults ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Display saved people results here...</p>
              </div>
            ) : (
              <EmptyStateUI />
            )}
          </TabsContent>
        )}

        {activeTab === 'companies' && (
          <>
            <TabsContent value="saved" className="flex-1 flex flex-col mt-0">
              {loading ? (
                <LoadingSpinner />
              ) : hasSavedCompanyResults ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p>Display saved company results here...</p>
                </div>
              ) : (
                <EmptyStateUI />
              )}
            </TabsContent>
            <TabsContent value="restricted" className="flex-1 flex flex-col mt-0">
              {loading ? (
                <LoadingSpinner />
              ) : hasRestrictedResults ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p>Display restricted results here...</p>
                </div>
              ) : (
                <RestrictedEmptyStateUI />
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SearchPageContent />
    </Suspense>
  );
}