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
  Building,
  Eye,
  X
} from 'lucide-react';
import { INSTITUTE_INFO } from '../data/mockData';

export const CertificateBuilder = ({ preselectedStudent }) => {
  const { students, currentRole, addAuditLog, triggerConfetti } = useRole();

  const eligibleStudents = students.filter(s => s.certificateEligible || s.attendancePercentage >= 85);
  const [selectedStudentId, setSelectedStudentId] = useState(
    preselectedStudent ? preselectedStudent.id : (eligibleStudents[0]?.id || students[3].id)
  );
  const [activeTheme, setActiveTheme] = useState('royal'); // 'royal' | 'cyber' | 'platinum'
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const student = students.find(s => s.id === selectedStudentId) || students[3];

  const certificateNumber = `TST-CERT-2026-${student.id.replace('STU-', '')}`;
  const issueDate = 'October 16, 2026';
  const verificationHash = `0x9f4a88b17c${student.id.replace('STU-', '24')}c8e0b59395`;

  const handlePrint = () => {
    triggerConfetti();
    window.print();
    addAuditLog({
      action: 'CERTIFICATE_GENERATED',
      summary: `Generated verifiable course completion certificate for ${student.name} (${certificateNumber})`,
      query: `GENERATE_CREDENTIAL(student_id='${student.id}', cert_no='${certificateNumber}', theme='${activeTheme}')`,
      status: 'Issued & Cryptographically Signed',
      securityCheck: 'Grade & Attendance Floor Verified'
    });
  };

  const getThemeStyles = () => {
    switch (activeTheme) {
      case 'cyber':
        return {
          background: 'linear-gradient(135deg, #051622 0%, #1a0826 100%)',
          border: '4px double #06b6d4',
          sealColor: 'radial-gradient(circle, #22d3ee 0%, #0891b2 100%)',
          sealBorder: '#67e8f9',
          titleColor: '#67e8f9',
          watermark: 'NOVIX CYBER',
        };
      case 'platinum':
        return {
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '4px double #e2e8f0',
          sealColor: 'radial-gradient(circle, #f8fafc 0%, #94a3b8 100%)',
          sealBorder: '#ffffff',
          titleColor: '#f8fafc',
          watermark: 'ACADEMIC',
        };
      default:
        return {
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          border: '4px double #d4af37',
          sealColor: 'radial-gradient(circle, #fde047 0%, #ca8a04 100%)',
          sealBorder: '#fef08a',
          titleColor: '#fef08a',
          watermark: 'TECHSUMMIT',
        };
    }
  };

  const currentTheme = getThemeStyles();

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
              Issued to graduates with &gt;85% hybrid attendance and cleared capstone engineering assessments.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
              <span>Print / Export PDF</span>
            </button>
          </div>
        </div>

        {/* Theme Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '18px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Template Aesthetic:</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTheme('royal')}
              className={`btn btn-sm ${activeTheme === 'royal' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem' }}
            >
              🌟 Royal Gold & Navy
            </button>
            <button
              onClick={() => setActiveTheme('cyber')}
              className={`btn btn-sm ${activeTheme === 'cyber' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem' }}
            >
              💎 Cyber AI Edition
            </button>
            <button
              onClick={() => setActiveTheme('platinum')}
              className={`btn btn-sm ${activeTheme === 'platinum' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem' }}
            >
              🏛️ Academic Platinum
            </button>
          </div>
        </div>
      </div>

      {/* Certificate Canvas Preview */}
      <div style={{
        background: currentTheme.background,
        border: currentTheme.border,
        borderRadius: '20px',
        padding: '50px 60px',
        maxWidth: '920px',
        margin: '0 auto',
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(99, 102, 241, 0.25)',
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
          fontSize: '11rem',
          fontWeight: '900',
        }}>
          {currentTheme.watermark}
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
          fontSize: '2.4rem',
          color: currentTheme.titleColor,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontWeight: 'normal',
          marginBottom: '18px',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)'
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
          borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
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
          maxWidth: '700px',
          margin: '0 auto 36px auto'
        }}>
          for successfully satisfying all academic curricula, demonstrating architectural mastery in 
          <strong> {student.courseName}</strong>, achieving a verified hybrid attendance rate of 
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

          {/* Gold Seal */}
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
              background: currentTheme.sealColor,
              border: `3px solid ${currentTheme.sealBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(250, 204, 21, 0.4)',
              color: '#000'
            }}>
              <Award size={32} />
            </div>
            <span style={{ fontSize: '0.65rem', color: '#fef08a', fontWeight: '700', letterSpacing: '0.05em' }}>
              OFFICIAL SEAL
            </span>
          </div>

          {/* Interactive QR Code */}
          <div style={{ textAlign: 'right' }}>
            <div
              onClick={() => setIsQrModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'flex-end',
                marginBottom: '4px',
                cursor: 'pointer'
              }}
              title="Click to verify cryptographic signature"
            >
              <QrCode size={32} color="#38bdf8" />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8' }}>{certificateNumber}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Issued: {issueDate}</div>
              </div>
            </div>
            <div
              onClick={() => setIsQrModalOpen(true)}
              style={{ fontSize: '0.65rem', color: 'var(--success)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ✓ Click QR to Verify Signature
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Verification Modal */}
      {isQrModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsQrModalOpen(false)}>
          <div
            className="modal-content animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', padding: '28px', background: '#0e1422' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>
                  Cryptographic Credential Verification
                </h3>
              </div>
              <button onClick={() => setIsQrModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem', color: '#cbd5e1' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div><strong>Certificate ID:</strong> {certificateNumber}</div>
                <div><strong>Conferred To:</strong> {student.name} ({student.id})</div>
                <div><strong>Course:</strong> {student.courseName}</div>
                <div><strong>Verified Attendance:</strong> {student.attendancePercentage}%</div>
                <div><strong>Issue Authority:</strong> TechSummitTrainers Accredited Ledger</div>
              </div>

              <div style={{ background: '#060911', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>SHA-256 Merkle Proof:</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#38bdf8', wordBreak: 'break-all' }}>
                  {verificationHash}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setIsQrModalOpen(false)} className="btn btn-primary btn-sm">
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
