import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sf1_access_token');

  if (token) {
    redirect('/dashboard');
  }

  redirect('/landing');
}
