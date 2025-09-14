from typing import Optional, List, Dict, Any
import json
from enum_matcher import match_company_via_api, match_size, get_industry
from clodura_client import CloduraClient


def ensure_list(val):
    """Convert single values to lists, handle None values"""
    return val if isinstance(val, list) else [val] if val is not None else []


class CompanySearchTool:
    """
    Dedicated tool for searching companies using Clodura.ai API
    """

    def __init__(self, user_id, clodura_client: CloduraClient):
        # Initialize the Clodura client
        self.user_id = user_id
        self.client = clodura_client

    async def search_companies(
        self,
        companyName: Optional[List[str]] = None,
        hqCountry: Optional[List[str]] = None,
        hqState: Optional[List[str]] = None,
        hqCity: Optional[List[str]] = None,
        industry: Optional[List[str]] = None,
        company_type: Optional[List[str]] = None,
        hiringAreas: Optional[List[str]] = None,
        speciality: Optional[List[str]] = None,
        size: Optional[List[str]] = None,
        revenue: Optional[List[str]] = None,
        websiteKeywords: Optional[List[str]] = None,
        techParams: Optional[Dict[str, Any]] = None,
        langTechOs: Optional[List[str]] = None,
        websiteList: Optional[List[str]] = None,
        uniqueCompanies: Optional[bool] = False,
        excludeWebList: Optional[bool] = False,
        funding: Optional[bool] = False,
        fundingType: Optional[List[str]] = None,
        fundingMinDate: Optional[str] = None,
        fundingMaxDate: Optional[str] = None,
        contentSearch: Optional[str] = None,
        partnerIntent: Optional[List[str]] = None,
        lockedCompany: Optional[bool] = False,
        correspondence: Optional[bool] = False,
        boardline: Optional[bool] = False,
        exclude_companies: Optional[List[str]] = None,
        limit: Optional[int] = 100,
        start: Optional[int] = 0,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Search for companies with various filters

        Args:
            companyName: List of company names to search for or exclude
            hqCountry: List of headquarters countries
            hqState: List of headquarters states
            hqCity: List of headquarters cities
            industry: List of industries
            company_type: List of company types (Public, Private, etc.)
            hiringAreas: List of departments/areas companies are hiring in
            speciality: List of company specialties/focus areas
            size: List of company size ranges
            revenue: List of revenue ranges
            websiteKeywords: Keywords to search for in company websites
            techParams: Technology parameters for tech stack filtering
            langTechOs: Programming languages, technologies, or operating systems
            websiteList: Specific website URLs
            uniqueCompanies: Only return unique companies
            excludeWebList: Exclude companies from web list
            funding: Filter for companies with funding information
            fundingType: Types of funding (Series A, B, C, etc.)
            fundingMinDate: Minimum funding date (YYYY-MM-DD)
            fundingMaxDate: Maximum funding date (YYYY-MM-DD)
            contentSearch: Content-based search terms
            partnerIntent: Partner intent signals
            lockedCompany: Include locked companies
            correspondence: Filter for companies with correspondence
            boardline: Include boardline companies
            exclude_companies: List of company names to exclude
            limit: Maximum number of results (default: 25)
            start: Starting index for pagination (default: 0)
            sort: Sort parameter

        Returns:
            Dict containing search results with companies
        """

        print(f"check company names: {companyName}")
        hqcities = ensure_list(hqCity)

        payload = {
            "companySelectedFilters": [],
            "companyName": match_company_via_api(companyName) if companyName else [],
            "hqCountry": ensure_list(hqCountry),
            "hqState": ensure_list(hqState),
            "hqCity": hqcities
            + (
                ["Bengaluru"] if any(c.lower() == "bangalore" for c in hqcities) else []
            ),
            "industry": [
                ind
                for ind in (get_industry(item) for item in ensure_list(industry))
                if ind is not None
            ],
            "type": ensure_list(company_type),
            "hiringAreas": ensure_list(hiringAreas),
            "speciality": ensure_list(speciality),
            "size": [match_size(item) for item in ensure_list(size)] if size else [],
            "revenue": ensure_list(revenue),
            "websiteKeywords": ensure_list(websiteKeywords),
            "techParams": techParams or {},
            "langTechOs": ensure_list(langTechOs),
            "lockedCompany": lockedCompany,
            "correspondence": correspondence,
            "boardline": boardline,
            "websiteList": ensure_list(websiteList),
            "uniqueCompanies": uniqueCompanies,
            "excludeWebList": excludeWebList,
            "funding": funding,
            "fundingType": [
                self._format_funding_type(item) for item in ensure_list(fundingType)
            ],
            "fundingMinDate": fundingMinDate,
            "fundingMaxDate": fundingMaxDate,
            "contentSearch": contentSearch,
            "partnerIntent": ensure_list(partnerIntent),
            "userId": self.user_id,
        }

        # Build query parameters
        params = {"_limit": limit, "_start": start, "_sort": sort}
        # Filter out None values
        params = {k: v for k, v in params.items() if v is not None}

        try:
            print(f"🏢 Sending company search request...")
            print(f"📋 Payload: {json.dumps(payload, indent=2)}")

            # Use the client to make the request
            result = await self.client.search_companies(body=payload, params=params)
            # Format the response
            formatted_result = self._format_response(result, limit)
            return formatted_result

        except Exception as e:
            print(f"❌ Unexpected error in CompanySearchTool: {e}")

            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}",
                "companies": [],
                "total_companies": 0,
            }

    def _format_funding_type(self, funding_type: str) -> Dict[str, Any]:
        """Format funding type for API payload"""
        return {"fundingType": funding_type, "exclude": False}

    def _format_response(self, raw_response: Dict, limit: int) -> Dict:
        """Format the API response for consistent output"""
        companies = raw_response.get("companies", [])[:limit]

        formatted_companies = []
        for company in companies:
            # Handle funding type list
            funding_types = company.get("cloduralastfundingtype", [])
            last_funding_type = funding_types[0] if funding_types else "N/A"

            formatted_companies.append(
                {
                    "id": company.get("id"),
                    "name": company.get("name", "N/A"),
                    "website": company.get("website", "N/A"),
                    "industry": company.get("industry", "N/A"),
                    "linkedin_industry": company.get("linkedin_industry", "N/A"),
                    "location": {
                        "city": company.get("city", "N/A"),
                        "state": company.get("state", "N/A"),
                        "country": company.get("country", "N/A"),
                        "full_location": f"{company.get('city', '')}, {company.get('state', '')}, {company.get('country', '')}".strip(
                            ", "
                        ),
                    },
                    "size": company.get("comp_size_range", "N/A"),
                    "contacts_count": company.get("contacts_count", 0),
                    "count_no_email_contacts": company.get(
                        "count_no_email_contacts", 0
                    ),
                    "social_media": {
                        "linkedin": company.get("linkedin_link", "N/A"),
                    },
                    "funding": {
                        "total_funding": company.get("totalfundingamount", "N/A"),
                        "last_funding_date": company.get("lastfundingdate", "N/A"),
                        "last_funding_type": last_funding_type,
                    },
                    "phone_numbers": company.get("boardline_numbers", []),
                    "status": {
                        "unlocked": company.get("unlocked", False),
                        "blacklisted": company.get("blacklisted", False),
                        "hidden": company.get("hidden", False),
                        "checked": company.get("checked", False),
                        "campaign_ready": company.get("campaign_ready", False),
                        "contacts_flag": company.get("isContactsFlag", "N/A"),
                    },
                    "correspondence": company.get("correspondence", None),
                }
            )

        return {
            "status": "success",
            "message": f"Found {len(formatted_companies)} companies",
            "companies": formatted_companies,
            "total_companies": len(formatted_companies),
            "search_metadata": {
                "limit": limit,
                "returned_count": len(formatted_companies),
            },
        }

    def search_by_domain(self, domains: List[str], **kwargs) -> Dict[str, Any]:
        """
        Convenience method to search companies by their website domains

        Args:
            domains: List of website domains
            **kwargs: Additional search parameters

        Returns:
            Dict containing search results
        """
        return self.search_companies(websiteList=domains, **kwargs)

    def search_by_industry(self, industries: List[str], **kwargs) -> Dict[str, Any]:
        """
        Convenience method to search companies by industry

        Args:
            industries: List of industry names
            **kwargs: Additional search parameters

        Returns:
            Dict containing search results
        """
        return self.search_companies(industry=industries, **kwargs)

    def search_by_size(self, sizes: List[str], **kwargs) -> Dict[str, Any]:
        """
        Convenience method to search companies by size

        Args:
            sizes: List of company size ranges
            **kwargs: Additional search parameters

        Returns:
            Dict containing search results
        """
        return self.search_companies(size=sizes, **kwargs)

    def search_by_location(
        self,
        countries: List[str] = None,
        states: List[str] = None,
        cities: List[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Convenience method to search companies by location

        Args:
            countries: List of countries
            states: List of states
            cities: List of cities
            **kwargs: Additional search parameters

        Returns:
            Dict containing search results
        """
        return self.search_companies(
            hqCountry=countries, hqState=states, hqCity=cities, **kwargs
        )

    def search_competitors(
        self, company_name: str, industry: str = None, size: str = None, **kwargs
    ) -> Dict[str, Any]:
        """
        Find competitors of a given company

        Args:
            company_name: Name of the company to find competitors for
            industry: Industry to search within
            size: Company size range
            **kwargs: Additional search parameters

        Returns:
            Dict containing competitor companies
        """
        search_params = {"exclude_companies": [company_name], **kwargs}

        if industry:
            search_params["industry"] = [industry]
        if size:
            search_params["size"] = [size]

        return self.search_companies(**search_params)


# Example usage
if __name__ == "__main__":
    # Initialize the tool
    api_key = "your-api-key-here"
    company_tool = CompanySearchTool(api_key)

    # Search for tech companies in the US
    results = company_tool.search_companies(
        industry=["Technology"], hqCountry=["United States"], size=["100-500"], limit=10
    )

    print(f"Found {results['total_companies']} companies")
    for company in results["companies"]:
        print(f"- {company['name']} ({company['location']['full_location']})")
