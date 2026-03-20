import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";

/**
 * Validiert Request Body gegen ein Zod Schema.
 * Gibt entweder die validierten Daten oder eine NextResponse mit Fehlern zurück.
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        error: NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "Validierungsfehler",
            details: err.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      error: NextResponse.json(
        {
          error: "INVALID_JSON",
          message: "Ungültiges JSON im Request Body",
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validiert Query-Parameter gegen ein Zod Schema.
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data: T } | { error: NextResponse } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        error: NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "Ungültige Query-Parameter",
            details: err.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      };
    }
    return {
      error: NextResponse.json(
        { error: "UNKNOWN_ERROR", message: "Unbekannter Fehler" },
        { status: 500 }
      ),
    };
  }
}
