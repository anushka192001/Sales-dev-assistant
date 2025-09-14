'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Search, ChevronDown, MessageSquare } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/loader';

export default function TemplatesPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 relative">
      <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-4 pb-4 mb-4">
        <div className="flex w-full sm:w-auto items-center space-x-0 rounded-md overflow-hidden border border-gray-300 bg-gray-100">
          <Select>
            <SelectTrigger className="w-[190px] h-9 rounded-none cursor-pointer border-y-0 border-l-0 border-r border-gray-300 focus:ring-0 bg-white">
              <SelectValue placeholder="Select Search Option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="template_name">Template Name</SelectItem>
              <SelectItem value="editor_type">Editor Type</SelectItem>
              <SelectItem value="updated_by">Updated By</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-1">
            <Input
              type="text"
              placeholder="Search"
              className="pl-3 pr-2 h-9 w-full border-none rounded-none focus-visible:ring-0 focus-visible:outline-none shadow-none bg-white flex-grow"
            />
            <button
              className="flex items-center justify-center h-9 w-10 bg-gray-200 hover:bg-gray-300 text-gray-700
                       border-l border-gray-300 rounded-none focus:outline-none focus:ring-1 focus:ring-gray-400
                       transition-colors duration-150 ease-in-out"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold text-md text-white cursor-pointer h-9 px-4 rounded-md shadow-sm">
              Create Template <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[230px] rounded-lg shadow-xl border border-gray-200 bg-white p-2 z-50"
          >
            <DropdownMenuItem className="py-2 px-3 text-sm rounded-md cursor-pointer hover:bg-gray-100 focus:bg-gray-100">
              Use Rich Text Editor
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-start justify-between py-2 px-3 text-sm rounded-md cursor-pointer hover:bg-gray-100 focus:bg-gray-100 leading-tight">
              <span className="flex-1 pr-2">Use Drag And Drop Editor</span>
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-white bg-pink-500 rounded-full">
                New
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2 px-3 text-sm rounded-md cursor-pointer hover:bg-gray-100 focus:bg-gray-100">
              Import Template Zip
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Card className="mx-auto px-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="border-t">
                <TableRow>
                  <TableHead className="min-w-[200px]">Template</TableHead>
                  <TableHead className="min-w-[150px]">Editor Type</TableHead>
                  <TableHead className="min-w-[150px]">Updated</TableHead>
                  <TableHead className="min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="h-40 font-semibold text-lg text-center">
                    No templates found
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-15 cursor-pointer right-6 h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg z-50"
        aria-label="Open chat"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </Button>
    </div>
  );
}