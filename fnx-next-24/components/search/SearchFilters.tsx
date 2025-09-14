'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search as SearchIcon, Settings, Snail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { MultiSelectDropdown } from './location/location-drop-down';

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  helper?: string;
  isOpen: boolean;
  onToggle: () => void;
}

const countries = [
  { label: 'APAC', value: 'group-header-apac', group: 'APAC' },
  { label: 'Afghanistan', value: 'afghanistan', group: 'APAC' },
  { label: 'Bangladesh', value: 'bangladesh', group: 'APAC' },
  { label: 'Australia', value: 'australia', group: 'APAC' },
  { label: 'Antarctica', value: 'antarctica', group: 'APAC' },
  { label: 'American Samoa', value: 'american-samoa', group: 'APAC' },
  { label: 'Europe', value: 'group-header-europe', group: 'Europe' },
  { label: 'France', value: 'france', group: 'Europe' },
  { label: 'Germany', value: 'germany', group: 'Europe' },
];

const FilterSection = ({ title, children, helper, isOpen, onToggle }: FilterSectionProps) => {
  return (
    <div className={`mb-3 rounded-sm overflow-hidden transition ${isOpen ? 'border border-blue-500 bg-white' : 'border border-gray-350 bg-blue-50'}`}>
      <button
        onClick={onToggle}
        className={`flex items-center cursor-pointer justify-between w-full px-3 py-2 text-sm font-medium transition
          ${isOpen ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100 border border-blue-100'}`}
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="bg-white px-3 pb-3 pt-1 space-y-2">
          {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
          {children}
        </div>
      )}
    </div>
  );
};

interface SidebarFiltersProps {
  activeTab: string;
  onSearch: (criteria: string[]) => void;
  onSaveSearchClick: (criteria: string[]) => void;
}

export function SidebarFilters({ activeTab, onSearch, onSaveSearchClick }: SidebarFiltersProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchState, setSearchState] = useState<string>('');
  const [searchCity, setSearchCity] = useState<string>('');
  const [idealCustomerProfile, setIdealCustomerProfile] = useState(false);
  const [selectedSeniorityLevels, setSelectedSeniorityLevels] = useState<string[]>([]);
  const [selectedFunctionalLevels, setSelectedFunctionalLevels] = useState<string[]>([]);
  const [searchTitle, setSearchTitle] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedCompanySizes, setSelectedCompanySizes] = useState<string[]>([]);
  const [personName, setPersonName] = useState<string>('');
  const [linkedInLink, setLinkedInLink] = useState<string>('');
  const [companyNameWebsite, setCompanyNameWebsite] = useState<string>('');
  const [industryType, setIndustryType] = useState<string>('');
  const [industryKeyword, setIndustryKeyword] = useState<string>('');
  const [revenue, setRevenue] = useState<string>('');
  const [funding, setFunding] = useState<string>('');
  const [companyLocation, setCompanyLocation] = useState<string>('');
  const [productService, setProductService] = useState<string>('');
  const [technologyParameter, setTechnologyParameter] = useState<string>('');
  const [websiteKeywords, setWebsiteKeywords] = useState<string>('');
  const [buyerIntent, setBuyerIntent] = useState<string>('');
  const [hiringIntent, setHiringIntent] = useState<string>('');
  const [jobPosting, setJobPosting] = useState<string>('');
  const [suppressions, setSuppressions] = useState<string>('');
  const [excludeViewedPeople, setExcludeViewedPeople] = useState<string>('');
  const [excludeEmailedPeople, setExcludeEmailedPeople] = useState<string>('');
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [openFilterSection, setOpenFilterSection] = useState<string | null>(null);

  const companySizeOptions = [
    { label: '10000+', value: '10000+' },
    { label: '5001 - 10000', value: '5001-10000' },
    { label: '1001 - 5000', value: '1001-5000' },
    { label: '501 - 1000', value: '501-1000' },
    { label: '201 - 500', value: '201-500' },
    { label: '51 - 200', value: '51-200' },
    { label: '11 - 50', value: '11-50' },
  ];

  const seniorityOptions = [
    { label: 'Founder', value: 'founder' },
    { label: 'Chairman', value: 'chairman' },
    { label: 'President', value: 'president' },
    { label: 'CEO', value: 'ceo' },
    { label: 'CXO', value: 'cxo' },
    { label: 'Vice President', value: 'vice-president' },
    { label: 'Director', value: 'director' },
  ];

  const functionalOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Analytics', value: 'analytics' },
    { label: 'Applications', value: 'applications' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Controller', value: 'controller' },
    { label: 'Customer Service', value: 'customer-service' },
    { label: 'Cloud', value: 'cloud' },
  ];

  const handleFilterToggle = (sectionId: string) => {
    setOpenFilterSection(openFilterSection === sectionId ? null : sectionId);
  };

  useEffect(() => {
    const checkActiveFilters = () => {
      const isActive =
        selectedCountries.length > 0 ||
        searchState.trim() !== '' ||
        searchCity.trim() !== '' ||
        idealCustomerProfile ||
        selectedSeniorityLevels.length > 0 ||
        selectedFunctionalLevels.length > 0 ||
        searchTitle.trim() !== '' ||
        personName.trim() !== '' ||
        linkedInLink.trim() !== '' ||
        companyNameWebsite.trim() !== '' ||
        industryType.trim() !== '' ||
        industryKeyword.trim() !== '' ||
        selectedCompanySizes.length > 0 ||
        revenue.trim() !== '' ||
        funding.trim() !== '' ||
        companyLocation.trim() !== '' ||
        productService.trim() !== '' ||
        technologyParameter.trim() !== '' ||
        websiteKeywords.trim() !== '' ||
        buyerIntent.trim() !== '' ||
        hiringIntent.trim() !== '' ||
        jobPosting.trim() !== '' ||
        suppressions.trim() !== '' ||
        excludeViewedPeople.trim() !== '' ||
        excludeEmailedPeople.trim() !== '';

      setHasActiveFilters(isActive);
    };

    checkActiveFilters();
  }, [
    selectedCountries, searchState, searchCity, idealCustomerProfile, selectedSeniorityLevels,
    selectedFunctionalLevels, searchTitle, personName, linkedInLink, companyNameWebsite,
    industryType, industryKeyword, selectedCompanySizes, revenue, funding, companyLocation,
    productService, technologyParameter, websiteKeywords, buyerIntent, hiringIntent,
    jobPosting, suppressions, excludeViewedPeople, excludeEmailedPeople,
  ]);

  const getCurrentFilterCriteria = () => {
    const criteria: string[] = [];

    if (personName.trim()) criteria.push(`Name: ${personName.trim()}`);
    if (linkedInLink.trim()) criteria.push(`LinkedIn: ${linkedInLink.trim()}`);
    if (selectedCountries.length > 0) criteria.push(`Countries: ${selectedCountries.map(val => countries.find(c => c.value === val)?.label || val).join(', ')}`);
    if (searchState.trim()) criteria.push(`State: ${searchState.trim()}`);
    if (searchCity.trim()) criteria.push(`City: ${searchCity.trim()}`);
    if (idealCustomerProfile) criteria.push('Ideal Customer Profile: Yes');
    if (selectedSeniorityLevels.length > 0) criteria.push(`Seniority: ${selectedSeniorityLevels.map(val => seniorityOptions.find(s => s.value === val)?.label || val).join(', ')}`);
    if (selectedFunctionalLevels.length > 0) criteria.push(`Functional Level: ${selectedFunctionalLevels.map(val => functionalOptions.find(f => f.value === val)?.label || val).join(', ')}`);
    if (searchTitle.trim()) criteria.push(`Job Title: ${searchTitle.trim()}`);

    if (companyNameWebsite.trim()) criteria.push(`Company: ${companyNameWebsite.trim()}`);
    if (industryType.trim()) criteria.push(`Industry Type: ${industryType.trim()}`);
    if (industryKeyword.trim()) criteria.push(`Industry Keyword: ${industryKeyword.trim()}`);
    if (selectedCompanySizes.length > 0) criteria.push(`Company Size: ${selectedCompanySizes.map(val => companySizeOptions.find(cs => cs.value === val)?.label || val).join(', ')}`);
    if (revenue.trim()) criteria.push(`Revenue: ${revenue.trim()}`);
    if (funding.trim()) criteria.push(`Funding: ${funding.trim()}`);
    if (companyLocation.trim()) criteria.push(`Company Location: ${companyLocation.trim()}`);
    if (productService.trim()) criteria.push(`Product/Service: ${productService.trim()}`);
    if (technologyParameter.trim()) criteria.push(`Technology: ${technologyParameter.trim()}`);
    if (websiteKeywords.trim()) criteria.push(`Website Keywords: ${websiteKeywords.trim()}`);

    if (buyerIntent.trim()) criteria.push(`Buyer Intent: ${buyerIntent.trim()}`);
    if (hiringIntent.trim()) criteria.push(`Hiring Intent: ${hiringIntent.trim()}`);
    if (jobPosting.trim()) criteria.push(`Job Posting: ${jobPosting.trim()}`);

    if (suppressions.trim()) criteria.push(`Suppressions: ${suppressions.trim()}`);
    if (excludeViewedPeople.trim()) criteria.push(`Exclude Viewed: ${excludeViewedPeople.trim()}`);
    if (excludeEmailedPeople.trim()) criteria.push(`Exclude Emailed: ${excludeEmailedPeople.trim()}`);

    return criteria;
  };

  const handleApplySearch = () => {
    const criteria = getCurrentFilterCriteria();
    onSearch(criteria);
  };

  const handleSaveButtonClick = () => {
    const criteria = getCurrentFilterCriteria();
    onSaveSearchClick(criteria);
  };

  return (
    <div className="flex flex-col h-full text-sm text-gray-800">
      {(activeTab === 'people' || activeTab === 'companies') && (
        <>
          <div className="p-3 sticky top-0 z-10 bg-white shadow-md">
            <div className="flex items-center mb-2">
              <h3 className="text-sm font-semibold">Filters</h3>
              <button
                className="text-xs text-blue-600 hover:underline ml-auto pr-7"
                onClick={() => {
                  setSelectedCountries([]); setSearchState(''); setSearchCity(''); setIdealCustomerProfile(false);
                  setSelectedSeniorityLevels([]); setSelectedFunctionalLevels([]); setSearchTitle(''); setPersonName('');
                  setLinkedInLink(''); setCompanyNameWebsite(''); setIndustryType(''); setIndustryKeyword('');
                  setSelectedCompanySizes([]); setRevenue(''); setFunding(''); setCompanyLocation(''); setProductService('');
                  setTechnologyParameter(''); setWebsiteKeywords(''); setBuyerIntent(''); setHiringIntent('');
                  setJobPosting(''); setSuppressions(''); setExcludeViewedPeople(''); setExcludeEmailedPeople('');
                  setOpenFilterSection(null);
                }}
              >
                Clear All
              </button>
            </div>

            <div className="relative">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by People/Company"
                className="pl-8 h-10 rounded-md text-sm placeholder:text-gray-400"
              />
              <div className="absolute right-2 top-2.5 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border">
                Enter/Tab
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-mini p-3 space-y-4">
            {activeTab === 'people' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide px-1">Person Info</h3>

                <FilterSection
                  title="Name"
                  helper="Use Tab/Enter Keys To Add Name(s)."
                  isOpen={openFilterSection === 'name'}
                  onToggle={() => handleFilterToggle('name')}
                >
                  <input
                    type="text"
                    placeholder="Name ex. John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                  />
                </FilterSection>

                <FilterSection
                  title="LinkedIn Link"
                  helper="Use Tab/Enter Keys To Add LinkedIn."
                  isOpen={openFilterSection === 'linkedin'}
                  onToggle={() => handleFilterToggle('linkedin')}
                >
                  <input
                    type="text"
                    placeholder="Enter LinkedIn URL..."
                    className="w-full px-2 py-1.5 border rounded-md text-sm"
                    value={linkedInLink}
                    onChange={(e) => setLinkedInLink(e.target.value)}
                  />
                </FilterSection>

                <FilterSection
                  title="Location"
                  isOpen={openFilterSection === 'location'}
                  onToggle={() => handleFilterToggle('location')}
                >
                  <MultiSelectDropdown
                    placeholder="Search By Country"
                    options={countries}
                    selected={selectedCountries}
                    setSelected={setSelectedCountries}
                  />
                  <MultiSelectDropdown
                    placeholder="Search By State"
                    searchOnly={true}
                    searchValue={searchState}
                    setSearchValue={setSearchState}
                  />
                  <MultiSelectDropdown
                    placeholder="Type To Search"
                    searchOnly={true}
                    searchValue={searchCity}
                    setSearchValue={setSearchCity}
                  />
                </FilterSection>

                <FilterSection
                  title="Job Title"
                  isOpen={openFilterSection === 'jobTitle'}
                  onToggle={() => handleFilterToggle('jobTitle')}
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor="ideal-customer-profile-toggle" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Ideal Customer Profile
                    </label>
                    <div className="flex items-center space-x-2">
                      <label className="relative flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="ideal-customer-profile-toggle"
                          className="sr-only"
                          checked={idealCustomerProfile}
                          onChange={(e) => setIdealCustomerProfile(e.target.checked)}
                        />
                        <span className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 peer-focus:ring-offset-background rounded-full peer peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-disabled:bg-gray-500" />
                      </label>
                      <Settings className="h-8 w-8 text-blue-700 border border-gray-300 rounded-md px-1 py-1" />
                    </div>
                  </div>

                  <MultiSelectDropdown
                    placeholder="Select Seniority Level"
                    options={seniorityOptions}
                    selected={selectedSeniorityLevels}
                    setSelected={setSelectedSeniorityLevels}
                  />

                  <MultiSelectDropdown
                    placeholder="Select Functional Level"
                    options={functionalOptions}
                    selected={selectedFunctionalLevels}
                    setSelected={setSelectedFunctionalLevels}
                  />
                  <div>
                    <MultiSelectDropdown
                      placeholder="Search By Title..."
                      searchOnly={true}
                      searchValue={searchTitle}
                      setSearchValue={setSearchTitle}
                    />
                    <p className="text-xs mt-2 ml-1 text-gray-500">Use Tab/Enter Keys To Add Title(s).</p>
                  </div>
                </FilterSection>

                <div className={`flex items-center font-medium justify-between px-3 py-3 border rounded-sm overflow-hidden transition ${'bg-blue-50'}`}>
                  <span className="text-sm">Direct Dial</span>
                  <Switch />
                </div>
              </div>
            )}

            {(activeTab === 'people' || activeTab === 'companies') && (
              <>
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide px-1">Companies</h3>

                  <FilterSection
                    title="Name/Website"
                    helper='Company Name/Website'
                    isOpen={openFilterSection === 'companyName'}
                    onToggle={() => handleFilterToggle('companyName')}
                  >
                    <input
                      type="text"
                      placeholder="Enter company name..."
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={companyNameWebsite}
                      onChange={(e) => setCompanyNameWebsite(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Industry"
                    isOpen={openFilterSection === 'industry'}
                    onToggle={() => handleFilterToggle('industry')}
                  >
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="industry-type" className="block text-sm font-medium text-gray-700 mb-1">
                          Industry Type
                        </label>
                        <input
                          type="text"
                          id="industry-type"
                          placeholder="Select Industry"
                          className="w-full px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={industryType}
                          onChange={(e) => setIndustryType(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="industry-keyword" className="block text-sm font-medium text-gray-700 mb-1">
                          Industry Keyword
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="industry-keyword"
                            placeholder="Tags ex. Payments, IOT"
                            className="w-full px-2 py-1.5 border rounded-md text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={industryKeyword}
                            onChange={(e) => setIndustryKeyword(e.target.value)}
                          />
                          <div
                            className="absolute inset-y-0 right-0 pr-2 flex items-center cursor-help"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                          >
                            <Snail size={16} className="text-gray-400" />
                          </div>

                          {showTooltip && (
                            <div className="absolute z-10 bg-gray-800 text-white text-xs rounded py-1 px-2 left-1/2 transform -translate-x-1/2 bottom-full mb-2 whitespace-nowrap">
                              This filter might slow down results.
                              <div className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-t-6 border-t-gray-800"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </FilterSection>

                  <FilterSection
                    title="Size"
                    isOpen={openFilterSection === 'size'}
                    onToggle={() => handleFilterToggle('size')}
                  >
                    <MultiSelectDropdown
                      placeholder="Select Company Size"
                      options={companySizeOptions}
                      selected={selectedCompanySizes}
                      setSelected={setSelectedCompanySizes}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Revenue"
                    isOpen={openFilterSection === 'revenue'}
                    onToggle={() => handleFilterToggle('revenue')}
                  >
                    <input
                      type="text"
                      placeholder="Select revenue range..."
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Funding"
                    isOpen={openFilterSection === 'funding'}
                    onToggle={() => handleFilterToggle('funding')}
                  >
                    <input
                      type="text"
                      placeholder="Select funding..."
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={funding}
                      onChange={(e) => setFunding(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Company Location"
                    isOpen={openFilterSection === 'companyLocation'}
                    onToggle={() => handleFilterToggle('companyLocation')}
                  >
                    <input
                      type="text"
                      placeholder="Enter location..."
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={companyLocation}
                      onChange={(e) => setCompanyLocation(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Product & Service"
                    isOpen={openFilterSection === 'productService'}
                    onToggle={() => handleFilterToggle('productService')}
                  >
                    <input
                      type="text"
                      placeholder="Enter products..."
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={productService}
                      onChange={(e) => setProductService(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Technology Parameter"
                    isOpen={openFilterSection === 'technology'}
                    onToggle={() => handleFilterToggle('technology')}
                  >
                    <input
                      type="text"
                      placeholder="Enter technology..."
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={technologyParameter}
                      onChange={(e) => setTechnologyParameter(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Website Keywords"
                    isOpen={openFilterSection === 'websiteKeywords'}
                    onToggle={() => handleFilterToggle('websiteKeywords')}
                  >
                    <input
                      type="text"
                      placeholder="Enter keywords..."
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={websiteKeywords}
                      onChange={(e) => setWebsiteKeywords(e.target.value)}
                    />
                  </FilterSection>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide px-1">Signals</h3>

                  <FilterSection
                    title="Buyer Intent"
                    isOpen={openFilterSection === 'buyerIntent'}
                    onToggle={() => handleFilterToggle('buyerIntent')}
                  >
                    <input
                      placeholder="Enter buyer intent keywords..."
                      type="text"
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={buyerIntent}
                      onChange={(e) => setBuyerIntent(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Hiring Intent"
                    isOpen={openFilterSection === 'hiringIntent'}
                    onToggle={() => handleFilterToggle('hiringIntent')}
                  >
                    <input
                      placeholder="Enter hiring intent keywords..."
                      type="text"
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={hiringIntent}
                      onChange={(e) => setHiringIntent(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Job Posting"
                    isOpen={openFilterSection === 'jobPosting'}
                    onToggle={() => handleFilterToggle('jobPosting')}
                  >
                    <input
                      placeholder="Enter job posting keywords..."
                      type="text"
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={jobPosting}
                      onChange={(e) => setJobPosting(e.target.value)}
                    />
                  </FilterSection>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide px-1">Advanced</h3>

                  <FilterSection
                    title="Suppressions"
                    isOpen={openFilterSection === 'suppressions'}
                    onToggle={() => handleFilterToggle('suppressions')}
                  >
                    <input
                      placeholder="Enter suppressions..."
                      type="text"
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={suppressions}
                      onChange={(e) => setSuppressions(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Exclude viewed people"
                    isOpen={openFilterSection === 'excludeViewed'}
                    onToggle={() => handleFilterToggle('excludeViewed')}
                  >
                    <input
                      placeholder="Enter viewed people keywords..."
                      type="text"
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={excludeViewedPeople}
                      onChange={(e) => setExcludeViewedPeople(e.target.value)}
                    />
                  </FilterSection>

                  <FilterSection
                    title="Exclude emailed people"
                    isOpen={openFilterSection === 'excludeEmailed'}
                    onToggle={() => handleFilterToggle('excludeEmailed')}
                  >
                    <input
                      placeholder="Enter emailed people keywords..."
                      type="text"
                      className="w-full px-2 py-1.5 border rounded-md text-sm"
                      value={excludeEmailedPeople}
                      onChange={(e) => setExcludeEmailedPeople(e.target.value)}
                    />
                  </FilterSection>
                </div>
              </>
            )}
          </div>

          <div className="p-3 sticky bottom-0 bg-[#F8FAFC] border-t flex space-x-2">
            <button
              onClick={handleSaveButtonClick}
              className={`w-full h-[38px] text-sm rounded-md font-medium text-center transition-all duration-200
                ${hasActiveFilters ? 'text-blue-600 bg-gray-100 hover:bg-gray-200 cursor-pointer' : 'text-gray-400 bg-gray-100/50 cursor-not-allowed opacity-50'}`}
              disabled={!hasActiveFilters}
            >
              Save Search
            </button>
            <button
              onClick={handleApplySearch}
              className={`w-full h-[38px] text-sm text-white rounded-md font-medium text-center transition-all duration-200
                ${hasActiveFilters ? 'bg-[#2795FC] hover:bg-blue-700 cursor-pointer' : 'bg-[#2795FC]/50 cursor-not-allowed opacity-50'}`}
              disabled={!hasActiveFilters}
            >
              Search
            </button>
          </div>
        </>
      )}
    </div>
  );
}