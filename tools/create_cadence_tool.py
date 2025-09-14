from typing import Optional, List, Dict, Any
import json
from datetime import datetime, date
import secrets
from clodura_client import CloduraClient


class CadenceTool:
    """
    Tool for creating and managing email sequences/cadences in Clodura.ai
    """

    def __init__(self, user_id: str, clodura_client: CloduraClient):
        self.user_id = user_id
        self.client = clodura_client

    def nanoid(self, n):
        uint32 = secrets.randbits(32)

        def int_to_base(num, base):
            if num == 0:
                return "0"
            digits = "0123456789abcdefghijklmnopqrstuvwxyz"
            res = ""
            while num > 0:
                res = digits[num % base] + res
                num //= base
            return res

        return int_to_base(uint32, n)

    def create_new_template(self, n, body, subject):
        template_data = {
            "name": "DT-" + self.nanoid(n),
            "subject": subject,
            "userId": self.user_id,
            "type": "html",
            "editor": "rte",
            "status": "active",
            "content": body,
            "contentObject": None,
            "dynamic": True,
            "cc": [],
            "bcc": [],
        }
        return template_data

    async def create_cadence(
        self,
        name: str,
        cadence_type: str = "constant",
        tags: Optional[List[str]] = None,
        start_date: Optional[Dict[str, int]] = None,
        start_time: Optional[Dict[str, int]] = None,
        white_days: Optional[List[str]] = None,
        list_type: str = "",
        list_id: Optional[str] = None,
        to_emails: Optional[List[str]] = None,
        is_active: bool = True,
        status: str = "paused",
        copy_temp_phases: bool = False,
        template_details: object = None,
    ) -> Dict[str, Any]: 
        """
        Create a new email cadence/sequence

        Args:
            name: Name of the cadence
            cadence_type: Type of cadence (default: "constant")
            tags: List of tags for the cadence
            start_date: Start date as dict with year, month, day
            start_time: Start time as dict with hour, minute, second
            white_days: Days when emails can be sent (Mo, Tu, We, Th, Fr, Sa, Su)
            list_type: Type of recipient list
            list_id: ID of the recipient list
            to_emails: List of email addresses
            is_active: Whether the cadence is active
            status: Status of the cadence
            copy_temp_phases: Whether to copy template phases
            template_details: Dict with body and subject for email template

        Returns:
            Dict containing the API response
        """

        # Set defaults
        if tags is None:
            tags = []
        if start_date is None:
            today = date.today()
            start_date = {"year": today.year, "month": today.month, "day": today.day}
        if start_time is None:
            now = datetime.now().time()
            start_time = {"hour": now.hour, "minute": now.minute, "second": now.second}
        if white_days is None:
            white_days = ["Mo", "Tu", "We", "Th", "Fr"]
        if to_emails is None:
            to_emails = []

        payload = {
            "name": name,
            "type": cadence_type,
            "tags": tags,
            "schedule": {
                "startDate": start_date,
                "startTime": start_time,
                "whiteDays": white_days,
            },
            "listType": list_type,
            "listId": list_id,
            "toEmails": to_emails,
            "steps": [],
            "isActive": is_active,
            "status": status,
            "copyTempPhases": copy_temp_phases,
            "userId": self.user_id,
        }

        try:
            print(f"📋 Payload: {json.dumps(payload, indent=2)}")

            # Create cadence using the client
            cadence_details = await self.client.create_cadence(
                body=payload, user_id=self.user_id
            )

            # Check if cadence creation was successful
            if cadence_details.get("status") == "error":
                print(f"❌ Failed to create cadence: {cadence_details.get('message')}")
                return {
                    "status": "error",
                    "message": f"Failed to create cadence: {cadence_details.get('message', 'Unknown error')}",
                    "error": cadence_details.get("message", "Cadence creation failed"),
                    "cadence_id": None,
                    "data": cadence_details,
                }

            cadence_id = cadence_details.get("_id", {}).get("$oid")

            if not cadence_id:
                return {
                    "status": "error",
                    "message": "Failed to get cadence ID from response",
                    "error": "No cadence ID returned",
                    "cadence_id": None,
                    "data": cadence_details,
                }

            # print(f"✅ Cadence created with ID: {cadence_id}")
            # print(f"📋 Result: {cadence_details}")
            print(f"template_details--->{template_details}") 
            if template_details is not None:
                email_body = template_details.get("body", "")
                email_subject = template_details.get("subject", "")
            else:
                email_body = ""
                email_subject = ""
                print("⚠️  No template_details provided, using empty body and subject")

            # Create step payload
            create_step_payload = {
                "id": self.nanoid(8),
                "name": "Email Phase 1",
                "sequenceName": name,
                "order": 0,
                "type": "email",
                "isEvent": False,
                "status": "paused",
                "userId": self.user_id,
                "schedule": {
                    "startDate": cadence_details.get("schedule", {}).get(
                        "startDate", start_date
                    ),
                    "startTime": cadence_details.get("schedule", {}).get(
                        "startTime", start_time
                    ),
                    "endDate": [],
                    "endTime": [],
                    "blackDays": [],
                    "whiteDays": cadence_details.get("whiteDays", white_days),
                    "offTime": None,
                },
                "interval": {"number": 10, "mode": "Minutes"},
                "steps": [],
                "reportId": "",
                "templateId": None,
                "listId": "",
                "nextStep": "",
                "includeOriginal": False,
                "addUnsubLink": True,
                "notifyMe": False,
                "sequenceId": cadence_id,
                "prevStep": None,
                "template": self.create_new_template(4, email_body, email_subject),
            }

            step_error = None
            try:
                # Create step using the client
                create_step_result = await self.client.create_cadence_step(
                    cadence_id=cadence_id,
                    body=create_step_payload,
                    user_id=self.user_id,
                )

                if create_step_result.get("status") == "error":
                    step_error = f"Failed to add step to cadence: {create_step_result.get('message')}"
                    print(f"❌ {step_error}")
                else:
                    print(f"📧 Adding step to cadence:")

            except Exception as e:
                step_error = f"Failed to add step to cadence: {str(e)}"
                print(f"❌ {step_error}")

            # Determine overall status  
            if step_error:
                errors = [step_error]

                return {
                    "status": "partial_success",
                    "message": f"Cadence '{name}' created but with some issues: {'; '.join(errors)}",
                    "error": "; ".join(errors),
                    "cadence_id": cadence_id,
                    "data": cadence_details,
                    "cadence_name": name,
                }

            return {
                "status": "success",
                "message": f"Cadence '{name}' created successfully",
                "cadence_id": cadence_id,
                "data": cadence_details,
                "cadence_name": name,
            }

        except Exception as e:
            print(f"❌ Unexpected error in create cadence tool: {e}")
            return {
                "status": "error",
                "message": f"Unexpected error creating cadence: {str(e)}",
                "error": str(e),
                "cadence_id": None,
                "data": None,
            }

    def get_cadence_schedule_from_datetime(
        self, start_datetime: datetime, white_days: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Helper method to convert datetime to schedule format

        Args:
            start_datetime: When to start the cadence
            white_days: Days when emails can be sent

        Returns:
            Dict with schedule information
        """
        if white_days is None:
            white_days = ["Mo", "Tu", "We", "Th", "Fr"]

        return {
            "start_date": {
                "year": start_datetime.year,
                "month": start_datetime.month,
                "day": start_datetime.day,
            },
            "start_time": {
                "hour": start_datetime.hour,
                "minute": start_datetime.minute,
                "second": start_datetime.second,
            },
            "white_days": white_days,
        }
