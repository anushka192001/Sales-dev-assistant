import json
from typing import Dict, List, Optional
import json
import httpx
import os


def match_size(value: str):
    with open("enum_data/sizes.json") as f:
        size_data = json.load(f)
    for sizes in size_data:
        if sizes["size"] == value:
            return sizes

    return []


def match_industry(industry_groups: List[str]) -> List[str]:
    with open("enum_data/industries.json") as f:
        industry_data = json.load(f)

    # Filter out excluded entries
    valid_industries = [entry for entry in industry_data if not entry.get("exclude")]

    # Step 1: Find groups for each input industry
    groups = set()
    for name in industry_groups:
        for entry in valid_industries:
            if entry["group"] == name:
                if group := entry.get("group"):
                    groups.add(group)
                break

    # Step 2: Collect all industries from those groups
    expanded_industries = [
        entry["industry"] for entry in valid_industries if entry.get("group") in groups
    ]


    return list(set(expanded_industries))  # Deduplicated


def get_industry(industryName: str) -> Dict:
    with open("enum_data/industries.json") as f:
        industry_data = json.load(f)

    for ind in industry_data:
        if ind["industry"] == industryName:
            return ind

    return None


def match_company_via_api(raw_values: List[str]) -> List[Dict[str, str]]:
    CLODURA_API_TOKEN = os.getenv("CLODURA_TOKEN")
    headers = {
        "Authorization": f"Bearer {CLODURA_API_TOKEN}",
        "Accept": "application/json",
    }

    all_matched = []

    for raw_value in raw_values:

        try:
            url = f"https://app.clodura.ai/api/search/typeahead/service/company_name/{raw_value}"
            with httpx.Client(timeout=5) as client:
                response = client.get(url, headers=headers)
                response.raise_for_status()
                suggestions = response.json()

            if not isinstance(suggestions, list) or not suggestions:
                continue


            # Try to find exact match (case-insensitive)
            exact = next(
                (
                    item for item in suggestions
                    if item.get("name", "").strip().lower() == raw_value.strip().lower()
                ),
                None
            )

            if exact:
                all_matched.append(exact)
            else:
                all_matched.extend(suggestions)

        except Exception as e:
            continue

    return all_matched




def get_type(TypeName: str) -> Dict:
    with open("enum_data/productandservice.json") as f:
        type_data = json.load(f)

    for t in type_data:
        if t["type"] == TypeName:
            return t
    return None


def get_funding_type(fundingType: str) -> Dict:
    with open("enum_data/fundingTypes.json") as f:
        funding_type_data = json.load(f)

    for fun in funding_type_data:
        if fun["fundingType"] == fundingType:
            return fun

    return None


def get_hiring_areas(hiringAreas: str) -> Dict:
    with open("enum_data/hiringareas.json") as f:
        hiring_areas = json.load(f)

    for area in hiring_areas:
        if area["hiringArea"] == hiringAreas:
            return area
    return None

def enum_data_loader() -> Dict:
    # we need to add other filters here
    with open("enum_data/industries.json") as f:
        industry_data = json.load(f)
    with open("enum_data/functional_level.json") as f:
        functional_levels = json.load(f)
    with open("enum_data/seniority.json") as f:
        seniority_data = json.load(f)
    with open("enum_data/sizes.json") as f:
        size_data = json.load(f)
    with open("enum_data/revenues.json") as f:
        revenue_data = json.load(f)
    with open("enum_data/hiringareas.json") as f:
        hiring_areas = json.load(f)
    with open("enum_data/fundingTypes.json") as f:
        funding_type_data = json.load(f)
    with open("enum_data/productandservice.json") as f:
        company_types = json.load(f)

    return {
        "functionalLevel": [
            entry["function"] for entry in functional_levels if not entry.get("exclude")
        ],
        "industry": [
            entry["industry"] for entry in industry_data if not entry.get("exclude")
        ],
        # "industry": [entry["group"] for entry in industry_data if not entry.get("exclude")],
        "seniority": [
            entry["seniority"] for entry in seniority_data if not entry.get("exclude")
        ],
        "size": [entry["size"] for entry in size_data if not entry.get("exclude")],
        "revenue": [
            entry["revenue"] for entry in revenue_data if not entry.get("exclude")
        ],
        "fundingType": [
            entry["fundingType"]
            for entry in funding_type_data
            if not entry.get("exclude")
        ],
        "hiringAreas": [
            entry["hiringArea"] for entry in hiring_areas if not entry.get("exclude")
        ],
        "company_types": [
            entry["type"] for entry in company_types if not entry.get("exclude")
        ]
    }
