import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { findAuthUserByEmail } from "./admin-auth.ts";

function fakeUser(overrides: { id: string; email: string }): User {
  return {
    ...overrides,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

test("findAuthUserByEmail returns a user from the first page", async () => {
  const user = await findAuthUserByEmail(
    {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [
                fakeUser({ id: "user-1", email: "person@example.com" }),
              ],
              nextPage: null,
              lastPage: 1,
            },
            error: null,
          }),
        },
      },
    },
    "person@example.com"
  );

  assert.equal(user?.id, "user-1");
});

test("findAuthUserByEmail walks additional pages", async () => {
  const visitedPages: number[] = [];

  const user = await findAuthUserByEmail(
    {
      auth: {
        admin: {
          listUsers: async (params) => {
            const page = params?.page ?? 1;
            visitedPages.push(page);
            if (page === 1) {
              return {
                data: {
                  users: [fakeUser({ id: "user-1", email: "first@example.com" })],
                  nextPage: 2,
                  lastPage: 2,
                },
                error: null,
              };
            }

            return {
              data: {
                users: [fakeUser({ id: "user-2", email: "second@example.com" })],
                nextPage: null,
                lastPage: 2,
              },
              error: null,
            };
          },
        },
      },
    },
    "second@example.com"
  );

  assert.deepEqual(visitedPages, [1, 2]);
  assert.equal(user?.id, "user-2");
});

test("findAuthUserByEmail returns null when the email is absent", async () => {
  const user = await findAuthUserByEmail(
    {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [fakeUser({ id: "user-1", email: "person@example.com" })],
              nextPage: null,
              lastPage: 1,
            },
            error: null,
          }),
        },
      },
    },
    "missing@example.com"
  );

  assert.equal(user, null);
});
