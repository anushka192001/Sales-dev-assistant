from typing import Optional, List, Dict, Any
import json
from enum_matcher import (
    match_industry,
    match_size,
    get_industry,
    match_company_via_api,
    get_type,
    get_funding_type,
    get_hiring_areas,
)
from clodura_client import CloduraClient


def ensure_list(val):
    return val if isinstance(val, list) else [val] if val is not None else []


class ContactsSearchTool:
    """
    Tool for searching contacts
    """

    def __init__(self, user_id, clodura_client: CloduraClient):
        self.user_id = user_id
        self.client = clodura_client

    async def search_leads(
        self,
        companyName: Optional[List[str]] = None,
        hqCountry: Optional[List[str]] = None,
        hqState: Optional[List[str]] = None,
        hqCity: Optional[List[str]] = None,
        industry: Optional[List[Dict[str, Any]]] = None,
        companytype: Optional[List[str]] = None,
        hiringAreas: Optional[List[str]] = None,
        speciality: Optional[List[str]] = None,
        size: Optional[List[str]] = None,
        revenue: Optional[List[str]] = None,
        fundingType: Optional[List[str]] = None,
        fundingMinDate: Optional[str] = None,
        fundingMaxDate: Optional[str] = None,
        fullName: Optional[List[str]] = None,
        seniority: Optional[List[str]] = None,
        functionalLevel: Optional[List[str]] = None,
        designation: Optional[List[str]] = None,
        country: Optional[List[str]] = None,
        state: Optional[List[str]] = None,
        city: Optional[List[str]] = None,
        companyIds: Optional[List[str]] = None,
        linkedinLink: Optional[List[str]] = None,
        isFilter: Optional[bool] = True,
        limit: Optional[int] = 100,
    ) -> Dict[str, Any]:
        """
        Search for leads with both contact and company filters

        Args:
            Company filters:
                companyName: List of company names to search for
                hqCountry: List of headquarters countries
                hqState: List of headquarters states
                hqCity: List of headquarters cities
                industry: List of industry dictionaries
                companytype: List of company types
                hiringAreas: List of hiring areas
                speciality: List of company specialties
                size: List of company sizes
                revenue: List of revenue ranges
                fundingType: List of funding types
                fundingMinDate: Minimum funding date (YYYY-MM-DD)
                fundingMaxDate: Maximum funding date (YYYY-MM-DD)

            Contact filters:
                fullName: List of full names
                seniority: List of seniority levels
                functionalLevel: List of functional levels
                designation: List of job designations
                country: List of contact countries
                state: List of contact states
                city: List of contact cities
                companyIds: List of specific company IDs
                linkedinLink: List of LinkedIn links

            General:
                isFilter: Boolean to apply filters
                limit: Maximum number of results to return

        Returns:
            Dict containing search results with contacts and companies
        """

        # Prioritize search by companyId if available
        company_name_list = []
        company_id_list = ensure_list(companyIds)
        if company_id_list:
            print(
                f"✅ Searching by {len(company_id_list)} company ID(s). Ignoring companyName."
            )
            company_name_list = []
        elif companyName:
            print(f"Raw companyNames input: {companyName}")
            company_name_list = match_company_via_api(companyName)

        print(f"🔍 Searching with company names: {len(company_name_list)}")
        print(f"🔍 Searching with company IDs: {len(company_id_list)}")

        cities = ensure_list(city)
        hqcities = ensure_list(hqCity)

        payload = {
            "userId": self.user_id,
            "company": {
                "companyName": company_name_list,
                "hqCountry": ensure_list(hqCountry),
                "hqState": ensure_list(hqState),
                "hqCity": hqcities
                + (
                    ["Bengaluru"]
                    if any(c.lower() == "bangalore" for c in hqcities)
                    else []
                ),
                "industry": [
                    ind
                    for ind in (get_industry(item) for item in ensure_list(industry))
                    if ind is not None
                ],
                "type": [get_type(item) for item in ensure_list(companytype)],
                "hiringAreas": [
                    get_hiring_areas(item) for item in ensure_list(hiringAreas)
                ],
                "speciality": [],
                "size": [match_size(item) for item in ensure_list(size)],
                "revenue": revenue or [],
                "websiteKeywords": [],
                "techParams": None,
                "langTechOs": [],
                "websiteList": [],
                "fundingType": [
                    get_funding_type(item) for item in ensure_list(fundingType)
                ],
                "fundingMinDate": fundingMinDate or None,
                "fundingMaxDate": fundingMaxDate or None,
                "boardline": False,
            },
            "contact": {
                "fullName": ensure_list(fullName),
                "firstName": [],
                "lastName": [],
                "seniority": [
                    self._format_seniority(item) for item in ensure_list(seniority)
                ],
                "functionalLevel": [
                    self._format_functional_level(item)
                    for item in ensure_list(functionalLevel)
                ],
                "designation": designation or [],
                "Verified": False,
                "High": False,
                "Medium": False,
                "Low": False,
                "emailPresent": False,
                "emailAbsent": False,
                "country": ensure_list(country),
                "state": ensure_list(state),
                "city": cities
                + (
                    ["Bengaluru"]
                    if any(c.lower() == "bangalore" for c in cities)
                    else []
                ),
                "excludeWebList": False,
                "uniqueCompanies": False,
                "companyIds": company_id_list,
                "emailCsvList": [],
                "nameCsvList": [],
                "DDirectDial": False,
                "contentSearch": [],
                "linkedinLink": ensure_list(linkedinLink),
                "partnerIntent": [],
                "companyName": company_name_list,
            },
            "isFilter": isFilter,
        }

        try:
            print(f"📡 Sending search request...")
            print(f"📋 Payload: {json.dumps(payload, indent=2)}")

            effective_limit = limit if limit is not None else 24
            params = {"_limit": effective_limit}

            # Use the client to make the request
            result = await self.client.search_contacts(body=payload, params=params)
            # Format the response
            print(f"check result {len(result)}")
            if result is None:
                print("❌ search_contacts returned None")
                return {
                    "status": "error",
                    "message": "No data returned from search_contacts",
                    "contacts": [],
                    "companies": [],
                }
            formatted_result = self._format_response(result, limit)
            print(181)
            return formatted_result

        except Exception as e:
            print(f"❌ Unexpected error in search leads tool: {e}")
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}",
                "contacts": [],
                "companies": [],
            }

    def _format_industry(self, industry: Optional[str]) -> List[Dict]:
        """Format industry for API payload"""
        if not industry:
            return []
        matched_industry_per_enum = match_industry(industry)
        if matched_industry_per_enum:
            return matched_industry_per_enum
        else:
            return []

    def _format_seniority(self, seniority: str) -> Dict[str, Any]:
        return {"seniority": seniority, "exclude": False}

    def _format_funding_type(self, funding_type: str) -> Dict[str, Any]:
        return {"fundingType": funding_type, "exclude": False}

    def _format_functional_level(self, functional_level: str) -> Dict[str, Any]:
        return {"function": functional_level, "exclude": False}

    def _format_response(self, raw_response: Dict, limit: int) -> Dict:
        """Format the API response for consistent output"""
        contacts = raw_response.get("contacts", [])[:limit]
        companies = raw_response.get("companies", [])[:limit]

        formatted_contacts = []
        for contact in contacts:
            formatted_contacts.append(
                {
                    "id": contact.get("person_id"),
                    "company_id": contact.get("company_id"),
                    "name": f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
                    or "N/A",
                    "designation": contact.get("position", "N/A"),
                    "seniority": contact.get("seniority", "N/A"),
                    "functional_level": contact.get("functional_level", "N/A"),
                    "company_name": contact.get("company_name", "N/A"),
                    "industry": contact.get("industry", "N/A"),
                    "location": f"{contact.get('person_city', '')}, {contact.get('person_state', '')}, {contact.get('person_country', '')}".strip(
                        ", "
                    ),
                    "email": contact.get("primary_email", "N/A"),
                    "linkedin": contact.get("linkedin_profile", "N/A"),
                    "unlocked": contact.get("unlocked", False),
                    "primary_email": contact.get("primary_email", "N/A"),
                }
            )
        formatted_companies = []
        for company in companies:
            formatted_companies.append(
                {
                    "id": company.get("id"),
                    "name": company.get("name", "N/A"),
                    "industry": company.get("industry", "N/A"),
                    "location": f"{company.get('city', '')}, {company.get('state', '')}, {company.get('country', '')}".strip(
                        ", "
                    ),
                    "size": company.get("comp_size_range", "N/A"),
                    "type": company.get("company_type", "N/A"),
                    "founded": company.get("founded", "N/A"),
                    "revenue": company.get("revenue_range", "N/A"),
                    "technologies": company.get("technology", []),
                    "specialities": company.get("specialities", []),
                }
            )

        return {
            "status": "success",
            "message": f"Found {len(formatted_contacts)} contacts",
            "contacts": formatted_contacts,
            "total_contacts": len(formatted_contacts),
        }
