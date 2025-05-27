import React, { useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface StudentReportCardHandle {
  download: () => Promise<void>;
}

interface StudentReportCardProps {
  studentId: string;
  year: number;
  term: 1 | 2;
}

const StudentReportCard = forwardRef<StudentReportCardHandle, StudentReportCardProps>(
  ({ studentId, year, term }, ref) => {
    const { students, subjects, exams, marks } = useAppContext();

    const student = useMemo(() => {
      return students.find(s => s.id === studentId);
    }, [studentId, students]);

    const relevantExams = useMemo(() => {
      return exams.filter(
        e => e.year === year && e.term === term && e.form === student?.form
      ).sort((a, b) => {
        const typeOrder: Record<string, number> = {
          "TermStart": 1,
          "MidTerm": 2,
          "EndTerm": 3,
          "Custom": 4,
        };
        return typeOrder[a.type] - typeOrder[b.type];
      });
    }, [exams, year, term, student]);

    const studentMarks = useMemo(() => {
      return marks.filter(
        m => m.studentId === studentId &&
        relevantExams.some(e => e.id === m.examId)
      );
    }, [marks, studentId, relevantExams]);

    const subjectAverages = useMemo(() => {
      const averages: Record<string, number> = {};
      subjects.forEach(subject => {
        const subjectMarks = studentMarks.filter(m => m.subjectId === subject.id);
        if (subjectMarks.length > 0) {
          const total = subjectMarks.reduce((sum, m) => sum + m.score, 0);
          averages[subject.id] = Math.round(total / subjectMarks.length);
        }
      });
      return averages;
    }, [subjects, studentMarks]);

    const chartData = useMemo(() => {
      const data: any[] = [];
      relevantExams.forEach(exam => {
        const examData: any = {
          name: exam.type === "Custom" ? exam.name : exam.type,
        };
        subjects.forEach(subject => {
          const mark = studentMarks.find(
            m => m.examId === exam.id && m.subjectId === subject.id
          );
          if (mark) {
            examData[subject.name] = mark.score;
          }
        });
        data.push(examData);
      });
      return data;
    }, [relevantExams, subjects, studentMarks]);

    const lineColors = [
      "#1E88E5", "#43A047", "#FF8F00", "#E53935",
      "#5E35B1", "#00ACC1", "#F4511E", "#3949AB",
    ];

    const totalMarks = useMemo(() => {
      return Object.values(subjectAverages).reduce((sum, avg) => sum + avg, 0);
    }, [subjectAverages]);

    const averageMark = useMemo(() => {
      const subjectCount = Object.keys(subjectAverages).length;
      return subjectCount > 0 ? Math.round(totalMarks / subjectCount) : 0;
    }, [totalMarks, subjectAverages]);

    const getOverallGrade = (average: number): string => {
      if (average >= 80) return "A";
      if (average >= 75) return "A-";
      if (average >= 70) return "B+";
      if (average >= 65) return "B";
      if (average >= 60) return "B-";
      if (average >= 55) return "C+";
      if (average >= 50) return "C";
      if (average >= 45) return "C-";
      if (average >= 40) return "D+";
      if (average >= 35) return "D";
      if (average >= 30) return "D-";
      return "E";
    };

    const classPosition = useMemo(() => {
      if (!student) return "N/A";
      const classmates = students.filter(s => s.form === student.form);
      const studentAverages = classmates.map(s => {
        const studentSubjectAverages: Record<string, number> = {};
        subjects.forEach(subject => {
          const subjectMarks = marks.filter(
            m => m.studentId === s.id &&
            m.subjectId === subject.id &&
            relevantExams.some(e => e.id === m.examId)
          );
          if (subjectMarks.length > 0) {
            const total = subjectMarks.reduce((sum, m) => sum + m.score, 0);
            studentSubjectAverages[subject.id] = Math.round(total / subjectMarks.length);
          }
        });
        const subjectValues = Object.values(studentSubjectAverages);
        const average = subjectValues.length > 0
          ? subjectValues.reduce((sum, avg) => sum + avg, 0) / subjectValues.length
          : 0;
        return {
          studentId: s.id,
          average,
        };
      });
      studentAverages.sort((a, b) => b.average - a.average);
      const position = studentAverages.findIndex(item => item.studentId === studentId) + 1;
      return `${position} out of ${classmates.length}`;
    }, [student, students, subjects, marks, studentId, relevantExams]);

    const reportRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      download: async () => {
        if (reportRef.current && student) {
          const canvas = await html2canvas(reportRef.current, { scale: 2 });
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: "a4",
          });
          const pageWidth = pdf.internal.pageSize.getWidth();
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pageWidth;
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${student.firstName}_${student.lastName}_ReportCard.pdf`);
        }
      }
    }));

    if (!student) {
      return <div>Student not found</div>;
    }

    return (
      <Card id={`student-report-${studentId}`} className="print:shadow-none" style={{ display: "block" }}>
        <CardHeader className="text-center border-b pb-4">
          <CardTitle className="text-3xl">Academic Report Card</CardTitle>
          <p className="text-xl font-semibold mt-2">
            {`Form ${student.form} - Academic Year ${year}, Term ${term}`}
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div ref={reportRef}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="font-medium">Name:</p>
                  <p>{`${student.firstName} ${student.lastName}`}</p>
                </div>
                <div className="flex justify-between">
                  <p className="font-medium">Admission Number:</p>
                  <p>{student.admissionNumber}</p>
                </div>
                <div className="flex justify-between">
                  <p className="font-medium">Form:</p>
                  <p>{`Form ${student.form}`}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="font-medium">Guardian:</p>
                  <p>{student.guardianName}</p>
                </div>
                <div className="flex justify-between">
                  <p className="font-medium">Contact:</p>
                  <p>{student.guardianPhone}</p>
                </div>
                <div className="flex justify-between">
                  <p className="font-medium">Class Position:</p>
                  <p>{classPosition}</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <h3 className="text-xl font-semibold mb-4">Subject Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border px-4 py-2 text-left">Subject</th>
                    {relevantExams.map((exam) => (
                      <th key={exam.id} className="border px-4 py-2 text-center">
                        {exam.type === "Custom" ? exam.name : exam.type}
                      </th>
                    ))}
                    <th className="border px-4 py-2 text-center">Average</th>
                    <th className="border px-4 py-2 text-center">Grade</th>
                    <th className="border px-4 py-2 text-center">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => {
                    const average = subjectAverages[subject.id] || 0;
                    const grade = getOverallGrade(average);
                    let remarks = "N/A";
                    if (average >= 70) remarks = "Excellent";
                    else if (average >= 60) remarks = "Very Good";
                    else if (average >= 50) remarks = "Good";
                    else if (average >= 40) remarks = "Fair";
                    else if (average > 0) remarks = "Needs Improvement";
                    return (
                      <tr key={subject.id}>
                        <td className="border px-4 py-2">{subject.name}</td>
                        {relevantExams.map((exam) => {
                          const mark = studentMarks.find(
                            (m) => m.examId === exam.id && m.subjectId === subject.id
                          );
                          return (
                            <td key={exam.id} className="border px-4 py-2 text-center">
                              {mark ? mark.score : "-"}
                            </td>
                          );
                        })}
                        <td className="border px-4 py-2 text-center font-medium">
                          {average || "-"}
                        </td>
                        <td className="border px-4 py-2 text-center font-medium">
                          {average > 0 ? grade : "-"}
                        </td>
                        <td className="border px-4 py-2 text-center">
                          {remarks}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted font-medium">
                    <td className="border px-4 py-2">Total</td>
                    <td className="border px-4 py-2 text-center" colSpan={relevantExams.length}>
                      -
                    </td>
                    <td className="border px-4 py-2 text-center">{totalMarks || "-"}</td>
                    <td className="border px-4 py-2 text-center" colSpan={2}>
                      -
                    </td>
                  </tr>
                  <tr className="bg-education-light font-medium text-education-primary">
                    <td className="border px-4 py-2">Mean Score / Grade</td>
                    <td className="border px-4 py-2 text-center" colSpan={relevantExams.length}>
                      -
                    </td>
                    <td className="border px-4 py-2 text-center">{averageMark || "-"}</td>
                    <td className="border px-4 py-2 text-center">
                      {averageMark > 0 ? getOverallGrade(averageMark) : "-"}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      {averageMark >= 70
                        ? "Excellent"
                        : averageMark >= 60
                        ? "Very Good"
                        : averageMark >= 50
                        ? "Good"
                        : averageMark >= 40
                        ? "Fair"
                        : averageMark > 0
                        ? "Needs Improvement"
                        : "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Performance Trend</h3>
              {chartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      {subjects.map((subject, index) => {
                        const hasData = chartData.some(item => item[subject.name]);
                        if (!hasData) return null;
                        return (
                          <Line
                            key={subject.id}
                            type="monotone"
                            dataKey={subject.name}
                            stroke={lineColors[index % lineColors.length]}
                            activeDot={{ r: 8 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No performance data available for the selected term
                </p>
              )}
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold mb-2">Class Teacher's Remarks</h3>
                <div className="p-4 border rounded-md min-h-[100px]">
                  {averageMark >= 80
                    ? "Outstanding performance! Keep up the excellent work."
                    : averageMark >= 70
                    ? "Excellent results. Consistent and hardworking."
                    : averageMark >= 60
                    ? "Very good performance. Continue putting in more effort."
                    : averageMark >= 50
                    ? "Good performance. Can improve with more focus."
                    : averageMark >= 40
                    ? "Fair performance. Needs to work harder."
                    : averageMark > 0
                    ? "Performance below average. Requires significant improvement."
                    : "No assessment data available for evaluation."}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Principal's Remarks</h3>
                <div className="p-4 border rounded-md min-h-[100px]">
                  {averageMark >= 80
                    ? "Exceptional achievement. Demonstrates outstanding academic potential."
                    : averageMark >= 70
                    ? "Excellent results. Keep maintaining this high standard."
                    : averageMark >= 60
                    ? "Commendable performance. Continue working hard."
                    : averageMark >= 50
                    ? "Satisfactory results. Work on improving weak areas."
                    : averageMark >= 40
                    ? "Average performance. More dedication needed."
                    : averageMark > 0
                    ? "Needs significant improvement. Additional support required."
                    : "Insufficient data for evaluation."}
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Report generated on {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

export default StudentReportCard;