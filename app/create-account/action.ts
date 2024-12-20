'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { formScheme } from '@/schemes/schemes';
import { checkDuplicateEmail, createUser } from '@/utils/auth';
import { extractValuesFromFormData, parseErrors, wait } from '@/utils/utils';

const createAccountScheme = formScheme
  .extend({ username: z.string().min(5), passwordConfirm: z.string() })
  .refine(({ password, passwordConfirm }) => password === passwordConfirm, {
    message: 'The password and password confirm must be same!',
    path: ['passwordConfirm'],
  })
  .refine(
    async ({ email }) => {
      const isDuplicate = await checkDuplicateEmail(email);
      return !isDuplicate;
    },
    {
      message: 'Duplicate Email!',
      path: ['email'],
    },
  );

type CreateAccountType = z.infer<typeof createAccountScheme>;

type Errors = Partial<Record<keyof CreateAccountType, string[]>>;

type CreateAccountResult = CreateAccountType & {
  isTried: boolean;
  errors: Errors;
};

const handleOnSubmit = async (_: CreateAccountResult, current: FormData) => {
  await wait(1000);

  const values = extractValuesFromFormData(current, [
    'email',
    'username',
    'password',
    'passwordConfirm',
  ] as const);

  const parseResult = await createAccountScheme.safeParseAsync(values);

  /** parsed error list */
  const errors = parseErrors<Errors>(parseResult.error?.errors);

  if (parseResult.success) {
    const id = await createUser(values);

    if (id) {
      redirect('/log-in');
    } else {
      errors.email = ['Failed to create user'];
    }
  }

  return {
    ...values,
    isTried: true,
    errors: errors ?? {},
  };
};

export { handleOnSubmit };
export type { CreateAccountResult };
