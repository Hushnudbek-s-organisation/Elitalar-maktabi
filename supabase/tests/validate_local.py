#!/usr/bin/env python3
# ============================================================================
# SchoolOS Uzbekistan — LOKAL VALIDATSIYA DRAYVERI
# ----------------------------------------------------------------------------
# Migrationlarni toza PostgreSQL bazada (pgserver orqali) tekshiradi:
#   1. Toza baza: local_harness → 001 → 002 → 003 → 004 (ON_ERROR_STOP)
#   2. RLS smoke testlari (rls_smoke_tests.sql) — 53 test
#   3. Idempotensiya: 001-003 qayta run OK, 004 guard bilan rad etiladi
#
# Talab: pip install --break-system-packages pgserver
# Ishlatish: python3 supabase/tests/validate_local.py
# ============================================================================
import os
import subprocess
import sys

import pgserver  # pip install --break-system-packages pgserver

os.environ.setdefault('XDG_RUNTIME_DIR', '/tmp/runtime-1001')

PGDATA = os.path.join(os.path.expanduser('~'), 'pgdata')
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MIGRATIONS = os.path.join(REPO, 'migrations')

db = pgserver.get_server(PGDATA)

PSQL = None
for root, _dirs, files in os.walk(
        os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')):
    if 'psql' in files:
        PSQL = os.path.join(root, 'psql')
        break
assert PSQL, 'psql topilmadi'

ADMIN = f'postgresql://postgres:@/postgres?host={PGDATA}'
DB = 'schoolos_test'
URI = f'postgresql://postgres:@/{DB}?host={PGDATA}'


def psql(sql, uri=URI, stop=True):
    args = [PSQL, '-X', uri]
    if stop:
        args[1:1] = ['-v', 'ON_ERROR_STOP=1']
    return subprocess.run(args, input=sql, capture_output=True, text=True)


def run_file(label, path, expect_fail=False, expect_msg=None):
    p = psql(open(path).read())
    if expect_fail:
        ok = p.returncode != 0 and (expect_msg is None or expect_msg in p.stderr)
        print(f'--- {label}: {"KUTILGANDEK RAD ETILDI" if ok else "KUTILMAGAN NATIJA"}')
        if not ok:
            print(p.stderr[-1500:])
            sys.exit(1)
    else:
        ok = p.returncode == 0
        print(f'--- {label}: {"OK" if ok else "FAIL"}')
        if not ok:
            print(p.stderr[-1500:])
            sys.exit(1)
    return p


def main():
    # 0. Toza baza
    c = psql(f'drop database if exists {DB}; create database {DB};', uri=ADMIN)
    assert c.returncode == 0, c.stderr

    print('=== 1. Toza o\'rnatish ===')
    run_file('harness',    f'{MIGRATIONS}/../tests/local_harness.sql')
    run_file('001_schema', f'{MIGRATIONS}/001_schema.sql')
    run_file('002_rls',    f'{MIGRATIONS}/002_rls.sql')
    run_file('003_audit',  f'{MIGRATIONS}/003_audit.sql')
    run_file('004_seed',   f'{MIGRATIONS}/004_seed_dev.sql')

    print('=== 2. RLS smoke testlar ===')
    p = psql(open(f'{MIGRATIONS}/../tests/rls_smoke_tests.sql').read(), stop=False)
    lines = [l for l in (p.stdout + p.stderr).splitlines()
             if ' PASS' in l or 'FAIL' in l]
    npass = sum(1 for l in lines if 'PASS' in l)
    nfail = sum(1 for l in lines if 'FAIL' in l)
    for l in lines:
        print('   ' + l.strip())
    print(f'   YAKUN: PASS={npass} FAIL={nfail}')
    if nfail:
        sys.exit(1)

    print('=== 3. Idempotensiya ===')
    run_file('QAYTA 001', f'{MIGRATIONS}/001_schema.sql')
    run_file('QAYTA 002', f'{MIGRATIONS}/002_rls.sql')
    run_file('QAYTA 003', f'{MIGRATIONS}/003_audit.sql')
    run_file('QAYTA 004 (guard rad etishi kerak)',
             f'{MIGRATIONS}/004_seed_dev.sql',
             expect_fail=True, expect_msg='allaqachon mavjud')

    print()
    print('VALIDATSIYA YAKUNI: HAMMASI OK')


if __name__ == '__main__':
    main()
