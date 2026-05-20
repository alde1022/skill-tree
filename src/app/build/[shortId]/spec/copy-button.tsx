'use client';
import { Button } from '@/components/ui/button';
export default function CopyButton({ text, label }: { text: string; label: string }) { return <Button onClick={() => navigator.clipboard.writeText(text)}>{label}</Button>; }
