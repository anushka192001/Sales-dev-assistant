'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AreaChart,
  Search,
  Download,
  BarChart3,
  Settings,
  Mail,
  FileText,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  FolderSearch,
  Users2,
  Copy,
  PencilLine,
  Tag
} from 'lucide-react';
import { TooltipProvider, TooltipTrigger, TooltipContent, Tooltip } from '@radix-ui/react-tooltip';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/loader';

interface Sequence {
  id: number;
  name: string;
  state: boolean;
  contacts: {
    active: number;
    paused: number;
    interested: number;
    finished: number;
  };
  emails: {
    sent: number;
    scheduled: number;
    read: string;
    replied: string;
    linkClick: string;
  };
  bounced: {
    soft: string;
    hard: string;
  };
}

export default function AutomatedSequencePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOption, setSearchOption] = useState('Sequence Name');
  const [selectedSequences, setSelectedSequences] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState('25');
  const [currentSequenceData, setCurrentSequenceData] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch sequences from API
  const fetchSequences = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:8000/proxy/clodura/tag-sequences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "selectedName": "", "selectedValue": "", "uids": [], "planName": "Prospect Pro" }
        ), // You can modify this body as needed
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log('API Response:', data); // Debug log

      // Check if seqList exists and is an array
      if (!data.seqList || !Array.isArray(data.seqList)) {
        console.error('seqList is not an array:', data.seqList);
        throw new Error('Invalid response format: seqList not found or not an array');
      }

      // Transform the API data to match your Sequence interface
      const transformedData: Sequence[] = data.seqList.map((item: any, index: number) => {
        const report = item.seqReport || {};
        const totalSent = report.totalSentCount || 0;

        // Calculate percentages
        const readPercentage = totalSent > 0 ? ((report.totalReadCount || 0) / totalSent * 100).toFixed(1) + '%' : '0.0%';
        const replyPercentage = totalSent > 0 ? ((report.totalReplyCount || 0) / totalSent * 100).toFixed(1) + '%' : '0.0%';
        const linkClickPercentage = totalSent > 0 ? ((report.totalTrackCount || 0) / totalSent * 100).toFixed(1) + '%' : '0.0%';
        const softBouncePercentage = totalSent > 0 ? ((report.softBounceCount || 0) / totalSent * 100).toFixed(1) + '%' : '0.0%';
        const hardBouncePercentage = totalSent > 0 ? ((report.hardBounceCount || 0) / totalSent * 100).toFixed(1) + '%' : '0.0%';

        return {
          id: item._id?.$oid || index + 1,
          name: item.name || `Sequence ${index + 1}`,
          state: item.isActive || false,
          contacts: {
            active: report.totalActiveCount || 0,
            paused: report.totalPausedCount || 0,
            interested: report.totalInterestedCount || 0,
            finished: report.totalFinishedCount || 0,
          },
          emails: {
            sent: totalSent,
            scheduled: report.totalScheduledCount || 0,
            read: readPercentage,
            replied: replyPercentage,
            linkClick: linkClickPercentage,
          },
          bounced: {
            soft: softBouncePercentage,
            hard: hardBouncePercentage,
          },
        };
      });

      setCurrentSequenceData(transformedData);
    } catch (err) {
      console.error('Error fetching sequences:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sequences');
      // Fallback to empty array on error
      setCurrentSequenceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSequences();
  }, []);

  const filteredSequences = currentSequenceData.filter(sequence => {
    if (!searchTerm) return true;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    switch (searchOption) {
      case 'Sequence Name':
        return sequence.name.toLowerCase().includes(lowerCaseSearchTerm);
      default:
        return false;
    }
  });

  const indexOfLastItem = currentPage * parseInt(itemsPerPage);
  const indexOfFirstItem = indexOfLastItem - parseInt(itemsPerPage);
  const paginatedSequences = filteredSequences.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSequences.length / parseInt(itemsPerPage));

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleSelectAll = (checkedState: boolean | 'indeterminate') => {
    if (checkedState === true) {
      setSelectedSequences(paginatedSequences.map(seq => seq.id));
    } else if (checkedState === false) {
      setSelectedSequences([]);
    }
  };

  const handleSelectSequence = (id: number, checkedState: boolean | 'indeterminate') => {
    const checked = checkedState === true;

    if (checked) {
      setSelectedSequences(prev => [...prev, id]);
    } else {
      setSelectedSequences(prev => prev.filter(seqId => seqId !== id));
    }
  };

  const handleSequenceStateChange = (id: number, newState: boolean) => {
    setCurrentSequenceData(prevData =>
      prevData.map(seq => (seq.id === id ? { ...seq, state: newState } : seq))
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-4 sm:p-6 bg-[#E2E6ED] min-h-screen">
      {/* Error display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">
            Error loading sequences: {error}
          </p>
          <Button
            onClick={fetchSequences}
            className="mt-2 text-sm bg-red-600 hover:bg-red-700 text-white"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center mr-auto md:mr-0">
          <Button variant="outline" className="h-9 px-4 py-2 text-sm font-medium rounded-md shadow-sm border-gray-300 bg-white hover:bg-gray-50">
            <AreaChart className="w-4 h-4 text-blue-600 mr-2" />
            Show Team Analytics
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-[#2596FF] cursor-pointer text-white rounded-md w-10 h-10 flex items-center justify-center hover:bg-blue-600 transition-colors"
          >
            <FolderSearch className="!w-5 !h-5" />
          </Button>

          <div className="flex items-center border border-neutral-300 rounded-md overflow-hidden shadow-sm bg-white">
            <Select value={searchOption} onValueChange={setSearchOption}>
              <SelectTrigger className="w-40 sm:w-60 h-10 rounded-none border-0 cursor-pointer bg-transparent text-sm text-gray-700 focus:ring-0 focus:outline-none data-[placeholder]:text-gray-500">
                <SelectValue placeholder="Select Search Option" />
              </SelectTrigger>
              <SelectContent className="text-sm cursor-pointer shadow-md border border-neutral-200 bg-white">
                <SelectItem value="Sequence Name">Sequence Name</SelectItem>
                <SelectItem value="Contact Email">Contact Email</SelectItem>
                <SelectItem value="Contact Name">Contact Name</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 h-10 border-0 focus:outline-none focus:ring-0 px-3 text-sm text-gray-700 placeholder:text-gray-500"
            />
            <Button
              variant="ghost"
              size="icon"
              className="bg-neutral-200 cursor-pointer text-gray-600 hover:bg-neutral-300 border-l border-neutral-300 rounded-none w-10 h-10 flex items-center justify-center">
              <Search className="w-4 h-4 cursor-pointer" />
            </Button>
          </div>
          <Button className="bg-[#2596FF] cursor-pointer hover:bg-[#0084fe] text-white text-sm font-medium h-10 rounded-md shadow-sm whitespace-nowrap">
            Create Sequence
          </Button>
        </div>
      </div>

      <Card className="bg-white rounded-lg border shadow-sm !gap-0">
        <CardHeader className="flex items-center gap-2 border-b border-gray-200">
          <Button variant="outline" size="sm" className="h-8 gap-2 border-[#2596FF] bg-white hover:bg-gray-50 text-[#2596FF]">
            <Users2 className="w-4 h-4" />
            Show Contacts
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-2 border-[#2596FF] bg-white hover:bg-gray-50 text-[#2596FF]">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-2 border-[#2596FF] bg-white hover:bg-gray-50 text-[#2596FF]">
            <BarChart3 className="w-4 h-4" />
            Show Analytics
          </Button>
          <div className="ml-auto px-4 py-2">
            <span className="text-sm font-medium">
              {filteredSequences.length} Sequence{filteredSequences.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Main Table */}
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="text-gray-700 uppercase text-xs">
                  <TableHead className="w-12 text-center py-2 align-middle">
                    <Checkbox
                      checked={selectedSequences.length > 0 && selectedSequences.length === paginatedSequences.length}
                      onCheckedChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </TableHead>
                  <TableHead className="w-16 text-center py-2 align-middle">State</TableHead>
                  <TableHead className="min-w-[200px] text-left py-2 align-middle">Sequence</TableHead>
                  <TableHead className="text-center py-2 align-middle" colSpan={4}>Contacts</TableHead>
                  <TableHead className="text-center py-2 align-middle" colSpan={5}>Emails</TableHead>
                  <TableHead className="text-center py-2 align-middle" colSpan={2}>Bounced</TableHead>
                </TableRow>

                <TableRow className="text-gray-700 uppercase text-xs font-normal">
                  {/* Empty cells for the first three columns to align sub-headers */}
                  <TableHead className="py-2"></TableHead>
                  <TableHead className="py-2"></TableHead>
                  <TableHead className="py-2"></TableHead>

                  {/* Contacts sub-headers */}
                  <TableHead className="py-2 text-center">Active</TableHead>
                  <TableHead className="py-2 text-center">Paused</TableHead>
                  <TableHead className="py-2 text-center">Interested</TableHead>
                  <TableHead className="py-2 text-center">Finished</TableHead>

                  {/* Emails sub-headers */}
                  <TableHead className="py-2 text-center">Sent</TableHead>
                  <TableHead className="py-2 text-center">Scheduled</TableHead>
                  <TableHead className="py-2 text-center">Read</TableHead>
                  <TableHead className="py-2 text-center">Replied</TableHead>
                  <TableHead className="py-2 text-center">Link Click</TableHead>

                  {/* Bounced sub-headers */}
                  <TableHead className="py-2 text-center">Soft</TableHead>
                  <TableHead className="py-2 text-center">Hard</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSequences.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="h-40 text-center text-gray-500">
                      {error ? 'Failed to load sequences.' : 'No sequences found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSequences.map((sequence) => (
                    <TableRow key={sequence.id} className="text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <TableCell className="w-12 text-center py-2 align-middle">
                        <Checkbox
                          checked={selectedSequences.includes(sequence.id)}
                          onCheckedChange={(checkedState) => handleSelectSequence(sequence.id, checkedState)}
                          className="w-4 h-4"
                        />
                      </TableCell>
                      <TableCell className="w-16 text-center py-2 align-middle">
                        <Switch
                          checked={sequence.state}
                          onCheckedChange={(checkedState) => handleSequenceStateChange(sequence.id, checkedState === true)}
                          className="data-[state=checked]:bg-sky-600 data-[state=unchecked]:bg-gray-400"
                          aria-label={sequence.state ? "Active" : "Inactive"}
                        />
                      </TableCell>

                      <TableCell className="min-w-[200px] py-2 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 whitespace-nowrap">{sequence.name}</span>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm cursor-pointer text-gray-500 p-0.5">
                                    <PencilLine className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                  Rename
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-gray-500 cursor-pointer hover:bg-gray-100 p-0.5">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                  Edit Sequence
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-gray-500 cursor-pointer hover:bg-gray-100 p-0.5">
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                  Settings
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-gray-500 cursor-pointer hover:bg-gray-100 p-0.5">
                                    <Users2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                  Show Contacts
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-green-600 cursor-pointer hover:bg-green-50 p-0.5">
                                    <Mail className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                  Show Email
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-purple-600 cursor-pointer hover:bg-purple-50 p-0.5">
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                  Clone
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-sm cursor-pointer text-red-600 p-0.5"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                  Delete
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-gray-600 cursor-pointer hover:bg-gray-100 p-0.5">
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                  View Sequence Reports
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <Badge className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-md">
                              sales
                            </Badge>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 bg-gray-200 rounded-sm cursor-pointer text-gray-500 hover:bg-gray-100 p-0.5">
                                    <Tag className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                  Add/Edits Tags
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </TableCell>

                      {/* Individual TableCell for each data point under Contacts */}
                      <TableCell className="text-center py-2 align-middle">{sequence.contacts.active}</TableCell>
                      <TableCell className="text-center py-2 align-middle">{sequence.contacts.paused}</TableCell>
                      <TableCell className="text-center py-2 align-middle">{sequence.contacts.interested}</TableCell>
                      <TableCell className="text-center py-2 align-middle">{sequence.contacts.finished}</TableCell>
                      {/* Individual TableCell for each data point under Emails */}
                      <TableCell className="text-center py-2 align-middle">{sequence.emails.sent}</TableCell>
                      <TableCell className="text-center py-2 align-middle">{sequence.emails.scheduled}</TableCell>
                      <TableCell className="text-center py-2 align-middle">{sequence.emails.read}</TableCell>
                      <TableCell className="text-center py-2 align-middle">{sequence.emails.replied}</TableCell>
                      <TableCell className="text-center py-2 align-middle">{sequence.emails.linkClick}</TableCell>
                      {/* Individual TableCell for each data point under Bounced */}
                      <TableCell className="text-center py-2 align-middle">{sequence.bounced.soft}</TableCell>
                      <TableCell className="text-center py-2 align-middle">{sequence.bounced.hard}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between p-4">
          {/* Left Pagination Controls */}
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer text-gray-500 hover:bg-gray-100 border border-gray-300"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {'<<'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-gray-500 cursor-pointer hover:bg-gray-100 border border-gray-300"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {/* Page number buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'ghost'}
                size="icon"
                className={`h-7 w-7 rounded-md cursor-pointer text-xs font-medium ${page === currentPage
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-gray-500 cursor-pointer hover:bg-gray-100 border border-gray-300"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-md text-gray-500 cursor-pointer hover:bg-gray-100 border border-gray-300"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              {'>>'}
            </Button>
          </div>

          {/* Right Pagination Info & Add Sequence */}
          <div className="flex items-center gap-2">
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="w-full h-8 text-sm cursor-pointer text-gray-700">
                <SelectValue>
                  {itemsPerPage} sequence
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="text-sm shadow-md border border-neutral-200 bg-white">
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}