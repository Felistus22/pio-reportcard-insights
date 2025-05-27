import React, { useMemo, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FormReportProps {
  form: number;
  year: number;
  term: 1 | 2;
}

// Helper function to calculate grade, points and remarks based on score
const calculateGradeInfo = (score: number): { grade: string; points: number; remarks: string } => {
  if (score >= 74.5) {
    return { grade: 'A', points: 1, remarks: 'Excellent!' };
  } else if (score >= 64.5) {
    return { grade: 'B', points: 2, remarks: 'Good' };
  } else if (score >= 44.5) {
    return { grade: 'C', points: 3, remarks: 'Fair' };
  } else if (score >= 29.5) {
    return { grade: 'D', points: 4, remarks: 'Needs Improvement' };
  } else {
    return { grade: 'F', points: 5, remarks: 'Failed' };
  }
};

// Helper function to calculate division based on total points
const calculateDivision = (totalPoints: number): string => {
  if (totalPoints >= 7 && totalPoints < 18) {
    return 'I';
  } else if (totalPoints >= 18 && totalPoints < 22) {
    return 'II';
  } else if (totalPoints >= 22 && totalPoints < 26) {
    return 'III';
  } else if (totalPoints >= 26 && totalPoints <= 34) {
    return 'IV';
  } else {
    return 'ABS';
  }
};

// Helper function to calculate GPA from points
const calculateGPA = (points: number): number => {
  if (points === 1) return 4.0;     // A
  if (points === 2) return 3.0;     // B
  if (points === 3) return 2.0;     // C
  if (points === 4) return 1.0;     // D
  return 0.0;                       // F
};

// Helper to get previous term and year
const getPreviousTermYear = (year: number, term: 1 | 2) => {
  if (term === 2) {
    return { year, term: 1 as 1 | 2 };
  } else {
    return { year: year - 1, term: 2 as 1 | 2 };
  }
};

const FormReport: React.FC<FormReportProps> = ({ form, year, term }) => {
  const { students, subjects, exams, marks } = useAppContext();

  // --- Exam Filter State ---
  const [selectedExamId, setSelectedExamId] = useState<string | "all">("all");

  // Filter students for the specified form
  const formStudents = useMemo(() => {
    return students.filter(s => s.form === form).sort((a, b) => 
      a.lastName.localeCompare(b.lastName)
    );
  }, [students, form]);

  // Filter exams relevant to this form, year, and term
  const relevantExams = useMemo(() => {
    return exams.filter(
      e => e.form === form && e.year === year && e.term === term
    );
  }, [exams, form, year, term]);

  // --- Filter marks for selected exam ---
  const filteredFormMarks = useMemo(() => {
    if (selectedExamId === "all") {
      return marks.filter(
        m =>
          formStudents.some(s => s.id === m.studentId) &&
          relevantExams.some(e => e.id === m.examId)
      );
    } else {
      return marks.filter(
        m =>
          formStudents.some(s => s.id === m.studentId) &&
          m.examId === selectedExamId
      );
    }
  }, [marks, formStudents, relevantExams, selectedExamId]);

  // Calculate student averages and detailed performance
  const studentPerformance = useMemo(() => {
    const performance: Record<string, {
      totalScore: number;
      count: number;
      average: number;
      subjectScores: Record<string, number>;
      totalPoints: number;
      division: string;
    }> = {};
    
    formStudents.forEach(student => {
      const studentMarks = filteredFormMarks.filter(m => m.studentId === student.id);
      
      if (studentMarks.length > 0) {
        const subjectScores: Record<string, number> = {};
        let totalScore = 0;
        let totalPoints = 0;
        
        subjects.forEach(subject => {
          const subjectMarks = studentMarks.filter(m => m.subjectId === subject.id);
          if (subjectMarks.length > 0) {
            const subjectAvg = Math.round(subjectMarks.reduce((sum, m) => sum + m.score, 0) / subjectMarks.length);
            subjectScores[subject.id] = subjectAvg;
            totalScore += subjectAvg;
            
            // Calculate points for this subject
            const { points } = calculateGradeInfo(subjectAvg);
            totalPoints += points;
          }
        });
        
        const average = Math.round(totalScore / Object.keys(subjectScores).length);
        const division = calculateDivision(totalPoints);
        
        performance[student.id] = {
          totalScore,
          count: Object.keys(subjectScores).length,
          average,
          subjectScores,
          totalPoints,
          division
        };
      }
    });
    
    return performance;
  }, [formStudents, filteredFormMarks, subjects]);

  // Calculate subject averages
  const subjectAverages = useMemo(() => {
    const averages: Record<string, { totalScore: number; count: number; average: number }> = {};
    
    subjects.forEach(subject => {
      const subjectMarks = filteredFormMarks.filter(m => m.subjectId === subject.id);
      
      if (subjectMarks.length > 0) {
        const totalScore = subjectMarks.reduce((sum, m) => sum + m.score, 0);
        averages[subject.id] = {
          totalScore,
          count: subjectMarks.length,
          average: Math.round(totalScore / subjectMarks.length)
        };
      }
    });
    
    return averages;
  }, [subjects, filteredFormMarks]);

  // Calculate detailed subject performance summary with grade distributions
  const subjectPerformanceSummary = useMemo(() => {
    const summary: Record<string, {
      id: string;
      name: string;
      code: string;
      totalStudents: number;
      average: number;
      gradeDistribution: {
        A: number;
        B: number;
        C: number;
        D: number;
        F: number;
      };
      absent: number;
      gpa: number;
    }> = {};
    
    subjects.forEach(subject => {
      // Get all marks for this subject
      const subjectMarks = filteredFormMarks.filter(m => m.subjectId === subject.id);
      
      // Initialize grade distribution
      const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      let totalScore = 0;
      let totalPoints = 0;
      
      // Count students with marks for this subject
      const studentsWithMarks = new Set(subjectMarks.map(m => m.studentId));
      
      // Calculate students absent for this subject
      const absent = formStudents.length - studentsWithMarks.size;
      
      // Count grade distribution
      subjectMarks.forEach(mark => {
        const { grade, points } = calculateGradeInfo(mark.score);
        
        // Increment the corresponding grade count
        if (grade === 'A') gradeDistribution.A++;
        else if (grade === 'B') gradeDistribution.B++;
        else if (grade === 'C') gradeDistribution.C++;
        else if (grade === 'D') gradeDistribution.D++;
        else gradeDistribution.F++;
        
        totalScore += mark.score;
        totalPoints += points;
      });
      
      // Calculate average and GPA
      const average = subjectMarks.length > 0 ? Math.round((totalScore / subjectMarks.length) * 100) / 100 : 0;
      const gpa = subjectMarks.length > 0 ? Math.round((calculateGPA(totalPoints / subjectMarks.length) * 100)) / 100 : 0;
      
      summary[subject.id] = {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        totalStudents: studentsWithMarks.size,
        average,
        gradeDistribution,
        absent,
        gpa
      };
    });
    
    return summary;
  }, [subjects, filteredFormMarks, formStudents]);
  
  // Calculate overall form GPA
  const overallFormGPA = useMemo(() => {
    const validSubjects = Object.values(subjectPerformanceSummary).filter(s => s.totalStudents > 0);
    if (validSubjects.length === 0) return 0;
    
    const totalGPA = validSubjects.reduce((sum, subject) => sum + subject.gpa, 0);
    return Math.round((totalGPA / validSubjects.length) * 100) / 100;
  }, [subjectPerformanceSummary]);

  // Sort students by average for rankings
  const rankedStudents = useMemo(() => {
    return [...formStudents]
      .filter(student => studentPerformance[student.id])
      .sort((a, b) => {
        const avgA = studentPerformance[a.id]?.average || 0;
        const avgB = studentPerformance[b.id]?.average || 0;
        return avgB - avgA;
      });
  }, [formStudents, studentPerformance]);

  // Calculate overall form average
  const formAverage = useMemo(() => {
    const values = Object.values(studentPerformance);
    if (values.length === 0) return 0;
    
    const totalScore = values.reduce((sum, value) => sum + value.totalScore, 0);
    const totalCount = values.reduce((sum, value) => sum + value.count, 0);
    
    return totalCount > 0 ? Math.round(totalScore / totalCount) : 0;
  }, [studentPerformance]);

  // Create chart data for subject performance
  const subjectPerformanceData = useMemo(() => {
    return subjects.map(subject => {
      const data = subjectAverages[subject.id];
      return {
        subject: subject.name,
        average: data?.average || 0
      };
    }).filter(item => item.average > 0);
  }, [subjects, subjectAverages]);

  // --- BEGIN: Most Improved Students logic ---

  // Calculate previous term/year
  const prevTermYear = useMemo(() => getPreviousTermYear(year, term), [year, term]);

  // Get previous exams for this form
  const prevExams = useMemo(() => {
    return exams.filter(
      e => e.form === form && e.year === prevTermYear.year && e.term === prevTermYear.term
    );
  }, [exams, form, prevTermYear]);

  // Get previous marks for relevant students and exams
  const prevFormMarks = useMemo(() => {
    return marks.filter(
      m =>
        formStudents.some(s => s.id === m.studentId) &&
        prevExams.some(e => e.id === m.examId)
    );
  }, [marks, formStudents, prevExams]);

  // Calculate previous student averages
  const prevStudentAverages = useMemo(() => {
    const averages: Record<string, number> = {};
    formStudents.forEach(student => {
      const studentMarks = prevFormMarks.filter(m => m.studentId === student.id);
      if (studentMarks.length > 0) {
        // Average across all subjects
        const subjectScores: Record<string, number> = {};
        subjects.forEach(subject => {
          const subjectMarks = studentMarks.filter(m => m.subjectId === subject.id);
          if (subjectMarks.length > 0) {
            const subjectAvg = Math.round(subjectMarks.reduce((sum, m) => sum + m.score, 0) / subjectMarks.length);
            subjectScores[subject.id] = subjectAvg;
          }
        });
        const avg = Object.values(subjectScores).length > 0
          ? Math.round(Object.values(subjectScores).reduce((a, b) => a + b, 0) / Object.values(subjectScores).length)
          : 0;
        averages[student.id] = avg;
      }
    });
    return averages;
  }, [formStudents, prevFormMarks, subjects]);

  // Calculate improvement for each student
  const mostImprovedStudentsData = useMemo(() => {
    return rankedStudents
      .map(student => {
        const prevAvg = prevStudentAverages[student.id] ?? 0;
        const currAvg = studentPerformance[student.id]?.average ?? 0;
        return {
          name: `${student.firstName} ${student.lastName}`,
          improvement: currAvg - prevAvg,
          previous: prevAvg,
          current: currAvg,
        };
      })
      .filter(s => s.previous > 0 || s.current > 0) // Only show students with data
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 10);
  }, [rankedStudents, prevStudentAverages, studentPerformance]);

  // --- END: Most Improved Students logic ---

  // Get grade for average
  const getGrade = (average: number): string => {
    return calculateGradeInfo(average).grade;
  };

  return (
    <Card id="form-report">
      <CardHeader className="text-center border-b pb-4">
        <CardTitle className="text-3xl mb-2">Form Performance Report</CardTitle>
        <div className="flex flex-wrap justify-center gap-4 items-center mb-2">
          <span className="font-semibold">Form:</span>
          <span>{form}</span>
          <span className="font-semibold">Academic Year:</span>
          <span>{year}</span>
          <span className="font-semibold">Term:</span>
          <span>{term}</span>
          {/* Place Exam filter right after the other filters */}
          <span className="font-semibold">Exam:</span>
          <select
            className="border rounded px-2 py-1"
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
          >
            <option value="all">All Exams</option>
            {relevantExams.map(exam => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* ...rest of your report code remains unchanged... */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-center">{formStudents.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Form Average</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-center">
                {formAverage}% ({getGrade(formAverage)})
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg">Exams Taken</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-center">{relevantExams.length}</p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Subject Performance</h3>
          {subjectPerformanceData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" name="Average Score (%)">
                    {subjectPerformanceData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.average >= 70 ? "#43A047" : entry.average >= 50 ? "#1E88E5" : "#E53935"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground">No subject data available</p>
          )}
        </div>

        <Separator className="my-6" />

        {/* Replaced Top 10 Students with 10 Most Improved Students */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">10 Most Improved Students</h3>
          {mostImprovedStudentsData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostImprovedStudentsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: "Improvement", position: "insideBottomRight", offset: 0 }} />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value: number, name: string, props: any) => [`${value}`, "Improvement"]} />
                  <Legend />
                  <Bar dataKey="improvement" name="Improvement (Current - Previous)">
                    {mostImprovedStudentsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.improvement > 0 ? "#43A047" : "#E53935"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                <span>Showing change in average score from previous term/year</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No improvement data available</p>
          )}
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Student Rankings</h3>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>Adm No.</TableHead>
                  {subjects.slice(0, 5).map(subject => (
                    <TableHead key={subject.id} className="text-right">{subject.code}</TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Division</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedStudents.map((student, index) => {
                  const performance = studentPerformance[student.id] || {
                    average: 0,
                    subjectScores: {},
                    totalPoints: 0,
                    division: 'N/A',
                    totalScore: 0,
                    count: 0
                  };
                  
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell>{student.stream || 'N/A'}</TableCell>
                      <TableCell>{student.admissionNumber}</TableCell>
                      {subjects.slice(0, 5).map(subject => (
                        <TableCell key={subject.id} className="text-right">
                          {performance.subjectScores[subject.id] || '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium">
                        {performance.totalScore}
                      </TableCell>
                      <TableCell className="text-right">
                        {performance.average}% ({getGrade(performance.average)})
                      </TableCell>
                      <TableCell className="text-right">
                        {performance.totalPoints}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {performance.division}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {rankedStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9 + Math.min(subjects.length, 5)} className="text-center py-4">
                      No student data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overall Assessment</h3>
            <div className="p-4 border rounded-md">
              {formAverage >= 70
                ? "The form has performed excellently. Most students demonstrate strong understanding across subjects."
                : formAverage >= 60
                ? "The form has performed well above average. A good number of students show good grasp of the subjects."
                : formAverage >= 50
                ? "The form has performed satisfactorily. There is room for improvement in several areas."
                : formAverage >= 40
                ? "The form's performance is average. More effort is needed to improve overall results."
                : formAverage > 0
                ? "The form's performance is below average. Significant intervention is required."
                : "No assessment data available for evaluation."}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
            <div className="p-4 border rounded-md">
              {formAverage >= 70
                ? "Continue with the current teaching strategies. Consider offering enrichment activities for top performers."
                : formAverage >= 60
                ? "Maintain the teaching approaches while providing additional support for struggling students."
                : formAverage >= 50
                ? "Implement targeted interventions for lower-performing subjects. Consider revision sessions."
                : formAverage >= 40
                ? "Schedule remedial classes for weak subjects. Encourage more student participation."
                : formAverage > 0
                ? "Conduct a comprehensive review of teaching methodologies. Implement intensive remedial programs."
                : "Insufficient data to provide recommendations."}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Subject Performance Summary Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-center">SUBJECTS PERFORMANCE SUMMARY</h3>
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Grade</TableHead>
                  {subjects.map(subject => (
                    <TableHead key={subject.id} className="text-center font-semibold">{subject.name}</TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead className="font-semibold">CODE</TableHead>
                  {subjects.map(subject => (
                    <TableHead key={subject.id} className="text-center">{subject.code}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">A</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    return (
                      <TableCell key={subject.id} className="text-center">{summary?.gradeDistribution.A || 0}</TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">B</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    return (
                      <TableCell key={subject.id} className="text-center">{summary?.gradeDistribution.B || 0}</TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">C</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    return (
                      <TableCell key={subject.id} className="text-center">{summary?.gradeDistribution.C || 0}</TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">D</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    return (
                      <TableCell key={subject.id} className="text-center">{summary?.gradeDistribution.D || 0}</TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">F</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    return (
                      <TableCell key={subject.id} className="text-center">{summary?.gradeDistribution.F || 0}</TableCell>
                    );
                  })}
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableCell className="font-medium">Total Students</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    return (
                      <TableCell key={subject.id} className="text-center font-medium">{summary?.totalStudents || 0}</TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">AVERAGE</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    return (
                      <TableCell key={subject.id} className="text-center">{summary?.average.toFixed(2) || '0.00'}</TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">GRADES</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    const grade = summary?.average ? getGrade(summary.average) : 'N/A';
                    return (
                      <TableCell key={subject.id} className="text-center">{grade}</TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">ABS</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    return (
                      <TableCell key={subject.id} className="text-center">{summary?.absent || 0}</TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">GPA</TableCell>
                  {subjects.map(subject => {
                    const summary = subjectPerformanceSummary[subject.id];
                    return (
                      <TableCell key={subject.id} className="text-center">{summary?.gpa.toFixed(2) || '0.00'}</TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-center font-semibold">Overall Form GPA: {overallFormGPA.toFixed(2)}</p>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Report generated on {new Date().toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormReport;