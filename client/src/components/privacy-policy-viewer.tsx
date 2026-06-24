import { LegalDocumentViewer } from '@/components/legal-document-viewer';
import { PRIVACY_POLICY_TEXT } from '@/lib/documents/privacy-policy-content';

interface PrivacyPolicyViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyPolicyViewer({ open, onOpenChange }: PrivacyPolicyViewerProps) {
  return (
    <LegalDocumentViewer
      open={open}
      onOpenChange={onOpenChange}
      subtitle="ред. «11» декабря 2025 г."
      title="Политика в отношении обработки и защиты персональных данных"
      text={PRIVACY_POLICY_TEXT}
    />
  );
}
