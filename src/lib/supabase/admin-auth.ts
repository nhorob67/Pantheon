import type { SupabaseClient, User } from "@supabase/supabase-js";

const AUTH_USER_PAGE_SIZE = 200;

interface AdminListUsersClient {
  auth: {
    admin: {
      listUsers: (params?: {
        page?: number;
        perPage?: number;
      }) => Promise<{
        data: {
          users: User[];
          nextPage?: number | null;
          lastPage?: number;
        };
        error: { message: string } | null;
      }>;
    };
  };
}

export async function findAuthUserByEmail(
  admin: Pick<SupabaseClient, "auth"> | AdminListUsersClient,
  email: string
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: AUTH_USER_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const match =
      data.users.find(
        (user) => user.email?.trim().toLowerCase() === normalizedEmail
      ) ?? null;

    if (match) {
      return match;
    }

    const nextPage =
      typeof data.nextPage === "number" && data.nextPage > page
        ? data.nextPage
        : null;

    if (nextPage) {
      page = nextPage;
      continue;
    }

    if (
      typeof data.lastPage === "number" &&
      data.lastPage > page &&
      data.users.length > 0
    ) {
      page += 1;
      continue;
    }

    return null;
  }
}
