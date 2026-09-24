import { redirect } from 'next/navigation';

/** The cabinet is the only thing at the root; project forms live under /p/<slug>/. */
export default function Home(): never {
  redirect('/admin');
}
