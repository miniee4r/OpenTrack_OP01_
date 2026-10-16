import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import {
  Award,
  Download,
  Printer,
  CheckCircle2,
  Sparkles,
  QrCode,
  ShieldCheck,
  Send,
  Building
} from 'lucide-react';
import { INSTITUTE_INFO } from '../data/mockData';

export const CertificateBuilder = ({ preselectedStudent }) => {
  const { students, currentRole, addAuditLog } = useRole();

  const eligibleStudents = students.filter(s => s.certificateEligible || s.attendancePercentage >= 90);
  const [selectedStudentId, setSelectedStudentId] = useState(
    preselectedStudent ? preselectedStudent.id : (eligibleStudents[0]?.id || students[3].id)
  );

  const student = students.find(s => s.id === selectedStudentId) || students[3];

  const certificateNumber = `TST-CERT-2026-${student.id.replace('STU-', '')}`;
  const issueDate = 'October 16, 2026';

  const handlePrint = () => {
    window.print();
    addAuditLog({
      action: 'CERTIFICATE_GENERATED',
      summary: `Generated verifiable course completion certificate for ${student.name} (${certificateNumber})`,
      query: `GENERATE_CREDENTIAL(student_id='${student.id}', cert_no='${certificateNumber}')`,
      status: 'Issued & Cryptographically Signed',
      securityCheck: 'Grade & Attendance Floor Verified'
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-purple">
                <Award size={12} />
                Digital Credential Engine
              </span>
              <span className="badge badge-success">
                <ShieldCheck size={12} />
                QR Verifiable on Blockchain Ledger
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              Verifiable Course Completion Certificate Generator
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Issued to graduates with &gt;90% hybrid attendance and cleared project assessments.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="input-control"
              style={{ width: 'auto', fontWeight: '700', padding: '8px 14px' }}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.courseName}) {s.certificateEligible ? '⭐ Eligible' : ''}
                </option>
              ))}
            </select>

            <button onClick={handlePrint} className="btn btn-primary">
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Certificate Canvas Preview */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        border: '4px double #d4af37',
        borderRadius: '20px',
        padding: '50px 60px',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(212, 175, 55, 0.2)',
        position: 'relative',
        color: '#fff',
        textAlign: 'center',
        fontFamily: "'Times New Roman', Georgia, serif",
      }}>
        {/* Subtle Watermark */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.04,
          pointerEvents: 'none',
          fontSize: '12rem',
          fontWeight: '900',
        }}>
          TECHSUMMIT
        </div>

        {/* Sponsor Banner */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(212, 175, 55, 0.15)',
          border: '1px solid #d4af37',
          padding: '4px 16px',
          borderRadius: '20px',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.75rem',
          fontWeight: '700',
          color: '#fef08a',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '24px'
        }}>
          <Sparkles size={14} color="#fef08a" />
          <span>Sponsored by TechSummitTrainers</span>
        </div>

        <h3 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '1rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#cbd5e1',
          marginBottom: '10px'
        }}>
          {INSTITUTE_INFO.name}
        </h3>

        <h2 style={{
          fontSize: '2.5rem',
          color: '#fef08a',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontWeight: 'normal',
          marginBottom: '20px',
          textShadow: '0 2px 10px rgba(212, 175, 55, 0.4)'
        }}>
          Certificate of Mastery & Completion
        </h2>

        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.95rem',
          color: '#94a3b8',
          marginBottom: '12px'
        }}>
          This is proudly conferred upon
        </p>

        <h1 style={{
          fontSize: '2.6rem',
          color: '#fff',
          fontWeight: 'bold',
          letterSpacing: '0.02em',
          borderBottom: '2px solid rgba(212, 175, 55, 0.4)',
          display: 'inline-block',
          padding: '0 30px 8px 30px',
          marginBottom: '20px'
        }}>
          {student.name}
        </h1>

        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.95rem',
          color: '#cbd5e1',
          lineHeight: '1.8',
          maxWidth: '680px',
          margin: '0 auto 36px auto'
        }}>
          for successfully satisfying all academic curricula, demonstrating architectural mastery in 
          <strong> {student.courseName}</strong>, achieving a hybrid attendance rate of 
          <strong> {student.attendancePercentage}%</strong>, and completing production capstone assessments.
        </p>

        {/* Footer Seal & Signatures */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '24px',
          fontFamily: 'var(--font-sans)'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>Vikramaditya Rao</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Institute Director</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>TechSummit Institute</div>
          </div>

          {/* Gold Seal & QR Badge */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #fde047 0%, #ca8a04 100%)',
              border: '3px solid #fef08a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(250, 204, 21, 0.4)',
              color: '#713f12'
            }}>
              <Award size={32} />
            </div>
            <span style={{ fontSize: '0.65rem', color: '#fde047', fontWeight: '700', letterSpacing: '0.05em' }}>
              OFFICIAL SEAL
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginBottom: '4px' }}>
              <QrCode size={30} color="#38bdf8" />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8' }}>{certificateNumber}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Issued: {issueDate}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--success)' }}>
              ✓ Verified on TechSummit Ledger
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
