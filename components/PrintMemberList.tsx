import { Person } from "@/types";

interface PrintMemberListProps {
  persons: Person[];
}

const genderLabel = (gender: string) => {
  if (gender === "male") return "Nam";
  if (gender === "female") return "Nữ";
  return "Khác";
};

export default function PrintMemberList({ persons }: PrintMemberListProps) {
  const printDate = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="print-show hidden">
      <div style={{ fontFamily: "serif", padding: "0 1cm" }}>
        <h1
          style={{
            fontSize: "20pt",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "4pt",
          }}
        >
          Danh sách Gia phả
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: "10pt",
            color: "#666",
            marginBottom: "16pt",
          }}
        >
          Ngày in: {printDate} — Tổng số: {persons.length} thành viên
        </p>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "9pt",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f0e8" }}>
              <th style={thStyle}>STT</th>
              <th style={thStyle}>Họ tên</th>
              <th style={thStyle}>Năm sinh</th>
              <th style={thStyle}>Năm mất</th>
              <th style={thStyle}>Giới tính</th>
              <th style={thStyle}>Thế hệ</th>
              <th style={{ ...thStyle, width: "30%" }}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {persons.map((person, index) => (
              <tr
                key={person.id}
                style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#fafafa" }}
              >
                <td style={tdStyle}>{index + 1}</td>
                <td style={{ ...tdStyle, fontWeight: "600" }}>
                  {person.full_name}
                  {person.other_names ? (
                    <span style={{ fontWeight: "normal", color: "#666" }}>
                      {" "}
                      ({person.other_names})
                    </span>
                  ) : null}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {person.birth_year ?? "—"}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {person.death_year ?? (person.is_deceased ? "?" : "—")}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {genderLabel(person.gender)}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {person.generation != null ? `Đời ${person.generation}` : "—"}
                </td>
                <td style={tdStyle}>{person.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6pt 8pt",
  textAlign: "left",
  fontWeight: "bold",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "5pt 8pt",
  verticalAlign: "top",
};
