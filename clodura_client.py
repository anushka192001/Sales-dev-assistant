import httpx
import json
from typing import Dict, Any, Optional
from urllib.parse import urljoin
from mongo_client import MongoClient


class CloduraClient:
    """
    Unified client for interacting with Clodura.ai APIs
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        user_id: Optional[str] = None,
        mongo_client: Optional[MongoClient] = None,
    ):
        """
        Initialize the Clodura client

        Args:
            base_url: Base URL for the API (e.g., https://app.clodura.ai)
            api_key: API key for authentication
            user_id: Optional user ID (can be set later or passed in methods)
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.user_id = user_id
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        self.mongo_client = mongo_client

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        body: Dict[str, Any] = None,
        params: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Make HTTP request to Clodura API

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path
            body: Request body/payload
            params: Query parameters

        Returns:
            Response data as dictionary
        """
        url = urljoin(self.base_url, endpoint)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=method,
                    url=url,
                    json=body,
                    headers=self.headers,
                    params=params,
                )
                response.raise_for_status()
                response_json = response.json()

            if self.mongo_client:
                log_data = {
                    "log_source": "clodura_api",
                    "status": "success",
                    "request": {
                        "method": method,
                        "url": url,
                        "params": params,
                        "body": body,
                    },
                    "response": {
                        "status_code": response.status_code,
                        "data": response_json,
                    },
                }
                self.mongo_client.log_clodura_api_request(log_data)
                print("check if saved properly")

            return response_json

        except httpx.RequestError as e:
            error_details = (
                getattr(e.response, "text", None) if hasattr(e, "response") else None
            )
            status_code = (
                getattr(e.response, "status_code", None)
                if hasattr(e, "response")
                else None
            )

            if self.mongo_client:
                log_data = {
                    "log_source": "clodura_api",
                    "status": "error",
                    "request": {
                        "method": method,
                        "url": url,
                        "params": params,
                        "body": body,
                    },
                    "response": {
                        "status_code": status_code,
                        "error_message": str(e),
                        "error_details": error_details,
                    },
                }
                self.mongo_client.log_clodura_api_request(log_data)

            return {
                "status": "error",
                "message": f"API request failed: {str(e)}",
                "error_details": (
                    getattr(e.response, "text", None)
                    if hasattr(e, "response")
                    else None
                ),
            }

    # Company Search Methods
    async def search_companies(
        self, body: Dict[str, Any], params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Search for companies

        Args:
            body: Search payload containing filters
            params: Query parameters like _limit, _start, _sort

        Returns:
            Search results
        """
        # Add userId if not in body and available
        if self.user_id and "userId" not in body:
            body["userId"] = self.user_id

        result = await self._make_request(
            method="POST", endpoint="/api/search/neg/company", body=body, params=params
        )

        # print(f"results: {result.text}")

        return result

    # Contact Search Methods
    async def search_contacts(
        self, body: Dict[str, Any], params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Search for contacts/leads

        Args:
            body: Search payload containing company and contact filters
            params: Query parameters like _limit

        Returns:
            Search results
        """
        # Add userId if not in body and available
        if self.user_id and "userId" not in body:
            body["userId"] = self.user_id

        return await self._make_request(
            method="POST", endpoint="/api/search/neg/contact", body=body, params=params
        )

    # Cadence Methods
    async def create_cadence(
        self, body: Dict[str, Any], user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new email cadence/sequence

        Args:
            body: Cadence configuration payload
            user_id: User ID (uses instance user_id if not provided)

        Returns:
            Created cadence details
        """
        uid = user_id or self.user_id
        if not uid:
            return {"status": "error", "message": "User ID is required"}

        # Add userId to body if not present
        if "userId" not in body:
            body["userId"] = uid

        this_res = await self._make_request(
            method="POST", endpoint=f"/api/seq/addsequence/{uid}", body=body
        )

        # Check if the _make_request already returned an error (network issues, etc.)
        if this_res.get("status") == "error":
            return {
                "status": "error",
                "message": f"Failed to create cadence: {this_res.get('message', 'Unknown error')}",
                "details": this_res,
            }

        # Check for specific error patterns in the response
        if isinstance(this_res, dict):
            # Look for error indicators in the response
            res_str = str(this_res).lower()
            if "error" in res_str or "fail" in res_str or "invalid" in res_str:
                return {
                    "status": "error",
                    "message": f"Failed to create cadence: {str(this_res)}",
                    "error": str(this_res),
                    "details": this_res,
                }

            # Check for missing cadence ID (primary success indicator)
            cadence_id = (
                this_res.get("_id", {}).get("$oid")
                if isinstance(this_res.get("_id"), dict)
                else this_res.get("_id")
            )
            if not cadence_id:
                return {
                    "status": "error",
                    "message": "Failed to create cadence: No cadence ID returned",
                    "error": "Cadence was not created successfully - missing ID",
                    "details": this_res,
                }

        # If we get here, assume success
        print(f"✅ Successfully created cadence")
        return this_res

    async def create_cadence_step(
        self, cadence_id: str, body: Dict[str, Any], user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add a step to an existing cadence

        Args:
            cadence_id: ID of the cadence to add step to
            body: Step configuration payload
            user_id: User ID (uses instance user_id if not provided)

        Returns:
            Created step details
        """
        uid = user_id or self.user_id
        if not uid:
            return {"status": "error", "message": "User ID is required"}

        # Add userId and sequenceId to body if not present
        if "userId" not in body:
            body["userId"] = uid
        if "sequenceId" not in body:
            body["sequenceId"] = cadence_id

        this_res = await self._make_request(
            method="POST", endpoint=f"/api/seq/step/{uid}/{cadence_id}", body=body
        )

        # Check if the _make_request already returned an error (network issues, etc.)
        if this_res.get("status") == "error":
            return {
                "status": "error",
                "message": f"Failed to create cadence step: {this_res.get('message', 'Unknown error')}",
                "details": this_res,
            }

        # Check for specific error patterns in the response
        if isinstance(this_res, dict):
            # Look for error indicators in the response
            res_str = str(this_res).lower()
            if "error" in res_str or "fail" in res_str or "invalid" in res_str:
                return {
                    "status": "error",
                    "message": f"Failed to create cadence step: {str(this_res)}",
                    "error": str(this_res),
                    "details": this_res,
                }

            # Check for missing 'steps' field (primary success indicator for step creation)
            if "sequence" not in this_res and "steps" not in this_res["sequence"]:
                return {
                    "status": "error",
                    "message": "Failed to create cadence step: Missing steps field in response",
                    "error": "Step creation failed - no steps field returned",
                    "details": this_res,
                }

        # If we get here, assume success
        print(f"✅ Successfully created cadence step")
        return this_res

    async def add_contacts_to_cadence(
        self, body: Dict[str, Any], campaign_type: str = "campaign"
    ) -> Dict[str, Any]:
        """
        Add contacts to a cadence

        Args:
            body: Payload with contacts and cadence details
            campaign_type: Type of campaign (default: "campaign")

        Returns:
            Result of adding contacts
        """
        # Note: This endpoint uses a different subdomain (c25.clodura.com)
        # You might need to handle this differently or pass full URL
        endpoint = f"/api/radar/create/addListToSeq/{campaign_type}"

        # Add userId if not in body and available
        if self.user_id and "userId" not in body:
            body["userId"] = self.user_id

        print("hello there from add_contacts_to_cadence")
        # If using different subdomain, you might need to override the base URL
        # For now, assuming the same base URL structure
        this_res = await self._make_request(method="POST", endpoint=endpoint, body=body)

        # Check for different possible error conditions
        if this_res.get("status") == "error":
            return {
                "status": "error",
                "message": f"Failed to add contacts to cadence: {this_res.get('message', 'Unknown error')}",
                "details": this_res,
            }

        # Check for the specific error case you're seeing
        if "radar deletd" in str(this_res).lower():
            return {
                "status": "error",
                "message": "Failed to add contacts to cadence: Radar deleted error",
                "details": this_res,
            }

        # Check if 'msg' field exists and indicates success
        if "msg" not in this_res and "message" not in this_res:
            if "queuedContacts" in this_res:
                return {
                    "status": "success",
                    "message": this_res["queuedContacts"],
                    "details": this_res,
                }

            return {
                "status": "error",
                "message": "Failed to add contacts to cadence: Unexpected response format",
                "details": this_res,
            }

        # Success case
        return {"status": "success", "message": this_res["msg"], "details": this_res}
