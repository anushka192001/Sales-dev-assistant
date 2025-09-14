// data/searchData.ts

interface SearchItem {
    id: number;
    type: "person" | "company";
    name: string;
    country?: string;
    state?: string;
    city?: string;
    seniority?: string;
    functional?: string;
    companySize?: string;
}

export const searchData: SearchItem[] = [
    { 
        id: 1, 
        type: "person", 
        name: "John Doe",
        country: "france",
        state: "Île-de-France",
        city: "Paris",
        seniority: "ceo",
        functional: "admin"
    },
    { 
        id: 2, 
        type: "company", 
        name: "Acme Inc.",
        country: "germany",
        state: "Bavaria",
        city: "Munich",
        companySize: "1001-5000"
    },
    { 
        id: 3, 
        type: "person", 
        name: "Jane Smith",
        country: "australia",
        state: "New South Wales",
        city: "Sydney",
        seniority: "director",
        functional: "analytics"
    },
    { 
        id: 4, 
        type: "company", 
        name: "Globex Corporation",
        country: "bangladesh",
        state: "Dhaka",
        city: "Dhaka",
        companySize: "5001-10000"
    },
    // ... add more
];

export type { SearchItem };
  