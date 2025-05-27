import { useParams } from "react-router-dom";
import StudentReportCard from "@/components/dashboard/reports/StudentReportCard";

const ReportCardView = () => {
  const { studentId, year, term } = useParams();

  if (!studentId || !year || !term) {
    return <div>Invalid report link.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <StudentReportCard
        studentId={studentId}
        year={parseInt(year)}
        term={parseInt(term) as 1 | 2}
      />
      {/* Optionally add a download button here */}
    </div>
  );
};

export default ReportCardView;