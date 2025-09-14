import { Dialog, DialogContent, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useEffect, useState } from "react";
import { searchData } from "@/app/data/search-data";
import { Search, X, Filter, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MultiSelectDropdown } from '../search/location/location-drop-down';

const countries = [
    { label: 'APAC', value: 'group-header-apac', group: 'APAC' },
    { label: 'Afghanistan', value: 'afghanistan', group: 'APAC' },
    { label: 'Bangladesh', value: 'bangladesh', group: 'APAC' },
    { label: 'Australia', value: 'australia', group: 'APAC' },
    { label: 'Antarctica', value: 'antarctica', group: 'APAC' },
    { label: 'American Samoa', value: 'american-samoa', group: 'APAC' },
    { label: 'Europe', value: 'group-header-europe', group: 'Europe' },
    { label: 'France', value: 'france', group: 'Europe' },
    { label: 'Germany', value: 'germany', group: 'Europe' },
];

const seniorityOptions = [
    { label: 'Founder', value: 'founder' },
    { label: 'Chairman', value: 'chairman' },
    { label: 'President', value: 'president' },
    { label: 'CEO', value: 'ceo' },
    { label: 'CXO', value: 'cxo' },
    { label: 'Vice President', value: 'vice-president' },
    { label: 'Director', value: 'director' },
];

const functionalOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Analytics', value: 'analytics' },
    { label: 'Applications', value: 'applications' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Controller', value: 'controller' },
    { label: 'Customer Service', value: 'customer-service' },
    { label: 'Cloud', value: 'cloud' },
];

const companySizeOptions = [
    { label: '10000+', value: '10000+' },
    { label: '5001 - 10000', value: '5001-10000' },
    { label: '1001 - 5000', value: '1001-5000' },
    { label: '501 - 1000', value: '501-1000' },
    { label: '201 - 500', value: '201-500' },
    { label: '51 - 200', value: '51-200' },
    { label: '11 - 50', value: '11-50' },
];

interface FilterSectionProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
}

const FilterSection = ({ title, children, isOpen, onToggle }: FilterSectionProps) => {
    return (
        <div className={`mb-2 rounded-sm overflow-hidden transition ${isOpen ? 'border border-blue-500 bg-white' : 'border border-gray-350 bg-blue-50'}`}>
            <button
                onClick={onToggle}
                className={`flex items-center cursor-pointer justify-between w-full px-3 py-2 text-sm font-medium transition
          ${isOpen ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100 border border-blue-100'}`}
            >
                <span>{title}</span>
                {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
            </button>

            {isOpen && (
                <div className="bg-white px-3 pb-3 pt-1 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
};

export default function SearchModal() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<typeof searchData>([]);
    const [activeFilter, setActiveFilter] = useState<"all" | "person" | "company">("all");
    const [showFilters, setShowFilters] = useState(false);

    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [searchState, setSearchState] = useState<string>('');
    const [searchCity, setSearchCity] = useState<string>('');
    const [selectedSeniorityLevels, setSelectedSeniorityLevels] = useState<string[]>([]);
    const [selectedFunctionalLevels, setSelectedFunctionalLevels] = useState<string[]>([]);
    const [selectedCompanySizes, setSelectedCompanySizes] = useState<string[]>([]);
    const [openFilterSection, setOpenFilterSection] = useState<string | null>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code === "Space") {
                event.preventDefault();
                setOpen(true);
            }
            if (event.code === "Escape") {
                setOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleFilterToggle = (sectionId: string) => {
        setOpenFilterSection(openFilterSection === sectionId ? null : sectionId);
    };

    useEffect(() => {
        if (query.trim() === "") {
            setResults([]);
        } else {
            const filtered = searchData.filter((item) => {
                const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
                const matchesFilter = activeFilter === "all" || item.type === activeFilter;

                // Additional filter matching
                const matchesCountry = selectedCountries.length === 0 ||
                    (item.country && selectedCountries.includes(item.country));
                const matchesState = !searchState ||
                    (item.state && item.state.toLowerCase().includes(searchState.toLowerCase()));
                const matchesCity = !searchCity ||
                    (item.city && item.city.toLowerCase().includes(searchCity.toLowerCase()));
                const matchesSeniority = selectedSeniorityLevels.length === 0 ||
                    (item.seniority && selectedSeniorityLevels.includes(item.seniority));
                const matchesFunctional = selectedFunctionalLevels.length === 0 ||
                    (item.functional && selectedFunctionalLevels.includes(item.functional));
                const matchesCompanySize = selectedCompanySizes.length === 0 ||
                    (item.companySize && selectedCompanySizes.includes(item.companySize));

                return matchesQuery && matchesFilter &&
                    matchesCountry && matchesState && matchesCity &&
                    matchesSeniority && matchesFunctional && matchesCompanySize;
            });
            setResults(filtered);
        }
    }, [query, activeFilter, selectedCountries, searchState, searchCity,
        selectedSeniorityLevels, selectedFunctionalLevels, selectedCompanySizes]);

    const clearQuery = () => setQuery("");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />

            <DialogContent
                className="fixed top-[30%] left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl bg-white border border-border rounded-lg shadow-xl p-4 space-y-3"
            >
                <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold">Search</DialogTitle>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-4">
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search for people, companies..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-10 pr-28 h-12 text-base focus-visible:ring-2 focus-visible:ring-primary/50"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant={activeFilter === "all" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActiveFilter("all")}
                                className="flex items-center gap-2"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                All
                            </Button>
                            <Button
                                variant={activeFilter === "person" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActiveFilter("person")}
                                className="flex items-center gap-2"
                            >
                                👤 People
                            </Button>
                            <Button
                                variant={activeFilter === "company" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActiveFilter("company")}
                                className="flex items-center gap-2"
                            >
                                🏢 Companies
                            </Button>
                        </div>

                        {/* Results */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {query && results.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
                                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
                                </div>
                            )}
                            <AnimatePresence>
                                {results.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-accent text-muted-foreground group-hover:bg-primary/10">
                                            {item.type === "person" ? "👤" : "🏢"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="border-l pl-4 space-y-3">
                            <h3 className="text-sm font-semibold">Advanced Filters</h3>

                            <FilterSection
                                title="Location"
                                isOpen={openFilterSection === 'location'}
                                onToggle={() => handleFilterToggle('location')}
                            >
                                <MultiSelectDropdown
                                    placeholder="Search By Country"
                                    options={countries}
                                    selected={selectedCountries}
                                    setSelected={setSelectedCountries}
                                />
                                <MultiSelectDropdown
                                    placeholder="Search By State"
                                    searchOnly={true}
                                    searchValue={searchState}
                                    setSearchValue={setSearchState}
                                />
                                <MultiSelectDropdown
                                    placeholder="Type To Search City"
                                    searchOnly={true}
                                    searchValue={searchCity}
                                    setSearchValue={setSearchCity}
                                />
                            </FilterSection>

                            {activeFilter === 'person' && (
                                <FilterSection
                                    title="Job Title"
                                    isOpen={openFilterSection === 'jobTitle'}
                                    onToggle={() => handleFilterToggle('jobTitle')}
                                >
                                    <MultiSelectDropdown
                                        placeholder="Select Seniority Level"
                                        options={seniorityOptions}
                                        selected={selectedSeniorityLevels}
                                        setSelected={setSelectedSeniorityLevels}
                                    />
                                    <MultiSelectDropdown
                                        placeholder="Select Functional Level"
                                        options={functionalOptions}
                                        selected={selectedFunctionalLevels}
                                        setSelected={setSelectedFunctionalLevels}
                                    />
                                </FilterSection>
                            )}

                            {activeFilter === 'company' && (
                                <FilterSection
                                    title="Company Size"
                                    isOpen={openFilterSection === 'companySize'}
                                    onToggle={() => handleFilterToggle('companySize')}
                                >
                                    <MultiSelectDropdown
                                        placeholder="Select Company Size"
                                        options={companySizeOptions}
                                        selected={selectedCompanySizes}
                                        setSelected={setSelectedCompanySizes}
                                    />
                                </FilterSection>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
