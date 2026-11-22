import React from 'react';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui';
import { SubHeader } from '@/components/Rows';
import { ProfileForm } from '@/components/ProfileForm';
import { toast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';

export default function EditProfile() {
  const router = useRouter();
  const { me, setMe } = useAuth();
  if (!me) return null;
  return (
    <Screen>
      <SubHeader title="Edit profile" />
      <ProfileForm me={me} submitLabel="Save" onSaved={(m) => { setMe(m); toast('Profile saved'); router.back(); }} />
    </Screen>
  );
}
