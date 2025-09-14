from typing import List, Dict, Any
from clodura_client import CloduraClient


class AddContactsToCadenceTool:
    """
    Tool for creating and managing email sequences/cadences in Clodura.ai
    """

    def __init__(self, user_id: str, clodura_client: CloduraClient):
        self.user_id = user_id
        self.client = clodura_client
        
    async def add_contacts_to_cadence(
        self,
        name: str,
        cadence_id: str,
        recipients_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Add contacts to an existing email cadence/sequence

        Args:
            name: Name of the cadence
            cadence_id: ID of cadence 
            recipients_ids: IDs of the contacts or recipients to be added to this cadence or sequence
                 
        Returns:
            Dict containing the API response
        """
        
        if not recipients_ids:
            return {
                "status": "error",
                "message": "No recipient IDs provided",
                "error": "recipients_ids list is empty",
                "cadence_id": cadence_id,
                "cadence_name": name,
                "recipients_ids": recipients_ids
            }
        
        add_contacts_to_cadence_payload = {
            "userId": self.user_id,
            "name": name,
            "source": "clodura",
            "recipients": recipients_ids,
            "planName": "Starter",
            "pageFlage": "contactSearch",
            "action": "add",
            "sequenceId": cadence_id
        }
        
        try:
            print(f"📧 Adding contacts to cadence...")
            print(f" add_contacts_to_cadence_payload -->{add_contacts_to_cadence_payload}")
            
            # Use the client to make the request
            result = await self.client.add_contacts_to_cadence(
                body=add_contacts_to_cadence_payload,
                campaign_type="campaign"
            )
            print(f"result-->{result}")
            
            # Check if the client already detected an error
            if result.get("status") == "error":
                print(f"❌ Failed to add contacts to cadence: {result.get('message')}")
                return {
                    "status": "error",
                    "message": result.get("message", "Failed to add contacts to cadence"),
                    "error": result.get("message", "Unknown error"),
                    "cadence_id": cadence_id,
                    "cadence_name": name,
                    "recipients_ids": recipients_ids,
                    "details": result.get("details", {})
                }
            
            # Additional checks for specific error responses that might not be caught by the client
            if isinstance(result, dict):
                # Check for the specific "radar deletd" error
                if result.get("res") == "radar deletd":
                    return {
                        "status": "error",
                        "message": "Failed to add contacts to cadence: Radar deleted error",
                        "error": "The radar/contact list appears to have been deleted",
                        "cadence_id": cadence_id,
                        "cadence_name": name,
                        "recipients_ids": recipients_ids,
                        "details": result
                    }
                
                # Check for other potential error indicators
                if "error" in str(result).lower() or "fail" in str(result).lower():
                    return {
                        "status": "error",
                        "message": f"Failed to add contacts to cadence: {str(result)}",
                        "error": str(result),
                        "cadence_id": cadence_id,
                        "cadence_name": name,
                        "recipients_ids": recipients_ids,
                        "details": result
                    }
                
                # Check for missing expected success indicators
                if "msg" not in result and "success" not in str(result).lower() and "id" not in result:
                    return {
                        "status": "error",
                        "message": "Failed to add contacts to cadence: Unexpected response format",
                        "error": f"Unexpected API response: {result}",
                        "cadence_id": cadence_id,
                        "cadence_name": name,
                        "recipients_ids": recipients_ids,
                        "details": result
                    }
            
            # If we get here, assume success
            print(f"✅ Successfully added contacts to cadence: {result}")
            
            return {
                "status": "success",
                "message": f"Successfully added {len(recipients_ids)} contacts to cadence '{name}'",
                "cadence_id": cadence_id,
                "cadence_name": name,
                "recipients_ids": recipients_ids,
                "contacts_added": len(recipients_ids),
                "data": result,
            }
                 
        except Exception as e:
            error_message = f"Failed to add contacts to cadence: {str(e)}"
            print(f"❌ {error_message}")
            return {
                "status": "error",
                "message": error_message,
                "error": str(e),
                "cadence_id": cadence_id,
                "cadence_name": name,
                "recipients_ids": recipients_ids
            }