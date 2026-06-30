import { redirect } from 'next/navigation'

// /log fue dividido en /log/run y /log/history en feature/16.
// Este redirect previene 404 en links viejos o bookmarks externos.
export default function LogPage() {
  redirect('/log/history')
}
