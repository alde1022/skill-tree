import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Agent Skill Tree', description: 'Design and export agent capability builds.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
