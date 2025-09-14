import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Search, Plus, ChevronDown, Copy, SendHorizontal, Phone } from "lucide-react";
import { useState } from "react";

const dummyRecipients = [
  {
    id: 1,
    initials: "KN",
    name: "Karthik Narayan",
    role: "Data Scientist",
    company: "Adobe",
    companyIndustry: "Software Development",
    companySize: "10000+",
    email: "karthik.narayan@adobe.com",
    mobileClodura: "View Direct Dial",
    mobilePartner: "$ Search Partner",
    contactLocation: "India\nUttar Pradesh Noida",
    companyLocation: "United States\nCalifornia San Jose",
    verified: true,
    companyLogo: "A", // Adobe
    companyColor: "#FF0000"
  },
  {
    id: 2,
    initials: "NN",
    name: "Narayan Narayan",
    role: "Organization Manager",
    company: "Farmar Jack",
    companyIndustry: "Retail",
    companySize: "51 - 200",
    email: "narayan.narayan@farmarjack.com",
    mobileClodura: "View Direct Dial",
    mobilePartner: "$ Search Partner",
    contactLocation: "--",
    companyLocation: "France\nIle-de-France Issy-les-Moulineaux",
    verified: false,
    companyLogo: "FJ",
    companyColor: "#4A90E2"
  },
  {
    id: 3,
    initials: "DP",
    name: "Dipak Pawar",
    role: "Associate Member Staff",
    company: "Equitysoft Technology",
    companyIndustry: "IT Services and IT Consulting",
    companySize: "51 - 200",
    email: "dipak.pawar@equitysoft.com",
    mobileClodura: "View Direct Dial",
    mobilePartner: "$ Search Partner",
    contactLocation: "India\nMaharashtra Nashik",
    companyLocation: "India\nGujarat Ahmedabad",
    verified: true,
    companyLogo: "E",
    companyColor: "#FF6B35"
  },
  {
    id: 4,
    initials: "BP",
    name: "Bhawesh Pandey",
    role: "Software Engineer",
    company: "GoCodeo",
    companyIndustry: "Software Development",
    companySize: "1 - 10",
    email: "bhawesh@gocodeo.com",
    mobileClodura: "View Direct Dial",
    mobilePartner: "$ Search Partner",
    contactLocation: "India\nUttarakhand Haldwani",
    companyLocation: "India\nKarnataka Bengaluru",
    verified: true,
    companyLogo: "G",
    companyColor: "#9B59B6"
  }
];

const RecipientListModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(dummyRecipients.map(r => r.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, id]);
    } else {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-[95vw] h-[95vh] overflow-hidden p-0 px-5">
        {/* Header */}
        <div className="p-6 border-b bg-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-medium text-gray-900">List1</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">Created: 18/Jun/2025 8:27 PM</p>
              </div>
              <div className="text-sm text-gray-600">
                4 Recipients
              </div>
            </div>
          </DialogHeader>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm" className="h-8">
              <ChevronDown className="w-4 h-4 mr-1" />
              Select
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-blue-600">
              Delete
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-blue-600">
              Add To Sequence
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-blue-600">
              Quick Mail
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              Export
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-blue-600">
              $ Search Partner
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th className="w-8 p-3">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={selectedRows.length === dummyRecipients.length}
                  />
                </th>
                <th className="text-left p-3 font-medium text-gray-700 whitespace-nowrap">Name</th>
                <th className="text-left p-3 font-medium text-gray-700 whitespace-nowrap">Company</th>
                <th className="text-left p-3 font-medium text-gray-700 whitespace-nowrap">Email</th>
                <th className="text-left p-3 font-medium text-gray-700 whitespace-nowrap">Mobile No. Via Clodura</th>
                <th className="text-left p-3 font-medium text-gray-700 whitespace-nowrap">Mobile No. Via Partner</th>
                <th className="text-left p-3 font-medium text-gray-700 whitespace-nowrap">Contact Location</th>
                <th className="text-left p-3 font-medium text-gray-700 whitespace-nowrap">Company Location</th>
                <th className="text-left p-3 font-medium text-gray-700 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {dummyRecipients.map((recipient) => (
                <tr key={recipient.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      checked={selectedRows.includes(recipient.id)}
                      onChange={(e) => handleRowSelect(recipient.id, e.target.checked)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-medium text-sm text-gray-700 border">
                        {recipient.initials}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {recipient.name}
                          {recipient.verified && (
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{recipient.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: recipient.companyColor }}
                      >
                        {recipient.companyLogo}
                      </div>
                      <div>
                        <div className="font-medium text-blue-600 cursor-pointer hover:underline">
                          {recipient.company}
                        </div>
                        <div className="text-xs text-gray-500">{recipient.companyIndustry}</div>
                        <div className="text-xs text-gray-400">{recipient.companySize}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{recipient.email}</span>
                      <Copy className="w-3 h-3 text-black-600 cursor-pointer hover:text-gray-600 font-bold" />
                      <SendHorizontal className="w-3 h-3 text-black-600 cursor-pointer hover:text-gray-600 font-bold" />
                    </div>
                  </td>
                  <td className="p-3">
                    <Button variant="outline" size="sm" className="h-7 text-xs px-3 text-blue-600 border-blue-200 hover:bg-blue-50">
                      {recipient.mobileClodura}
                    </Button>
                  </td>
                  <td className="p-3">
                    <Button variant="outline" size="sm" className="h-7 text-xs px-3 text-blue-600 border-blue-200 hover:bg-blue-50">
                      {recipient.mobilePartner}
                    </Button>
                  </td>
                  <td className="p-3">
                    <div className="text-gray-700 whitespace-pre-line text-xs leading-relaxed">
                      {recipient.contactLocation}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-gray-700 whitespace-pre-line text-xs leading-relaxed">
                      {recipient.companyLocation}
                    </div>
                  </td>
                  <td className="p-3">
                    <Trash2 className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-700" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Button variant="outline" size="sm" className="h-6 w-6 p-0">«</Button>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0">‹</Button>
            <Button variant="default" size="sm" className="h-6 w-6 p-0 bg-blue-600">1</Button>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0">›</Button>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0">»</Button>
          </div>
          <Button variant="outline" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipientListModal;