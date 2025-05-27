import React, { useRef } from "react";
import StudentReportCard, { StudentReportCardHandle } from "./StudentReportCard";

// Example props: selectedStudents, year, term
const BatchReportDownload: React.FC<{
  selectedStudents: string[];
  year: number;
  term: 1 | 2;
}> = ({ selectedStudents, year, term }) => {
  const reportRefs = useRef<(StudentReportCardHandle | null)[]>([]);

  const handleDownloadSelected = async () => {
    for (let i = 0; i < selectedStudents.length; i++) {
      await reportRefs.current[i]?.download();
    }
  };

  return (
    <>
      <button
        onClick={handleDownloadSelected}
        disabled={selectedStudents.length === 0}
        className="mb-4 px-4 py-2 bg-education-primary text-white rounded hover:bg-education-dark"
      >
        Download Selected Report Cards
      </button>
      {/* Hidden report cards for PDF generation */}
      <div style={{ display: "none" }}>
        {selectedStudents.map((studentId, idx) => (
          <StudentReportCard
            key={studentId}
            ref={el => (reportRefs.current[idx] = el)}
            studentId={studentId}
            year={year}
            term={term}
          />
        ))}
      </div>
    </>
  );
};

export default BatchReportDownload;