import React from 'react';
import { MapPin, Building2, Linkedin, Globe, Users, ArrowLeft, Phone, DollarSign } from 'lucide-react';

interface CompanyLocation {
  city?: string;
  state?: string;
  country?: string;
  full_location?: string;
}

interface CompanySocialMedia {
  linkedin?: string;
}

interface CompanyFunding {
  total_funding?: number | null;
  last_funding_date?: string | null;
  last_funding_type?: string;
}

interface CompanyStatus {
  unlocked?: boolean;
  blacklisted?: boolean;
  hidden?: boolean;
  checked?: boolean;
  campaign_ready?: boolean;
  contacts_flag?: string;
}

interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  linkedin_industry?: string;
  location?: CompanyLocation;
  size?: string;
  contacts_count?: number;
  count_no_email_contacts?: number;
  social_media?: CompanySocialMedia;
  funding?: CompanyFunding;
  phone_numbers?: string[];
  status?: CompanyStatus;
  correspondence?: any;
}

interface SearchCompaniesData {
  companies: Company[];
}

interface SearchCompaniesResultViewProps {
  message?: string;
  data: SearchCompaniesData;
  onScrollToMessage?: (messageId: string) => void;
  messageId?: string;
}

// Sample data for demonstration
const sampleData: SearchCompaniesData = {
  companies: [
    {
      id: "2370383693282803712",
      name: "HDFC Bank",
      website: "hdfcbank.com",
      industry: "Banking",
      linkedin_industry: "Banking",
      location: {
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        full_location: "Mumbai, Maharashtra, India"
      },
      size: "10000+",
      contacts_count: 129210,
      count_no_email_contacts: 11714,
      social_media: {
        linkedin: "https://www.linkedin.com/company/hdfc-bank"
      },
      funding: {
        total_funding: null,
        last_funding_date: null,
        last_funding_type: "N/A"
      },
      phone_numbers: [
        "+919289200017",
        "+91 9289200017",
        "+919426792009"
      ]
    }
  ]
};

const SearchCompaniesResultView: React.FC<SearchCompaniesResultViewProps> = ({ 
  message = "Found 25 companies based on your search criteria.", 
  data = sampleData, 
  onScrollToMessage, 
  messageId 
}) => {
console.log("SearchCompaniesResultView rendered with data:", data);
  const { companies } = data;
  const hasCompanies = companies && companies.length > 0;

  const formatContactsCount = (count?: number): string => {
    if (!count) return 'N/A';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatFunding = (funding?: CompanyFunding): string | null => {
    if (!funding?.total_funding) return null;
    const amount = funding.total_funding;
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return `${amount}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-600">Company Search Results</span>
        </div>
        {onScrollToMessage && messageId && (
          <button
            onClick={() => onScrollToMessage(messageId)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go to message
          </button>
        )}
      </div>

      <p className="text-gray-800 mb-6">{message}</p>

      {!hasCompanies && (
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 italic">No companies found.</p>
        </div>
      )}

      {hasCompanies && (
        <div className="space-y-4">
          {companies.map((company: Company) => (
            <div
              key={company.id}
              className="p-5 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900 mb-1">{company.name}</h4>
                  <p className="text-sm text-gray-600">{company.industry || company.linkedin_industry}</p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  {company.social_media?.linkedin && (
                    <a
                      href={company.social_media.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 text-sm hover:text-gray-800 hover:underline flex items-center gap-1 transition-colors"
                    >
                      <Linkedin className="w-4 h-4" /> LinkedIn
                    </a>
                  )}
                  {company.website && (
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 text-sm hover:text-gray-800 hover:underline flex items-center gap-1 transition-colors"
                    >
                      <Globe className="w-4 h-4" /> Website
                    </a>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600 mb-4">
                {company.location?.full_location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{company.location.full_location}</span>
                  </div>
                )}
                
                {company.size && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{company.size} employees</span>
                  </div>
                )}
                
                {company.contacts_count && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{formatContactsCount(company.contacts_count)} contacts</span>
                  </div>
                )}
                
                {formatFunding(company.funding) && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>{formatFunding(company.funding)} funding</span>
                  </div>
                )}
              </div>

              {company.phone_numbers && company.phone_numbers.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{company.phone_numbers[0]}</span>
                    {company.phone_numbers.length > 1 && (
                      <span className="text-gray-400">+{company.phone_numbers.length - 1} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchCompaniesResultView;