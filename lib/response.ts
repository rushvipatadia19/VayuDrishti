import { NextResponse } from 'next/server';

export const ok = <T,>(data: T, message?: string, status = 200) =>
  NextResponse.json({ success: true, data, message }, { status });

export const fail = (error: string, status = 400, code?: string) =>
  NextResponse.json({ success: false, error, code }, { status });

