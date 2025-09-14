"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Merge,
  Search,
  Plus,
  Pencil,
  Users,
  Download,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import RecipientListModal from "../modal/recipientListModal";

const ContactsListTab = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [listData, setListData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / parseInt(itemsPerPage));
  const [showModal, setShowModal] = useState(false);
  const handlePageChange = (page: any) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [itemsPerPage, totalPages, currentPage]);

  // Fetch list data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          "http://localhost:8000/proxy/clodura_list",
          {
            headers: {
              Authorization:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOnsiYW0iOnsic2hvd1Bob25lIjpmYWxzZX0sInBsYW5TdHJ1Y3R1cmUiOnsibWF4U2VxdWVuY2UiOjk5OTk5OTk5OSwibWF4Q29tcGFuaWVzIjo5OTk5OTk5OTksIm1heENvbnRhY3RzIjo5OTk5OTk5OTksIm1heEVtYWlscyI6OTk5OTk5OTk5LCJtYXhDYW1wYWlnbnMiOjk5OTk5OTk5OSwibWF4QXR0ZW5kZWVzIjo5OTk5OTk5OTksIm1heFRyaWdnZXJzIjo5OTk5OTk5OTksIm1heERpcmVjdERpYWxzIjo1MCwiYlNlbCI6MTAwMDAsIm1heENvbnREb3dubG9hZHMiOjIwMDAsIm1heENvbXBEb3dubG9hZHMiOjIwMDAsImRhaWx5VW5sb2NrTGltaXQiOjEwMDAwLCJtYXhMaXN0U2l6ZSI6NTAsImFpU3VnZ2VzdENyZWRpdCI6OTk5OTk5OTk5LCJtYXhKb2JDaGFuZ2UiOjk5OTk5OTk5OSwibWF4QnV5aW5nSW50ZW50IjoxMCwibWF4Vmlld0NvbXBhbnlSZXBvcnQiOjk5OTk5OTk5OSwibWF4RG93bmxvYWRDb21wYW55UmVwb3J0IjoyMDAwLCJtYXhPcmdDaGFydCI6OTk5OTk5OTk5LCJtYXhDYWxsaW5nRGlzcG9zaXRpb24iOjEwMDAwLCJtYXhDU1ZJbXBvcnQiOjk5OTk5OTk5OSwiZGFpbHlTZWFyY2hRdWVyaWVzIjo5OTk5OTk5OTksImZyZWVDYWxsaW5nTWludXRlcyI6MTAwLCJtYXhDYWxsaW5nTWludXRlcyI6MTAwfSwidHJpYWxQbGFuU3RydWN0dXJlIjp7Im1heENhbGxpbmdNaW51dGVzIjowLCJmcmVlQ2FsbGluZ01pbnV0ZXMiOjAsIm1heENvbXBhbmllcyI6MjUsIm1heENvbnRhY3RzIjoyNSwibWF4U2VxdWVuY2UiOjk5OTk5OTk5OSwibWF4RW1haWxzIjoyNSwibWF4Q2FtcGFpZ25zIjoyNSwibWF4QXR0ZW5kZWVzIjoyNSwibWF4VHJpZ2dlcnMiOjI1LCJtYXhDb21wRG93bmxvYWRzIjoyNSwibWF4Q29udERvd25sb2FkcyI6MjUsIm1heERpcmVjdERpYWxzIjowLCJtYXhMaXN0U2l6ZSI6NTAsImJTZWwiOjAsImRhaWx5VW5sb2NrTGltaXQiOjI1LCJhaVN1Z2dlc3RDcmVkaXQiOjAsIm1heEJ1eWluZ0ludGVudCI6MCwibWF4Q1NWSW1wb3J0IjowLCJtYXhDYWxsaW5nRGlzcG9zaXRpb24iOjAsIm1heERvd25sb2FkQ29tcGFueVJlcG9ydCI6MCwibWF4Sm9iQ2hhbmdlIjowLCJtYXhPcmdDaGFydCI6MCwibWF4Vmlld0NvbXBhbnlSZXBvcnQiOjAsImRhaWx5U2VhcmNoUXVlcmllcyI6MH0sInByZU9mZmxpbmUiOmZhbHNlLCJfaWQiOiI2N2VkMWU0NjkyNjJmODk1OTljZDNiZWYiLCJmaXJzdE5hbWUiOiJOaWRoaSIsImxhc3ROYW1lIjoiS3Vsa2FybmkiLCJlbWFpbCI6Im5pZGhpLmt1bGthcm5pQGNsb2R1cmEuYWkiLCJyb2xlIjoidXNlciIsInByb3ZpZGVyIjoibWFnaWNsaW5rIiwiY29tcGFueU5hbWUiOiJDbG9kdXJhLmFpIiwiZW1haWxWZXJpZnkiOmZhbHNlLCJpc0NCIjpmYWxzZSwidW5TdWJzY3JpYmUiOmZhbHNlLCJzaG93T25iIjp0cnVlLCJhY2NvdW50VHlwZSI6ImZyZWUiLCJpc1RyaWFsIjpmYWxzZSwicGFpZExhc3RCaWxsIjp0cnVlLCJzdGF0dXMiOiJhY3RpdmUiLCJpc0NvcnBBY2NvdW50IjpmYWxzZSwiaXNUZWFtQWRtaW4iOnRydWUsInRlYW1TaXplIjoxLCJwbGFuTmFtZSI6IlByb3NwZWN0IFBybyIsImhhc1JlcGxhY2VkIjpmYWxzZSwiaGFzRGlyZWN0RGlhbHMiOmZhbHNlLCJjb21wQXNEaXNwTmFtZSI6ZmFsc2UsImFzVXNlciI6ZmFsc2UsInJlZmVycmVyIjoiZGlyZWN0IiwicGFnZSI6IiIsImlzT2ZmbGluZSI6dHJ1ZSwiaXNPZmZsaW5lUGFpZCI6ZmFsc2UsImNyZWF0ZWREYXRlIjoiMjAyNS0wNC0wMlQxMToyMzo1MC4zOTRaIiwicGxhbkR1cmF0aW9uIjoiQmlsbGVkIE1vbnRobHkiLCJwbGFuQW1vdW50IjoxMTg5MywicGxhblR5cGUiOiJJTlIiLCJwYXNzd29yZFN1cCI6bnVsbCwiX192IjowLCJzdXBJZCI6bnVsbCwiem9ob0N1c3RvbWVySWQiOiIyMDE4NzM5MDAwMDEyNzY2MDQyIiwiQ0JjYW5jZWxTdGF0dXMiOmZhbHNlLCJpc0luRWRpdGlvbiI6dHJ1ZSwiaXNVc0VkaXRpb24iOmZhbHNlLCJzaGlmdEZGRGVsZXRlIjpmYWxzZSwiY3VzdG9tRW1haWwiOnRydWUsIlNwQ2hlY2siOmZhbHNlLCJhcHBsaWVkREQiOmZhbHNlLCJndHdvcmV2aWV3IjpmYWxzZSwiaXNEZXZlbG9wZXIiOmZhbHNlLCJpc1dlYnNpdGUiOmZhbHNlLCJncmFjZXBlcmlvZERheXMiOjMsIkNCRnJlZUZvcmV2ZXIiOmZhbHNlLCJDQmN1c3RvbWVySWQiOiIiLCJDQnN1YnNjcmlwdGlvbklkIjoiIiwiYWRkcmVzcyI6IiIsImF0dGVtcHRGYWlsIjpmYWxzZSwiY291bnRyeSI6IiIsImVuZERhdGUiOiIyMDI1LTA3LTAyVDAwOjAwOjAwLjAwMFoiLCJpc0Z1dHVyZURhdGUiOmZhbHNlLCJzY2hlZHVsZV9jaGFuZ2UiOmZhbHNlLCJzdGFydERhdGUiOiIyMDI1LTA2LTAyVDAwOjAwOjAwLjAwMFoiLCJzdGF0ZSI6IiIsInVzZXJJbml0aWF0ZWQiOmZhbHNlLCJ6aXAiOiIiLCJ6b2hvU3Vic2NyaXB0aW9uSWQiOiIyMDE4NzM5MDAwMDEyNzY1MTcyIiwiaXNEb3dubG9hZFJhZGFyIjpmYWxzZSwiZGlzcGxheU5hbWUiOiJOaWRoaSBLdWxrYXJuaSIsInRvdXBwIjp0cnVlLCJrb3NLb3QiOiJleUpoYkdjaU9pSklVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKcmIzTnJiM1FpT2lKSGNYbEVOM2hSYTNoeFdGQTNOakZJSWl3aWFXUWlPaUkyTjJWa01XVTBOamt5TmpKbU9EazFPVGxqWkROaVpXWWlMQ0p1YlNJNklrNXBaR2hwSUV0MWJHdGhjbTVwSWl3aWFXRjBJam94TnpVd01qSTVOVFV5TENKbGVIQWlPakUzTlRBNE16UXpOVEo5LkZsZDZhVUNyVnlwQ2JzVFZtOXJPSjFidVVfYjlxbmVzeHZXcUd1RTlJb00iLCJpbnRlcmNvbVRva2VuIjoiZDFlMjMyYjIyN2FjZmQ1MDA0YjA2YjE0NTc1YWEwMjY1YThmMTI2MGYxMmYyZTVmNjU1NDI0Y2Y4NGE4MWFiZCJ9LCJpYXQiOjE3NTAyMjk1NTIsImV4cCI6MTc1MDU3NTE1Mn0.RORtToIS8yeOcZQzr1O-H9896yE4WXG0tyuEzPK6Csc", // Hardcoded empty token for now
            },
          }
        );
        const data = await res.json();
        console.log(data, "check")
        setListData(data.results || []);
        setTotalItems((data.results && data.results.length) || 0);
      } catch (error) {
        setListData([]);
        setTotalItems(0);
      }
    };
    // const fetchData = async () => {
    //   try {
    //     const res = await fetch("http://localhost:8000/proxy/clodura_list", {
    //       headers: {
    //         "Content-Type": "application/json",
    //       },
    //     });
    //     const data = await res.json();
    //     setListData(data.results || []);
    //     setTotalItems((data.results && data.results.length) || 0);
    //   } catch (error) {
    //     console.error("Error fetching data:", error);
    //     setListData([]);
    //     setTotalItems(0);
    //   }
    // };
    fetchData();
  }, [currentPage, itemsPerPage]);

  const cloduraLogoUrl =
    "/images/orange-logo-icon.png";

  return (
    <>
      <div className="bg-white p-4 rounded-md rounded-tl-none shadow-sm border border-gray-200 -mt-[1px]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Manage List</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="flex items-center bg-[#2795FC] space-x-1 text-white border-sky-200 cursor-not-allowed h-9 px-4 py-2 rounded-md"
            >
              <Merge className="w-4 h-4 mr-1" />
              <span>Merge</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-gray-300 w-auto justify-between px-3 h-9"
                >
                  Select Search Option
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem className="cursor-pointer py-2 px-3 text-sm">
                  List Name
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2 px-3 text-sm">
                  List Source
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2 px-3 text-sm">
                  Contact Name
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2 px-3 text-sm">
                  Contact Email
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2 px-3 text-sm">
                  Company Name
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2 px-3 text-sm">
                  Sequence Name
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Input with integrated button */}
            <div className="relative flex items-center border border-gray-300 rounded-md overflow-hidden h-9">
              <Input
                type="text"
                placeholder="Search"
                className="pl-3 pr-0 border-none h-full focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-full rounded-l-none text-gray-500 hover:bg-gray-100"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Create List Button */}
            <Button className="flex items-center space-x-1 bg-[#0681F9] hover:bg-sky-600 text-white cursor-pointer h-9 px-4 py-2 rounded-md">
              <Plus className="w-4 h-4 mr-1" />
              <span>Create List</span>
            </Button>
            <span className="text-[#0681F9] text-sm ml-2">
              {listData.length} List{listData.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 border-b border-gray-200">
                <TableHead className="w-[200px] text-gray-700 font-bold text-sm py-2.5">
                  Name
                </TableHead>
                <TableHead className="text-gray-700 font-bold text-sm py-2.5">
                  Source
                </TableHead>
                <TableHead className="text-gray-700 font-bold text-sm py-2.5">
                  Recipients
                </TableHead>
                <TableHead className="text-gray-700 font-bold text-sm py-2.5">
                  Companies
                </TableHead>
                <TableHead className="text-gray-700 font-bold text-sm py-2.5">
                  Usage
                </TableHead>
                <TableHead className="text-gray-700 font-bold text-sm py-2.5">
                  Created
                </TableHead>
                <TableHead className="text-left text-gray-700 font-bold text-sm py-2.5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listData.map((list) => (
                <TableRow
                  key={list.id}
                  className="border-b border-gray-200 last:border-b-0"
                >
                  <TableCell className="font-medium flex items-center py-2.5 text-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
                    {list.name}
                    <Pencil className="w-4 h-4 ml-2 text-gray-500 cursor-pointer" />
                  </TableCell>
                  <TableCell className="py-2.5 text-sm">
                    <div className="flex items-center space-x-2">
                      <img
                        src={cloduraLogoUrl}
                        alt={`${list.source} Logo`}
                        className="h-6"
                      />
                      <span>{list.source}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm">
                    {list.listlength}
                  </TableCell>
                  <TableCell className="py-2.5 text-sm">
                    {/* No companies field in API, leave blank or 0 */}0
                  </TableCell>
                  <TableCell className="py-2.5 text-sm">
                    {list.usedcount}
                  </TableCell>
                  <TableCell className="py-2.5 text-sm">
                    {list.createdon
                      ? new Date(list.createdon).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                      : ""}
                  </TableCell>
                  <TableCell className="text-left flex items-center gap-4 space-x-2 py-2.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Copy className="w-4 h-4 text-gray-500 hover:text-gray-600 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clone</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Users className="w-4 h-4 text-purple-500 hover:text-purple-600 cursor-pointer" onClick={() => setShowModal(true)} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Show Recipients</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Download className="w-4 h-4 text-green-500 hover:text-green-600 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Export</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <UserPlus className="w-4 h-4 text-yellow-500 hover:text-yellow-600 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add Recipients</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Merge className="w-4 h-4 text-blue-300 cursor-not-allowed" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Merge List</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6 flex-col sm:flex-row">
          {/* Pagination buttons */}
          <div className="flex items-center gap-0 rounded-md overflow-hidden border border-gray-300">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 cursor-pointer hover:bg-gray-100 rounded-none border-r border-gray-300"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {"<<"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 cursor-pointer hover:bg-gray-100 rounded-none"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              variant={currentPage === 1 ? "default" : "ghost"}
              size="icon"
              className={`h-7 w-7 cursor-pointer text-xs font-medium rounded-none
                            ${currentPage === 1
                  ? "bg-[#2795FC] text-white hover:bg-sky-600"
                  : "text-gray-700 hover:bg-gray-100"
                }
                        `}
              onClick={() => handlePageChange(1)}
            >
              {currentPage}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 cursor-pointer hover:bg-gray-100 rounded-none border-r border-gray-300"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 cursor-pointer hover:bg-gray-100 rounded-none"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              {">>"}
            </Button>
          </div>
          {/* Items per page dropdown */}
          <div className="flex items-center gap-2">
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="w-[120px] h-8 text-sm cursor-pointer text-gray-700 border-gray-300">
                <SelectValue>{itemsPerPage} Lists</SelectValue>
              </SelectTrigger>
              <SelectContent className="text-sm shadow-md border border-neutral-200 bg-white">
                <SelectItem value="25">25 Lists</SelectItem>
                <SelectItem value="50">50 Lists</SelectItem>
                <SelectItem value="100">100 Lists</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>


      </div>
      <RecipientListModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};

export default ContactsListTab;
