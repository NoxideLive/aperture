import { DeviceApprovalPage } from '@/components/device/DeviceApprovalPage';

export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = params.code?.trim() ?? '';
  return <DeviceApprovalPage userCode={code} />;
}