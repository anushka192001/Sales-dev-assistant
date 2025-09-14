class CadenceTool {
    /**
     * Tool for creating and managing email sequences/cadences in Clodura.ai
     */
    constructor(apiKey, userId) {
        this.baseUrl = "https://app.clodura.ai/api/seq";
        this.addContactsUrl = "https://app.clodura.ai/api/radar/create/addListToSeq";
        this.apiKey = apiKey;
        this.userId = userId;
        this.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
        };
    }

    nanoid(n) {
        const uint32 = Math.floor(Math.random() * 0xFFFFFFFF);

        function intToBase(num, base) {
            if (num === 0) {
                return "0";
            }
            const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
            let res = "";
            while (num > 0) {
                res = digits[num % base] + res;
                num = Math.floor(num / base);
            }
            return res;
        }

        const baseToUse = 5;
        return intToBase(uint32, n);
    }

    createNewTemplate(n, body, subject) {
        const templateData = {
            'name': 'DT-' + this.nanoid(n),
            'subject': subject,
            'userId': this.userId,
            'type': 'html',
            'editor': 'rte',
            'status': 'active',
            'content': body,
            'contentObject': null,
            'dynamic': true,
            'cc': [],
            'bcc': []
        };
        return templateData;
    }

    async createCadence({
        name,
        cadenceType = "constant",
        tags = null,
        startDate = null,  // {year: 2025, month: 6, day: 18}
        startTime = null,  // {hour: 21, minute: 5, second: 44}
        whiteDays = null,  // ["Mo", "Tu", "We", "Th", "Fr"]
        listType = "",
        listId = null,
        toEmails = null,
        isActive = true,
        status = "paused",
        copyTempPhases = false,
        templateDetails = null,
        recipients = null
    }) {
        /**
         * Create a new email cadence/sequence
         *
         * Args:
         *     name: Name of the cadence
         *     cadenceType: Type of cadence (default: "constant")
         *     tags: List of tags for the cadence
         *     startDate: Start date as object with year, month, day
         *     startTime: Start time as object with hour, minute, second
         *     whiteDays: Days when emails can be sent (Mo, Tu, We, Th, Fr, Sa, Su)
         *     listType: Type of recipient list
         *     listId: ID of the recipient list
         *     toEmails: List of email addresses
         *     isActive: Whether the cadence is active
         *     status: Status of the cadence
         *     copyTempPhases: Whether to copy template phases
         *     templateDetails: Object with body and subject for email template
         *     recipients: List of recipient IDs
         *
         * Returns:
         *     Object containing the API response
         */

        // Set defaults
        if (tags === null) {
            tags = [];
        }
        if (startDate === null) {
            const today = new Date();
            startDate = {
                year: today.getFullYear(),
                month: today.getMonth() + 1,
                day: today.getDate()
            };
        }
        if (startTime === null) {
            const now = new Date();
            startTime = {
                hour: now.getHours(),
                minute: now.getMinutes(),
                second: now.getSeconds()
            };
        }
        if (whiteDays === null) {
            whiteDays = ["Mo", "Tu", "We", "Th", "Fr"];  // Weekdays only by default
        }
        if (toEmails === null) {
            toEmails = [];
        }
        if (recipients === null) {
            recipients = [];
        }

        const payload = {
            "name": name,
            "type": cadenceType,
            "tags": tags,
            "schedule": {
                "startDate": startDate,
                "startTime": startTime,
                "whiteDays": whiteDays,
            },
            "listType": listType,
            "listId": listId,
            "toEmails": toEmails,
            "steps": [],  // Empty for now, will add step functionality later
            "isActive": isActive,
            "status": status,
            "copyTempPhases": copyTempPhases,
            "userId": this.userId,
        };

        try {
            console.log(`📧 Creating cadence: ${name}`);
            console.log(`${JSON.stringify(templateDetails)},check once babe`);
            console.log(`📋 Payload: ${JSON.stringify(payload, null, 2)}`);

            // add contacts to cadence
            const createdCadenceDetails = await fetch(
                `${this.baseUrl}/addsequence/${this.userId}`,
                {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify(payload)
                }
            );

            if (!createdCadenceDetails.ok) {
                throw new Error(`HTTP error! status: ${createdCadenceDetails.status}`);
            }

            const cadenceDetails = await createdCadenceDetails.json();
            const cadenceId = cadenceDetails['_id']['$oid'];
            console.log(`✅ Cadence created with ID: ${cadenceId}`);
            console.log(`📋 Result: ${JSON.stringify(cadenceDetails)}`);

            // FIX: Handle null template_details properly
            let emailBody = "";
            let emailSubject = "";
            if (templateDetails !== null) {
                emailBody = templateDetails.body || "";
                emailSubject = templateDetails.subject || "";
            } else {
                console.log("⚠️  No template_details provided, using empty body and subject");
            }

            const createStepPayload = {
                "id": this.nanoid(8), // should be auto generated
                "name": "Email Phase 1",
                "sequenceName": name,
                "order": 0,
                "type": "email",
                "isEvent": false,
                "status": "paused",
                "userId": this.userId,
                "schedule": {
                    "startDate": cadenceDetails.schedule.startDate,
                    "startTime": cadenceDetails.schedule.startTime,
                    "endDate": [],
                    "endTime": [],
                    "blackDays": [],
                    // pass from cadence details
                    "whiteDays": cadenceDetails.whiteDays,
                    "offTime": null
                },
                "interval": {
                    "number": 0,
                    "mode": "Day"
                },
                "steps": [],
                "reportId": "",
                "templateId": null,
                "listId": "",
                "nextStep": "",
                "includeOriginal": false,
                "addUnsubLink": true,
                "notifyMe": false,
                "sequenceId": cadenceId,
                "prevStep": null,
                "template": this.createNewTemplate(4, emailBody, emailSubject)  // Create a new template for the step
            };

            try {
                const addStepResponse = await fetch(
                    `${this.baseUrl}/step/${this.userId}/${cadenceId}`,
                    {
                        method: 'POST',
                        headers: this.headers,
                        body: JSON.stringify(createStepPayload)
                    }
                );

                if (!addStepResponse.ok) {
                    throw new Error(`HTTP error! status: ${addStepResponse.status}`);
                }

                const createStepResult = await addStepResponse.json();
                console.log(`📧 Adding step to cadence: ${JSON.stringify(createStepResult)}`);

                const addContactsToCadencePayload = {
                    "userId": this.userId,
                    "name": name,
                    "source": "clodura",
                    "recipients": recipients,
                    "planName": "Starter",
                    "pageFlage": "contactSearch",
                    "action": "add",
                    "sequenceId": cadenceId
                };

                console.log(`please check payload before calling: ${JSON.stringify(addContactsToCadencePayload)} ${this.addContactsUrl}`);

                try {
                    const types = "campaign";
                    const addContactsResponse = await fetch(
                        `${this.addContactsUrl}/${types}`,
                        {
                            method: 'POST',
                            headers: this.headers,
                            body: JSON.stringify(addContactsToCadencePayload)
                        }
                    );

                    if (!addContactsResponse.ok) {
                        throw new Error(`HTTP error! status: ${addContactsResponse.status}`);
                    }

                    const addContactsResult = await addContactsResponse.json();
                    console.log(`📧 Adding contacts to cadence: ${JSON.stringify(addContactsResult)}`);

                } catch (e) {
                    console.log(`❌ Failed to add contacts to cadence: ${e}`);
                }

            } catch (e) {
                console.log(`❌ Failed to add step to cadence: ${e}`);
            }

            return {
                "status": "success",
                "message": `Cadence '${name}' created successfully`,
                "cadence_id": cadenceId,
                "cadence_name": name,
                "recipients_ids": recipients,
                "data": cadenceDetails,
            };

        } catch (e) {
            console.log(`❌ API request failed: ${e}`);
            return {
                "status": "error",
                "message": `API request failed: ${e.toString()}`,
                "cadence_id": null,
                "data": null,
            };
        }
    }

    getCadenceScheduleFromDatetime(startDatetime, whiteDays = null) {
        /**
         * Helper method to convert datetime to schedule format
         *
         * Args:
         *     startDatetime: When to start the cadence
         *     whiteDays: Days when emails can be sent
         *
         * Returns:
         *     Object with schedule information
         */
        if (whiteDays === null) {
            whiteDays = ["Mo", "Tu", "We", "Th", "Fr"];
        }

        return {
            "start_date": {
                "year": startDatetime.getFullYear(),
                "month": startDatetime.getMonth() + 1,
                "day": startDatetime.getDate(),
            },
            "start_time": {
                "hour": startDatetime.getHours(),
                "minute": startDatetime.getMinutes(),
                "second": startDatetime.getSeconds(),
            },
            "white_days": whiteDays,
        };
    }
}

// Example usage
async function createBasicCadence() {
    /**
     * Example of how to use the CadenceTool
     */
    
    // Initialize the tool
    const apiKey = "your_api_key_here";
    const userId = "68400fdecc7f4762201b755f";
    const cadenceTool = new CadenceTool(apiKey, userId);

    // Create a basic cadence
    const result = await cadenceTool.createCadence({
        name: "Q2 Product Outreach Campaign",
        tags: ["sales", "q2", "product"],
        whiteDays: ["Mo", "Tu", "We", "Th"],  // Weekdays only
    });

    return result;
}

async function createScheduledCadence() {
    /**
     * Example of creating a cadence with specific scheduling
     */
    
    const apiKey = "your_api_key_here";
    const userId = "68400fdecc7f4762201b755f";
    const cadenceTool = new CadenceTool(apiKey, userId);

    // Schedule for next Monday at 9 AM
    const now = new Date();
    const daysUntilMonday = (7 - now.getDay() + 1) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    const startDatetime = new Date(nextMonday);
    startDatetime.setHours(9, 0, 0, 0);

    const schedule = cadenceTool.getCadenceScheduleFromDatetime(startDatetime);

    const result = await cadenceTool.createCadence({
        name: "Monday Morning Outreach",
        tags: ["sales", "morning"],
        ...schedule
    });

    return result;
}