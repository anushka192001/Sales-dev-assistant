from typing import Optional, List, Dict, Any
from datetime import datetime, date
from clodura_client import CloduraClient


class CadenceStepTool:
    """
    Tool for adding steps to an existing email cadence in Clodura.ai
    """

    def __init__(self, user_id: str, clodura_client: CloduraClient):
        self.user_id = user_id
        self.client = clodura_client

    async def create_cadence_step(
        self,
        cadence_id: str,
        name: str,
        order: int,
        step_type: str = "email",
        subject: str = "",
        content: str = "",
        interval_number: int = 1,
        interval_mode: str = "Day",
        schedule_start_date: Optional[Dict[str, int]] = None,
        schedule_start_time: Optional[Dict[str, int]] = None,
        schedule_white_days: Optional[List[str]] = None,
        is_event: bool = False,
        status: str = "active",
        add_unsub_link: bool = True,
        template_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new step for an existing email cadence.

        Args:
            cadence_id (str): The ID of the parent cadence to add the step to.
            name (str): Name of the cadence step (e.g., "Email Phase 1").
            order (int): The order of the step in the sequence (e.g., 0 for the first step).
            step_type (str): Type of step (default: "email").
            subject (str): Subject of the email for this step.
            content (str): HTML or plain text content of the email for this step.
            interval_number (int): Number for the interval (e.g., 6).
            interval_mode (str): Mode for the interval (e.g., "Day", "Hour").
            schedule_start_date (Optional[Dict[str, int]]): Specific start date for the step.
            schedule_start_time (Optional[Dict[str, int]]): Specific start time for the step.
            schedule_white_days (Optional[List[str]]): Days when this step can be sent.
            is_event (bool): Whether this step is an event (default: False).
            status (str): Status of the step (default: "active").
            add_unsub_link (bool): Whether to include an unsubscribe link (default: True).
            template_name (Optional[str]): Name for the internal email template. Defaults to step name.

        Returns:
            Dict[str, Any]: A dictionary containing the API response status and data.
        """

        # Set defaults for schedule if not provided
        if schedule_start_date is None:
            today = date.today()
            schedule_start_date = {
                "year": today.year,
                "month": today.month,
                "day": today.day,
            }
        if schedule_start_time is None:
            now = datetime.now().time()
            schedule_start_time = {
                "hour": now.hour,
                "minute": now.minute,
                "second": now.second,
            }
        if schedule_white_days is None:
            schedule_white_days = ["Mo", "Tu", "We", "Th", "Fr"]

        if template_name is None:
            template_name = f"{name} Template"

        payload = {
            "name": name,
            "order": order,
            "type": step_type,
            "isEvent": is_event,
            "status": status,
            "userId": self.user_id,
            "schedule": {
                "startDate": schedule_start_date,
                "startTime": schedule_start_time,
                "whiteDays": schedule_white_days,
            },
            "interval": {
                "number": interval_number,
                "mode": interval_mode,
            },
            "steps": [],
            "reportId": "",
            "templateId": None,
            "listId": "",
            "nextStep": "",
            "includeOriginal": False,
            "addUnsubLink": add_unsub_link,
            "notifyMe": False,
            "sequenceId": cadence_id,
            "prevStep": None,
            "template": {
                "name": template_name,
                "subject": subject,
                "userId": self.user_id,
                "type": "html",
                "editor": "rte",
                "status": "active",
                "content": content,
                "contentObject": None,
                "dynamic": True,
                "cc": [],
                "bcc": [],
            },
        }

        try:
            print(f"Adding step '{name}' to cadence ID: {cadence_id}")

            # Use the client to make the request
            result = await self.client.create_cadence_step(
                cadence_id=cadence_id, body=payload, user_id=self.user_id
            )

            # Check if the request was successful
            if result.get("status") == "error":
                print(
                    f"❌ API request failed for cadence step: {result.get('message')}"
                )
                return result

            return {
                "status": "success",
                "message": f"Cadence step '{name}' created successfully for cadence ID: {cadence_id}",
                "step_id": result.get("id"),
                "data": result,
            }

        except Exception as e:
            print(f"❌ Unexpected error during cadence step creation: {e}")
            return {
                "status": "error",
                "message": f"Unexpected error during step creation: {str(e)}",
                "step_id": None,
                "data": None,
            }
