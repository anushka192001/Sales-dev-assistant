'use client'

import React, { useState, useEffect } from 'react';
import { Filter, Download, Plus, MessageSquare, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loader';

export default function CallHistoryPage() {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [isCallDateOpen, setIsCallDateOpen] = useState(false);
  const [isContactNameOpen, setIsContactNameOpen] = useState(false);
  const [isCompanyNameOpen, setIsCompanyNameOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isEmailConfidenceOpen, setIsEmailConfidenceOpen] = useState(false);
  const [emailConfidenceVerified, setEmailConfidenceVerified] = useState(false);
  const [emailConfidenceGuessed, setEmailConfidenceGuessed] = useState(false);
  const [emailConfidenceNotFound, setEmailConfidenceNotFound] = useState(false);
  const [isJobTitleOpen, setIsJobTitleOpen] = useState(false);
  const [preferredContacts, setPreferredContacts] = useState(false);
  const [seniorityLevel, setSeniorityLevel] = useState<string[]>([]);
  const [functionalLevel, setFunctionalLevel] = useState<string[]>([]);
  const [isContactLocationOpen, setIsContactLocationOpen] = useState(false);
  const [isCompanyParametersOpen, setIsCompanyParametersOpen] = useState(false);
  const [companyIndustry, setCompanyIndustry] = useState<string[]>([]);
  const [companySize, setCompanySize] = useState<string[]>([]);
  const [isSeniorityDropdownOpen, setIsSeniorityDropdownOpen] = useState(false);
  const [isFunctionalDropdownOpen, setIsFunctionalDropdownOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applyOnLastCallDate, setApplyOnLastCallDate] = useState(false);
  const [callCount1_3, setCallCount1_3] = useState(false);
  const [callCount4_10, setCallCount4_10] = useState(false);
  const [callCount10Plus, setCallCount10Plus] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [contactName, setContactName] = useState('');
  const [title, setTitle] = useState('');
  const [companyNameSearchType, setCompanyNameSearchType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string[]>([]);
  const [stateSearchTerm, setStateSearchTerm] = useState('');
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
    if (isFilterPanelOpen) {
      setOpenFilter(null);
      setIsJobTitleOpen(false);
      setIsSeniorityDropdownOpen(false);
      setIsFunctionalDropdownOpen(false);
    }
  };

  const toggleSection = (sectionName: string) => {
    if (sectionName === 'callDate') setIsCallDateOpen(!isCallDateOpen);
    else if (sectionName === 'contactName') setIsContactNameOpen(!isContactNameOpen);
    else if (sectionName === 'title') setOpenFilter(openFilter === sectionName ? null : sectionName);
    else if (sectionName === 'companyName') setIsCompanyNameOpen(!isCompanyNameOpen);
    else if (sectionName === 'email') setIsEmailOpen(!isEmailOpen);
    else if (sectionName === 'emailConfidence') setIsEmailConfidenceOpen(!isEmailConfidenceOpen);
    if (sectionName === 'jobTitle') setIsJobTitleOpen(!isJobTitleOpen);
    else setIsJobTitleOpen(false);
    if (sectionName !== 'jobTitle' || !isJobTitleOpen) {
      setIsSeniorityDropdownOpen(false);
      setIsFunctionalDropdownOpen(false);
    }
    if (sectionName === 'contactLocation') setIsContactLocationOpen(!isContactLocationOpen);
    if (sectionName === 'companyParameters') setIsCompanyParametersOpen(!isCompanyParametersOpen);
  };

  const handleSeniorityLevelChange = (level: string) => {
    setSeniorityLevel(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const handleFunctionalLevelChange = (level: string) => {
    setFunctionalLevel(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };
  const toggleSeniorityLevelDropdown = () => {
    setIsSeniorityDropdownOpen(!isSeniorityDropdownOpen);
  };

  const toggleFunctionalDropdown = () => {
    setIsFunctionalDropdownOpen(prevState => !prevState);
    if (isSeniorityDropdownOpen) {
      setIsSeniorityDropdownOpen(false);
    }
  };

  const handleFilterApply = () => {
    console.log('Applying Filters:', {
      fromDate,
      toDate,
      applyOnLastCallDate,
      callCount1_3,
      callCount4_10,
      callCount10Plus,
      callStatus,
      contactName,
      title,
      companyNameSearchType,
      companyName,
      emailAddress,
      emailConfidenceVerified,
      emailConfidenceGuessed,
      emailConfidenceNotFound,
      preferredContacts,
      seniorityLevel,
      functionalLevel,
      companyIndustry,
      companySize,
      selectedCountry,
      stateSearchTerm,
      citySearchTerm,
    });
    setIsSeniorityDropdownOpen(false);
    setIsFunctionalDropdownOpen(false);
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setApplyOnLastCallDate(false);
    setCallCount1_3(false);
    setCallCount4_10(false);
    setCallCount10Plus(false);
    setCallStatus('');
    setContactName('');
    setTitle('');
    setCompanyNameSearchType('');
    setCompanyName('');
    setEmailAddress('');
    setEmailConfidenceVerified(false);
    setEmailConfidenceGuessed(false);
    setEmailConfidenceNotFound(false);
    setPreferredContacts(false);
    setSeniorityLevel([]);
    setFunctionalLevel([]);
    setCompanyIndustry([]);
    setCompanySize([]);
    setSelectedCountry([]);
    setStateSearchTerm('');
    setCitySearchTerm('');
    setIsSeniorityDropdownOpen(false);
    setIsFunctionalDropdownOpen(false);
  };

  const handleCountryChange = (country: any) => {
    setSelectedCountry((prevSelected) =>
      prevSelected.includes(country)
        ? prevSelected.filter((c) => c !== country)
        : [...prevSelected, country]
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 relative flex overflow-hidden">
      <div className={`flex-1 bg-white rounded-lg shadow-md p-4 md:p-6 flex flex-col transition-all duration-300 ease-in-out min-w-0`}>
        <div className="flex flex-col sm:flex-row items-center justify-between border-b pb-4 mb-4 flex-shrink-0">
          <div className="flex items-center space-x-2 mb-4 sm:mb-0 w-full sm:w-auto justify-between sm:justify-start">
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-sky-600 text-white hover:bg-blue-600 h-8 px-3 py-1.5 cursor-pointer"
              onClick={toggleFilterPanel}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              {isFilterPanelOpen ? 'Hide Filters' : 'Filter'}
              {isFilterPanelOpen ? (
                <ChevronUp className="h-4 w-4 ml-1.5" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-1.5" />
              )}
            </button>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-sky-600 text-white hover:bg-blue-600 h-8 px-3 py-1.5 cursor-pointer">
              <Download className="h-4 w-4 mr-1.5" /> Export
            </button>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-sky-600 text-white hover:bg-blue-600 h-8 px-3 py-1.5 cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" /> Add To
            </button>
          </div>
          <div className="text-right flex flex-col items-end sm:items-start text-sm">
            <h2 className="text-xl font-bold mb-1">Call History</h2>
            <p className="font-medium">Total Calls: 0</p>
            <p className="font-medium">Unique Calls: 0</p>
          </div>
        </div>

        <div className={`flex-1 ${isFilterPanelOpen ? 'flex gap-4' : ''} overflow-hidden`}>
          {isFilterPanelOpen && (
            <div className="w-[280px] flex-shrink-0 border-r flex flex-col">
              <div className="pb-4 border-b flex-shrink-0">
                <h3 className="font-semibold text-lg text-gray-800">Filters</h3>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-mini pr-2 pl-2 py-4">
                <div className="space-y-6">

                  <div className="pb-4 border-b border-gray-200">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1.5"
                      onClick={() => toggleSection('callDate')}
                    >
                      <label className="text-sm font-medium text-gray-700">Call Date</label>
                      {isCallDateOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {isCallDateOpen && (
                      <div className="space-y-4 pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">From</label>
                            <input
                              type="date"
                              value={fromDate}
                              onChange={(e) => setFromDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-500 mb-1">To</label>
                            <input
                              type="date"
                              value={toDate}
                              onChange={(e) => setToDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">Apply On Last Call Date</label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={applyOnLastCallDate}
                              onChange={(e) => setApplyOnLastCallDate(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">Call Count</label>
                          <div className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="callCount1-3"
                                checked={callCount1_3}
                                onChange={() => setCallCount1_3(!callCount1_3)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="callCount1-3" className="text-sm text-gray-700 font-normal">1-3</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="callCount4-10"
                                checked={callCount4_10}
                                onChange={() => setCallCount4_10(!callCount4_10)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="callCount4-10" className="text-sm text-gray-700 font-normal">4-10</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="callCount10plus"
                                checked={callCount10Plus}
                                onChange={() => setCallCount10Plus(!callCount10Plus)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="callCount10plus" className="text-sm text-gray-700 font-normal">10+</label>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label htmlFor="callStatus" className="text-sm font-medium text-gray-700">Call Status</label>
                          <div className="relative">
                            <select
                              id="callStatus"
                              className="w-full border border-gray-300 p-2 rounded-md text-sm appearance-none bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={callStatus}
                              onChange={(e) => setCallStatus(e.target.value)}
                            >
                              <option value="">Select Call Status</option>
                              <option value="inProcessRightVM">In Process: Right VM</option>
                              <option value="inProcessRinging">In Process: Ringing</option>
                              <option value="inProcessCallback">In Process: Callback</option>
                              <option value="inProcessNotReachable">In Process: Not Reachable</option>
                              <option value="inProcessNumberBusy">In Process: Number Busy</option>
                              <option value="inProcessDisconnected">In Process: Disconnected</option>
                              <option value="incorrectWrongPersonPicked">Incorrect: Wrong Person Picked</option>
                            </select>
                          </div>
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-xs flex items-start space-x-2 mt-4">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="w-4 h-4 mt-0.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.02M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                              />
                            </svg>
                            <span>Following filters will only work for contacts added from clodura platform</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pb-4 border-b border-gray-200">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1.5"
                      onClick={() => toggleSection('contactName')}
                    >
                      <label className="text-sm font-medium text-gray-700">Contact Name</label>
                      {isContactNameOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {isContactNameOpen && (
                      <div className="space-y-2 pt-3">
                        <p className="text-xs text-gray-500">Use Tab/Enter Keys To Add Name(s).</p>
                        <input
                          type="text"
                          placeholder="Name ex. John Doe"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-500 rounded-md text-sm focus:outline-none focus:ring-1 hover:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                  <div className="pb-4 border-b border-gray-200">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1.5"
                      onClick={() => toggleSection('title')}
                    >
                      <label className="text-sm font-medium text-gray-700">Title</label>
                      {openFilter === 'title' ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {openFilter === 'title' && (
                      <div className="space-y-2 pt-3">
                        <p className="text-xs text-gray-500">Use Tab/Enter Keys To Add Title(s).</p>
                        <input
                          type="text"
                          placeholder="Search By Title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-purple-500 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    )}
                  </div>
                  <div className="pb-4 border-b border-gray-200">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1.5"
                      onClick={() => toggleSection('companyName')}
                    >
                      <label className="text-sm font-medium text-gray-700">Company Name</label>
                      {isCompanyNameOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {isCompanyNameOpen && (
                      <div className="space-y-2 pt-3">
                        <div className="relative">
                          <select
                            id="companyNameSearchType"
                            className="w-full border border-gray-300 p-2 rounded-md text-sm appearance-none bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={companyNameSearchType}
                            onChange={(e) => setCompanyNameSearchType(e.target.value)}
                          >
                            <option value="">Type to search</option>
                            <option value="exact">Exact Match</option>
                            <option value="partial">Partial Match</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pb-4 border-b border-gray-200">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1.5"
                      onClick={() => toggleSection('email')}
                    >
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      {isEmailOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {isEmailOpen && (
                      <div className="space-y-2 pt-3">
                        <input
                          type="text"
                          placeholder="Add Email Address"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">Use Tab/Enter Keys To Add Email(s).</p>
                      </div>
                    )}
                  </div>
                  <div className="pb-4 border-b border-gray-200">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1.5"
                      onClick={() => toggleSection('emailConfidence')}
                    >
                      <label className="text-sm font-medium text-gray-700">Email Confidence</label>
                      {isEmailConfidenceOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {isEmailConfidenceOpen && (
                      <div className="flex space-x-4 pt-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="emailConfidenceVerified"
                            checked={emailConfidenceVerified}
                            onChange={(e) => setEmailConfidenceVerified(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="emailConfidenceVerified" className="text-sm text-gray-700 font-normal">Verified</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="emailConfidenceGuessed"
                            checked={emailConfidenceGuessed}
                            onChange={(e) => setEmailConfidenceGuessed(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="emailConfidenceGuessed" className="text-sm text-gray-700 font-normal">Guessed</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="emailConfidenceNotFound"
                            checked={emailConfidenceNotFound}
                            onChange={(e) => setEmailConfidenceNotFound(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="emailConfidenceNotFound" className="text-sm text-gray-700 font-normal">Not Found</label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-xs flex items-start space-x-2 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-4 h-4 mt-0.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.02M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                      />
                    </svg>
                    <span>Following filters will only work for contacts added from clodura platform</span>
                  </div>

                  <div className="pb-4 border-b border-gray-200">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1.5"
                      onClick={() => toggleSection('jobTitle')}
                    >
                      <label className="text-sm font-medium text-gray-700">Job Title</label>
                      {isJobTitleOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {isJobTitleOpen && (
                      <div className="space-y-4 pt-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">Preferred Contacts</label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferredContacts}
                              onChange={(e) => setPreferredContacts(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="relative">
                          <div
                            className="w-full border border-gray-300 p-2 rounded-md text-sm bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer flex justify-between items-center"
                            onClick={toggleSeniorityLevelDropdown}
                            tabIndex={0}
                          >
                            <span>
                              {seniorityLevel.length > 0
                                ? seniorityLevel.join(', ')
                                : 'Select Seniority Level'}
                            </span>
                            {isSeniorityDropdownOpen ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          {isSeniorityDropdownOpen && (
                            <div
                              className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              {['Founder', 'Chairman', 'President', 'CEO', 'CXO', 'Vice President', 'Director', 'Manager', 'Entry Level'].map((level) => (
                                <div key={level} className="flex items-center p-2 hover:bg-gray-100">
                                  <input
                                    type="checkbox"
                                    id={`seniority-${level}`}
                                    checked={seniorityLevel.includes(level)}
                                    onChange={() => handleSeniorityLevelChange(level)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <label htmlFor={`seniority-${level}`} className="ml-2 text-sm text-gray-700 font-normal">{level}</label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <div
                            className="w-full border border-gray-300 p-2 rounded-md text-sm bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer flex justify-between items-center"
                            onClick={toggleFunctionalDropdown}
                            onBlur={() => setTimeout(() => setIsFunctionalDropdownOpen(false), 100)}
                            tabIndex={0}
                          >
                            <span>
                              {functionalLevel.length > 0
                                ? functionalLevel.join(', ')
                                : 'Select Functional Level'}
                            </span>
                            {isFunctionalDropdownOpen ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          {isFunctionalDropdownOpen && (
                            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                              {['Engineering', 'Sales', 'Marketing', 'Human Resources', 'Finance', 'Operations', 'Product', 'IT', 'Customer Service', 'Legal'].map((level) => (
                                <div key={level} className="flex items-center p-2 hover:bg-gray-100">
                                  <input
                                    type="checkbox"
                                    id={`functional-${level}`}
                                    checked={functionalLevel.includes(level)}
                                    onChange={() => handleFunctionalLevelChange(level)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <label htmlFor={`functional-${level}`} className="ml-2 text-sm text-gray-700 font-normal">{level}</label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pb-4 border-b border-gray-200">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1.5"
                      onClick={() => toggleSection('contactLocation')}
                    >
                      <label className="text-sm font-medium text-gray-700">Contact Location</label>
                      {isContactLocationOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {isContactLocationOpen && (
                      <div className="space-y-4 pt-3">
                        <div className="relative">
                          <div
                            className="w-full border border-gray-300 p-2 rounded-md text-sm bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer flex justify-between items-center"
                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            tabIndex={0}
                          >
                            <span>
                              {selectedCountry.length > 0
                                ? selectedCountry.join(', ')
                                : 'Search By Country'}
                            </span>
                            {isCountryDropdownOpen ? (
                              <ChevronUp className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          {isCountryDropdownOpen && (
                            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                              {['APAC', 'Afghanistan', 'American Samoa', 'Antarctica', 'Australia', 'Azerbaijan', 'Bangladesh'].map((country) => (
                                <div key={country} className="flex items-center p-2 hover:bg-gray-100">
                                  <input
                                    type="checkbox"
                                    id={`country-${country}`}
                                    checked={selectedCountry.includes(country)}
                                    onChange={() => handleCountryChange(country)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <label htmlFor={`country-${country}`} className="ml-2 text-sm text-gray-700 font-normal">{country}</label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <label htmlFor="stateSearchInput" className="text-sm font-medium text-gray-700 sr-only">Search By State</label>
                          <input
                            type="text"
                            id="stateSearchInput"
                            placeholder="Search By State"
                            className="w-full border border-gray-300 p-2 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={stateSearchTerm}
                            onChange={(e) => setStateSearchTerm(e.target.value)}
                          />
                        </div>

                        <div className="relative">
                          <label htmlFor="citySearchInput" className="text-sm font-medium text-gray-700 sr-only">Search By City</label>
                          <input
                            type="text"
                            id="citySearchInput"
                            placeholder="Search By City"
                            className="w-full border border-gray-300 p-2 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={citySearchTerm}
                            onChange={(e) => setCitySearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pb-4 border-b border-gray-200">
                    <div
                      className="flex items-center justify-between cursor-pointer py-1.5"
                      onClick={() => toggleSection('companyParameters')}
                    >
                      <label className="text-sm font-medium text-gray-700">Company Parameters</label>
                      {isCompanyParametersOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {isCompanyParametersOpen && (
                      <div className="space-y-4 pt-3">
                        <div className="relative">
                          <select
                            id="companyIndustry"
                            className="w-full border border-gray-300 p-2 rounded-md text-sm appearance-none bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={companyIndustry[0] || ''}
                            onChange={(e) => setCompanyIndustry([e.target.value])}
                          >
                            <option value="">Select Company Industry</option>
                            {['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Other'].map((industry) => (
                              <option key={industry} value={industry}>{industry}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                          <select
                            id="companySize"
                            className="w-full border border-gray-300 p-2 rounded-md text-sm appearance-none bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={companySize[0] || ''}
                            onChange={(e) => setCompanySize([e.target.value])}
                          >
                            <option value="">Select Company Size</option>
                            {['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'].map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>

                        <label className="text-sm font-medium text-gray-700">Company Location</label>
                        <div className="relative">
                          <div
                            className="w-full border border-gray-300 p-2 rounded-md text-sm bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer flex justify-between items-center"
                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            tabIndex={0}
                          >
                            <span>
                              {selectedCountry.length > 0
                                ? selectedCountry.join(', ')
                                : 'Search By Country'}
                            </span>
                            {isCountryDropdownOpen ? (
                              <ChevronUp className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          {isCountryDropdownOpen && (
                            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                              {['APAC', 'Afghanistan', 'American Samoa', 'Antarctica', 'Australia', 'Azerbaijan', 'Bangladesh'].map((country) => (
                                <div key={country} className="flex items-center p-2 hover:bg-gray-100">
                                  <input
                                    type="checkbox"
                                    id={`country-${country}`}
                                    checked={selectedCountry.includes(country)}
                                    onChange={() => handleCountryChange(country)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <label htmlFor={`country-${country}`} className="ml-2 text-sm text-gray-700 font-normal">{country}</label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <label htmlFor="stateSearchInput" className="text-sm font-medium text-gray-700 sr-only">Search By State</label>
                          <input
                            type="text"
                            id="stateSearchInput"
                            placeholder="Search By State"
                            className="w-full border border-gray-300 p-2 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={stateSearchTerm}
                            onChange={(e) => setStateSearchTerm(e.target.value)}
                          />
                        </div>

                        <div className="relative">
                          <label htmlFor="citySearchInput" className="text-sm font-medium text-gray-700 sr-only">Search By City</label>
                          <input
                            type="text"
                            id="citySearchInput"
                            placeholder="Search By City"
                            className="w-full border border-gray-300 p-2 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={citySearchTerm}
                            onChange={(e) => setCitySearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t bg-white flex-shrink-0">
                <div className="flex justify-between space-x-2">
                  <button
                    className="flex-1 text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    onClick={resetFilters}
                  >
                    Reset
                  </button>
                  <button
                    className="flex-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
                    onClick={handleFilterApply}
                  >
                    <Filter className="h-4 w-4 mr-1.5" /> Filter
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="overflow-x-auto scrollbar-mini">
              <table className="min-w-full table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-[40px] px-4 py-2 text-left sticky top-0 bg-gray-50 z-10">
                      <input type="checkbox" id="select-all" className="w-4 h-4" />
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Mobile No Via Clodura</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Mobile No Via Partner</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Email</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Call logs and Rec</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Company</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Contact Location</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Company Location</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Last Call Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Last Call Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Call On</th>
                  </tr>
                </thead>
              </table>
            </div>

            <div className="overflow-auto scrollbar-mini h-full">
              <table className="min-w-full table-fixed">
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">
                        <input type="checkbox" className="w-4 h-4" />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">John Doe {i + 1}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">+1 555-01{i}00</td>
                      <td className="px-4 py-2 text-sm text-gray-800">+1 999-88{i}77</td>
                      <td className="px-4 py-2 text-sm text-gray-800">john{i}@example.com</td>
                      <td className="px-4 py-2 text-sm text-gray-800">Log {i} - Rec.mp3</td>
                      <td className="px-4 py-2 text-sm text-gray-800">Acme Corp</td>
                      <td className="px-4 py-2 text-sm text-gray-800">New York, USA</td>
                      <td className="px-4 py-2 text-sm text-gray-800">San Francisco, USA</td>
                      <td className="px-4 py-2 text-sm text-gray-800">2025-06-0{i + 1}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">In Process: Ringing</td>
                      <td className="px-4 py-2 text-sm text-gray-800">Auto Dial</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg z-50 flex items-center justify-center transition-colors"
        aria-label="Open chat"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}