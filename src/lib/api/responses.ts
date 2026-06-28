import { NextResponse } from 'next/server'

/** 200 OK with JSON body */
export const ok = <T>(data: T) => NextResponse.json(data, { status: 200 })

/** 201 Created with JSON body */
export const created = <T>(data: T) => NextResponse.json(data, { status: 201 })

/** 400 Bad Request */
export const badRequest = (message: string | object = 'Bad request') =>
  NextResponse.json({ error: message }, { status: 400 })

/** 401 Unauthorized */
export const unauthorized = (message = 'Unauthorized') =>
  NextResponse.json({ error: message }, { status: 401 })

/** 403 Forbidden */
export const forbidden = (message = 'Forbidden') =>
  NextResponse.json({ error: message }, { status: 403 })

/** 404 Not Found */
export const notFound = (message = 'Not found') =>
  NextResponse.json({ error: message }, { status: 404 })

/** 409 Conflict */
export const conflict = (message = 'Conflict') =>
  NextResponse.json({ error: message }, { status: 409 })

/** 500 Internal Server Error */
export const serverError = (message = 'Internal server error') =>
  NextResponse.json({ error: message }, { status: 500 })
