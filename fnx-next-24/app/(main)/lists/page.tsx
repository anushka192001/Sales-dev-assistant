'use client';
import React from 'react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import ContactsListTab from '@/components/lists/contacts-list';

const ListsPage = () => {
    return (
        <div className="p-6 bg-[#E2E6ED] min-h-screen">
            <Tabs defaultValue="contacts-list" className="!gap-0">
                <TabsList className="bg-transparent h-full p-0">
                    <TabsTrigger
                        className="cursor-pointer px-4 py-2 text-sm font-medium
                                   data-[state=active]:bg-white data-[state=active]:shadow-sm
                                   data-[state=active]:rounded-t-md data-[state=active]:rounded-b-none
                                   data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-b-white data-[state=active]:z-10
                                   relative top-[1px]
                                   "
                        value="contacts-list"
                    >
                        Contacts List
                    </TabsTrigger>
                    <TabsTrigger
                        className="cursor-pointer px-4 py-2 text-sm font-medium
                                   data-[state=active]:bg-white data-[state=active]:shadow-sm
                                   data-[state=active]:rounded-t-md data-[state=active]:rounded-b-none
                                   data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-b-white data-[state=active]:z-10
                                   relative top-[1px]
                                   "
                        value="email-suppression-list"
                    >
                        Email Suppression List
                    </TabsTrigger>
                    <TabsTrigger
                        className="cursor-pointer px-4 py-2 text-sm font-medium
                                   data-[state=active]:bg-white data-[state=active]:shadow-sm
                                   data-[state=active]:rounded-t-md data-[state=active]:rounded-b-none
                                   data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-b-white data-[state=active]:z-10
                                   relative top-[1px]
                                   "
                        value="website-suppression-list"
                    >
                        Website Suppression List
                    </TabsTrigger>
                    <TabsTrigger
                        className="cursor-pointer px-4 py-2 text-sm font-medium
                                   data-[state=active]:bg-white data-[state=active]:shadow-sm
                                   data-[state=active]:rounded-t-md data-[state=active]:rounded-b-none
                                   data-[state=active]:border-t data-[state=active]:border-x data-[state=active]:border-b-white data-[state=active]:z-10
                                   relative top-[1px]
                                   "
                        value="name-suppression-list"
                    >
                        Name Suppression List
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="contacts-list">
                    <ContactsListTab />
                </TabsContent>
                <TabsContent value="email-suppression-list" className="bg-white p-4 rounded-md rounded-tl-none shadow-sm border border-gray-200 -mt-[1px]">Email Suppression List UI will go here.</TabsContent>
                <TabsContent value="website-suppression-list" className="bg-white p-4 rounded-md rounded-tl-none shadow-sm border border-gray-200 -mt-[1px]">Website Suppression List UI will go here.</TabsContent>
                <TabsContent value="name-suppression-list" className="bg-white p-4 rounded-md rounded-tl-none shadow-sm border border-gray-200 -mt-[1px]">Name Suppression List UI will go here.</TabsContent>
            </Tabs>
        </div>
    );
};

export default ListsPage;