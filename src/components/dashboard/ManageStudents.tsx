import React, { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Trash2, UserPlus, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import StudentForm from "./forms/StudentForm";
import { Student } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";

const PAGE_SIZE = 10;

const ManageStudents: React.FC = () => {
  const { students, currentTeacher, deleteStudent } = useAppContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Sender phone number for SMS and WhatsApp
  const senderPhoneNumber = "+255697127596";

  // Only admin can access this page
  if (currentTeacher?.role !== "admin") {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold">Unauthorized Access</h2>
        <p className="text-muted-foreground">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  const filteredStudents = students
    .filter((student) => {
      const matchesSearch =
        student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    })
    .sort((a, b) => {
      // Improved sorting: first by form, then by admission number
      if (a.form !== b.form) return a.form - b.form;

      // Extract any numeric parts for proper numeric comparison
      const admNoA = a.admissionNumber;
      const admNoB = b.admissionNumber;

      const numA = admNoA.replace(/^\D+/g, '');
      const numB = admNoB.replace(/^\D+/g, '');

      if (numA && numB) {
        // If both have numeric parts, compare those numerically
        const numCompare = parseInt(numA) - parseInt(numB);
        if (numCompare !== 0) return numCompare;
      }

      // Fall back to string comparison if numeric comparison doesn't yield a result
      return a.admissionNumber.localeCompare(b.admissionNumber);
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleDelete = (student: Student) => {
    if (window.confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}?`)) {
      deleteStudent(student.id);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowAddForm(true);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAllStudents = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(paginatedStudents.map(student => student.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const sendNotification = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setIsSending(true);
    toast.info(`Sending notifications to ${selectedStudents.length} guardians...`);

    try {
      // Simulate API call to send SMS
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(`Successfully sent notifications to ${selectedStudents.length} guardians from ${senderPhoneNumber}`);
      setSelectedStudents([]);
    } catch (error) {
      console.error("Error sending notifications:", error);
      toast.error("An error occurred while sending notifications");
    } finally {
      setIsSending(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedStudents([]); // Clear selection on page change
  };

  // Helper for compact pagination display
  const getPageNumbers = () => {
    const pages: number[] = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage === 1) {
        pages.push(1, 2, totalPages);
      } else if (currentPage === totalPages) {
        pages.push(1, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 1, currentPage, currentPage + 1);
        if (currentPage - 1 > 1) pages.unshift(1);
        if (currentPage + 1 < totalPages) pages.push(totalPages);
      }
    }
    // Remove duplicates and sort
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Manage Students</h2>
        <p className="text-muted-foreground">
          Add, edit, or remove student records
        </p>
      </div>

      {showAddForm ? (
        <StudentForm
          student={editingStudent}
          onCancel={() => {
            setShowAddForm(false);
            setEditingStudent(null);
          }}
          onSuccess={() => {
            setShowAddForm(false);
            setEditingStudent(null);
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border rounded-md w-full max-w-sm"
            />
            <div className="flex gap-2">
              {selectedStudents.length > 0 && (
                <Button
                  variant="outline"
                  onClick={sendNotification}
                  disabled={isSending}
                  className="flex items-center"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Notification ({selectedStudents.length})
                </Button>
              )}
              <Button onClick={() => setShowAddForm(true)} className="bg-education-primary hover:bg-education-dark">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Records</CardTitle>
              <CardDescription>
                Displaying {paginatedStudents.length} of {filteredStudents.length} students
                {selectedStudents.length > 0 && ` (${selectedStudents.length} selected)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          paginatedStudents.length > 0 &&
                          selectedStudents.length === paginatedStudents.length
                        }
                        onCheckedChange={(checked) => toggleAllStudents(!!checked)}
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => toggleStudentSelection(student.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={student.imageUrl} />
                            <AvatarFallback className="bg-education-primary text-white">
                              {student.firstName[0]}{student.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.admissionNumber}</TableCell>
                      <TableCell>{student.form}</TableCell>
                      <TableCell>{student.guardianName}</TableCell>
                      <TableCell>{student.guardianPhone}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(student)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(student)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {paginatedStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        No students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* Compact Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {getPageNumbers().map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && page - arr[idx - 1] > 1 && (
                        <span className="px-1 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ManageStudents;