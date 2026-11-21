import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from './auth';

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? 'Invalid input.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
