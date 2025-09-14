import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight } from "lucide-react";
import { Users, Building2, Upload, Settings } from "lucide-react";
import Image from "next/image";

export default function EnrichmentPage() {

    const enrichCsvImage = 'https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/csv.svg';

    return (
        <div className="min-h-screen bg-[#E2E6ED] p-6 flex flex-col">
            <div className="container mx-auto px-4 flex-1 flex flex-col">
                <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col bg-white shadow-lg rounded-lg overflow-hidden">
                    <div className="bg-[#E2E6ED] border-b border-gray-200">
                        <TabsList className="grid grid-cols-2 h-auto p-0 bg-transparent relative">
                            <TabsTrigger
                                value="overview"
                                className="py-3 px-6 text-sm font-medium text-gray-600
                                           data-[state=active]:text-blue-600 data-[state=active]:bg-white
                                           data-[state=active]:rounded-t-lg data-[state=active]:border-t
                                           data-[state=active]:border-x data-[state=active]:border-gray-200
                                           data-[state=active]:border-b-white
                                           hover:bg-gray-50 cursor-pointer"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="csv-enrichment"
                                className="py-3 px-6 text-sm font-medium text-gray-600
                                           data-[state=active]:text-blue-600 data-[state=active]:bg-white
                                           data-[state=active]:rounded-t-lg data-[state=active]:border-t
                                           data-[state=active]:border-x data-[state=active]:border-gray-200
                                           data-[state=active]:border-b-white
                                           hover:bg-gray-50 cursor-pointer"
                            >
                                CSV Enrichment
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Main content area for tab contents */}
                    <main className="flex-1 flex flex-col justify-center items-center p-4">
                        <TabsContent value="overview" className="w-full flex-1 flex flex-col items-center pt-8">
                            <div className="text-center mb-10">
                                <h1 className="text-3xl font-semibold text-gray-800 mb-2">Welcome to enrichment</h1>
                                <p>Here, you can enrich and update your records with information from</p>
                                <p>Clodura.AI.</p>
                            </div>
                            <Card className="w-full max-w-md shadow-xl !py-0 rounded-lg overflow-hidden">
                                <CardContent className="flex flex-col items-center justify-center p-0 text-center bg-white">
                                    <div className="w-full flex items-center justify-center py-8 px-4 gradient-blue-light"
                                    >
                                        <div className="rounded-sm bg-white bg-opacity-30 flex items-center justify-center">
                                            <Image
                                                src={enrichCsvImage}
                                                alt="CSV icon"
                                                width={100}
                                                height={100}
                                                quality={100}
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <CardTitle className="text-2xl font-bold text-gray-800 mb-2">CSV Enrichment</CardTitle>
                                        <CardDescription className="text-gray-600 text-base mb-6">
                                            Enrich a CSV of records with Clodura's information.
                                        </CardDescription>
                                        <Button className="bg-[#0683FB] hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md inline-flex items-center group text-base">
                                            Get Started
                                            <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-200 group-hover:translate-x-1" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="csv-enrichment" className="w-full flex-1 flex flex-col items-center pt-8">
                            <div className="text-center mb-10">
                                <h3 className="text-3xl font-semibold text-gray-800 mb-2">Enrich contacts or companies in a CSV</h3>
                                <p>Boost your contacts or companies data with Clodura.AI insights!</p>
                                <p>Simply select a CSV for a deeper understanding.</p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl px-4 mt-8">
                                <Card className="w-full shadow-lg p-6 flex flex-col items-center text-center">
                                    <CardContent className="p-0 flex flex-col items-center">
                                        <div className="p-4 text-sky-600 mb-6">
                                            <Users className="h-12 w-12" />
                                        </div>
                                        <CardTitle className="text-xl font-semibold text-gray-800 mb-2">Enrich Contacts</CardTitle>
                                        <CardDescription className="text-gray-600 mb-6">
                                            Unleash hidden value enrich your CSV with Clodura.
                                        </CardDescription>
                                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full justify-center">
                                            <Button variant="outline" className="text-white bg-[#0683FB] cursor-pointer hover:bg-blue-500 hover:text-white">
                                                <Upload className="mr-2 h-4 w-4" /> Select CSV
                                            </Button>
                                            <Button variant="outline" className="text-[#0683FB] cursor-pointer border border-[#0683FB] hover:bg-[#0683FB] hover:text-white">
                                                <Settings className="mr-2 h-4 w-4" /> Edit Settings
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="w-full shadow-lg p-6 flex flex-col items-center text-center">
                                    <CardContent className="p-0 flex flex-col items-center">
                                        <div className="p-4 text-sky-600 mb-6">
                                            <Building2 className="h-12 w-12" />
                                        </div>
                                        <CardTitle className="text-xl font-semibold text-gray-800 mb-2">Enrich Companies</CardTitle>
                                        <CardDescription className="text-gray-600 mb-6">
                                            Unleash hidden value enrich your CSV with Clodura.
                                        </CardDescription>
                                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full justify-center">
                                            <Button variant="outline" className="text-white bg-[#0683FB] cursor-pointer hover:bg-blue-500 hover:text-white">
                                                <Upload className="mr-2 h-4 w-4" /> Select CSV
                                            </Button>
                                            <Button variant="outline" className="text-[#0683FB] cursor-pointer border border-[#0683FB] hover:bg-[#0683FB] hover:text-white">
                                                <Settings className="mr-2 h-4 w-4" /> Edit Settings
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </main>
                </Tabs>
            </div>
        </div>
    );
}