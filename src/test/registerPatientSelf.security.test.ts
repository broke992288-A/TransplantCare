import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import sql from './fixtures/register-patient-self.sql?raw';
const caller = '11111111-1111-4111-8111-111111111111';
const victim = '22222222-2222-4222-8222-222222222222';
const victimAccount = '33333333-3333-4333-8333-333333333333';
let db: PGlite;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE public.user_roles (user_id uuid PRIMARY KEY, role text NOT NULL);
    CREATE TABLE public.patients (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, phone text,
      date_of_birth date, gender text, linked_user_id uuid, organ_type text, risk_level text
    );
    CREATE FUNCTION public.normalize_phone(text) RETURNS text LANGUAGE sql AS
      $$ SELECT nullif(regexp_replace($1, '[^0-9]', '', 'g'), '') $$;
    GRANT USAGE ON SCHEMA public, auth TO authenticated;
    GRANT SELECT ON public.patients TO authenticated;
    ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_patient ON public.patients FOR SELECT TO authenticated
      USING (linked_user_id = auth.uid());
  `);
  await db.exec(sql);
});
afterEach(async () => { await db.close(); });

async function signIn() {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [caller]);
  await db.exec('SET ROLE authenticated');
}
async function register(phone: string | null = '+998901234567') {
  const result = await db.query<{ id: string }>(
    'SELECT public.register_patient_self($1, $2, NULL, NULL) AS id', ['New patient', phone],
  );
  return result.rows[0]?.id;
}

describe('self-registration ownership security', () => {
  it('never claims or alters an unlinked record with the supplied phone', async () => {
    await db.query('INSERT INTO public.patients (id, full_name, phone) VALUES ($1, $2, $3)',
      [victim, 'Original patient', '998901234567']);
    await signIn();
    const created = await register();
    expect(created).toBeDefined();
    expect(created).not.toBe(victim);
    const visible = await db.query<{ id: string }>('SELECT id FROM public.patients');
    expect(visible.rows.map(row => row.id)).toEqual([created]);
    await db.exec('RESET ROLE');
    const original = await db.query('SELECT full_name, phone, linked_user_id FROM public.patients WHERE id = $1', [victim]);
    expect(original.rows).toEqual([{ full_name: 'Original patient', phone: '998901234567', linked_user_id: null }]);
  });

  it('does not change another account’s existing link', async () => {
    await db.query('INSERT INTO public.patients (id, phone, linked_user_id) VALUES ($1, $2, $3)',
      [victim, '998901234567', victimAccount]);
    await signIn();
    expect(await register()).not.toBe(victim);
    await db.exec('RESET ROLE');
    const result = await db.query<{ linked_user_id: string }>('SELECT linked_user_id FROM public.patients WHERE id = $1', [victim]);
    expect(result.rows[0]?.linked_user_id).toBe(victimAccount);
  });

  it('returns only the caller’s existing card without rewriting it', async () => {
    await db.query('INSERT INTO public.patients (id, full_name, linked_user_id) VALUES ($1, $2, $3)',
      [victim, 'Preserved name', caller]);
    await signIn();
    expect(await register()).toBe(victim);
    const result = await db.query<{ full_name: string }>('SELECT full_name FROM public.patients');
    expect(result.rows[0]?.full_name).toBe('Preserved name');
  });

  it('keeps repeated registration idempotent', async () => {
    await signIn();
    const first = await register(null);
    expect(await register()).toBe(first);
    expect((await db.query('SELECT id FROM public.patients')).rows).toHaveLength(1);
  });

  it('rejects calls without an authenticated identity', async () => {
    await expect(register()).rejects.toMatchObject({ code: '42501' });
    expect((await db.query('SELECT * FROM public.user_roles')).rows).toHaveLength(0);
    expect((await db.query('SELECT * FROM public.patients')).rows).toHaveLength(0);
  });

  it('does not turn a doctor into a patient', async () => {
    await db.query('INSERT INTO public.user_roles VALUES ($1, $2)', [caller, 'doctor']);
    await signIn();
    await expect(register()).rejects.toThrow(/doctor/);
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT role FROM public.user_roles')).rows).toEqual([{ role: 'doctor' }]);
    expect((await db.query('SELECT * FROM public.patients')).rows).toHaveLength(0);
  });
});