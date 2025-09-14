import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"

export function SearchResults() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Example row - you'll map through your actual data here */}
            <TableRow>
              <TableCell>
                <Checkbox />
              </TableCell>
              <TableCell>
                <div className="font-medium">John Doe</div>
                <div className="text-sm text-muted-foreground">john@example.com</div>
              </TableCell>
              <TableCell>Senior Developer</TableCell>
              <TableCell>Tech Corp</TableCell>
              <TableCell>New York, USA</TableCell>
              <TableCell className="space-x-2">
                <button className="text-blue-600 hover:text-blue-800">
                  View
                </button>
                <button className="text-blue-600 hover:text-blue-800">
                  Save
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 