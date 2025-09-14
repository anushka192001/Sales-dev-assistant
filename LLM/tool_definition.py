tool_definition = [
    {
        "type": "function",
        "function": {
            "name": "search_leads",
            "description": "Search for professional contacts and companies using various filters. Use this to find individuals who are potential sales leads.",
            "parameters": {
                "type": "object",
                "properties": {
                    "companyName": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of company names to search for contacts within.",
                    },
                    "industry": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The industry of the companies to search for leads in. For example: ['Technology', 'Finance']",
                    },
                    "speciality": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific specialities of the companies. For example: ['Cloud Computing', 'SaaS']",
                    },
                    "size": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "0 - 1",
                                "2 - 10",
                                "11 - 50",
                                "51 - 200",
                                "201 - 500",
                                "501 - 1000",
                                "1001 - 5000",
                                "10000+",
                            ],
                        },
                        "description": "The size of the company by employee count.",
                    },
                    "revenue": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "< 1M",
                                "1M - 10M",
                                "11M - 100M",
                                "101M - 500M",
                                "501M - 1B",
                                "1B+",
                            ],
                        },
                        "description": "The revenue range of the company.",
                    },
                    "fundingType": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The type of funding the company has received.",
                    },
                    "fundingMinDate": {
                        "type": "string",
                        "description": "The minimum funding date in YYYY-MM-DD format.",
                    },
                    "fundingMaxDate": {
                        "type": "string",
                        "description": "The maximum funding date in YYYY-MM-DD format.",
                    },
                    "fullName": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The full name of a specific contact to search for.",
                    },
                    "seniority": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "Founder",
                                "Chairman",
                                "President",
                                "CEO",
                                "CXO",
                                "Vice President",
                                "Director",
                                "Head",
                                "Manager",
                                "Entry Level",
                                "Junior",
                                "Senior",
                                "Executive",
                            ],
                        },
                        "description": "The seniority level of the contacts to search for. For example: ['CEO', 'Vice President']",
                    },
                    "functionalLevel": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "Admin",
                                "Analytics",
                                "Applications",
                                "Compliance",
                                "Controller",
                                "Customer Service",
                                "Cloud",
                                "Cyber Security",
                                "Data Engineering",
                                "Devops",
                                "Digital",
                                "Distribution",
                                "Engineering",
                                "Finance",
                                "Fraud",
                                "Hiring",
                                "HR",
                                "Infrastructure",
                                "IT",
                                "Inside Sales",
                                "Learning",
                                "Legal",
                                "Marketing",
                                "Network Security",
                                "Operations",
                                "Product Management",
                                "Production",
                                "Product Security",
                                "Purchase",
                                "Risk",
                                "Sales",
                                "Security",
                                "Support",
                                "Testing",
                                "Training",
                                "Research",
                            ],
                        },
                        "description": "The functional area or department of the contact. For example: ['Marketing', 'Sales']",
                    },
                    "designation": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The specific job title of the contact. For example: ['Marketing Manager', 'Sales Director']",
                    },
                    "country": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The country where the contact is located.",
                    },
                    "state": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The state or region where the contact is located.",
                    },
                    "city": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The city where the contact is located.",
                    },
                    "companyIds": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of specific company IDs to find contacts within. Use this for follow-up queries after a company search to be more precise. Do not use this with companyName.",
                    },
                    "isFilter": {"type": "boolean", "default": True},
                    "limit": {
                        "type": "integer",
                        "description": "The maximum number of leads to return.",
                    },
                },
                "examples": [
                    {
                        "prompt": "Find me VPs of Sales in the Technology industry in California.",
                        "tool_calls": [
                            {
                                "name": "search_leads",
                                "arguments": {
                                    "seniority": ["Vice President"],
                                    "functionalLevel": ["Sales"],
                                    "industry": ["Technology"],
                                    "state": ["California"],
                                },
                            }
                        ],
                    },
                    {
                        "prompt": "Get me a list of 20 marketing managers in Chicago.",
                        "tool_calls": [
                            {
                                "name": "search_leads",
                                "arguments": {
                                    "designation": ["Marketing Manager"],
                                    "city": ["Chicago"],
                                    "limit": 20,
                                },
                            }
                        ],
                    },
                ],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_companies",
            "description": "Search for companies using various filters including location, industry, size, revenue, and technology stack. Use this to find companies that match a certain profile.",
            "parameters": {
                "type": "object",
                "properties": {
                    "companyName": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of company names to search for.",
                    },
                    "hqCountry": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The country where the company headquarters is located.",
                    },
                    "hqState": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The state or region where the company headquarters is located.",
                    },
                    "hqCity": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The city where the company headquarters is located.",
                    },
                    "industry": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "The industry the company operates in. For example: ['Healthcare', 'Retail']",
                    },
                    "company_type": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "Public",
                                "Private",
                                "Non-Profit",
                                "Government",
                                "Educational",
                                "Partnership",
                                "Sole Proprietorship",
                            ],
                        },
                        "description": "The ownership type of the company. Do not use this parameter unless specified",
                    },
                    "hiringAreas": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Departments or areas where the company is currently hiring.",
                    },
                    "speciality": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific specialities or focus areas of the company. Do not use this parameter unless user asked for a speciality",
                    },
                    "size": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "0 - 1",
                                "2 - 10",
                                "11 - 50",
                                "51 - 200",
                                "201 - 500",
                                "501 - 1000",
                                "1001 - 5000",
                                "5001 - 10000",
                                "10000+",
                            ],
                        },
                        "description": "The size of the company by employee count.",
                    },
                    "revenue": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "< 1M",
                                "1M - 10M",
                                "11M - 100M",
                                "101M - 500M",
                                "501M - 1B",
                                "1B+",
                            ],
                        },
                        "description": "The annual revenue range of the company.",
                    },
                    "websiteKeywords": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Keywords to search for on the company's website.",
                    },
                    "techParams": {
                        "type": "object",
                        "description": "Technology parameters for filtering based on the company's tech stack.",
                        "properties": {
                            "technologies": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "categories": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                    },
                    "langTechOs": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific programming languages, technologies, or operating systems used by the company.",
                    },
                    "websiteList": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of specific company websites to search for.",
                    },
                    "uniqueCompanies": {"type": "boolean", "default": False},
                    "excludeWebList": {"type": "boolean", "default": False},
                    "funding": {"type": "boolean", "default": False},
                    "fundingType": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "Pre-Seed",
                                "Seed",
                                "Series A",
                                "Series B",
                                "Series C",
                                "Series D",
                                "Series E+",
                                "Private Equity",
                                "IPO",
                                "Acquisition",
                                "Debt Financing",
                                "Grant",
                                "Crowdfunding",
                            ],
                        },
                    },
                    "fundingMinDate": {"type": "string", "format": "date"},
                    "fundingMaxDate": {"type": "string", "format": "date"},
                    "contentSearch": {"type": "string"},
                    "partnerIntent": {"type": "array", "items": {"type": "string"}},
                    "lockedCompany": {"type": "boolean", "default": False},
                    "correspondence": {"type": "boolean", "default": False},
                    "boardline": {"type": "boolean", "default": False},
                    "exclude_companies": {"type": "array", "items": {"type": "string"}},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 100},
                    "start": {"type": "integer", "default": 0, "minimum": 0},
                    "sort": {
                        "type": "string",
                        "enum": ["name", "size", "revenue", "founded", "relevance"],
                    },
                },
                "examples": [
                    {
                        "prompt": "Find private companies in the 'SaaS' industry with a revenue of over $10M.",
                        "tool_calls": [
                            {
                                "name": "search_companies",
                                "arguments": {
                                    "company_type": ["Private"],
                                    "speciality": ["SaaS"],
                                    "revenue": [
                                        "11M - 100M",
                                        "101M - 500M",
                                        "501M - 1B",
                                        "1B+",
                                    ],
                                },
                            }
                        ],
                    },
                    {
                        "prompt": "Show me 10 startups in New York that have received Seed funding.",
                        "tool_calls": [
                            {
                                "name": "search_companies",
                                "arguments": {
                                    "hqCity": ["New York"],
                                    "fundingType": ["Seed"],
                                    "limit": 10,
                                },
                            }
                        ],
                    },
                ],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_cadence",
            "description": "Create a new email cadence or campaign for automated outreach sequences.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the cadence or campaign.",
                    },
                    "cadence_type": {
                        "type": "string",
                        "default": "constant",
                        "description": "The type of cadence.",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags for organizing and tracking the cadence.",
                    },
                    "start_date": {
                        "type": "object",
                        "properties": {
                            "year": {"type": "integer"},
                            "month": {"type": "integer"},
                            "day": {"type": "integer"},
                        },
                        "description": "The start date for the cadence.",
                    },
                    "start_time": {
                        "type": "object",
                        "properties": {
                            "hour": {"type": "integer"},
                            "minute": {"type": "integer"},
                            "second": {"type": "integer"},
                        },
                        "description": "The start time for the cadence.",
                    },
                    "white_days": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
                        },
                        "description": "The days of the week when emails are allowed to be sent.",
                    },
                    "is_active": {
                        "type": "boolean",
                        "default": False,
                        "description": "Set to true to activate the cadence immediately.",
                    },
                    "status": {
                        "type": "string",
                        "default": "active",
                        "description": "The status of the cadence.",
                    },
                    "template_details": {
                        "type": "object",
                        "properties": {
                            "body": {"type": "string"},
                            "subject": {"type": "string"},
                        },
                        "default": "None",
                        "description": "Email content to be added to the cadence, this will be passed down later by system, in case you have it in context, do call it",
                    },
                },
                "required": ["name", "template_details"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_contacts_to_cadence",
            "description": "Add one or more contacts (recipients) to an existing cadence or campaign.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The exact name of the cadence or campaign to which the contacts should be added.",
                    },
                    "recipients_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "A list of recipient/contact IDs to add to the cadence.",
                    },
                    "cadence_id": {
                        "type": "string",
                        "description": "The unique ID of the existing cadence or campaign.",
                    },
                },
                "required": ["name", "cadence_id", "recipients_ids"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_email",
            "description": "Generate an email with a specific tone, type, and purpose. This tool crafts both the subject and body of the email.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tone": {
                        "type": "string",
                        "description": "The desired tone of the email (e.g., formal, casual, assertive, friendly, persuasive).",
                    },
                    "email_type": {
                        "type": "string",
                        "description": "The type of email (e.g., business, reach out, campaign, follow-up).",
                    },
                    "purpose": {
                        "type": "string",
                        "description": "The main objective of the email (e.g., request a meeting, introduce a new product).",
                    },
                    "example": {
                        "type": "string",
                        "description": "An optional example of an email or specific phrases to guide the generation.",
                    },
                },
                "required": ["tone", "email_type", "purpose"],
            },
        },
    },
]
